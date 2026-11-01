// The town hall's upper floor (Upcoming and Done).
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { signBoard } from '../../details.js';
import { rug, plant, bookshelf } from '../../decor.js';
import { W, D, F, TOP } from './dims.js';
import { dark } from './materials.js';
import { taskBoard, calendarTexture } from './boards.js';
import { pendant } from './fixtures.js';

// Upstairs: Upcoming and Done. The planning wall (later notes and the
// calendar), the drafting table, the archive with its pile of finished
// tasks, the window seat with the cat, and the lamps. Everything is built in
// a group raised to the upper floor.
export function furnishUpstairs(upper, rand) {
  const U = F;
  const up = new THREE.Group();
  up.position.y = U;
  upper.add(up);
  const later = taskBoard(up, 1.6, 2.15, -D / 2 + 0.1, 3.9, 2.2, 4, 2, stamp.todo);
  signBoard(up, 1.6, 3.6, -D / 2 + 0.14, 1.6, 0.36, 'Coming up');
  const calTex = calendarTexture();
  box(up, 2.9, 2.5, 0.08, M.planks, -2.4, 2.2, -D / 2 + 0.06);
  mesh(new THREE.PlaneGeometry(2.7, 2.3), toon('#ffffff', calTex), -2.4, 2.2, -D / 2 + 0.11, up);
  // a drafting table and stool in front of the planning wall
  const draft = box(up, 1.6, 0.06, 1.0, M.planks, -2.4, 1.0, -3.3);
  draft.rotation.x = 0.2;
  for (const [x, z] of [[-3.1, -3.7], [-1.7, -3.7], [-3.1, -2.9], [-1.7, -2.9]]) box(up, 0.06, 1.0, 0.06, M.white, x, 0.5, z);
  for (let i = 0; i < 3; i++) box(up, 0.5, 0.01, 0.35, M.white, -2.6 + i * 0.3, 1.05 + i * 0.01, -3.3).rotation.set(0.2, i * 0.2, 0);
  cyl(up, 0.22, 0.22, 0.05, M.planks, -2.4, 0.65, -2.2, 12);
  cyl(up, 0.04, 0.04, 0.62, M.white, -2.4, 0.31, -2.2, 6);
  const upBin = new THREE.Vector3(4.0, U, -4.4);
  cyl(up, 0.24, 0.2, 0.5, M.planks, upBin.x, 0.25, upBin.z, 14);
  // the archive: shelves of binders, cabinets, the out-tray of finished tasks
  bookshelf(up, -W / 2 + 0.35, 1.2, Math.PI / 2, rand);
  bookshelf(up, -W / 2 + 0.35, -1.2, Math.PI / 2, rand);
  for (const z of [-2.9, -3.6]) {
    box(up, 0.7, 1.15, 0.65, M.white, -5.5, 0.575, z); // below the window sill
    for (const y of [0.3, 0.65, 0.98]) box(up, 0.04, 0.05, 0.25, dark, -5.13, y, z);
  }
  box(up, 1.4, 0.06, 0.8, M.planks, -3.6, 0.78, 0.6);
  for (const [x, z] of [[-4.2, 0.3], [-3.0, 0.3], [-4.2, 0.9], [-3.0, 0.9]]) box(up, 0.06, 0.78, 0.06, M.white, x, 0.39, z);
  box(up, 0.55, 0.12, 0.42, M.planks, -3.6, 0.87, 0.6);
  const stack = new THREE.Group();
  up.add(stack);
  signBoard(up, -3.6, 1.2, 0.95, 0.8, 0.22, 'Done');
  // a window seat with cushions and a cat asleep in the sun, a plant, a globe
  box(up, 1.8, 0.45, 0.6, M.planks, -3.4, 0.22, 4.55);
  box(up, 1.7, 0.1, 0.55, M.white, -3.4, 0.5, 4.55);
  for (const x of [-3.9, -2.9]) box(up, 0.4, 0.35, 0.12, M.white, x, 0.7, 4.75).rotation.x = -0.3;
  const cat = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.2, 10, 8).scale(1.3, 0.6, 1), M.white, 0, 0.12, 0, cat);
  mesh(new THREE.SphereGeometry(0.11, 8, 6), M.white, 0.2, 0.15, 0.05, cat);
  cat.position.set(-3.2, 0.55, 4.5);
  up.add(cat);
  plant(up, 1.0, 4.3, 1.0);
  cyl(up, 0.05, 0.12, 0.9, M.white, 3.0, 0.45, 3.6, 8);
  mesh(new THREE.IcosahedronGeometry(0.45, 1), M.white, 3.0, 1.3, 3.6, up);
  rug(up, 0, 1.0, 4.2, 3.0, 0, 0);
  const upLamps = [pendant(up, -2.4, 2.7, -3.0, TOP - U - 0.3), pendant(up, -3.6, 2.6, 0.6, TOP - U - 0.3)];
  return { U, later, calTex, upBin, stack, upLamps };
}
