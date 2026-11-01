// Finance: your banks, read through Plaza's server (server/finance.js), which
// syncs them from Banco MCP (Brazilian Open Finance). The page never talks
// to Banco itself: logging in, the bank consents and the syncing all happen
// on the server, and this only reads /api/finance.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n, currency = 'BRL') => (n == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(n));
const shortDate = (d) => (d ? new Date(`${d}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60e3);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : shortDate(new Date(t).toISOString().slice(0, 10));
};
const daysUntil = (d) => Math.round((new Date(`${d}T12:00`) - new Date(new Date().toDateString() + ' 12:00')) / 864e5);

// ---------- the data, shared by the sign and the card ----------
let data = null;        // the server's /api/finance, or { offline: true }
const listeners = new Set();
const changed = () => { for (const fn of listeners) fn(data); };

async function refresh() {
  try {
    const r = await fetch('/api/finance', { cache: 'no-store' });
    data = r.ok && r.headers.get('content-type')?.includes('json') ? await r.json() : { offline: true };
  } catch {
    data = { offline: true };
  }
  changed();
  return data;
}

async function syncNow() {
  data = { ...data, syncing: true };
  changed();
  const r = await fetch('/api/finance/sync', { method: 'POST' }).catch(() => null);
  if (r && !r.ok) data = { ...data, error: (await r.json().catch(() => ({}))).error || 'Sync failed' };
  return refresh();
}

refresh();
setInterval(refresh, 10 * 60e3);

export const finance = {
  id: 'finance',
  name: 'Finance',
  key: '2',
  title: 'This month',

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  // what the bank's interior needs: the data, and the courier's Sync
  api: { data: () => data, sync: syncNow },

  // what the plaza shows on the bank's sign
  summary() {
    if (!data || data.offline) return { status: 'Finance', count: 0 };
    if (!data.loggedIn) return { status: 'Connect your bank', count: 0 };
    if (!data.accounts?.length) return { status: data.syncing ? 'Syncing…' : 'Add a bank', count: 0 };
    const soon = data.accounts.filter((a) => a.type === 'CREDIT' && a.due && daysUntil(a.due) >= 0 && daysUntil(a.due) <= 7)
      .sort((a, b) => a.due.localeCompare(b.due));
    if (soon.length) {
      const d = daysUntil(soon[0].due);
      return { status: `Card ${d === 0 ? 'due today' : d === 1 ? 'due tomorrow' : `due ${shortDate(soon[0].due)}`}`, count: soon.length };
    }
    const cash = data.accounts.filter((a) => a.type === 'BANK').reduce((s, a) => s + (a.balance || 0), 0);
    return { status: money(cash), count: 0 };
  },

  mount(el, { tab } = {}) {
    let shown = tab || 'overview';
    let poll = null;

    const render = () => {
      clearTimeout(poll);
      if (data?.syncing) poll = setTimeout(refresh, 2500);
      el.innerHTML = body();
    };
    listeners.add(render);
    render();
    refresh();

    function body() {
      if (!data) return `<p class="td-empty">Opening the ledger…</p>`;
      if (data.offline) {
        return `<p class="fi-lead">Plaza's server isn't running, so your banks can't be read.</p>
          <p class="pz-panel-note">Start Plaza with <code>npm run dev</code> (or <code>npm start</code>) and open Finance again.</p>`;
      }
      if (!data.loggedIn) {
        return `<p class="fi-lead">See your accounts, card bills and spending here, read from your banks through Brazilian Open Finance.</p>
          <ol class="fi-steps">
            <li>Log in to <b>Banco</b> (mcp.ai), which reads your banks for Plaza. Only reading: nothing here can move money.</li>
            <li>Then connect each bank, giving its Open Finance consent at the bank.</li>
          </ol>
          <a class="pz-btn pz-btn-primary" href="/api/finance/login">Log in to Banco</a>
          <p class="pz-panel-note">Your login stays on this Mac, with Plaza's server.</p>`;
      }
      const foot = footer();
      if (!data.accounts?.length) {
        return `${data.error ? `<p class="fi-error">${esc(data.error)}</p>` : ''}
          <p class="fi-lead">${data.syncing ? 'Reading your banks…' : 'Logged in to Banco. Now connect a bank.'}</p>
          ${data.addConnectionUrl ? `<a class="pz-btn pz-btn-primary" href="${esc(data.addConnectionUrl)}" target="_blank" rel="noopener">Connect a bank</a>` : ''}
          <p class="pz-panel-note">Once you've given the consent at your bank, come back and press Sync.</p>${foot}`;
      }
      const tabs = [['overview', 'Overview'], ['activity', 'Activity'], ['accounts', 'Accounts']]
        .map(([id, label]) => `<button role="tab" aria-selected="${shown === id}" data-tab="${id}">${label}</button>`).join('');
      return `${data.error ? `<p class="fi-error">${esc(data.error)}</p>` : ''}
        <div class="td-tabs" role="tablist">${tabs}</div>
        ${shown === 'overview' ? overview() : shown === 'activity' ? activity() : accounts()}
        ${foot}`;
    }

    function overview() {
      const { month, bills } = data;
      const cash = data.accounts.filter((a) => a.type === 'BANK').reduce((s, a) => s + (a.balance || 0), 0);
      const top = month.byCategory[0]?.[1] || 1;
      // each card: what's used of its limit, and when it's due
      const cardRows = data.accounts.filter((a) => a.type === 'CREDIT').map((a) => {
        const d = a.due ? daysUntil(a.due) : null;
        return `<div class="row"><span class="t">${esc(a.name)}<small>${a.limit != null ? `of ${money(a.limit, a.currency)}` : ''}</small></span>
          ${d != null && d >= 0 ? `<span class="when${d <= 3 ? ' late' : ''}">due ${d === 0 ? 'today' : shortDate(a.due)}</span>` : ''}
          <span class="fi-amt">${money(a.used ?? a.balance, a.currency)}</span></div>`;
      }).join('');
      const STATUS = { PAID: 'paid', OPEN: 'open', PAST_DUE_UNCONFIRMED: 'not confirmed', PAST_DUE_UNPAID: 'unpaid' };
      const billRows = bills.slice(0, 3).map((b) => {
        const late = b.status === 'PAST_DUE_UNPAID' && b.total > 0;
        return `<div class="row"><span class="t">Bill due ${shortDate(b.due)}<small>${b.total ? esc(STATUS[b.status] || '') : 'nothing due'}</small></span>
          <span class="fi-amt${late ? ' fi-late' : ''}">${money(b.total, b.currency)}</span></div>`;
      }).join('');
      return `
        <div class="fi-cards">
          <div class="fi-card"><span>In the bank</span><b>${money(cash)}</b></div>
          <div class="fi-card"><span>In this month</span><b class="fi-in">${money(month.in)}</b></div>
          <div class="fi-card"><span>Out this month</span><b>${money(month.out)}</b></div>
        </div>
        ${cardRows ? `<h3 class="td-section">Cards</h3>${cardRows}` : ''}
        ${billRows ? `<h3 class="td-section">Last bills</h3>${billRows}` : ''}
        ${month.byCategory.length ? `<h3 class="td-section">Where it went this month</h3>
          <div class="fi-bars">${month.byCategory.map(([c, v]) => `
            <div class="fi-bar"><span class="fi-bar-name">${esc(c)}</span>
              <span class="fi-bar-track"><span style="width:${Math.max(3, (v / top) * 100).toFixed(1)}%"></span></span>
              <span class="fi-amt">${money(v)}</span></div>`).join('')}
          </div>` : ''}`;
    }

    function activity() {
      if (!data.recent.length) return `<p class="td-empty">No transactions yet.</p>`;
      const names = Object.fromEntries(data.accounts.map((a) => [a.id, a.name]));
      return data.recent.map((t) => `
        <div class="row fi-tx">
          <span class="when">${shortDate(t.date)}</span>
          <span class="t">${esc(t.description)}<small>${esc([t.category, names[t.accountId]].filter(Boolean).join(' · '))}${t.pending ? ' · pending' : ''}</small></span>
          <span class="fi-amt${t.amount > 0 ? ' fi-in' : ''}">${money(t.amount)}</span>
        </div>`).join('');
    }

    function accounts() {
      return data.accounts.map((a) => `
        <div class="row">
          <span class="t">${esc(a.name)}<small>${esc([a.bank, a.type === 'CREDIT' ? 'Credit card' : a.subtype?.replace(/_/g, ' ').toLowerCase(), a.number].filter(Boolean).join(' · '))}</small></span>
          <span class="fi-amt">${a.type === 'CREDIT'
            ? `${money(a.balance, a.currency)}${a.available != null ? `<small>${money(a.available, a.currency)} free</small>` : ''}`
            : money(a.balance, a.currency)}</span>
        </div>`).join('') +
        (data.banks.some((b) => b.reconnectUrl && /ERROR|OUTDATED|WAITING/i.test(b.status || ''))
          ? `<h3 class="td-section late">Needs you</h3>${data.banks.filter((b) => /ERROR|OUTDATED|WAITING/i.test(b.status || '')).map((b) => `
            <div class="row"><span class="t">${esc(b.bank)}<small>${esc(b.status)}</small></span>
              <a class="pz-btn" href="${esc(b.reconnectUrl)}" target="_blank" rel="noopener">Reconnect</a></div>`).join('')}`
          : '');
    }

    function footer() {
      return `<div class="fi-foot">
        <span>${data.syncing ? 'Syncing…' : data.lastSync ? `Synced ${ago(data.lastSync)}` : 'Not synced yet'}${data.quota ? `<small>Banco plan: ${esc(data.quota)}</small>` : ''}</span>
        <button class="pz-btn" data-act="sync"${data.syncing ? ' disabled' : ''}>Sync</button>
        ${data.addConnectionUrl && data.accounts?.length ? `<a class="pz-btn" href="${esc(data.addConnectionUrl)}" target="_blank" rel="noopener">Add a bank</a>` : ''}
        <button class="fi-link" data-act="logout">Log out of Banco</button>
      </div>`;
    }

    const onClick = async (e) => {
      const tab = e.target.closest('[data-tab]')?.dataset.tab;
      if (tab) { shown = tab; return render(); }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'sync') syncNow();
      if (act === 'logout' && confirm('Log Plaza out of Banco? Your synced data on this Mac is removed too. Your bank consents stay as they are.')) {
        await fetch('/api/finance/logout', { method: 'POST' });
        refresh();
      }
    };
    el.addEventListener('click', onClick);

    return () => {
      clearTimeout(poll);
      listeners.delete(render);
      el.removeEventListener('click', onClick);
    };
  },
};
