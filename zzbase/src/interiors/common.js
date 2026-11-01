// What the single-story rooms share: their size, the shell with a cutaway
// front, the room light, a wall clock and a note board.
import * as THREE from 'three';
import { M, mesh, box, windowAt } from '../kit.js';
import { clockHands } from '../details.js';

export const W = 12, D = 10, H = 4.2, T = 0.3;
export const BACK = -D / 2 + 0.04, LEFT = -W / 2 + 0.04; // just in front of the back and left walls

// A wall clock facing +x on the left wall, telling the real time.
export function wallClock(p, z, y, r = 0.32) {
  const face = mesh(new THREE.CylinderGeometry(r, r, 0.05, 24), [M.white, M.clock, M.white], LEFT + 0.03, y, z, p);
  face.rotation.z = -Math.PI / 2;
  const hands = new THREE.Group();
  hands.position.set(LEFT + 0.07, y, z);
  hands.rotation.y = Math.PI / 2;
  p.add(hands);
  clockHands(hands, 0, 0, 0, r * 0.9);
}

export function shell(scene, wallMat, floorMat) {
  const cutaway = [];
  const cut = (m) => { cutaway.push(m); return m; };
  box(scene, W + T * 2, 0.3, D + T * 2, floorMat, 0, -0.15, 0);
  box(scene, W + T * 2, H, T, wallMat, 0, H / 2, -D / 2 - T / 2);          // back
  box(scene, T, H, D, wallMat, -W / 2 - T / 2, H / 2, 0);                  // left
  cut(box(scene, T, H, D, wallMat, W / 2 + T / 2, H / 2, 0));              // right
  const seg = (W - 2) / 2;
  const frontId = 1e5 + Math.random() * 1e5; // the front wall's pieces share one outline
  cut(box(scene, seg, H, T, wallMat, -(W / 2 + 1) / 2, H / 2, D / 2 + T / 2)).userData.inkId = frontId; // front, left of door
  cut(box(scene, seg, H, T, wallMat, (W / 2 + 1) / 2, H / 2, D / 2 + T / 2)).userData.inkId = frontId;  // front, right of door
  cut(box(scene, 2, H - 2.5, T, wallMat, 0, 2.5 + (H - 2.5) / 2, D / 2 + T / 2)).userData.inkId = frontId;
  const ceiling = cut(box(scene, W + T * 2, 0.2, D + T * 2, M.white, 0, H + 0.1, 0));
  ceiling.castShadow = false;
  // the way out: a door frame and a doormat that stay visible in the cutaway
  for (const x of [-1.08, 1.08]) box(scene, 0.16, 2.5, 0.4, M.white, x, 1.25, D / 2 + T / 2);
  box(scene, 2.32, 0.16, 0.4, M.white, 0, 2.5, D / 2 + T / 2);
  box(scene, 1.8, 0.04, 1.0, M.dirt, 0, 0.02, D / 2 - 0.7);
  // windows
  for (const x of [-3.5, 3.5]) windowAt(scene, x, 2.3, -D / 2 + 0.04, 1.3, 1.5);
  for (const z of [-2, 2]) windowAt(scene, -W / 2 + 0.04, 2.3, z, 1.3, 1.5, Math.PI / 2);
  return cutaway;
}

export function lightRoom(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 1);
  const sun = new THREE.DirectionalLight(0xffffff, Math.PI);
  sun.position.set(-6, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(ambient, sun, sun.target);
  return { ambient, sun };
}

// Paper notes pinned to a board; the count can change live.
export function noteBoard(p, x, y, z, w, h, pinMat) {
  const g = new THREE.Group();
  box(g, w + 0.2, h + 0.2, 0.1, M.planks, 0, 0, 0);
  box(g, w, h, 0.12, M.dirt, 0, 0, 0.02);
  const notes = new THREE.Group();
  g.add(notes);
  g.position.set(x, y, z);
  p.add(g);
  const slots = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) slots.push([-w / 2 + 0.5 + c * (w - 1) / 4, h / 2 - 0.55 - r * (h / 2 - 0.1)]);
  return {
    group: g,
    setNotes(n) {
      notes.clear();
      slots.slice(0, Math.min(n, slots.length)).forEach(([nx, ny], i) => {
        const note = box(notes, 0.5, 0.6, 0.02, M.white, nx, ny - 0.15, 0.1);
        note.rotation.z = ((i * 37) % 9 - 4) * 0.025;
        mesh(new THREE.SphereGeometry(0.05, 8, 6), pinMat, nx, ny + 0.1, 0.12, notes);
      });
    },
  };
}
