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
import { hideTip } from '../ui/hall-cards.js';

const rooms = new Map();    // interiors are built the first time you enter
export const currentScene = () => (game.room ? game.room.scene : plazaScene);

const fade = document.getElementById('fade');
function fadeThrough(swap) {
  game.transitioning = true;
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
  };
  seamless(game.room) ? swap() : fadeThrough(swap);
}

// ---------- empty lots ----------
// Empty lots have no inside yet: the camera looks at the lot and the card opens.
let savedOffset = null; // where the camera was before it flew to the lot
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
// When the card closes, the camera flies back from the lot.
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
