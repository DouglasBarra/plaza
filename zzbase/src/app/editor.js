// The layout editor (development only): move furniture and buildings around
// in the game and save where they stand to src/layout.json.
//
//   `            turn the editor on and off (or the Layout button)
//   click, drag  select a piece and slide it over the floor (5 cm steps)
//   arrows       nudge 10 cm (Shift: 50 cm, Alt: 1 cm)
//   [ ]          turn 15° (Shift: 1°)
//   PgUp PgDn    raise or lower 5 cm (for things on a wall or a shelf)
//   R            back to where the code puts it
//   Ctrl/⌘ S     save
//   Esc          let go of the piece, then leave the editor
//
// Colliders and use spots move with their piece (see layout.js). While the
// editor is on, clicks and keys don't walk you around (input.js checks).
import * as THREE from 'three';
import { move, pieceOf, whereIs, homeOf, layoutChanges, markSaved } from '../layout.js';
import { controls, canvas } from './engine.js';
import { game } from './state.js';
import { setView } from './camera.js';
import { currentScene } from './rooms.js';
import { ray, setPointer, shownInScene } from './picking.js';
import { closeApp } from '../ui/card.js';

let selected = null;   // the id of the selected piece
let helper = null;     // the box drawn around it
let drag = null;       // { plane, offset } while dragging
let dirty = false;     // moved since the last save
let status = '';

let panel, button;      // made by installEditor, so real builds leave the editor out

export function installEditor() {
  panel = document.createElement('aside');
  panel.className = 'layout-editor';
  panel.hidden = true;
  document.body.appendChild(panel);
  button = document.createElement('button');
  button.className = 'pz-btn layout-toggle';
  button.id = 'toggle-layout';
  button.dataset.key = '`';
  button.textContent = 'Layout';
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => toggle());
  document.body.appendChild(button);   // bottom left, where the panel opens
  canvas.addEventListener('pointerdown', onDown, true);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  window.addEventListener('keydown', onKey);
}

function toggle(on = !game.editing) {
  game.editing = on;
  document.body.classList.toggle('editing', on);
  button.setAttribute('aria-pressed', String(on));
  panel.hidden = !on;
  if (on) {
    if (game.appOpen) closeApp();
    if (game.view === 'first') setView('third');
    status = 'Click a piece to move it.';
    requestAnimationFrame(tick);
  } else {
    select(null);
  }
  render();
}

// ---------- picking and dragging ----------
function pieceUnder(e) {
  setPointer(e);
  const hit = ray.intersectObjects(currentScene().children, true)
    .find((h) => !h.object.material?.transparent && h.object !== helper && shownInScene(h.object));
  for (let o = hit?.object; o; o = o.parent) if (o.userData.layoutId) return { id: o.userData.layoutId, point: hit.point };
  return null;
}

function select(id) {
  helper?.removeFromParent();
  helper = null;
  selected = id;
  if (id) status = '';
  if (id) {
    helper = new THREE.BoxHelper(pieceOf(id).obj, 0xd9480f);
    helper.userData.inkSkip = true;
    currentScene().add(helper);
  }
  render();
}

function onDown(e) {
  if (!game.editing || e.button !== 0) return;
  const hit = pieceUnder(e);
  if (!hit) return; // empty floor: let the camera orbit
  e.stopImmediatePropagation(); // and don't let the camera orbit while dragging
  select(hit.id);
  const obj = pieceOf(hit.id).obj;
  const base = obj.getWorldPosition(new THREE.Vector3());
  // slide on a level plane through the point you grabbed, keeping that grip
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -hit.point.y);
  drag = { plane, offset: base.sub(hit.point), moved: false };
  controls.enabled = false;
  canvas.setPointerCapture(e.pointerId);
}

function onMove(e) {
  if (!game.editing) return;
  if (!drag) { canvas.classList.toggle('hovering', !!pieceUnder(e)); return; }
  setPointer(e);
  const p = ray.ray.intersectPlane(drag.plane, new THREE.Vector3());
  if (!p) return;
  const obj = pieceOf(selected).obj;
  const local = obj.parent.worldToLocal(p.add(drag.offset));
  const snap = (v) => Math.round(v / 0.05) * 0.05;
  move(selected, { x: snap(local.x), z: snap(local.z) });
  drag.moved = dirty = true;
  render();
}

function onUp(e) {
  if (!drag) return;
  drag = null;
  controls.enabled = true;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}

// ---------- keys ----------
function onKey(e) {
  if (e.target.closest?.('input, textarea, select')) return;
  if (e.key === '`') { e.preventDefault(); return toggle(); }
  if (!game.editing) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); return save(); }
  if (e.key === 'Escape') return selected ? select(null) : toggle(false);
  if (!selected) return;
  const w = whereIs(selected);
  const step = e.shiftKey ? 0.5 : e.altKey ? 0.01 : 0.1;
  const turn = THREE.MathUtils.degToRad(e.shiftKey ? 1 : 15);
  const to = {
    ArrowLeft: { x: w.x - step }, ArrowRight: { x: w.x + step },
    ArrowUp: { z: w.z - step }, ArrowDown: { z: w.z + step },
    '[': { rotY: w.rotY + turn }, '{': { rotY: w.rotY + turn },
    ']': { rotY: w.rotY - turn }, '}': { rotY: w.rotY - turn },
    PageUp: { y: w.y + 0.05 }, PageDown: { y: w.y - 0.05 },
    r: homeOf(selected), R: homeOf(selected),
  }[e.key];
  if (!to) return;
  e.preventDefault();
  move(selected, to);
  dirty = true;
  render();
}

// ---------- saving ----------
async function save() {
  const changes = layoutChanges();
  try {
    const res = await fetch('/__plaza/layout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(changes) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    markSaved(changes);
    dirty = false;
    const n = Object.keys(changes).length;
    status = `Saved to src/layout.json (${n} ${n === 1 ? 'piece' : 'pieces'} moved from the code's layout).`;
  } catch (err) {
    // no dev server to save through (a built copy): hand the layout over instead
    console.log('Plaza layout (put this in src/layout.json):\n' + JSON.stringify(changes, null, 2));
    status = `Couldn't save (${err.message}). The layout is in the console: copy it into src/layout.json.`;
  }
  render();
}

// ---------- the panel ----------
const deg = (r) => Math.round(THREE.MathUtils.radToDeg(r) * 10) / 10;
const m = (v) => v.toFixed(2);

function render() {
  if (!game.editing) return;
  let info = '<p class="le-hint">Click and drag a piece. Arrows nudge, [ ] turn, PgUp/PgDn raise, R resets.</p>';
  if (selected) {
    const w = whereIs(selected), h = homeOf(selected);
    const moved = ['x', 'y', 'z', 'rotY'].some((k) => Math.abs(w[k] - h[k]) > 1e-4);
    info = `
      <p class="le-id">${selected}${moved ? ' <small>moved</small>' : ''}</p>
      <p class="le-pos">x ${m(w.x)} · z ${m(w.z)}${Math.abs(w.y - h.y) > 1e-4 ? ` · y ${m(w.y)}` : ''} · turned ${deg(w.rotY)}°</p>`;
  }
  panel.innerHTML = `
    <h2>Layout</h2>
    ${info}
    <div class="le-actions">
      <button class="pz-btn pz-btn-primary" data-act="save"${dirty ? '' : ' disabled'}>Save${dirty ? '' : 'd'}</button>
      <button class="pz-btn" data-act="done">Done</button>
    </div>
    <p class="le-status">${status}</p>`;
  panel.querySelector('[data-act="save"]').onclick = save;
  panel.querySelector('[data-act="done"]').onclick = () => toggle(false);
}

function tick() {
  if (!game.editing) return;
  if (helper) {
    // keep the box on the piece (and in the scene you're looking at)
    if (helper.parent !== currentScene()) currentScene().add(helper);
    helper.update();
  }
  requestAnimationFrame(tick);
}
