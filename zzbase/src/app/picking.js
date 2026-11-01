// What's under the pointer (or, in first person, in the middle of the view):
// a building, a note on a board, a find, or the floor.
import * as THREE from 'three';
import * as finds from '../finds.js';
import { camera, canvas } from './engine.js';
import { game } from './state.js';
import { buildings } from './plaza.js';
import { currentScene } from './rooms.js';
import { reward } from '../ui/card.js';

export const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const centerOfView = new THREE.Vector2(0, 0);
export const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export function setPointer(e) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  ray.layers.mask = camera.layers.mask;
}

export function shownInScene(o) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

// Click (or, in first person, look and click): did that hit a find?
export function tryFind(fromCenter = false) {
  currentScene().updateMatrixWorld(); // positions as they are right now
  if (fromCenter) ray.setFromCamera(centerOfView, camera);
  const hit = ray.intersectObjects(currentScene().children, true)
    .find((h) => !h.object.material?.transparent && shownInScene(h.object) && (!fromCenter || h.distance < 25));
  const f = hit && finds.findOf(hit.object);
  if (!f) return false;
  if (finds.markFound(f)) reward(`Found: ${f.name.replace(/^The /, '')}!`);
  return true;
}

// The note on a town hall board under the ray (or null), if nothing is in front of it.
export function pickNote(fromCenter = false) {
  if (!game.room?.boards) return null;
  if (fromCenter) { ray.setFromCamera(centerOfView, camera); ray.layers.mask = camera.layers.mask; }
  const hit = ray.intersectObjects(currentScene().children, true)
    .find((h) => !h.object.material?.transparent && shownInScene(h.object) && (!fromCenter || h.distance < 9));
  let o = hit?.object;
  while (o && !o.userData.task && !o.userData.more) o = o.parent;
  return o || null;
}

export function pickBuilding() {
  if (game.room) return null;
  const hit = ray.intersectObjects(buildings, true)[0];
  let o = hit?.object;
  while (o && !o.userData.district) o = o.parent;
  return o || null;
}
