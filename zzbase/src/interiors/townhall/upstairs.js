// The town hall's upper floor (Upcoming and Done).
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { signBoard } from '../../details.js';
import { rug, plant, bookshelf } from '../../decor.js';
import { piece } from '../../layout.js';
import { W, D, F, TOP } from './dims.js';
import { dark } from './materials.js';
import { taskBoard, calendarTexture } from './boards.js';
import { pendant } from './fixtures.js';

// Upstairs: Upcoming and Done. The planning wall (later notes and the
// calendar), the drafting table, the archive with its pile of finished
// tasks, the window seat with the cat, and the lamps. Everything is built in
// a group raised to the upper floor. Each movable piece (see layout.js)
// carries its colliders and the spot where you use it.
export function furnishUpstairs(upper, rand) {
  const U = F;
  const up = new THREE.Group();
  up.position.y = U;
  upper.add(up);
  const colliders = [];
  const col = (x, z, r) => { const c = { x, z, r, level: 1 }; colliders.push(c); return c; };
  const spots = {
    later: new THREE.Vector3(1.8, 0, -3.4),    // plan ahead
    archive: new THREE.Vector3(-2.4, 0, 0.6),  // look through the archive
  };

  let later;
  piece(up, 'hall.later-board', [1.6, -D / 2], (g) => {
    later = taskBoard(g, 1.6, 2.15, -D / 2 + 0.1, 3.9, 2.2, 4, 2, stamp.todo);
    signBoard(g, 1.6, 3.6, -D / 2 + 0.14, 1.6, 0.36, 'Coming up');
  }, [spots.later]);
  const calTex = calendarTexture();
  piece(up, 'hall.calendar', [-2.4, -D / 2], (g) => {
    box(g, 2.9, 2.5, 0.08, M.planks, -2.4, 2.2, -D / 2 + 0.06);
    mesh(new THREE.PlaneGeometry(2.7, 2.3), toon('#ffffff', calTex), -2.4, 2.2, -D / 2 + 0.11, g);
  });
  // a drafting table and stool in front of the planning wall
  piece(up, 'hall.drafting-table', [-2.4, -3.3], (g) => {
    const draft = box(g, 1.6, 0.06, 1.0, M.planks, -2.4, 1.0, -3.3);
    draft.rotation.x = 0.2;
    for (const [x, z] of [[-3.1, -3.7], [-1.7, -3.7], [-3.1, -2.9], [-1.7, -2.9]]) box(g, 0.06, 1.0, 0.06, M.white, x, 0.5, z);
    for (let i = 0; i < 3; i++) box(g, 0.5, 0.01, 0.35, M.white, -2.6 + i * 0.3, 1.05 + i * 0.01, -3.3).rotation.set(0.2, i * 0.2, 0);
    cyl(g, 0.22, 0.22, 0.05, M.planks, -2.4, 0.65, -2.2, 12);
    cyl(g, 0.04, 0.04, 0.62, M.white, -2.4, 0.31, -2.2, 6);
  }, [col(-2.4, -3.3, 1.0), col(-2.4, -2.2, 0.35)]);
  const upBin = new THREE.Vector3(4.0, U, -4.4);
  piece(up, 'hall.bin-upstairs', [upBin.x, upBin.z], (g) => {
    cyl(g, 0.24, 0.2, 0.5, M.planks, upBin.x, 0.25, upBin.z, 14);
  }, [upBin, col(4.0, -4.4, 0.35)]);
  // the archive: shelves of binders, cabinets, the out-tray of finished tasks
  piece(up, 'hall.archive-shelves', [-W / 2 + 0.35, 0], (g) => {
    bookshelf(g, -W / 2 + 0.35, 1.2, Math.PI / 2, rand);
    bookshelf(g, -W / 2 + 0.35, -1.2, Math.PI / 2, rand);
  }, [col(-5.6, 0, 1.6)]);
  piece(up, 'hall.archive-cabinets', [-5.5, -3.25], (g) => {
    for (const z of [-2.9, -3.6]) {
      box(g, 0.7, 1.15, 0.65, M.white, -5.5, 0.575, z); // below the window sill
      for (const y of [0.3, 0.65, 0.98]) box(g, 0.04, 0.05, 0.25, dark, -5.13, y, z);
    }
  }, [col(-5.5, -3.25, 0.8)]);
  let stack;
  piece(up, 'hall.archive-table', [-3.6, 0.6], (g) => {
    box(g, 1.4, 0.06, 0.8, M.planks, -3.6, 0.78, 0.6);
    for (const [x, z] of [[-4.2, 0.3], [-3.0, 0.3], [-4.2, 0.9], [-3.0, 0.9]]) box(g, 0.06, 0.78, 0.06, M.white, x, 0.39, z);
    box(g, 0.55, 0.12, 0.42, M.planks, -3.6, 0.87, 0.6);
    stack = new THREE.Group();   // the finished tasks, filled in by index.js
    g.add(stack);
    signBoard(g, -3.6, 1.2, 0.95, 0.8, 0.22, 'Done');
  }, [spots.archive, col(-3.6, 0.6, 0.9)]);
  // a window seat with cushions and a cat asleep in the sun, a plant, a globe
  piece(up, 'hall.window-seat', [-3.4, 4.55], (g) => {
    box(g, 1.8, 0.45, 0.6, M.planks, -3.4, 0.22, 4.55);
    box(g, 1.7, 0.1, 0.55, M.white, -3.4, 0.5, 4.55);
    for (const x of [-3.9, -2.9]) box(g, 0.4, 0.35, 0.12, M.white, x, 0.7, 4.75).rotation.x = -0.3;
    const cat = new THREE.Group();
    mesh(new THREE.SphereGeometry(0.2, 10, 8).scale(1.3, 0.6, 1), M.white, 0, 0.12, 0, cat);
    mesh(new THREE.SphereGeometry(0.11, 8, 6), M.white, 0.2, 0.15, 0.05, cat);
    cat.position.set(-3.2, 0.55, 4.5);
    g.add(cat);
  }, [col(-3.4, 4.55, 0.95)]);
  piece(up, 'hall.plant-upstairs', [1.0, 4.3], (g) => plant(g, 1.0, 4.3, 1.0), [col(1.0, 4.4, 0.5)]);
  piece(up, 'hall.globe', [3.0, 3.6], (g) => {
    cyl(g, 0.05, 0.12, 0.9, M.white, 3.0, 0.45, 3.6, 8);
    mesh(new THREE.IcosahedronGeometry(0.45, 1), M.white, 3.0, 1.3, 3.6, g);
  }, [col(3.0, 3.6, 0.6)]);
  piece(up, 'hall.rug-upstairs', [0, 1.0], (g) => rug(g, 0, 1.0, 4.2, 3.0, 0, 0));
  const upLamps = [pendant(up, -2.4, 2.7, -3.0, TOP - U - 0.3), pendant(up, -3.6, 2.6, 0.6, TOP - U - 0.3)];
  return { U, later, calTex, upBin, stack, upLamps, colliders, spots };
}
