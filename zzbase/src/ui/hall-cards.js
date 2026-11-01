// The town hall's own cards: the tooltip over a note on a board, the note
// itself (tear it off to finish the task), and the clerk's typewriter.
import { DISTRICTS } from '../districts/index.js';
import { game } from '../app/state.js';
import { showCard, openApp, closeApp, reward } from './card.js';

// ---------- the tooltip over a note ----------
const tip = document.createElement('div');
tip.className = 'note-tip is-hidden';
document.body.appendChild(tip);
export function hideTip() { tip.classList.add('is-hidden'); }

export function showTip(note, x, y) {
  if (!note) return hideTip();
  if (note.userData.more) {
    tip.innerHTML = '<b>More tasks</b><small>Click to see them all</small>';
  } else {
    const t = note.userData.task;
    const when = DISTRICTS.todo.api.dueLabel(t.due);
    tip.innerHTML = `<b>${t.title.replace(/[<>&]/g, '')}</b><small>${t.late ? 'Overdue' : when} · click to open</small>`;
  }
  tip.style.transform = `translate(${x}px, ${y}px)`;
  tip.classList.remove('is-hidden');
}

// ---------- a note from the board ----------
export function openNoteCard(note) {
  if (note.userData.more) return openApp('todo', { tab: note.position.y > 4 ? 'upcoming' : 'today' });
  const t = note.userData.task;
  hideTip();
  const when = t.late ? 'Overdue' : DISTRICTS.todo.api.dueLabel(t.due);
  const body = showCard('note', {
    tag: 'ToDos', title: 'A note on the board', cls: 'pz-d-todo note-card',
    body: `
      <div class="paper-note${t.late ? ' is-late' : ''}"><p class="nt"></p><p class="nd">${when}</p></div>
      <div class="note-actions">
        <button class="pz-btn pz-btn-primary" data-act="tear">Tear it off: done!</button>
        <button class="pz-btn" data-act="open">Open in ToDos</button>
      </div>`,
  });
  body.querySelector('.nt').textContent = t.title;
  body.querySelector('[data-act="open"]').addEventListener('click', () => openApp('todo', { tab: note.position.y > 4 || t.due > new Date().toISOString().slice(0, 10) ? 'upcoming' : 'today' }));
  body.querySelector('[data-act="tear"]').addEventListener('click', () => {
    closeApp();
    reward('Task done!');
    game.room.tearOff(note, () => DISTRICTS.todo.api.complete(t.id));
  });
}

// ---------- the clerk's typewriter ----------
export function openTypewriter() {
  hideTip();
  const form = showCard('typewriter', {
    tag: 'ToDos', title: "The clerk's typewriter", cls: 'pz-d-todo typewriter-card', form: true,
    body: `
      <p class="tw-intro">"What shall I type up for you?"</p>
      <label class="sr-only" for="tw-text">Task</label>
      <input id="tw-text" class="td-input tw-input" maxlength="200" placeholder="Water the plants…">
      <div class="tw-row">
        <label class="sr-only" for="tw-due">Due date</label>
        <input id="tw-due" class="td-date" type="date">
        <button class="pz-btn pz-btn-primary" type="submit">Type it and pin it</button>
      </div>`,
  });
  const input = form.querySelector('#tw-text');
  setTimeout(() => input.focus(), 50);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!input.value.trim()) return input.focus();
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    DISTRICTS.todo.api.add(input.value, form.querySelector('#tw-due').value || key);
    closeApp();
    reward('Pinned!');
  });
}
