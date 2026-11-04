// Talking with folks: walk up to the clerk, the teller or the manager and
// press T. What you say goes to Claude on Plaza's server (server/claude.js),
// which answers in their voice and can read your tasks and your money.
//
// When they offer to change something (add a task, tick one off), you're
// asked here first. On a yes, this page makes the change through the
// district itself, so everything on screen stays in step, and tells Claude.
import { DISTRICTS } from '../districts/index.js';
import { showCard } from './card.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const logs = new Map();   // persona -> [{ who, text }] for this visit to the page

// What a proposal says, and how to carry it out.
const ACTIONS = {
  add_task: {
    ask: ({ title, due }) => `Add “${title}”${due ? ` for ${DISTRICTS.todo.api.dueLabel(due).toLowerCase()} (${due})` : ' for anytime'}?`,
    yes: 'Add it',
    run({ title, due }) { const t = DISTRICTS.todo.api.add(title, due || null); return `added “${t.title}”${due ? ` due ${due}` : ''}`; },
  },
  complete_task: {
    ask: ({ title }) => `Tick off “${title}”?`,
    yes: 'Tick it off',
    run({ id, title }) { DISTRICTS.todo.api.complete(id); return `marked “${title}” done`; },
  },
};

export function openChat(speaker) {
  const { persona, name } = speaker;
  const log = logs.get(persona) || [];
  logs.set(persona, log);
  const title = name.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase());
  const body = showCard('chat', { tag: 'Talk', title, cls: 'chat-panel', body: `
    <div class="chat-log" aria-live="polite"></div>
    <div class="chat-ask" hidden></div>
    <form class="chat-form" autocomplete="off">
      <label class="sr-only" for="chat-input">Say something to ${esc(name)}</label>
      <input id="chat-input" class="td-input" placeholder="Ask ${esc(name)}…" maxlength="2000">
      <button class="pz-btn pz-btn-primary" type="submit">Say</button>
    </form>` });
  const logEl = body.querySelector('.chat-log');
  const askEl = body.querySelector('.chat-ask');
  const form = body.querySelector('.chat-form');
  const input = body.querySelector('#chat-input');
  let busy = false;

  const draw = (thinking = false) => {
    logEl.innerHTML = log.map((l) => `<div class="chat-line ${l.who}">${esc(l.text)}</div>`).join('')
      + (thinking ? `<div class="chat-line them thinking">…</div>` : '');
    logEl.scrollTop = logEl.scrollHeight;
  };
  draw();
  input.focus();

  async function send(payload) {
    busy = true;
    draw(true);
    try {
      const r = await fetch('/api/claude/talk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ persona, ...payload }) });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        log.push({ who: 'note', text: {
          'no-key': 'They can’t talk yet: add your Anthropic API key to a .env file (see the README), then restart Plaza.',
          'bad-key': 'The Anthropic API key in .env was turned down. Check it and restart Plaza.',
          busy: 'Too many questions at once. Try again in a moment.',
        }[out.error] || 'They didn’t catch that. Try again?' });
      } else {
        if (out.reply) log.push({ who: 'them', text: out.reply });
        if (out.pending) return propose(out.pending);
      }
    } catch {
      log.push({ who: 'note', text: 'Plaza’s server isn’t running, so nobody can answer.' });
    } finally {
      busy = false;
      draw();
    }
  }

  function propose({ tool, input: args }) {
    const a = ACTIONS[tool];
    // A change this page doesn't know how to make: say so, change nothing,
    // and let the talking carry on.
    if (!a) {
      log.push({ who: 'note', text: 'This version of Plaza can’t make that change yet, so nothing was changed.' });
      return;
    }
    askEl.hidden = false;
    askEl.innerHTML = `<p>${esc(a.ask(args))}</p>
      <button class="pz-btn pz-btn-primary" data-yes>${a.yes}</button>
      <button class="pz-btn" data-no>Not now</button>`;
    form.hidden = true;
    askEl.querySelector('[data-yes]').focus();
    askEl.onclick = (e) => {
      const yes = e.target.closest('[data-yes]'), no = e.target.closest('[data-no]');
      if (!yes && !no) return;
      askEl.hidden = true;
      form.hidden = false;
      let result = '';
      if (yes) {
        // either way the user sees what came of it, not only Claude
        try { result = a.run(args); log.push({ who: 'note', text: result.replace(/^./, (c) => c.toUpperCase()) }); }
        catch (err) { result = `it failed: ${err.message}`; log.push({ who: 'note', text: `That didn’t work: ${err.message}` }); }
      }
      send({ answer: { approved: !!yes, result } }).then(() => input.focus());
    };
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    log.push({ who: 'me', text });
    send({ text }).then(() => input.focus());
  });
}
