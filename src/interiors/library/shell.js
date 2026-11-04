// The library's structure: a parquet floor, plastered walls with real
// openings, tall windows with small panes and deep oak sills, an oak
// wainscot, the beamed ceiling, and the shafts of sunlight the dust turns
// over in. The walls facing the third-person camera, and the ceiling, go in
// the cutaway group, so the room opens like a diorama.
import * as THREE from 'three';
import { M, mesh, box } from '../../kit.js';
import { skipND } from '../../life.js';
import { wall } from '../townhall/shell.js';
import { W, D, H, T, BACK, FRONT, LEFT, RIGHT, DOOR, DOOR_HOLE, HOLES } from './dims.js';
import { parquet, dark, sunbeam, dustMote } from './materials.js';

// ---------- windows ----------
// A window seen from inside: an architrave around the deep reveal, six small
// panes, and an oak sill wide enough to stand books on.
function windowIn(p, axis, at, hole, inward, books = false) {
  const g = new THREE.Group();
  const rotY = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[inward];
  if (axis === 'x') g.position.set(hole.c, hole.y, at); else g.position.set(at, hole.y, hole.c);
  g.rotation.y = rotY;
  p.add(g);
  const f = T / 2 + 0.03, t = 0.09;
  box(g, hole.w + t * 2, t, 0.12, M.white, 0, hole.h / 2 + t / 2, f);
  box(g, hole.w + t * 2, t, 0.12, M.white, 0, -hole.h / 2 - t / 2, f);
  for (const k of [-1, 1]) box(g, t, hole.h, 0.12, M.white, k * (hole.w / 2 + t / 2), 0, f);
  const pane = mesh(new THREE.PlaneGeometry(hole.w, hole.h), M.deep, 0, 0, 0, g);
  pane.castShadow = false;
  // the glazing bars: one mullion, two transoms, so six panes
  box(g, 0.04, hole.h, 0.04, M.white, 0, 0, f - 0.03).castShadow = false;
  for (let i = 1; i < 3; i++) box(g, hole.w, 0.035, 0.04, M.white, 0, -hole.h / 2 + (i * hole.h) / 3, f - 0.03).castShadow = false;
  box(g, hole.w + 0.44, 0.07, 0.36, M.planks, 0, -hole.h / 2 - 0.1, f + 0.12);   // the sill
  if (books) {
    // a few books left standing on the sill, one fallen over on the others
    let bx = -hole.w / 2 + 0.08;
    for (let i = 0; bx < hole.w / 2 - 0.14; i++) {
      const bw = 0.05 + ((i * 7) % 4) * 0.014, bh = 0.2 + ((i * 5) % 3) * 0.05;
      const b = box(g, bw, bh, 0.16, M.white, bx + bw / 2, -hole.h / 2 - 0.03 + bh / 2, f + 0.14);
      b.rotation.z = i % 5 === 4 ? 0.22 : 0;
      bx += bw + 0.012;
    }
    box(g, 0.28, 0.05, 0.19, M.white, hole.w / 2 - 0.2, -hole.h / 2 + 0.3, f + 0.14).rotation.y = 0.2;
  }
  return g;
}

// ---------- the wainscot ----------
// Oak panelling to waist height with a rail on top and a skirting below, and
// a plaster cornice under the ceiling. `inward` is the room-facing side.
function wainscot(p, axis, at, from, to, inward, gaps = []) {
  const s = inward[0] === '+' ? 1 : -1;
  const face = at + s * (T / 2 + 0.02);
  const piece = (a, b, y, h, d, mat) => {
    const len = b - a, c = (a + b) / 2, off = face + (s * d) / 2;
    const m = axis === 'x' ? box(p, len, h, d, mat, c, y, off) : box(p, d, h, len, mat, off, y, c);
    m.castShadow = false;
    m.userData.inkId = 8e5 + y;
    return m;
  };
  let cursor = from;
  for (const [a, b] of [...gaps, [to, to]].sort((u, v) => u[0] - v[0])) {
    if (a - cursor > 0.05) {
      piece(cursor, a, 0.52, 0.9, 0.04, M.planks);        // the panels
      piece(cursor, a, 1.0, 0.08, 0.1, M.white);          // the rail
      piece(cursor, a, 0.08, 0.16, 0.07, M.white);        // the skirting
    }
    cursor = Math.max(cursor, b);
  }
  piece(from, to, H - 0.14, 0.2, 0.16, M.white);          // the cornice
  piece(from, to, H - 0.3, 0.06, 0.08, M.white);
}

// ---------- sunlight through the windows ----------
// A soft wedge of light from a window down onto the floor, with dust turning
// over in it. index.js fades both in and out with the hour.
const moteGeo = new THREE.BoxGeometry(0.022, 0.022, 0.022);
function sunShaft(p, from, to, w, h) {
  const g = new THREE.Group();
  g.position.copy(from);
  g.lookAt(to);                                            // the group's +z runs down the beam
  p.add(g);
  const len = from.distanceTo(to);
  const beam = mesh(new THREE.BoxGeometry(w, h, len), sunbeam, 0, 0, len / 2, g);
  beam.castShadow = beam.receiveShadow = false;
  beam.renderOrder = 1;
  const motes = [];
  for (let i = 0; i < 22; i++) {
    const m = mesh(moteGeo, dustMote, 0, 0, 0, g);
    m.castShadow = m.receiveShadow = false;
    m.renderOrder = 2;
    m.userData = { k: Math.random(), ph: Math.random() * 7, w, h, len };
    motes.push(m);
  }
  skipND.push(g);                 // see-through: no outlines, and it hides nothing
  return { group: g, beam, motes };
}

// ---------- the whole room ----------
export function buildShell(scene) {
  const cutaway = [];
  const cut = (m) => { cutaway.push(m); return m; };
  const cuts = (parts) => { for (const m of parts) cutaway.push(m); };

  box(scene, W + T * 2, 0.3, D + T * 2, parquet, 0, -0.15, 0);
  // the walls: the back and left stay, the right and front open up in third person
  wall(scene, 'x', BACK, -W / 2 - T, W / 2 + T, 0, H, HOLES.back, M.white);
  wall(scene, 'z', LEFT, -D / 2, D / 2, 0, H, HOLES.left, M.white);
  cuts(wall(scene, 'z', RIGHT, -D / 2, D / 2, 0, H, HOLES.right, M.white));
  cuts(wall(scene, 'x', FRONT, -W / 2 - T, W / 2 + T, 0, H, [...HOLES.front, DOOR_HOLE], M.white));
  HOLES.left.forEach((h) => windowIn(scene, 'z', LEFT, h, '+x'));
  HOLES.right.forEach((h) => cut(windowIn(scene, 'z', RIGHT, h, '-x')));
  HOLES.front.forEach((h) => cut(windowIn(scene, 'x', FRONT, h, '-z', true)));

  // the way out: a door frame and a doormat that stay visible in the cutaway
  for (const x of [-1, 1]) box(scene, 0.18, DOOR.h + 0.1, 0.42, M.white, x * (DOOR.w / 2 + 0.09), (DOOR.h + 0.1) / 2, FRONT);
  box(scene, DOOR.w + 0.36, 0.18, 0.42, M.white, 0, DOOR.h + 0.09, FRONT);
  box(scene, 1.9, 0.04, 1.0, M.dirt, 0, 0.02, D / 2 - 0.7);
  // a swing door standing open against the front wall, with a glazed panel
  const leaf = new THREE.Group();
  leaf.position.set(DOOR.w / 2, 0, D / 2 - 0.06);
  leaf.rotation.y = -1.92;
  scene.add(leaf);
  box(leaf, DOOR.w * 0.92, DOOR.h, 0.07, M.planks, -DOOR.w * 0.46, DOOR.h / 2, 0);
  mesh(new THREE.PlaneGeometry(DOOR.w * 0.56, DOOR.h * 0.4), M.deep, -DOOR.w * 0.46, DOOR.h * 0.68, 0.04, leaf).castShadow = false;
  box(leaf, DOOR.w * 0.68, 0.07, 0.09, M.white, -DOOR.w * 0.46, DOOR.h * 0.45, 0.03);
  mesh(new THREE.SphereGeometry(0.05, 8, 6), dark, -DOOR.w * 0.84, DOOR.h * 0.44, 0.09, leaf);

  // the wainscot, skipping the walls the stacks stand against
  wainscot(scene, 'x', BACK, -W / 2, W / 2, '+z', [[-6, 6]]);
  wainscot(scene, 'z', LEFT, -D / 2, D / 2, '+x', [[-4.3, 0.4]]);
  wainscot(scene, 'z', RIGHT, -D / 2, D / 2, '-x');
  wainscot(scene, 'x', FRONT, -W / 2, W / 2, '-z', [[-(DOOR.w / 2 + 0.3), DOOR.w / 2 + 0.3]]);

  // the ceiling: boards on four beams, with a lantern rose over the table
  const ceiling = cut(box(scene, W + T * 2, 0.2, D + T * 2, M.white, 0, H + 0.1, 0));
  ceiling.castShadow = false;
  for (const z of [-3.5, -1.2, 1.2, 3.5]) cut(box(scene, W + T, 0.26, 0.26, M.planks, 0, H - 0.13, z));
  for (const x of [-1.9, 0.3]) cut(mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.07, 20), M.white, x, H - 0.04, 0.1, scene)).castShadow = false;

  // sunlight: in through the left window and the front-left one
  const shafts = [
    sunShaft(scene, new THREE.Vector3(-W / 2 + 0.1, 2.25, 2.2), new THREE.Vector3(-1.9, 0, 0.6), 1.25, 2.3),
    sunShaft(scene, new THREE.Vector3(-3.8, 2.25, D / 2 - 0.1), new THREE.Vector3(-2.3, 0, -1.6), 1.25, 2.3),
  ];

  return { cutaway, shafts };
}
