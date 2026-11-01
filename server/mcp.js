// A connection to a remote MCP server that logs in with OAuth. The login
// happens once in the browser (login() gives the page to open, finishLogin()
// takes the code it sends back to /api/oauth/<name>/callback); the tokens are
// kept in the secrets table and refreshed by the MCP SDK when they run out.
// Banco (finance.js) and Beeper (people.js) use it; Claude will use the
// same connections.
import { randomBytes } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { auth, UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';

export class LoginNeeded extends Error {
  constructor(name) { super(`Log in to ${name} first`); this.loginNeeded = true; }
}

export function mcpConnection(db, { name, url, scope, ports }) {
  const key = (k) => `mcp.${name}.${k}`;
  const callback = (port) => `http://localhost:${port}/api/oauth/${name}/callback`;
  let port = ports[0];
  let pendingUrl = null;
  let client = null;

  const provider = {
    get redirectUrl() { return callback(port); },
    get clientMetadata() {
      return {
        client_name: 'Plaza',
        redirect_uris: ports.map(callback),
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        scope,
      };
    },
    state() {
      const s = randomBytes(16).toString('hex');
      db.setSecret(key('state'), s);
      return s;
    },
    clientInformation: () => db.secret(key('client')),
    saveClientInformation: (info) => db.setSecret(key('client'), info),
    tokens: () => db.secret(key('tokens')),
    saveTokens: (tokens) => db.setSecret(key('tokens'), tokens),
    redirectToAuthorization(u) { pendingUrl = u.toString(); },
    saveCodeVerifier: (v) => db.setSecret(key('verifier'), v),
    codeVerifier: () => db.secret(key('verifier')),
    invalidateCredentials(what) {
      if (what === 'all' || what === 'client') db.setSecret(key('client'), undefined);
      if (what === 'all' || what === 'tokens') db.setSecret(key('tokens'), undefined);
      if (what === 'all' || what === 'verifier') db.setSecret(key('verifier'), undefined);
      client = null;
    },
  };

  async function connect() {
    if (client) return client;
    if (!provider.tokens()) throw new LoginNeeded(name);
    const c = new Client({ name: 'plaza', version: '0.1.0' });
    await c.connect(new StreamableHTTPClientTransport(new URL(url), { authProvider: provider }));
    return (client = c);
  }

  return {
    name,
    loggedIn: () => !!provider.tokens(),

    // The page to open in the browser to log in. `at` is the port this
    // server answers on, so the login comes back to the same place.
    async login(at) {
      port = ports.includes(at) ? at : ports[0];
      pendingUrl = null;
      const r = await auth(provider, { serverUrl: url, scope });
      return r === 'REDIRECT' ? pendingUrl : null; // null: already logged in
    },

    async finishLogin(code, state) {
      const expected = db.secret(key('state'));
      if (!expected || state !== expected) throw new Error('The login link is stale: start again from Plaza');
      db.setSecret(key('state'), undefined);
      await auth(provider, { serverUrl: url, authorizationCode: code, scope });
      client = null;
    },

    async logout() {
      if (client) await client.close().catch(() => {});
      provider.invalidateCredentials('all');
    },

    // For servers with a plain HTTP API behind the same login (Beeper):
    // fetches a path on the server with the access token, refreshing it once
    // if it ran out. Returns the parsed JSON.
    async fetch(path, { method = 'GET', body } = {}) {
      const go = () => fetch(new URL(path, url), {
        method,
        headers: { authorization: `Bearer ${provider.tokens()?.access_token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!provider.tokens()) throw new LoginNeeded(name);
      let r = await go();
      if (r.status === 401) {
        await auth(provider, { serverUrl: url, scope }).catch(() => {});
        if (!provider.tokens()) throw new LoginNeeded(name);
        r = await go();
        if (r.status === 401) { provider.invalidateCredentials('tokens'); throw new LoginNeeded(name); }
      }
      const text = await r.text();
      if (!r.ok) throw new Error(`${name} ${method} ${path}: ${r.status} ${text.slice(0, 200)}`);
      return text ? JSON.parse(text) : null;
    },

    // Calls a tool and returns its result as data: the structured content
    // if the server sends it, else the text parsed as JSON (or the text).
    async call(tool, args = {}) {
      let c = await connect();
      let res;
      try {
        res = await c.callTool({ name: tool, arguments: args });
      } catch (e) {
        if (e instanceof UnauthorizedError || /401|unauthori[sz]ed|authentication_required/i.test(e.message)) {
          client = null;
          if (!provider.tokens()) throw new LoginNeeded(name);
          c = await connect(); // the SDK refreshed the token: try once more
          res = await c.callTool({ name: tool, arguments: args });
        } else {
          client = null; // a dropped session: start a new one next time
          throw e;
        }
      }
      const text = (res.content || []).filter((p) => p.type === 'text').map((p) => p.text).join('\n');
      if (res.isError) throw new Error(`${tool}: ${text || 'failed'}`);
      if (res.structuredContent) return res.structuredContent;
      try { return JSON.parse(text); } catch { return text; }
    },
  };
}
