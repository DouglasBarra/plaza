// Signs over the buildings (each district's live summary), the greeting,
// and the "E: Enter…" prompt over your head.
import * as THREE from 'three';
import { DISTRICTS } from '../districts/index.js';
import { camera, controls, canvas } from '../app/engine.js';
import { game } from '../app/state.js';
import { me, buildings, townHall } from '../app/plaza.js';
import { interact } from '../app/actions.js';

const labelsEl = document.getElementById('labels');
export const labels = new Map();
for (const b of buildings) {
  const el = document.createElement('div');
  el.className = `label pz-d-${b.userData.district}`;
  labelsEl.appendChild(el);
  labels.set(b, el);
}
const prompt = document.createElement('button');
prompt.className = 'prompt is-hidden';
prompt.addEventListener('click', () => interact());
labelsEl.appendChild(prompt);

// Signs, greeting and the town hall flag follow live data.
export function refreshSigns() {
  for (const [b, el] of labels) {
    const d = DISTRICTS[b.userData.district];
    const s = d.summary();
    el.innerHTML = `<span class="tag"><span class="stampdot"></span>${d.name}${s.count ? `<span class="count">${s.count}</span>` : ''}</span><small>${s.status}</small>`;
  }
  const todo = DISTRICTS.todo.summary();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting-line').textContent = todo.overdue
    ? `${hello}. ${todo.overdue} ${todo.overdue === 1 ? 'task is' : 'tasks are'} overdue.`
    : todo.count ? `${hello}. ${todo.count} ${todo.count === 1 ? 'thing needs' : 'things need'} you today.`
    : `${hello}. Nothing due today.`;
  townHall.userData.flagUp = todo.allClear;
}

const tmp = new THREE.Vector3();
export function screenOf(v) {
  tmp.copy(v).project(camera);
  return [(tmp.x * 0.5 + 0.5) * canvas.clientWidth, (-tmp.y * 0.5 + 0.5) * canvas.clientHeight, tmp.z];
}

const hudEls = ['.greeting', '.hud-actions', '#dock'].map((s) => document.querySelector(s));
const overlaps = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

export function placeLabels() {
  const { room, focused, view, action } = game;
  const camDist = camera.position.distanceTo(controls.target);
  const hud = hudEls.map((el) => { const r = el.getBoundingClientRect(); return { l: r.left - 8, r: r.right + 8, t: r.top - 8, b: r.bottom + 8 }; });
  // nearest labels claim their spot first; farther ones step up out of the way
  const items = [];
  for (const [b, el] of labels) {
    const [x, y, z] = screenOf(new THREE.Vector3(0, b.userData.labelY, 0).applyMatrix4(b.matrixWorld));
    const hidden = !!room || z > 1 || (focused && focused !== b) || (view === 'third' && camDist > 110);
    items.push({ el, x, y, z, hidden, w: el.offsetWidth, h: el.offsetHeight });
  }
  items.sort((a, b) => a.z - b.z);
  const placed = [];
  for (const it of items) {
    let { y } = it;
    if (!it.hidden) {
      for (let tries = 0; tries < 10; tries++) {
        const box = { l: it.x - it.w / 2, r: it.x + it.w / 2, t: y - it.h, b: y };
        const hit = placed.find((p) => overlaps(box, p));
        if (!hit) break;
        y = hit.t - 4;
      }
      const box = { l: it.x - it.w / 2, r: it.x + it.w / 2, t: y - it.h, b: y };
      if (hud.some((h) => overlaps(box, h))) it.hidden = true;
      else placed.push(box);
    }
    it.el.style.transform = `translate(${it.x}px, ${y}px) translate(-50%, -100%)`;
    it.el.classList.toggle('is-hidden', it.hidden);
  }
  prompt.classList.toggle('is-hidden', !action);
  prompt.classList.toggle('is-center', view === 'first');
  if (!action) return;
  prompt.innerHTML = `<kbd>E</kbd> ${action.label}`;
  if (view === 'first') { prompt.style.transform = ''; return; }
  const [x, y] = screenOf(me.position.clone().add(new THREE.Vector3(0, 2, 0)));
  prompt.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
}
