// The sorting office's shell: plaster walls over a timber frame, the way
// half-timbering looks from the inside; windows onto the plaza; the way out
// with its letter slot; and the enamel-shaded lamps hung over the floor.
//
// The walls the third-person camera looks through (the right wall, the front
// wall, the ceiling and the joists under it) go in `cutaway`, so they only
// exist in first person.
import * as THREE from 'three';
import { M, mesh, box, cyl, windowAt } from '../../kit.js';
import { W, D, H, T, BACK, FRONT, LEFT, RIGHT } from './dims.js';
import { brass, dark, enamel } from './materials.js';

// The inside of a window: an architrave, a sill, and the bars that divide
// the dark pane into small ones. `rotY` turns it to face into the room, and
// it stands just clear of the pane so the bars read against it.
function reveal(p, x, y, z, w, h, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  const t = 0.09;
  for (const k of [-1, 1]) box(g, t, h + t * 2, 0.1, M.planks, k * (w / 2 + t / 2), 0, 0.06);
  box(g, w + t * 2, t, 0.1, M.planks, 0, h / 2 + t / 2, 0.06);
  box(g, w + t * 2.6, 0.08, 0.26, M.planks, 0, -h / 2 - 0.04, 0.12);     // the sill
  box(g, 0.05, h, 0.04, M.white, 0, 0, 0.02).castShadow = false;         // the mullion
  for (let i = 1; i < 3; i++) box(g, w, 0.04, 0.04, M.white, 0, -h / 2 + (i * h) / 3, 0.02).castShadow = false;
  return g;
}

// A pendant lamp: a flex from the ceiling, an enamel shade, a bulb that
// glows in the evening.
function pendant(p, x, z, drop = 1.1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  const y = H - drop;
  cyl(g, 0.05, 0.05, 0.07, dark, 0, H - 0.04, 0, 10);                    // the rose on the ceiling
  cyl(g, 0.012, 0.012, drop - 0.12, dark, 0, y + (drop - 0.12) / 2 + 0.06, 0, 4).castShadow = false;
  const shade = mesh(new THREE.ConeGeometry(0.32, 0.3, 22, 1, true), enamel, 0, y + 0.15, 0, g);
  shade.receiveShadow = false;
  cyl(g, 0.045, 0.045, 0.05, brass, 0, y + 0.3, 0, 10).castShadow = false;
  const bulb = mesh(new THREE.SphereGeometry(0.06, 10, 8), M.white, 0, y + 0.07, 0, g);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe9b5', 0, 8, 1.5);
  light.position.set(0, y + 0.02, 0);
  g.add(light);
  return { bulb, light };
}

export function buildShell(scene) {
  const cutaway = [], lamps = [];
  const cut = (m) => { cutaway.push(m); return m; };

  // ---------- floor, walls, ceiling ----------
  box(scene, W + T * 2, 0.3, D + T * 2, M.floor, 0, -0.15, 0);
  box(scene, W + T * 2, H, T, M.white, 0, H / 2, BACK - T / 2);
  box(scene, T, H, D, M.white, LEFT - T / 2, H / 2, 0);
  cut(box(scene, T, H, D, M.white, RIGHT + T / 2, H / 2, 0));
  const seg = (W - 2) / 2;
  const frontId = 2.4e5;                                 // the front wall's pieces share one outline
  cut(box(scene, seg, H, T, M.white, -(W / 2 + 1) / 2, H / 2, FRONT + T / 2)).userData.inkId = frontId;
  cut(box(scene, seg, H, T, M.white, (W / 2 + 1) / 2, H / 2, FRONT + T / 2)).userData.inkId = frontId;
  cut(box(scene, 2, H - 2.5, T, M.white, 0, 2.5 + (H - 2.5) / 2, FRONT + T / 2)).userData.inkId = frontId;
  const ceiling = cut(box(scene, W + T * 2, 0.2, D + T * 2, M.white, 0, H + 0.1, 0));
  ceiling.castShadow = false;
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {              // the joists, cut away with the ceiling
    cut(box(scene, 0.18, 0.28, D, M.planks, x, H - 0.14, 0)).castShadow = false;
  }

  // ---------- the timber frame on the walls you see ----------
  // A skirting, a dado rail at counter height, then posts and a top plate up
  // under the ceiling: the frame of the half-timbered front, from inside.
  const run = (len, h, d, x, y, z, rotY = 0) => {
    const m = box(scene, len, h, d, M.planks, x, y, z);
    m.rotation.y = rotY;
    m.castShadow = false;
    return m;
  };
  for (const [len, x, z, rotY] of [[W, 0, BACK + 0.04, 0], [D, LEFT + 0.04, 0, Math.PI / 2]]) {
    run(len, 0.22, 0.07, x, 0.11, z, rotY);              // skirting
    run(len, 0.1, 0.06, x, 1.08, z, rotY);               // dado rail
    run(len, 0.14, 0.09, x, 2.96, z, rotY);              // mid rail
    run(len, 0.18, 0.1, x, 3.98, z, rotY);               // top plate
  }
  for (const x of [-4.4, -1.5, 1.5, 4.4]) run(0.16, 0.86, 0.07, x, 3.46, BACK + 0.04);
  for (const z of [-3.4, -0.9, 1.6, 4.0]) run(0.16, 0.86, 0.07, LEFT + 0.04, 3.46, z, Math.PI / 2);

  // ---------- windows ----------
  // The two on the front are the ones you see from the plaza: the counter
  // window, wide, and a smaller one the other side of the door.
  for (const [x, w] of [[-3.4, 1.6], [3.4, 1.1]]) {
    cut(windowAt(scene, x, 2.3, FRONT - 0.04, w, 1.5));
    cut(reveal(scene, x, 2.3, FRONT - 0.09, w, 1.5, Math.PI));
  }
  for (const z of [-2.6, 3.0]) {
    windowAt(scene, LEFT + 0.04, 2.3, z, 1.3, 1.5, Math.PI / 2);
    reveal(scene, LEFT + 0.09, 2.3, z, 1.3, 1.5, Math.PI / 2);
  }
  for (const z of [-2.4, 2.4]) {
    cut(windowAt(scene, RIGHT - 0.04, 2.3, z, 1.3, 1.5, Math.PI / 2));
    cut(reveal(scene, RIGHT - 0.09, 2.3, z, 1.3, 1.5, -Math.PI / 2));
  }

  // ---------- the way out ----------
  for (const x of [-1.08, 1.08]) box(scene, 0.16, 2.5, 0.4, M.white, x, 1.25, FRONT + T / 2);
  box(scene, 2.32, 0.16, 0.4, M.white, 0, 2.5, FRONT + T / 2);
  box(scene, 1.8, 0.04, 1.0, M.dirt, 0, 0.02, FRONT - 0.7);
  // the letter slot beside the door, and the wire basket under it that
  // catches what the postman pushes through
  cut(box(scene, 0.44, 0.18, 0.1, M.planks, -1.9, 1.05, FRONT - 0.05));
  cut(box(scene, 0.34, 0.09, 0.06, dark, -1.9, 1.05, FRONT - 0.11)).castShadow = false;
  const basket = new THREE.Group();
  basket.position.set(-1.9, 0, FRONT - 0.34);
  scene.add(basket);
  for (const [w, d, x, z] of [[0.52, 0.03, 0, -0.17], [0.52, 0.03, 0, 0.17], [0.03, 0.34, -0.26, 0], [0.03, 0.34, 0.26, 0]]) {
    for (const y of [0.1, 0.22]) box(basket, w, 0.02, d, M.white, x, y, z).castShadow = false;
  }
  for (let i = 0; i < 9; i++) cyl(basket, 0.008, 0.008, 0.26, M.white, -0.25 + i * 0.0625, 0.13, 0, 4).castShadow = false;
  box(basket, 0.5, 0.02, 0.32, M.white, 0, 0.02, 0);
  for (let i = 0; i < 4; i++) {                           // a few letters already in it
    const l = box(basket, 0.26, 0.012, 0.18, M.white, (i % 2) * 0.03 - 0.015, 0.04 + i * 0.015, (i % 3) * 0.02 - 0.02);
    l.rotation.y = ((i * 29) % 7 - 3) * 0.09;
  }

  // ---------- the lamps ----------
  for (const [x, z] of [[-3.4, 1.42], [-1.1, -1.8], [3.4, -1.6]]) lamps.push(pendant(scene, x, z));

  return { cutaway, lamps };
}
