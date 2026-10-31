// A tiny persistent store per district. Data lives in this browser's
// localStorage for now; the desktop app will swap this for files on disk
// without the districts noticing.

export function createStore(key, initial) {
  let state = load(key, initial);
  const listeners = new Set();

  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? next(state) : next;
      save(key, state);
      for (const fn of listeners) fn(state);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

function load(key, initial) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initial;
  } catch {
    return initial;
  }
}

function save(key, state) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
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
