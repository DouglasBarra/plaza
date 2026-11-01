// The card: the panel that opens over the scene for a district's app, the
// finds list, a note from the board or the clerk's typewriter. Also the dock
// of district buttons and the little "Task done!" burst.
import { DISTRICTS } from '../districts/index.js';
import { game } from '../app/state.js';
import { me } from '../app/plaza.js';
import { captureMouse } from '../app/camera.js';
import { leaveLot } from '../app/rooms.js';
import { hideTip } from './hall-cards.js';

const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
let unmount = null;

// Open the card as `kind` (what game.appOpen becomes) and return its body.
// Walking stops and the mouse is freed while it's open.
export function showCard(kind, { tag, title, cls, body = '', form = false }) {
  unmount?.();
  unmount = null;
  game.appOpen = kind;
  me.goal = null;
  me.keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  const el = form ? 'form' : 'div';
  panel.className = `pz-panel ${cls}`;
  panel.innerHTML = `
    <header class="pz-panel-head">
      <span class="pz-panel-tag">${tag}</span>
      <h2 class="pz-panel-title">${title}</h2>
      <button class="pz-panel-close" aria-label="Close">×</button>
    </header>
    <${el} class="pz-panel-body"${form ? ' autocomplete="off"' : ''}>${body}</${el}>`;
  overlay.hidden = false;
  document.body.classList.add('app-open');
  panel.querySelector('.pz-panel-close').addEventListener('click', closeApp);
  return panel.querySelector('.pz-panel-body');
}

// A district's app. `opts` reach its mount(), e.g. { tab: 'upcoming' }.
export function openApp(id, opts = {}) {
  const d = DISTRICTS[id];
  const body = showCard(id, { tag: d.name, title: d.title, cls: `pz-d-${id}` });
  unmount = d.mount(body, { reward, ...opts });
  for (const [k, btn] of dockButtons) btn.classList.toggle('is-active', k === id);
}

export function closeApp() {
  hideTip();
  // back to the game: in first person the mouse looks around again
  if (game.view === 'first') captureMouse();
  unmount?.();
  unmount = null;
  game.appOpen = null;
  overlay.hidden = true;
  document.body.classList.remove('app-open');
  for (const btn of dockButtons.values()) btn.classList.remove('is-active');
  leaveLot();
}

export function reward(text) {
  const el = document.createElement('div');
  el.className = 'reward';
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<line x1="${180 + Math.cos(a) * 120}" y1="${180 + Math.sin(a) * 70}" x2="${180 + Math.cos(a) * 150}" y2="${180 + Math.sin(a) * 92}"/>`;
  }).join('');
  el.innerHTML = `<div><svg viewBox="0 0 360 360" aria-hidden="true">${rays}</svg>${text}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// ---------- dock: jump straight to a district's app ----------
const dock = document.getElementById('dock');
const dockButtons = new Map();
for (const [id, d] of Object.entries(DISTRICTS)) {
  const btn = document.createElement('button');
  btn.className = `pz-d-${id}`;
  btn.innerHTML = `<span class="stampdot"></span><span class="name">${d.name}</span><kbd>${d.key}</kbd>`;
  btn.addEventListener('click', () => openApp(id));
  dock.appendChild(btn);
  dockButtons.set(id, btn);
}
