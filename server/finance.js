// The Finance district's data: your banks, through Banco MCP (Brazilian Open
// Finance, read-only for money). The server logs in to Banco once, then
// copies connections, accounts, transactions and card bills into the bank
// table: on start, every few hours, and when you press Sync. The page only
// ever reads Plaza's own /api/finance, never Banco directly.
//
// Banco can also change things (re-categorize transactions, revoke a bank's
// consent). Plaza doesn't use those; when Claude does, it asks you first.
import { mcpConnection } from './mcp.js';

const BANCO_URL = process.env.BANCO_MCP_URL || 'https://api.mcp.ai/banco';
const EVERY = 6 * 3600e3;          // background sync
const FIRST_DAYS = 365;             // how far back the first sync reaches
const OVERLAP_DAYS = 10;            // later syncs re-read this much, for late changes
const PAGE = 500;

// ---------- reading the provider's objects ----------
// Banco's tools wrap lists in an object, and the field names vary a little
// between tools, so read them leniently.
const LIST_KEYS = ['results', 'items', 'connections', 'accounts', 'transactions', 'bills', 'data'];
function listIn(res) {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object') return [];
  for (const k of LIST_KEYS) if (Array.isArray(res[k])) return res[k];
  for (const v of Object.values(res)) if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
  for (const v of Object.values(res)) if (v && typeof v === 'object' && !Array.isArray(v)) { const l = listIn(v); if (l.length) return l; }
  return [];
}
const pick = (o, ...names) => { for (const n of names) if (o?.[n] != null) return o[n]; };
const day = (d) => (d ? String(d).slice(0, 10) : null);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export function finance(db, ports) {
  const banco = mcpConnection(db, { name: 'banco', url: BANCO_URL, scope: 'mcp:read mcp:execute integrations:read', ports });
  let syncing = null;

  const meta = () => db.secret('finance.meta') || {};
  const setMeta = (m) => db.setSecret('finance.meta', { ...meta(), ...m });

  async function syncNow() {
    const res = await banco.call('openfinance_list_connections');
    const conns = listIn(res);
    const items = conns.map((c) => ({
      id: String(pick(c, 'item_id', 'itemId', 'id')),
      bank: pick(c, 'bank_name', 'bank', 'connector_name', 'name', 'connectorName') || 'Bank',
      connector: pick(c, 'connector_id', 'connectorId'),
      status: pick(c, 'status', 'executionStatus'),
      reconnectUrl: pick(c, 'reconnect_url', 'reconnectUrl'),
    })).filter((i) => i.id && i.id !== 'undefined');
    // With no bank connected yet, Banco answers in words, with your own
    // link to connect one (the line for "Banco MCP", else any connect link).
    const addUrl = typeof res === 'string'
      ? (res.match(/Banco MCP:\s*(https:\/\/\S+)/) || res.match(/(https:\/\/\S*\/connect\/\S+)/))?.[1]
      : pick(res, 'add_connection_url', 'addConnectionUrl', 'connect_url', 'url');

    const accounts = [];
    for (const item of items) {
      for (const a of listIn(await banco.call('openfinance_list_accounts', { item_id: item.id }))) {
        accounts.push({ ...a, itemId: a.itemId || item.id, bank: item.bank });
      }
    }

    const since = meta().lastSync ? daysAgo(OVERLAP_DAYS) : daysAgo(FIRST_DAYS);
    const to = daysAgo(-1);
    const txs = [], bills = [];
    for (const a of accounts) {
      for (let page = 1; page <= 40; page++) {
        const got = listIn(await banco.call('openfinance_list_transactions', { account_id: a.id, from: since, to, page, page_size: PAGE, detail: 'raw' }));
        for (const t of got) txs.push({ ...t, accountId: t.accountId || a.id });
        if (got.length < PAGE) break;
      }
      if (a.type === 'CREDIT') {
        for (const b of listIn(await banco.call('openfinance_list_credit_card_bills', { account_id: a.id, include_open_bill: true }))) {
          bills.push({ ...b, accountId: a.id });
        }
      }
    }

    db.bank.batch(() => {
      db.bank.clear('item'); db.bank.clear('account');
      for (const i of items) db.bank.put('item', i.id, null, null, i);
      for (const a of accounts) db.bank.put('account', a.id, a.itemId, null, a);
      for (const t of txs) db.bank.put('tx', t.id, t.accountId, day(pick(t, 'date', 'postedDate')), t);
      for (const b of bills) db.bank.put('bill', b.id, b.accountId, day(pick(b, 'dueDate', 'due_date')), b);
    });
    setMeta({ lastSync: Date.now(), addUrl: addUrl || meta().addUrl, error: null });
    return { items: items.length, accounts: accounts.length, transactions: txs.length, bills: bills.length };
  }

  function sync() {
    syncing ??= syncNow()
      .catch((e) => {
        setMeta({ error: e.loginNeeded ? null : String(e.message || e) });
        if (!e.loginNeeded) console.error('Finance sync failed:', e);
        throw e;
      })
      .finally(() => { syncing = null; });
    return syncing;
  }

  // in the background: soon after start, then every few hours
  const tick = () => { if (banco.loggedIn() && Date.now() - (meta().lastSync || 0) > EVERY - 60e3) sync().catch(() => {}); };
  setTimeout(tick, 5e3);
  setInterval(tick, 15 * 60e3).unref();

  // ---------- what the page gets ----------
  function summary() {
    const m = meta();
    const items = db.bank.all('item');
    const accounts = db.bank.all('account').map((a) => ({
      id: a.id, bank: a.bank, type: a.type, subtype: a.subtype,
      name: pick(a, 'marketingName', 'name') || a.type,
      number: a.number, currency: a.currencyCode || 'BRL', balance: a.balance,
      limit: a.creditData?.creditLimit, available: a.creditData?.availableCreditLimit,
    }));
    const kind = Object.fromEntries(accounts.map((a) => [a.id, a.type]));
    // one sign for everything: money in is positive. Card charges come in
    // positive from the provider, so they're flipped.
    const flow = (t) => (kind[t.accountId] === 'CREDIT' ? -t.amount : t.amount);
    const txs = db.bank.all('tx', daysAgo(120)).map((t) => ({
      id: t.id, date: day(pick(t, 'date', 'postedDate')), accountId: t.accountId,
      description: pick(t, 'descriptionRaw', 'description') || '',
      amount: flow(t), category: pick(t, 'category', 'categoryName') || null,
      pending: t.status === 'PENDING',
    }));
    const month = daysAgo(0).slice(0, 7);
    const thisMonth = txs.filter((t) => t.date?.startsWith(month));
    const spent = {};
    for (const t of thisMonth) if (t.amount < 0 && !/transfer|transfer[eê]ncia|pagamento de fatura|credit card payment/i.test(t.category || '')) {
      spent[t.category || 'Other'] = (spent[t.category || 'Other'] || 0) - t.amount;
    }
    const today = daysAgo(0);
    const bills = db.bank.all('bill').map((b) => ({
      id: b.id, accountId: b.accountId, due: day(pick(b, 'dueDate', 'due_date')),
      total: pick(b, 'totalAmount', 'total_amount'), minimum: pick(b, 'minimumPaymentAmount', 'minimum_payment_amount'),
      currency: pick(b, 'totalAmountCurrencyCode', 'currencyCode') || 'BRL',
    })).filter((b) => b.due && b.due >= today).sort((a, b) => a.due.localeCompare(b.due));

    return {
      loggedIn: banco.loggedIn(),
      syncing: !!syncing,
      lastSync: m.lastSync || null,
      error: m.error || null,
      addConnectionUrl: m.addUrl || null,
      banks: items.map((i) => ({ id: i.id, bank: i.bank, status: i.status, reconnectUrl: i.reconnectUrl })),
      accounts,
      month: {
        in: thisMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
        out: -thisMonth.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0),
        byCategory: Object.entries(spent).sort((a, b) => b[1] - a[1]).slice(0, 8),
      },
      bills,
      recent: txs.slice(0, 60),
    };
  }

  // ---------- the API ----------
  const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
  const page = (res, status, title, text) => {
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;margin:3em;max-width:36em"><h1>${title}</h1><p>${text}</p><p><a href="/">Back to Plaza</a></p>`);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  // Returns true when it answered the request.
  return async function handle(req, res, url, serverPort) {
    if (url.pathname === '/api/finance' && req.method === 'GET') return json(res, 200, summary()), true;
    if (url.pathname === '/api/finance/sync' && req.method === 'POST') {
      if (!banco.loggedIn()) return json(res, 401, { error: 'login needed' }), true;
      try { return json(res, 200, await sync()), true; } catch (e) { return json(res, 502, { error: String(e.message || e) }), true; }
    }
    // a link the page opens: off to mcp.ai to log in
    if (url.pathname === '/api/finance/login' && req.method === 'GET') {
      try {
        const to = await banco.login(serverPort);
        res.writeHead(302, { location: to || '/' }); res.end();
      } catch (e) {
        console.error('Banco login failed:', e);
        page(res, 502, 'Couldn’t reach Banco', esc(e.message || e));
      }
      return true;
    }
    if (url.pathname === '/api/finance/logout' && req.method === 'POST') {
      await banco.logout();
      db.bank.batch(() => { for (const k of ['item', 'account', 'tx', 'bill']) db.bank.clear(k); });
      db.setSecret('finance.meta', undefined);
      return json(res, 200, { ok: true }), true;
    }
    if (url.pathname === '/api/oauth/banco/callback' && req.method === 'GET') {
      const err = url.searchParams.get('error');
      if (err) return page(res, 400, 'Login cancelled', esc(url.searchParams.get('error_description') || err)), true;
      try {
        await banco.finishLogin(url.searchParams.get('code'), url.searchParams.get('state'));
        sync().catch(() => {});
        res.writeHead(302, { location: '/?district=finance' }); res.end();
      } catch (e) {
        console.error('Banco login failed:', e);
        page(res, 400, 'Login didn’t finish', esc(e.message || e));
      }
      return true;
    }
    return false;
  };
}
