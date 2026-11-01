// Going in and out of buildings, and how a room looks from where you stand.
import * as THREE from 'three';
import { THEMES } from '../ink.js';
import { buildInterior, hasInterior } from '../interiors/index.js';
import { LAYER_CEILING, LAYER_UPPER, glassDay, glassNight } from '../interiors/townhall/index.js';
import { camera, controls, plazaScene } from './engine.js';
import { game } from './state.js';
import { me, colliders, plazaBounds, buildingFor } from './plaza.js';
import { setOrbitLimits, placeCameraBehindMe, lookFrom, flyTo } from './camera.js';
import { portalMat } from './window-view.js';
import { refreshSigns } from '../ui/labels.js';
import { openApp } from '../ui/card.js';
import { sfx } from '../sound/index.js';
import { hideTip } from '../ui/hall-cards.js';

const rooms = new Map();    // interiors are built the first time you enter
export const currentScene = () => (game.room ? game.room.scene : plazaScene);

// Going in and out: an ink blot spreads from the middle of the screen until
// it covers it, the room changes behind it, and it shrinks away again. Its
// edge is a wobbly circle with a few lumps and a splatter of drops, drawn
// anew each time, so no two are alike.
const fade = document.getElementById('fade');
function inkBlot() {
  const pts = [], n = 28, lumps = 3 + Math.floor(Math.random() * 3), ph = Math.random() * 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 50 * (1 + 0.06 * Math.sin(a * lumps + ph) + 0.05 * (Math.random() - 0.5));
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  // a smooth closed curve through the points (midpoint quadratics)
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M${mid(pts[n - 1], pts[0]).join(' ')}`;
  for (let i = 0; i < n; i++) d += ` Q${pts[i].join(' ')} ${mid(pts[i], pts[(i + 1) % n]).join(' ')}`;
  const drops = Array.from({ length: 7 }, () => {
    const a = Math.random() * Math.PI * 2, r = 54 + Math.random() * 12;
    return `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="${(1 + Math.random() * 3).toFixed(1)}"/>`;
  }).join('');
  fade.innerHTML = `<svg viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid slice"><g class="blot" style="--turn:${(Math.random() * 40 - 20).toFixed(0)}deg"><path d="${d}Z"/>${drops}</g></svg>`;
  fade.getBoundingClientRect();     // let the blot start small before it grows
}
function fadeThrough(swap) {
  game.transitioning = true;
  sfx('swish');
  inkBlot();
  fade.classList.add('is-on');
  setTimeout(() => {
    swap();
    requestAnimationFrame(() => fade.classList.remove('is-on'));
    setTimeout(() => { game.transitioning = false; }, 260);
  }, 260);
}

// In first person, a building whose windows show the plaza has no fade: you just step in.
const seamless = (r) => game.view === 'first' && r?.plazaOffset;

export function enterBuilding(id) {
  if (!hasInterior(id)) return visitLot(id);
  if (!rooms.has(id)) { rooms.set(id, buildInterior(id)); setRoomLights(rooms.get(id).lights); }
  const swap = () => {
    game.room = rooms.get(id);
    refreshSigns();
    const { room } = game;
    me.setWorld(room.scene, room.colliders, room.bounds, room.spawn, Math.PI, room.heightAt);
    setOrbitLimits();
    if (game.view === 'first') lookFrom(Math.PI); else placeCameraBehindMe();
    applyRoomView();
    document.body.classList.add('in-room');
    sfx('door', { vol: 0.8 });
  };
  seamless(rooms.get(id)) ? swap() : fadeThrough(swap);
}

export function exitBuilding() {
  const b = buildingFor(game.room.id);
  const swap = () => {
    game.room = null;
    me.setWorld(plazaScene, colliders, plazaBounds, b.userData.door.clone(), b.rotation.y);
    setOrbitLimits();
    if (game.view === 'first') lookFrom(b.rotation.y); else placeCameraBehindMe();
    applyRoomView();
    hideTip();
    document.body.classList.remove('in-room');
    sfx('door', { vol: 0.8 });
  };
  seamless(game.room) ? swap() : fadeThrough(swap);
}

// ---------- buildings without an inside yet ----------
// The camera looks at the building and its district's card opens.
let savedOffset = null; // where the camera was before it flew to the building
function visitLot(id) {
  const b = buildingFor(id);
  if (game.view === 'third') {
    savedOffset = camera.position.clone().sub(controls.target);
    game.focused = b;
    const front = new THREE.Vector3(0, 0, 1).applyQuaternion(b.quaternion);
    const target = b.position.clone().add(new THREE.Vector3(0, 2.6, 0));
    const side = new THREE.Vector3(front.z, 0, -front.x).multiplyScalar(7);
    const pos = target.clone().add(front.clone().multiplyScalar(30)).add(side).add(new THREE.Vector3(0, 20, 0));
    flyTo(pos, target.clone().add(new THREE.Vector3(0, -6.5, 0)).add(front.multiplyScalar(4)));
    setTimeout(() => openApp(id), 520);
  } else openApp(id);
}
// When the card closes, the camera flies back.
export function leaveLot() {
  if (!game.focused) return;
  game.focused = null;
  const t = me.position.clone().setY(1);
  flyTo(t.clone().add(savedOffset), t);
}

// ---------- what you see of a room ----------
// In third person the walls between you and the camera are cut away; in a
// two-story building so are the floor above you and the ceilings (by render
// layer, so they still cast shadows). In first person windows show the plaza.
let shownLevel = -1;
export function applyRoomView() {
  const first = game.view === 'first';
  const { room } = game;
  camera.layers.set(0);
  shownLevel = me.level;
  if (!room) return;
  for (const m of room.cutaway || []) m.visible = first;
  if (!room.levels) return;
  room.cutLower.visible = room.cutUpper.visible = first;
  if (first) { camera.layers.enable(LAYER_CEILING); camera.layers.enable(LAYER_UPPER); }
  else if (me.level === 1) camera.layers.enable(LAYER_UPPER);
  const glass = game.theme === 'night' ? glassNight : glassDay;
  for (const p of room.panes) {
    p.material = first ? portalMat : glass;
    p.visible = first || !p.userData.door;
  }
}
// Went up or down the stairs since the room view was last set?
export const levelChanged = () => me.level !== shownLevel;

function setRoomLights(l) {
  l.ambient.intensity = THEMES[game.theme].shadow * Math.PI;
  l.sun.intensity = Math.PI;
}
// Day and night: every room built so far follows the theme.
export function relightRooms() {
  for (const r of rooms.values()) setRoomLights(r.lights);
}
