// People: your WhatsApp and LinkedIn chats, read through Plaza's server
// (server/people.js), which reads them from Beeper Desktop on this Mac. The
// page never talks to Beeper itself. It shows who's waiting on you, who you
// talked to lately, and who's gone quiet, and lets you answer from here.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = (iso) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - Date.parse(iso)) / 60e3);
  if (m < 1) return 'now';
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.round(m / 60)} h`;
  const d = Math.round(m / 1440);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const clock = (iso) => new Date(iso).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', ...(Date.now() - Date.parse(iso) > 864e5 ? { month: 'short', day: 'numeric' } : {}) });
// a number nobody saved gets # instead of "+5"
const initials = (t) => t.split(/\s+/).filter((w) => /\p{L}/u.test(w[0] || '')).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '#';
const NET = { whatsapp: ['WA', 'WhatsApp'], linkedin: ['in', 'LinkedIn'] };
const net = (n) => NET[String(n).toLowerCase().replace(/[^a-z]/g, '')] || [String(n).slice(0, 2), n];

// ---------- the data, shared by the sign and the card ----------
let data = null;        // the server's /api/people, or { offline: true }
const listeners = new Set();
const changed = () => { for (const fn of listeners) fn(data); };

async function refresh() {
  try {
    const r = await fetch('/api/people', { cache: 'no-store' });
    data = r.ok && r.headers.get('content-type')?.includes('json') ? await r.json()
      : r.status === 502 ? { loggedIn: true, running: true, accounts: [], chats: [], quiet: [], ...data, error: (await r.json().catch(() => ({}))).error }
      : { offline: true };
  } catch {
    data = { offline: true };
  }
  changed();
  return data;
}

refresh();
setInterval(refresh, 5 * 60e3);

export const people = {
  id: 'people',
  name: 'People',
  key: '6',
  title: 'Keeping in touch',

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  // what the post office's inside needs: the data, and the counter bell
  api: { data: () => data, refresh },

  // what the plaza shows on the post office's sign
  summary() {
    if (!data || data.offline) return { status: 'People', count: 0 };
    if (!data.running && !data.chats) return { status: 'Open Beeper', count: 0 };
    if (!data.loggedIn) return { status: 'Connect your chats', count: 0 };
    const waiting = (data.chats || []).filter((c) => c.unread && !c.muted);
    if (waiting.length) return { status: waiting.length === 1 ? `${waiting[0].title} wrote` : `${waiting.length} chats waiting`, count: waiting.length };
    if (data.quiet?.length) return { status: `Say hi to ${data.quiet[0].title}`, count: 0 };
    return { status: 'All caught up', count: 0 };
  },

  mount(el, { tab: startTab } = {}) {
    // 'waiting' | 'recent' | 'quiet': the station you came in by can choose
    // one (the post office's pigeonholes, its unclaimed shelf), otherwise
    // it's picked on the first render
    let tab = ['waiting', 'recent', 'quiet'].includes(startTab) ? startTab : null;
    let only = 'all';     // a network, or 'all'
    let open = null;      // the chat being read
    let thread = null;    // its messages, or null while loading
    let poll = null;

    const render = () => {
      if (open) return drawThread();
      el.innerHTML = body();
    };
    listeners.add(render);
    render();
    refresh();
    // fresher while the card is open
    const every = setInterval(() => { refresh(); if (open) load(); }, 45e3);

    function body() {
      if (!data) return `<p class="td-empty">Sorting the post…</p>`;
      if (data.offline) {
        return `<p class="fi-lead">Plaza's server isn't running, so your chats can't be read.</p>
          <p class="pz-panel-note">Start Plaza with <code>npm run dev</code> (or <code>npm start</code>) and open People again.</p>`;
      }
      if (!data.running) {
        return `<p class="fi-lead">Your WhatsApp and LinkedIn chats come in through <b>Beeper Desktop</b>, and it isn't open.</p>
          <ol class="fi-steps">
            <li>Install <a href="https://www.beeper.com/download" target="_blank" rel="noopener">Beeper Desktop</a> and add WhatsApp and LinkedIn to it.</li>
            <li>In Beeper, turn on <b>Settings → Developers → Beeper Desktop API</b>.</li>
            <li>Keep Beeper open, then come back here.</li>
          </ol>
          <button class="pz-btn pz-btn-primary" data-act="retry">Check again</button>`;
      }
      if (!data.loggedIn) {
        return `<p class="fi-lead">Beeper is open. Let Plaza read your chats through it.</p>
          <a class="pz-btn pz-btn-primary" href="/api/people/login">Connect Beeper</a>
          <p class="pz-panel-note">Beeper asks you to approve Plaza. The login stays on this Mac, with Plaza's server, and Plaza never marks your chats read.</p>`;
      }
      const err = data.error ? `<p class="fi-error">${esc(data.error)}</p>` : '';
      if (!data.accounts?.length) {
        return `${err}<p class="fi-lead">Connected to Beeper, but it has no WhatsApp or LinkedIn yet.</p>
          <p class="pz-panel-note">In Beeper, go to Settings → Accounts and add them. They show up here on their own.</p>${footer()}`;
      }

      const chats = data.chats.filter((c) => only === 'all' || net(c.network)[1] === only);
      const quiet = data.quiet.filter((c) => only === 'all' || net(c.network)[1] === only);
      const waiting = chats.filter((c) => c.unread && !c.muted);
      tab ??= waiting.length ? 'waiting' : 'recent';
      const lists = { waiting, recent: chats.slice(0, 40), quiet };
      const tabs = [['waiting', 'Waiting', waiting.length], ['recent', 'Recent'], ['quiet', 'Quiet lately', quiet.length]]
        .map(([id, label, n]) => `<button role="tab" aria-selected="${tab === id}" data-tab="${id}">${label}${n ? ` <span>${n}</span>` : ''}</button>`).join('');
      const nets = [...new Set(data.accounts.map((a) => net(a.network)[1]))];
      const chips = nets.length > 1 ? `<div class="pe-nets">${['all', ...nets].map((n) =>
        `<button class="td-chip${only === n ? ' on' : ''}" data-only="${esc(n)}">${n === 'all' ? 'All' : esc(n)}</button>`).join('')}</div>` : '';
      const trouble = data.accounts.filter((a) => !/connected|backfilling/.test(a.status));
      const shown = lists[tab];
      return `${err}
        ${trouble.map((a) => `<p class="fi-error">${esc(net(a.network)[1])}: ${esc(a.statusText || a.status.replace(/_/g, ' '))}. Fix it in Beeper.</p>`).join('')}
        <div class="td-tabs" role="tablist">${tabs}</div>${chips}
        ${tab === 'quiet' && shown.length ? `<p class="pz-panel-note pe-hint">One-on-one chats with nothing for three weeks or more.</p>` : ''}
        ${shown.length ? shown.map(row).join('') : `<p class="td-empty">${tab === 'waiting' ? 'Nobody waiting on you.' : tab === 'quiet' ? 'No one has gone quiet.' : 'No chats yet.'}</p>`}
        ${footer()}`;
    }

    function row(c) {
      const [badge, name] = net(c.network);
      const p = c.preview;
      const line = p ? `${p.mine ? 'You: ' : c.group && p.sender ? `${p.sender}: ` : ''}${p.text}` : '';
      return `<button class="row pe-chat${c.unread && !c.muted ? ' unread' : ''}" data-chat="${esc(c.id)}">
        <span class="pe-face" aria-hidden="true">${esc(initials(c.title))}<i class="pe-net pe-${esc(name.toLowerCase())}">${esc(badge)}</i></span>
        <span class="t">${esc(c.title)}<small>${esc(line) || '&nbsp;'}</small></span>
        <span class="when">${ago(c.last)}${c.unread && !c.muted ? `<b class="pe-count">${c.unread}</b>` : ''}</span>
      </button>`;
    }

    function footer() {
      const who = data.accounts.map((a) => `${net(a.network)[1]}${a.me ? ` (${a.me})` : ''}`).join(' · ');
      return `<div class="fi-foot"><span>${esc(who)}</span>
        <button class="pz-btn" data-act="retry">Refresh</button>
        <button class="fi-link" data-act="logout">Disconnect Beeper</button></div>`;
    }

    // ---------- one chat ----------
    function drawThread() {
      const c = data?.chats?.find((x) => x.id === open.id) || open;
      if (!el.querySelector('.pe-thread')) {
        const [, name] = net(c.network);
        el.innerHTML = `<div class="pe-top"><button class="pz-btn" data-act="back">← Back</button>
            <b>${esc(c.title)}</b><span class="when">${esc(name)}</span></div>
          <div class="pe-thread" aria-live="polite"></div>
          <form class="td-add pe-reply"><textarea class="td-input" rows="1" placeholder="Write to ${esc(c.title.split(' ')[0])}…" aria-label="Message"></textarea>
            <button class="pz-btn pz-btn-primary" type="submit">Send</button></form>
          <p class="pz-panel-note pe-hint">Sends from your ${esc(name)} through Beeper.</p>`;
      }
      const box = el.querySelector('.pe-thread');
      const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
      box.innerHTML = !thread ? `<p class="td-empty">Opening the letters…</p>`
        : !thread.length ? `<p class="td-empty">No messages here yet.</p>`
        : thread.map((m) => `<div class="pe-msg${m.mine ? ' mine' : ''}">
            ${!m.mine && c.group && m.sender ? `<small>${esc(m.sender)}</small>` : ''}
            ${m.text ? `<p>${esc(m.text)}</p>` : ''}
            ${m.files.length ? `<p class="pe-file">${m.files.map((f) => `📎 ${esc(f)}`).join('<br>')}</p>` : ''}
            ${!m.text && !m.files.length ? `<p class="pe-file">[${esc(m.kind.toLowerCase())}]</p>` : ''}
            <time>${m.sending ? esc(m.sending.toLowerCase()) : clock(m.at)}</time></div>`).join('');
      if (atEnd || !box.dataset.seen) { box.scrollTop = box.scrollHeight; box.dataset.seen = '1'; }
    }

    async function load() {
      const id = open.id;
      const r = await fetch(`/api/people/chats/${encodeURIComponent(id)}/messages`, { cache: 'no-store' }).catch(() => null);
      const got = r?.ok ? await r.json() : null;
      if (open?.id !== id) return;
      thread = Array.isArray(got) ? got : thread || [];
      drawThread();
    }

    async function send(form) {
      const input = form.querySelector('textarea');
      const text = input.value.trim();
      if (!text) return;
      const btn = form.querySelector('button');
      btn.disabled = true;
      const r = await fetch(`/api/people/chats/${encodeURIComponent(open.id)}/messages`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }),
      }).catch(() => null);
      btn.disabled = false;
      if (!r?.ok) {
        const e = r ? (await r.json().catch(() => ({}))).error : null;
        return alert(`Couldn't send: ${e || 'Plaza\'s server or Beeper isn\'t answering.'}`);
      }
      input.value = '';
      input.style.height = '';
      thread = [...(thread || []), { id: 'pending', at: new Date().toISOString(), mine: true, text, files: [], kind: 'TEXT', sending: 'Sending' }];
      drawThread();
      clearTimeout(poll);
      poll = setTimeout(() => { load(); refresh(); }, 1500);
    }

    const onClick = async (e) => {
      const t = e.target.closest('[data-tab]')?.dataset.tab;
      if (t) { tab = t; return render(); }
      const n = e.target.closest('[data-only]')?.dataset.only;
      if (n) { only = n; return render(); }
      const id = e.target.closest('[data-chat]')?.dataset.chat;
      if (id) {
        open = data.chats.find((c) => c.id === id) || data.quiet.find((c) => c.id === id);
        thread = null;
        el.innerHTML = '';
        drawThread();
        el.querySelector('textarea')?.focus();
        return load();
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'back') { open = null; thread = null; return render(); }
      if (act === 'retry') refresh();
      if (act === 'logout' && confirm('Disconnect Plaza from Beeper? Your chats stay in Beeper as they are.')) {
        await fetch('/api/people/logout', { method: 'POST' });
        refresh();
      }
    };
    const onSubmit = (e) => { if (e.target.matches('.pe-reply')) { e.preventDefault(); send(e.target); } };
    const onKey = (e) => {
      if (!e.target.matches('.pe-reply textarea')) return;
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(e.target.form); }
    };
    const onInput = (e) => {
      if (!e.target.matches('.pe-reply textarea')) return;
      e.target.style.height = '';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
    };
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);
    el.addEventListener('keydown', onKey);
    el.addEventListener('input', onInput);

    return () => {
      clearInterval(every);
      clearTimeout(poll);
      listeners.delete(render);
      el.removeEventListener('click', onClick);
      el.removeEventListener('submit', onSubmit);
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('input', onInput);
    };
  },
};
