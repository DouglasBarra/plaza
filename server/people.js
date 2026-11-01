// The People district's data: your WhatsApp and LinkedIn chats, through
// Beeper Desktop (beeper.com). Beeper runs on this Mac and does the talking
// to each network; Plaza's server logs in to Beeper's local API once (OAuth,
// like Banco) and reads chats from it when the page asks. Nothing is copied
// into Plaza's database: Beeper already keeps the chats on this Mac.
//
// Plaza never marks chats read and only sends a message when you press Send.
import { mcpConnection } from './mcp.js';

const BEEPER_URL = process.env.BEEPER_URL || 'http://localhost:23373';
// the networks People shows; Beeper has more (Slack, Telegram, …) for later
const NETWORKS = /whatsapp|linkedin/i;
const QUIET_DAYS = [21, 180];   // a 1:1 chat this quiet is someone to write to

const networkOf = (a) => a.network || a.bridge?.type || '';

export function people(db, ports) {
  // write: for sending the replies you type
  const beeper = mcpConnection(db, { name: 'beeper', url: `${BEEPER_URL}/v0/mcp`, scope: 'read write', ports });
  const api = (path, opts) => beeper.fetch(path, opts);

  // the accounts People cares about, or { running: false } when Beeper is closed
  async function accounts() {
    const all = await api('/v1/accounts');
    return (Array.isArray(all) ? all : all?.items || []).filter((a) => NETWORKS.test(networkOf(a)));
  }

  const chat = (c, networks) => ({
    id: c.id,
    accountID: c.accountID,
    network: c.network || networks[c.accountID] || '',
    title: c.title || c.participants?.items?.find((p) => !p.isSelf)?.fullName || 'Someone',
    group: c.type === 'group',
    unread: c.unreadCount || 0,
    muted: !!c.isMuted,
    pinned: !!c.isPinned,
    last: c.lastActivity || c.preview?.timestamp || null,
    preview: c.preview ? {
      text: c.preview.text || (c.preview.attachments?.length ? `[${c.preview.type?.toLowerCase() || 'attachment'}]` : ''),
      mine: !!c.preview.isSender,
      sender: c.preview.senderName || null,
    } : null,
  });

  async function summary() {
    if (!beeper.loggedIn()) return { loggedIn: false, running: await running() };
    const accs = await accounts();
    const networks = Object.fromEntries(accs.map((a) => [a.accountID, networkOf(a)]));
    let chats = [];
    if (accs.length) {
      const got = await api(`/v1/chats?${new URLSearchParams([['limit', '200'], ...accs.map((a) => ['accountIDs', a.accountID])])}`);
      chats = (got?.items || []).filter((c) => !c.isArchived && !c.isLowPriority).map((c) => chat(c, networks));
    }
    const now = Date.now();
    const age = (c) => (c.last ? (now - Date.parse(c.last)) / 864e5 : Infinity);
    return {
      loggedIn: true,
      running: true,
      accounts: accs.map((a) => ({
        id: a.accountID, network: networkOf(a), status: a.status, statusText: a.statusText || null,
        me: a.user?.fullName || a.user?.username || a.user?.phoneNumber || null,
      })),
      chats,
      quiet: chats.filter((c) => !c.group && !c.muted && age(c) >= QUIET_DAYS[0] && age(c) <= QUIET_DAYS[1])
        .sort((a, b) => Date.parse(a.last) - Date.parse(b.last)).slice(0, 12),
    };
  }

  async function running() {
    try { return (await fetch(`${BEEPER_URL}/v1/info`, { signal: AbortSignal.timeout(1500) })).status < 500; } catch { return false; }
  }

  async function messages(chatID) {
    const got = await api(`/v1/chats/${encodeURIComponent(chatID)}/messages`);
    return (got?.items || []).filter((m) => !m.isHidden && !m.isDeleted && m.type !== 'REACTION').map((m) => ({
      id: m.id,
      at: m.timestamp,
      mine: !!m.isSender,
      sender: m.senderName || null,
      text: m.text || '',
      kind: m.type || 'TEXT',
      files: (m.attachments || []).map((a) => a.fileName || a.type),
      sending: m.sendStatus && !/sent|delivered|read|success/i.test(m.sendStatus) ? m.sendStatus : null,
    })).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  }

  // ---------- the API ----------
  const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
  const page = (res, status, title, text) => {
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;margin:3em;max-width:36em"><h1>${title}</h1><p>${text}</p><p><a href="/">Back to Plaza</a></p>`);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  // Beeper being closed shows up as a refused connection
  const closed = (e) => /ECONNREFUSED|fetch failed/i.test(`${e?.message} ${e?.cause?.code}`);
  const fail = (res, e) => {
    if (e.loginNeeded) return json(res, 200, { loggedIn: false, running: true });
    if (closed(e)) return json(res, 200, { loggedIn: beeper.loggedIn(), running: false });
    console.error('People:', e);
    return json(res, 502, { error: String(e.message || e) });
  };

  // Returns true when it answered the request.
  return async function handle(req, res, url, serverPort) {
    if (url.pathname === '/api/people' && req.method === 'GET') {
      try { return json(res, 200, await summary()), true; } catch (e) { return fail(res, e), true; }
    }
    const m = url.pathname.match(/^\/api\/people\/chats\/([^/]+)\/messages$/);
    if (m && req.method === 'GET') {
      try { return json(res, 200, await messages(decodeURIComponent(m[1]))), true; } catch (e) { return fail(res, e), true; }
    }
    if (m && req.method === 'POST') {
      let body = '';
      for await (const c of req) { body += c; if (body.length > 64e3) return json(res, 413, { error: 'too long' }), true; }
      const text = (() => { try { return String(JSON.parse(body).text || '').trim(); } catch { return ''; } })();
      if (!text) return json(res, 400, { error: 'nothing to send' }), true;
      try {
        return json(res, 200, await api(`/v1/chats/${encodeURIComponent(decodeURIComponent(m[1]))}/messages`, { method: 'POST', body: { text } })), true;
      } catch (e) { return fail(res, e), true; }
    }
    // a link the page opens: Beeper asks you to approve Plaza, then comes back
    if (url.pathname === '/api/people/login' && req.method === 'GET') {
      try {
        const to = await beeper.login(serverPort);
        res.writeHead(302, { location: to || '/?district=people' }); res.end();
      } catch (e) {
        console.error('Beeper login failed:', e);
        page(res, 502, 'Couldn’t reach Beeper', closed(e)
          ? 'Open Beeper Desktop, turn on its API in Settings → Developers, then try again.'
          : esc(e.message || e));
      }
      return true;
    }
    if (url.pathname === '/api/people/logout' && req.method === 'POST') {
      await beeper.logout();
      return json(res, 200, { ok: true }), true;
    }
    if (url.pathname === '/api/oauth/beeper/callback' && req.method === 'GET') {
      const err = url.searchParams.get('error');
      if (err) return page(res, 400, 'Login cancelled', esc(url.searchParams.get('error_description') || err)), true;
      try {
        await beeper.finishLogin(url.searchParams.get('code'), url.searchParams.get('state'));
        res.writeHead(302, { location: '/?district=people' }); res.end();
      } catch (e) {
        console.error('Beeper login failed:', e);
        page(res, 400, 'Login didn’t finish', esc(e.message || e));
      }
      return true;
    }
    return false;
  };
}
