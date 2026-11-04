// A tiny persistent store per district. Data lives on Plaza's server on this
// Mac (server/, a SQLite file), read once before the app starts and saved
// back a moment after each change. Each store is also mirrored to this
// browser's localStorage, which is what's used when no server answers (a
// static build, the end-to-end tests) and where data from before the server
// came from: a store the server doesn't have yet is sent up from there.
//
// Both copies carry when they were last written, and the newer one wins. So
// work done with no server running isn't thrown away by an older copy from
// the server the next time the page loads with it up.

const SAVE_DELAY = 250; // ms: a burst of changes becomes one save

const server = await fetch('/api/stores', { cache: 'no-store' })
  .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null))
  .catch(() => null);

// When this browser last wrote each store, kept in one place beside them.
// A store with no stamp (saved before Plaza kept them) counts as the older.
const STAMPS = 'plaza.mirror.v1';
const stamps = load(STAMPS, {});

const pending = new Map(); // key → timer

function upload(key, state) {
  clearTimeout(pending.get(key));
  pending.delete(key);
  return fetch(`/api/stores/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state),
    keepalive: true, // still goes through when the page is closing
  }).catch((e) => console.warn(`Plaza: couldn't save ${key} to the server`, e));
}

const latest = new Map(); // key → state still waiting to be uploaded
function flush() {
  for (const [key, state] of latest) upload(key, state);
  latest.clear();
}
if (server) addEventListener('pagehide', flush);

export function createStore(key, initial) {
  let state;
  let when;                           // what to stamp the browser's copy with
  const saved = server?.[key];        // { value, updated } from the server
  // when this browser last wrote its own copy; -1 if it has never had one
  const mine = kept(key) ? (stamps[key] ?? 0) : -1;
  if (saved && saved.updated >= mine) {
    state = saved.value;              // the server's copy is the newer one
    when = saved.updated;
  } else if (saved) {
    state = load(key, initial);       // this browser wrote while the server was away
    upload(key, state);
  } else {
    state = load(key, initial);
    if (server && state !== initial) upload(key, state); // bring older browser data over
  }
  mirror(key, state, when);
  const listeners = new Set();

  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? next(state) : next;
      mirror(key, state);
      if (server) {
        latest.set(key, state);
        clearTimeout(pending.get(key));
        pending.set(key, setTimeout(() => { latest.delete(key); upload(key, state); }, SAVE_DELAY));
      }
      for (const fn of listeners) fn(state);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// Does this browser have a copy of its own? False if storage is blocked.
function kept(key) {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function load(key, initial) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initial;
  } catch {
    return initial;
  }
}

function mirror(key, state, when = Date.now()) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    stamps[key] = when;
    localStorage.setItem(STAMPS, JSON.stringify(stamps));
  } catch {
    // storage blocked or full: keep working in memory
  }
}

// Local calendar dates as "YYYY-MM-DD", so "today" means today where you are.
export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}
