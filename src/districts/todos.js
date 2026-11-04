// ToDos: the first real district. Tasks with optional due dates, saved locally.
import { createStore, dateKey, addDays } from '../store.js';

const store = createStore('plaza.todos.v1', { tasks: [] });

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function update(fn) {
  store.set((s) => ({ ...s, tasks: fn(s.tasks) }));
}

function groups(tasks, today = dateKey()) {
  const open = tasks.filter((t) => !t.done);
  const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.createdAt - b.createdAt;
  return {
    overdue: open.filter((t) => t.due && t.due < today).sort(byDue),
    today: open.filter((t) => t.due === today).sort(byDue),
    upcoming: open.filter((t) => t.due && t.due > today).sort(byDue),
    anytime: open.filter((t) => !t.due).sort(byDue),
    done: tasks.filter((t) => t.done).sort((a, b) => b.doneAt - a.doneAt),
  };
}

function dueLabel(due, today = dateKey()) {
  if (!due) return 'Add date';
  if (due < today) return 'Overdue';
  if (due === today) return 'Today';
  if (due === addDays(today, 1)) return 'Tomorrow';
  const [y, m, d] = due.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (due <= addDays(today, 6)) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Days in a row on which everything due was cleared (and something got done).
function streak(tasks, today = dateKey()) {
  const doneOn = new Map();
  for (const t of tasks) if (t.done && t.doneAt) {
    const d = dateKey(new Date(t.doneAt));
    doneOn.set(d, (doneOn.get(d) || 0) + 1);
  }
  const cleared = (d) => doneOn.has(d) && !tasks.some((t) => t.due === d && (!t.done || dateKey(new Date(t.doneAt)) > d));
  let day = cleared(today) ? today : addDays(today, -1);
  let n = 0;
  while (cleared(day) && n < 3650) { n++; day = addDays(day, -1); }
  return n;
}

export const todos = {
  id: 'todo',
  name: 'ToDos',
  key: '1',
  title: 'Tasks',

  subscribe: (fn) => store.subscribe(fn),

  // what the town hall building needs to read and change tasks
  api: {
    groups: () => groups(store.get().tasks),
    dueLabel,
    add(title, due = dateKey()) {
      const t = { id: uid(), title: title.trim().slice(0, 200), due, done: false, createdAt: Date.now() };
      if (t.title) update((ts) => [...ts, t]);
      return t;
    },
    complete(id) {
      update((ts) => ts.map((t) => (t.id === id ? { ...t, done: true, doneAt: Date.now() } : t)));
    },
    doneCount: () => store.get().tasks.filter((t) => t.done).length,
    doneToday: () => store.get().tasks.filter((t) => t.done && t.doneAt && dateKey(new Date(t.doneAt)) === dateKey()).length,
    streak: () => streak(store.get().tasks),
  },

  // what the plaza shows on the town hall's sign
  summary() {
    const g = groups(store.get().tasks);
    const due = g.overdue.length + g.today.length;
    const open = due + g.upcoming.length + g.anytime.length;
    let status = 'All clear';
    if (g.overdue.length) status = `${g.overdue.length} overdue`;
    else if (g.today.length) status = `${g.today.length} due today`;
    else if (open) status = `${open} open`;
    return { status, count: due, overdue: g.overdue.length, allClear: due === 0 };
  },

  mount(el, { reward, tab: startTab }) {
    let tab = startTab || 'today';
    el.innerHTML = `
      <form class="td-add" autocomplete="off">
        <label class="sr-only" for="td-new">New task</label>
        <input id="td-new" class="td-input" placeholder="Add a task…" maxlength="200">
        <label class="sr-only" for="td-due">Due date</label>
        <input id="td-due" class="td-date" type="date">
        <button class="pz-btn pz-btn-primary" type="submit">Add</button>
      </form>
      <div class="td-tabs" role="tablist"></div>
      <div class="td-list" role="tabpanel" id="td-panel"></div>`;
    const form = el.querySelector('.td-add');
    const input = el.querySelector('#td-new');
    const dueInput = el.querySelector('#td-due');
    const tabsEl = el.querySelector('.td-tabs');
    const list = el.querySelector('.td-list');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = input.value.trim();
      if (!title) return input.focus();
      // in the Today tab a task without a date is for today
      const due = dueInput.value || (tab === 'today' ? dateKey() : null);
      update((ts) => [...ts, { id: uid(), title, due, done: false, createdAt: Date.now() }]);
      input.value = '';
      dueInput.value = '';
      input.focus();
    });

    function row(t, today) {
      const late = t.due && t.due < today && !t.done;
      return `
        <div class="row td-row${t.done ? ' is-done' : ''}" data-id="${t.id}">
          <button class="box${t.done ? ' done' : ''}" data-act="toggle" aria-label="${t.done ? 'Mark not done' : 'Mark done'}: ${esc(t.title)}"></button>
          <span class="t" data-act="edit" title="Click to edit">${esc(t.title)}</span>
          <span class="td-due-wrap">
            <button class="td-chip${late ? ' late' : ''}${t.due ? '' : ' empty'}" data-act="date">${dueLabel(t.due, today)}</button>
            <input class="td-date-hidden" type="date" value="${t.due || ''}" tabindex="-1" aria-label="Change due date">
          </span>
          <button class="td-del" data-act="delete" aria-label="Delete: ${esc(t.title)}">×</button>
        </div>`;
    }

    function section(title, items, today, cls = '') {
      if (!items.length) return '';
      return `<h3 class="td-section ${cls}">${title}</h3>${items.map((t) => row(t, today)).join('')}`;
    }

    function render() {
      const today = dateKey();
      const g = groups(store.get().tasks, today);
      const counts = { today: g.overdue.length + g.today.length, upcoming: g.upcoming.length + g.anytime.length, done: g.done.length };
      // the tabs are rebuilt on every change, so remember if they had the focus
      const hadFocus = tabsEl.contains(document.activeElement);
      // only the selected tab is in the Tab order, and it names the list below
      tabsEl.innerHTML = [['today', 'Today'], ['upcoming', 'Upcoming'], ['done', 'Done']]
        .map(([id, label]) => `<button role="tab" id="td-tab-${id}" aria-controls="td-panel" aria-selected="${tab === id}" tabindex="${tab === id ? 0 : -1}" data-tab="${id}">${label}<span>${counts[id]}</span></button>`).join('');
      list.setAttribute('aria-labelledby', `td-tab-${tab}`);
      if (hadFocus) tabsEl.querySelector('[aria-selected="true"]')?.focus();

      let html = '';
      if (tab === 'today') {
        html = section('Overdue', g.overdue, today, 'late') + section('Today', g.today, today);
        if (!html) html = `<p class="td-empty">Nothing due today. Enjoy the plaza.</p>`;
      } else if (tab === 'upcoming') {
        html = section('Coming up', g.upcoming, today) + section('Anytime', g.anytime, today);
        if (!html) html = `<p class="td-empty">Nothing planned yet. Add a task with a date, or without one for "anytime".</p>`;
      } else {
        html = g.done.length
          ? section('Done', g.done.slice(0, 50), today) + `<button class="pz-btn td-clear" data-act="clear">Clear done tasks</button>`
          : `<p class="td-empty">Finished tasks land here.</p>`;
      }
      list.innerHTML = html;
      dueInput.placeholder = tab === 'today' ? 'Today' : '';
    }

    tabsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (b) { tab = b.dataset.tab; render(); }
    });

    // Left and Right move between the tabs and select the one you land on;
    // render() puts the focus back, since it builds the buttons again.
    tabsEl.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      const from = e.target.closest('[data-tab]');
      if (!step || !from) return;
      e.preventDefault();
      const buttons = [...tabsEl.querySelectorAll('[data-tab]')];
      const i = buttons.indexOf(from) + step;
      tab = buttons[(i + buttons.length) % buttons.length].dataset.tab;
      render();
    });

    list.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      const id = e.target.closest('.td-row')?.dataset.id;
      if (act === 'clear') return update((ts) => ts.filter((t) => !t.done));
      if (!id) return;
      if (act === 'toggle') {
        let finished = false;
        update((ts) => ts.map((t) => {
          if (t.id !== id) return t;
          finished = !t.done;
          return { ...t, done: !t.done, doneAt: !t.done ? Date.now() : null };
        }));
        if (finished) reward('Task done!');
      } else if (act === 'delete') {
        update((ts) => ts.filter((t) => t.id !== id));
      } else if (act === 'date') {
        const picker = e.target.closest('.td-row').querySelector('.td-date-hidden');
        try { picker.showPicker(); } catch { picker.focus(); }
      } else if (act === 'edit') {
        startEdit(e.target.closest('.td-row'), id);
      }
    });

    list.addEventListener('change', (e) => {
      if (!e.target.classList.contains('td-date-hidden')) return;
      const id = e.target.closest('.td-row').dataset.id;
      const due = e.target.value || null;
      update((ts) => ts.map((t) => (t.id === id ? { ...t, due } : t)));
    });

    function startEdit(rowEl, id) {
      const span = rowEl.querySelector('.t');
      const task = store.get().tasks.find((t) => t.id === id);
      if (!task) return; // the row is no longer in the store: nothing to edit
      const field = document.createElement('input');
      field.className = 'td-input td-edit';
      field.value = task.title;
      field.maxLength = 200;
      field.setAttribute('aria-label', 'Edit task');
      span.replaceWith(field);
      field.focus();
      field.select();
      let done = false;
      const finish = (save) => {
        if (done) return;
        done = true;
        const title = field.value.trim();
        if (save && title && title !== task.title) update((ts) => ts.map((t) => (t.id === id ? { ...t, title } : t)));
        else render();
      };
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
      });
      field.addEventListener('blur', () => finish(true));
    }

    const unsubscribe = store.subscribe(render);
    render();
    setTimeout(() => input.focus(), 50);
    return unsubscribe;
  },
};
