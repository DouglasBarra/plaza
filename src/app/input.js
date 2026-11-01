// Mouse and keyboard. Third person: click a building to walk to its door,
// click the floor to walk there, hover notes to read them. First person:
// the captured mouse looks around and a click uses what you look at.
import * as THREE from 'three';
import { DISTRICTS } from '../districts/index.js';
import { canvas } from './engine.js';
import { game } from './state.js';
import { me } from './plaza.js';
import { setView, captureMouse } from './camera.js';
import { enterBuilding } from './rooms.js';
import { ray, floor, setPointer, tryFind, pickNote, pickBuilding } from './picking.js';
import { interact } from './actions.js';
import { labels } from '../ui/labels.js';
import { openApp, closeApp } from '../ui/card.js';
import { openFinds } from '../ui/finds-card.js';
import { showTip, openNoteCard } from '../ui/hall-cards.js';

let hovered = null;
let downAt = null;

canvas.addEventListener('pointermove', (e) => {
  if (game.view === 'first' || game.editing) return;
  setPointer(e);
  if (game.room) {
    const note = game.appOpen ? null : pickNote();
    showTip(note, e.clientX + 14, e.clientY + 14);
    canvas.classList.toggle('hovering', !!note);
    return;
  }
  const b = pickBuilding();
  if (b === hovered) return;
  if (hovered) labels.get(hovered).classList.remove('is-hover');
  hovered = b;
  if (b) labels.get(b).classList.add('is-hover');
  canvas.classList.toggle('hovering', !!b);
});
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (game.editing) return; // the layout editor has the mouse
  if (game.view === 'first') {
    if (game.appOpen) return closeApp();
    if (document.pointerLockElement !== canvas) {
      // mouse not captured: a click finds what's under the pointer, else captures it
      const clicked = downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) <= 5;
      if (clicked) { setPointer(e); if (tryFind()) return; }
      return captureMouse();
    }
    if (tryFind(true)) return;
    const note = pickNote(true);
    if (note) return openNoteCard(note);
    return interact();
  }
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  setPointer(e);
  if (game.appOpen) return closeApp();
  if (tryFind()) return;
  const note = game.room && pickNote();
  if (note) return openNoteCard(note);
  const b = pickBuilding();
  if (b) return me.walkTo(b.userData.door, () => enterBuilding(b.userData.district));
  const p = ray.ray.intersectPlane(floor, new THREE.Vector3());
  if (p) me.walkTo(p);
});

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
// F finds · V view · L wobbly lines · N night (shown on the buttons)
const SHORTCUTS = {
  f: () => (game.appOpen === 'finds' ? closeApp() : openFinds()),
  v: () => setView(game.view === 'first' ? 'third' : 'first'),
  l: () => document.getElementById('toggle-wobble').click(),
  n: () => document.getElementById('toggle-theme').click(),
};
window.addEventListener('keydown', (e) => {
  if (game.editing) return; // the layout editor has the keys
  const k = e.key.toLowerCase();
  me.running = e.shiftKey;
  if (k === 'escape' && game.appOpen) return closeApp();
  // typing in a district's app must not walk you around
  if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (game.appOpen === 'finds' && k === 'f') return closeApp();
  if (game.appOpen) return;
  if (MOVE_KEYS.has(k)) { me.keys.add(k); e.preventDefault(); return; }
  if (k === 'e' || k === 'enter') return interact();
  if (SHORTCUTS[k]) return SHORTCUTS[k]();
  const id = Object.keys(DISTRICTS).find((key) => DISTRICTS[key].key === e.key);
  if (id) openApp(id);
});
window.addEventListener('keyup', (e) => { me.keys.delete(e.key.toLowerCase()); me.running = e.shiftKey; });
window.addEventListener('blur', () => { me.keys.clear(); me.running = false; });
