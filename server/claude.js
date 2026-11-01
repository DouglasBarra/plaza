// Claude in the game: the folks you can talk to (the town hall clerk, the
// bank's teller and manager) answer through Claude, here on the server, so
// the API key never reaches the page.
//
// Claude can read your tasks and your money freely. Anything that changes
// something (adding or finishing a task) is only proposed: the turn stops,
// the page asks you, and the page itself makes the change if you say yes,
// then tells Claude what happened so the conversation carries on.
//
// Needs an Anthropic API key: ANTHROPIC_API_KEY in a .env file at the
// project's root (see the README).
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
const MAX_ROUNDS = 8;      // tool calls in one answer, at most
const KEEP = 60;           // messages kept per conversation

const PERSONAS = {
  clerk: 'You are the clerk at the town hall of Plaza, who keeps the to-do list. Warm, brisk, a little old-fashioned.',
  teller: 'You are a teller at the Bank of Plaza. Polite and precise about money.',
  manager: 'You are the manager of the Bank of Plaza. Calm, thoughtful, good at seeing the bigger picture in someone\'s spending.',
};

const SYSTEM = `You live in Plaza, a small hand-drawn town square that is also the personal life app of the one person who visits it (the user). Each building is part of their life: the town hall holds their tasks, the bank their money.

Talk the way your character would, in a few short sentences: what you say appears in a speech bubble and a small card. Answer in the language the user writes in. Use the tools to look things up instead of guessing; amounts are in Brazilian reais unless the data says otherwise. If the data isn't there (no bank connected, nothing synced), say so plainly.

Changing anything (adding or finishing a task) is only a proposal: the user is asked to confirm. Propose it with the tool when they ask for it; don't ask "shall I?" in words first. If they decline, accept it and move on.`;

const TOOLS = [
  {
    name: 'get_tasks',
    description: 'The user\'s tasks: open ones with their due dates (YYYY-MM-DD, or none for "anytime") and the most recently finished ones.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_finances',
    description: 'The user\'s money as last synced from their banks: accounts and balances, credit cards (used, limit, due date), this month\'s money in and out with spending by category, the last card bills, and month-by-month totals for the past year.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'find_transactions',
    description: 'Search the user\'s transactions. Amounts: money in is positive, money out negative. Returns the matches (newest first, at most 80) and their total.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'First day, YYYY-MM-DD. Default: 90 days ago.' },
        to: { type: 'string', description: 'Last day, YYYY-MM-DD. Default: today.' },
        text: { type: 'string', description: 'Words to look for in the description or category, e.g. "ifood" or "food". Case-insensitive.' },
        direction: { type: 'string', enum: ['in', 'out', 'any'], description: 'Only money in, only money out, or both (default).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'add_task',
    description: 'Propose adding a task. The user confirms before it is added.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short, as the user would write it.' },
        due: { type: ['string', 'null'], description: 'Due date YYYY-MM-DD, or null for "anytime".' },
      },
      required: ['title', 'due'],
      additionalProperties: false,
    },
  },
  {
    name: 'complete_task',
    description: 'Propose marking an open task done (by its id from get_tasks). The user confirms first.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' }, title: { type: 'string', description: 'The task\'s title, to show the user.' } },
      required: ['id', 'title'],
      additionalProperties: false,
    },
  },
];
const PROPOSALS = new Set(['add_task', 'complete_task']);

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export function claude(db, finance) {
  let client = null;
  const ready = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const conversations = new Map(); // persona -> { messages, pending }

  // ---------- the read tools ----------
  function run(name, input) {
    if (name === 'get_tasks') {
      const tasks = db.stores()['plaza.todos.v1']?.tasks || [];
      return {
        today: today(),
        open: tasks.filter((t) => !t.done).map(({ id, title, due }) => ({ id, title, due: due || null })),
        recentlyDone: tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 10).map(({ title, doneAt }) => ({ title, done: doneAt ? new Date(doneAt).toISOString().slice(0, 10) : null })),
      };
    }
    if (name === 'get_finances') {
      const s = finance.summary();
      if (!s.loggedIn) return { note: 'No bank connected: the user hasn\'t logged in to Banco yet.' };
      const { accounts, month, bills, months, lastSync, quota } = s;
      return { today: today(), lastSync: lastSync ? new Date(lastSync).toISOString() : null, accounts, month, lastBills: bills.slice(0, 3), months, bancoPlan: quota };
    }
    if (name === 'find_transactions') {
      const from = input.from || daysAgo(90), to = input.to || today();
      const words = (input.text || '').toLowerCase().split(/\s+/).filter(Boolean);
      const hits = finance.transactions(from).filter((t) => t.date && t.date <= to
        && (input.direction === 'in' ? t.amount > 0 : input.direction === 'out' ? t.amount < 0 : true)
        && words.every((w) => `${t.description} ${t.category || ''}`.toLowerCase().includes(w)));
      return { from, to, count: hits.length, total: Math.round(hits.reduce((s, t) => s + t.amount, 0) * 100) / 100, transactions: hits.slice(0, 80).map(({ date, description, amount, category }) => ({ date, description, amount, category })) };
    }
    throw new Error(`unknown tool ${name}`);
  }

  // ---------- one exchange ----------
  // Runs Claude until it answers, or until it proposes a change (returned
  // as `pending`, for the page to confirm).
  async function talk(conv, persona) {
    client ??= new Anthropic();
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: `${SYSTEM}\n\n${PERSONAS[persona]}`, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages: conv.messages,
      });
      conv.messages.push({ role: 'assistant', content: response.content });
      const said = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      if (response.stop_reason === 'refusal') return { reply: said || 'I\'d rather not answer that one.' };
      if (response.stop_reason === 'pause_turn') continue;
      const uses = response.content.filter((b) => b.type === 'tool_use');
      if (response.stop_reason !== 'tool_use' || !uses.length) return { reply: said };

      // read tools run now; a proposal stops the turn for the user's answer
      const results = [];
      let pending = null;
      for (const u of uses) {
        if (PROPOSALS.has(u.name) && !pending) { pending = { id: u.id, tool: u.name, input: u.input }; continue; }
        if (PROPOSALS.has(u.name)) { results.push({ type: 'tool_result', tool_use_id: u.id, content: 'Only one change at a time: propose this again after the user answers.', is_error: true }); continue; }
        try { results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(run(u.name, u.input)) }); } catch (e) { results.push({ type: 'tool_result', tool_use_id: u.id, content: String(e.message || e), is_error: true }); }
      }
      if (pending) { conv.pending = { ...pending, results }; return { reply: said, pending: { tool: pending.tool, input: pending.input } }; }
      conv.messages.push({ role: 'user', content: results });
    }
    return { reply: 'Let me think about that and get back to you.' };
  }

  function trim(conv) {
    // keep the history short, starting at a plain user message
    while (conv.messages.length > KEEP) {
      conv.messages.shift();
      while (conv.messages.length && !(conv.messages[0].role === 'user' && typeof conv.messages[0].content === 'string')) conv.messages.shift();
    }
  }

  const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
  const body = (req) => new Promise((resolve, reject) => {
    let s = '';
    req.setEncoding('utf8');
    req.on('data', (c) => { s += c; if (s.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { reject(e); } });
  });

  return async function handle(req, res, url) {
    if (url.pathname === '/api/claude' && req.method === 'GET') return json(res, 200, { ready: ready(), model: MODEL }), true;
    if (url.pathname !== '/api/claude/talk' || req.method !== 'POST') return false;
    if (!ready()) return json(res, 503, { error: 'no-key' }), true;
    let b;
    try { b = await body(req); } catch { return json(res, 400, { error: 'bad request' }), true; }
    const persona = PERSONAS[b.persona] ? b.persona : 'clerk';
    const conv = conversations.get(persona) || { messages: [], pending: null };
    conversations.set(persona, conv);
    try {
      if (b.answer) {
        // the user's answer to a proposal: what the page did, back to Claude
        const p = conv.pending;
        if (!p) return json(res, 409, { error: 'nothing pending' }), true;
        conv.pending = null;
        const outcome = b.answer.approved ? `The user confirmed. Done: ${b.answer.result || 'ok'}` : 'The user declined. Nothing was changed.';
        conv.messages.push({ role: 'user', content: [...p.results, { type: 'tool_result', tool_use_id: p.id, content: outcome }] });
      } else {
        const text = String(b.text || '').trim().slice(0, 2000);
        if (!text) return json(res, 400, { error: 'empty' }), true;
        if (conv.pending) {   // they changed the subject: the proposal lapses
          conv.messages.push({ role: 'user', content: [...conv.pending.results, { type: 'tool_result', tool_use_id: conv.pending.id, content: 'The user didn\'t answer; nothing was changed.' }] });
          conv.pending = null;
        }
        trim(conv);
        conv.messages.push({ role: 'user', content: `(Today is ${new Date().toDateString()}.)\n${text}` });
      }
      return json(res, 200, await talk(conv, persona)), true;
    } catch (e) {
      console.error('Claude:', e);
      // don't leave a half turn behind: drop back to before this message
      while (conv.messages.length && conv.messages.at(-1).role !== 'user') conv.messages.pop();
      conv.messages.pop();
      const status = e instanceof Anthropic.AuthenticationError ? 401 : e instanceof Anthropic.RateLimitError ? 429 : 502;
      return json(res, status, { error: status === 401 ? 'bad-key' : status === 429 ? 'busy' : 'failed' }), true;
    }
  };
}
