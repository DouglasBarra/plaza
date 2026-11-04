// Plaza's server, running on this Mac. It keeps your data (server/db.js)
// and serves the page: through Vite while developing (npm run dev), or the
// built files in dist/ (npm start). It only listens on this computer.
//
// Later this is where Plaza talks to other apps, MCP servers and Claude,
// since tokens and API keys must never reach the browser.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { finance } from './finance.js';
import { claude } from './claude.js';
import { people } from './people.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEV = !process.argv.includes('--prod');
const PORT = Number(process.env.PORT || (DEV ? 5173 : 4174));
const HOST = '127.0.0.1';
const db = openDb(process.env.PLAZA_DB || join(ROOT, 'data', 'plaza.db'));
// logins come back to whichever port this server answers on
const ports = [...new Set([PORT, 5173, 4174])];
const money = finance(db, ports);
const districts = [money, claude(db, money), people(db, ports)];

// ---------- the API ----------
const KEY = /^[\w.-]{1,100}$/;
const LIMIT = 5 * 1024 * 1024;
// A store is always a plain object. Saving anything else (null, a number, a
// list) would break the district that reads it on the next load.
const isStore = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (c) => {
      body += c;
      if (body.length > LIMIT) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// Returns true when it answered the request.
async function api(req, res) {
  const url = new URL(req.url, 'http://plaza');
  if (!url.pathname.startsWith('/api/')) return false;
  // only pages served from this computer may use the API
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return send(res, 403, { error: 'forbidden' }), true;

  if (url.pathname === '/api/health') return send(res, 200, { ok: true }), true;
  if (url.pathname === '/api/stores' && req.method === 'GET') return send(res, 200, db.stores()), true;
  const m = url.pathname.match(/^\/api\/stores\/([^/]+)$/);
  if (m && (req.method === 'PUT' || req.method === 'POST')) {
    const key = decodeURIComponent(m[1]);
    if (!KEY.test(key)) return send(res, 400, { error: 'bad key' }), true;
    try {
      const value = await readJson(req);
      if (!isStore(value)) return send(res, 400, { error: 'a store must be a JSON object' }), true;
      db.save(key, value);
      return send(res, 204), true;
    } catch (e) {
      return send(res, 400, { error: String(e.message || e) }), true;
    }
  }
  for (const handle of districts) if (await handle(req, res, url, PORT)) return true;
  return send(res, 404, { error: 'not found' }), true;
}

// ---------- the page ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
};

async function serveBuilt(req, res) {
  const dist = join(ROOT, 'dist');
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://plaza').pathname));
  let file = join(dist, path);
  if (!file.startsWith(dist)) { res.writeHead(403); return res.end(); }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(dist, 'index.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not built yet: run npm run build');
  }
}

const server = createServer();
let page = serveBuilt;
if (DEV) {
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({ root: ROOT, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  page = (req, res) => vite.middlewares(req, res);
}
server.on('request', async (req, res) => {
  try {
    if (!(await api(req, res))) await page(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'server error' });
  }
});
server.listen(PORT, HOST, () => console.log(`Plaza is running at http://localhost:${PORT}`));
