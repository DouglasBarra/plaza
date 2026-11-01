// The camera: orbiting behind you in third person, looking through your eyes
// in first person, and flying between the two or to a building.
import * as THREE from 'three';
import { camera, controls, canvas } from './engine.js';
import { game } from './state.js';
import { me } from './plaza.js';
import { applyRoomView } from './rooms.js';

// the camera starts high over the south edge, looking up the square, so the fountain, town hall and every building's front are in view
export const PLAZA_VIEW = { minPolar: 0.5, maxPolar: 1.45, minDist: 14, maxDist: 140, offset: new THREE.Vector3(0, 60, 74) };
const ROOM_VIEW = { minPolar: 0.55, maxPolar: 1.15, minDist: 9, maxDist: 26, minAz: 0.05, maxAz: 1.5 };

export function setOrbitLimits() {
  const v = game.room ? ROOM_VIEW : PLAZA_VIEW;
  controls.minPolarAngle = v.minPolar;
  controls.maxPolarAngle = v.maxPolar;
  controls.minDistance = v.minDist;
  controls.maxDistance = v.maxDist;
  controls.minAzimuthAngle = v.minAz ?? -Infinity;
  controls.maxAzimuthAngle = v.maxAz ?? Infinity;
}

export function placeCameraBehindMe() {
  controls.target.copy(me.position).setY(me.position.y + 1);
  camera.position.copy(controls.target).add(game.room ? game.room.cameraOffset : PLAZA_VIEW.offset);
}

// ---------- camera moves ----------
let tween = null;
export function flyTo(pos, target, ms = 900) {
  tween = { from: camera.position.clone(), fromT: controls.target.clone(), pos, target, t0: performance.now(), ms };
  controls.enabled = false;
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export function stepTween(now) {
  if (!tween) return;
  const t = Math.min(1, (now - tween.t0) / tween.ms), k = ease(t);
  camera.position.lerpVectors(tween.from, tween.pos, k);
  controls.target.lerpVectors(tween.fromT, tween.target, k);
  if (t === 1) { tween = null; controls.enabled = game.view === 'third'; }
}

// ---------- first person ----------
// Capture the mouse for looking around. Browsers can refuse (no recent click,
// or the window isn't focused); then the next click captures it.
export function captureMouse() {
  if (game.view !== 'first' || document.pointerLockElement === canvas) return;
  try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* not allowed right now */ }
}
const viewBtn = document.getElementById('toggle-view');
let yaw = 0, pitch = -0.08;

export function lookFrom(bodyRotY) {
  // the body faces +z at rotation 0; the camera faces -z at yaw 0
  yaw = bodyRotY + Math.PI;
  pitch = -0.08;
}
// Set the first-person gaze directly (for taking screenshots).
export function look(y, p) { yaw = y; pitch = p; }

export function setView(next) {
  game.view = next;
  const first = game.view === 'first';
  me.body.visible = !first;
  camera.near = first ? 0.05 : 1;
  camera.fov = first ? 70 : 30;
  camera.updateProjectionMatrix();
  controls.enabled = !first;
  applyRoomView();
  if (first) {
    lookFrom(me.body.rotation.y);
    captureMouse();
  } else {
    if (document.pointerLockElement) document.exitPointerLock();
    placeCameraBehindMe();
  }
  viewBtn.textContent = first ? 'Third person' : 'First person';
  viewBtn.setAttribute('aria-pressed', String(first));
  document.body.classList.toggle('first-person', first);
}
viewBtn.addEventListener('click', () => setView(game.view === 'first' ? 'third' : 'first'));

document.addEventListener('mousemove', (e) => {
  if (game.view !== 'first') return;
  // look with the captured mouse, or by dragging when the mouse isn't captured
  const dragging = e.buttons === 1 && e.target === canvas;
  if (document.pointerLockElement !== canvas && !dragging) return;
  yaw -= e.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -1.3, 1.2);
});
document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('looking', document.pointerLockElement === canvas);
});

// ---------- each frame ----------
const follow = new THREE.Vector3();
export function updateCamera(dt) {
  if (game.view === 'first') {
    camera.position.copy(me.position).setY(me.position.y + 1.5);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    me.body.rotation.y = yaw + Math.PI;
    return;
  }
  // the camera follows you, keeping whatever angle you've orbited to
  if (!tween && !game.focused) {
    follow.copy(me.position).setY(me.position.y + 1).sub(controls.target).multiplyScalar(Math.min(1, dt * 5));
    controls.target.add(follow);
    camera.position.add(follow);
  }
  controls.update();
}
