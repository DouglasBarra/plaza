// The plaza's buildings, each built around its own origin with its front
// facing +z: the town hall (outside), the bank, the library, the lighthouse
// workshop and the construction lots. plaza/index.js places them.
import * as THREE from 'three';
import { M, stamp, glow, mesh, box, cyl, slab, gable } from '../kit.js';
import { skipND, nightOnly } from '../life.js';
import { W, D, T, F, TOP, DOOR, HOLES } from '../interiors/townhall/dims.js';
import { fancyWindow, door, signBoard, clockHands, ridge, chimney, statue, scaffold, crane, billboard } from '../details.js';
import { bench, crate } from './props.js';

export const beams = [];

const TILE = 0.4; // height of each building's raised ground tile

function groundTile(p, size, top) {
  slab(p, size, TILE, size, top, M.stone, 0, TILE / 2, 0);
}

// ---------- buildings ----------
// Night-only things (the lighthouse beam) are toggled with the theme (life.js).

// The town hall, outside: the same building as the inside (interiors/townhall/dims.js), two
// floors tall, with every window where the inside has one and the same door.
const HALL_BASE = TILE;               // the plinth's top: the ground floor stands here
export const HALL_SIZE = { w: W + T * 2, d: D + T * 2 }; // outer walls

export function townHall() {
  const g = new THREE.Group();
  const T0 = HALL_BASE, OW = W + T * 2, OD = D + T * 2;
  const wallTop = T0 + TOP + 0.2;

  // plinth, with a ring of paving around the walls
  slab(g, OW + 1.0, T0, OD + 1.0, M.paving, M.stone, 0, T0 / 2, 0);

  // walls: one solid block, banded between the floors, with corner stones
  box(g, OW, TOP + 0.2, OD, M.bricks, 0, T0 + (TOP + 0.2) / 2, 0);
  box(g, OW + 0.28, 0.2, OD + 0.28, M.white, 0, T0 + F, 0);               // string course between floors
  box(g, OW + 0.9, 0.34, OD + 0.9, M.white, 0, wallTop + 0.1, 0);        // cornice
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(g, 0.8, TOP + 0.2, 0.8, M.stone, sx * (OW / 2 - 0.2), T0 + (TOP + 0.2) / 2, sz * (OD / 2 - 0.2));
  }

  // roof: a long gable, its ridge running front to back, with chimneys
  const roofBase = wallTop + 0.27, roofH = 3.7, roofW = OW + 1.5;
  gable(g, roofW, roofH, OD + 1.5, M.shingles, roofBase);
  ridge(g, 0, roofBase + roofH, 0, OD + 1.6);
  const roofY = (x) => roofBase + roofH * (1 - Math.abs(x) / (roofW / 2));
  for (const [cx, cz] of [[-4.6, -2.6], [4.6, -2.6]]) chimney(g, cx, roofY(cx) + 0.9, cz, 0.7, 2.6);

  // the clock tower, astride the ridge over the entrance
  const tz = 2.3, tw = 3.4, tBase = roofBase, tH = roofH + 3.9;
  box(g, tw, tH, tw, M.bricks, 0, tBase + tH / 2, tz);
  box(g, tw + 0.5, 0.2, tw + 0.5, M.white, 0, tBase + tH + 0.1, tz);       // tower cornice
  const spire = mesh(new THREE.ConeGeometry(tw * 0.82, 3.3, 4), M.shingles, 0, tBase + tH + 0.2 + 1.65, tz, g);
  spire.rotation.y = Math.PI / 4;
  const tip = tBase + tH + 0.2 + 3.3;
  cyl(g, 0.05, 0.05, 2.0, M.white, 0, tip + 0.9, tz, 6);
  const flagLow = tip + 0.55, flagHigh = tip + 1.35;
  const flag = box(g, 1.0, 0.55, 0.05, stamp.todo, 0.52, flagLow, tz);
  // belfry openings, and clock faces on three sides that tell the real time
  const cr = 0.95, cy = tBase + tH - 1.5;
  const clockFace = (x, z, rotZ, rotX, handsRot) => {
    const f = mesh(new THREE.CylinderGeometry(cr + 0.1, cr + 0.1, 0.08, 28), [M.white, M.clock, M.white], x, cy, z, g);
    f.rotation.set(rotX, 0, rotZ);
    cyl(g, cr + 0.16, cr + 0.16, 0.05, M.white, x, cy, z, 28).rotation.set(rotX, 0, rotZ);
    const hands = new THREE.Group();
    hands.position.set(x + Math.sin(handsRot) * 0.07, cy, z + Math.cos(handsRot) * 0.07);
    hands.rotation.y = handsRot;
    g.add(hands);
    clockHands(hands, 0, 0, 0, cr);
  };
  clockFace(0, tz + tw / 2 + 0.05, 0, Math.PI / 2, 0);
  clockFace(tw / 2 + 0.05, tz, -Math.PI / 2, 0, Math.PI / 2);
  clockFace(-tw / 2 - 0.05, tz, Math.PI / 2, 0, -Math.PI / 2);

  // front: the door, its awning and the name; same size as the inside doorway
  const frontZ = OD / 2;
  door(g, 0, T0, frontZ - 0.06, DOOR.w, DOOR.h, M.planks, { step: true });
  box(g, DOOR.w + 2.2, 0.16, 0.7, M.stone, 0, T0 + 0.08, frontZ + 0.7);  // a second, wider step
  const awning = box(g, DOOR.w + 1.4, 0.1, 1.1, stamp.todo, 0, T0 + DOOR.h + 0.55, frontZ + 0.5);
  awning.rotation.x = 0.32;
  for (const sx of [-1, 1]) box(g, 0.06, 0.55, 0.06, M.white, sx * (DOOR.w / 2 + 0.55), T0 + DOOR.h + 0.2, frontZ + 0.95); // awning posts
  signBoard(g, 0, T0 + DOOR.h + 1.75, frontZ + 0.04, 3.4, 0.6, 'Town Hall');

  // windows, exactly where the inside has them
  // both floors get the same window: frame, cross bars, shutters and a flower box
  const win = (hole, x, y, z, rotY) => fancyWindow(g, x, T0 + y, z, hole.w, hole.h, rotY, { shutters: true, flowers: 'white' });
  for (const h of HOLES.front.lower) win(h, h.c, h.y, frontZ, 0);
  for (const h of HOLES.front.upper) win(h, h.c, h.y, frontZ, 0);
  for (const h of HOLES.back.lower) win(h, h.c, h.y, -frontZ, Math.PI);
  for (const h of HOLES.back.upper) win(h, h.c, h.y, -frontZ, Math.PI);
  for (const h of HOLES.left.lower) win(h, -OW / 2, h.y, h.c, -Math.PI / 2);
  for (const h of HOLES.left.upper) win(h, -OW / 2, h.y, h.c, -Math.PI / 2);
  for (const h of HOLES.right.lower) win(h, OW / 2, h.y, h.c, Math.PI / 2);
  for (const h of HOLES.right.upper) win(h, OW / 2, h.y, h.c, Math.PI / 2);

  // the flag rises to the top when nothing is due (driven from app/plaza.js)
  g.userData = {
    district: 'todo', labelY: tip + 2.6, flag, flagLow, flagHigh, flagUp: false,
    hall: true, roofBase, roofH, roofW, doorDist: OD / 2 + 1.9,
  };
  return g;
}

export function bank() {
  const g = new THREE.Group();
  groundTile(g, 6, M.paving);
  const T = TILE;
  slab(g, 5.6, 0.2, 4.8, M.stone, M.stone, 0, T + 0.1, 0);
  slab(g, 5.2, 0.2, 4.4, M.stone, M.stone, 0, T + 0.3, 0);
  const F = T + 0.4;
  box(g, 4.6, 2.8, 2.8, M.stone, 0, F + 1.4, -0.6);
  for (const x of [-1.8, -0.6, 0.6, 1.8]) {
    cyl(g, 0.2, 0.24, 2.6, M.white, x, F + 1.3, 1.45, 12);
    box(g, 0.55, 0.12, 0.55, M.white, x, F + 2.62, 1.45);
    box(g, 0.55, 0.12, 0.55, M.white, x, F + 0.06, 1.45);
  }
  slab(g, 5.0, 0.4, 4.2, M.white, M.white, 0, F + 2.8, 0);
  gable(g, 5.0, 0.9, 0.7, M.roofTiles, F + 3.0, 1.75);
  // a dome on a drum, where the back roof used to be
  cyl(g, 1.25, 1.25, 0.55, M.stone, 0, F + 3.27, -0.5, 24);
  mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.roofTiles, 0, F + 3.55, -0.5, g);
  cyl(g, 0.08, 0.12, 0.5, M.white, 0, F + 4.95, -0.5, 8);
  mesh(new THREE.SphereGeometry(0.14, 10, 8), M.white, 0, F + 5.25, -0.5, g);
  // stamp: green doors + the name on the frieze
  door(g, 0, F, 0.84, 1.1, 1.8, stamp.finance);
  box(g, 2.6, 0.32, 0.06, stamp.finance, 0, F + 2.8, 2.13);
  signBoard(g, 0, F + 2.8, 2.17, 2.2, 0.26, 'Bank of Plaza');
  for (const x of [-1.5, 1.5]) fancyWindow(g, x, F + 1.3, 0.84, 0.5, 1.3);
  statue(g, -2.35, T, 2.25, 0.5);
  g.userData = { district: 'finance', labelY: 6.6 };
  return g;
}

export function library() {
  const g = new THREE.Group();
  groundTile(g, 6, M.grass);
  const T = TILE;
  box(g, 4.2, 4.4, 3.6, M.bricks, 0, T + 2.2, 0);
  gable(g, 4.7, 1.9, 4.0, M.roofTiles, T + 4.4);
  ridge(g, 0, T + 6.32, 0, 4.1);
  chimney(g, 1.2, T + 5.2, -0.8, 0.55, 1.4);
  for (const x of [-1.15, 1.15]) {
    fancyWindow(g, x, T + 1.7, 1.82, 0.7, 1.0, 0, { books: true });
    fancyWindow(g, x, T + 3.3, 1.82, 0.7, 1.0, 0, { curtains: true, flowers: 'white' });
  }
  const round = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 20), M.deep, 0, T + 5.0, 2.0, g);
  round.rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 20), M.white, 0, T + 5.0, 2.04, g);
  // stamp: blue door + hanging banner
  door(g, 0, T, 1.82, 1.0, 1.7, stamp.study, { step: true });
  signBoard(g, 0, T + 2.05, 1.85, 1.25, 0.3, 'Library');
  box(g, 0.08, 0.08, 0.6, M.white, 2.1, T + 3.9, 2.05);
  box(g, 0.05, 1.3, 0.5, stamp.study, 2.15, T + 3.2, 2.2);
  // a reading bench by the door, with a stack of books
  bench(g, -1.5, 2.45, 0).position.y = T;
  box(g, 0.6, 0.18, 0.4, M.white, 1.3, T + 0.09, 2.4);
  box(g, 0.5, 0.18, 0.35, M.white, 1.32, T + 0.27, 2.4).rotation.y = 0.2;
  box(g, 0.45, 0.16, 0.3, stamp.study, 1.28, T + 0.44, 2.38).rotation.y = -0.15;
  for (const z of [-0.9, 0.9]) for (const y of [1.7, 3.3]) {
    fancyWindow(g, 2.12, T + y, z, 0.5, 0.9, Math.PI / 2);
    fancyWindow(g, -2.12, T + y, z, 0.5, 0.9, -Math.PI / 2);
  }
  g.userData = { district: 'study', labelY: 8.0 };
  return g;
}

export function lighthouse() {
  const g = new THREE.Group();
  groundTile(g, 6, M.dirt);
  const T = TILE;
  cyl(g, 1.0, 1.4, 6, M.stripes, -0.6, T + 3, -0.4, 14);
  cyl(g, 1.45, 1.45, 0.2, M.white, -0.6, T + 6.1, -0.4, 14);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    cyl(g, 0.03, 0.03, 0.45, M.white, -0.6 + Math.cos(a) * 1.35, T + 6.42, -0.4 + Math.sin(a) * 1.35, 5);
  }
  mesh(new THREE.TorusGeometry(1.35, 0.03, 4, 24), M.white, -0.6, T + 6.64, -0.4, g).rotation.x = Math.PI / 2;
  const lamp = mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.0, 12), glow, -0.6, T + 6.7, -0.4, g);
  lamp.castShadow = false;
  mesh(new THREE.ConeGeometry(1.05, 0.95, 12), M.white, -0.6, T + 7.68, -0.4, g);
  mesh(new THREE.SphereGeometry(0.12, 8, 6), M.white, -0.6, T + 8.2, -0.4, g);
  door(g, -0.6, T, 0.97, 0.7, 1.25, M.planks);
  for (const y of [2.6, 4.4]) fancyWindow(g, -0.6, T + y, 0.74 - (y - 2.6) * 0.07, 0.35, 0.5);
  // the beam sweeps the town at night
  const beam = new THREE.Group();
  beam.position.set(-0.6, T + 6.7, -0.4);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd21f', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 26, 20, 1, true), beamMat);
    cone.rotation.z = s * Math.PI / 2;
    cone.position.x = s * 13;
    beam.add(cone);
  }
  beam.visible = false;
  g.add(beam);
  nightOnly.push(beam);
  skipND.push(beam);
  beams.push(beam);
  // the keeper's hut, now the workshop
  box(g, 2.2, 1.6, 2.0, M.planks, 1.6, T + 0.8, 1.0);
  gable(g, 2.5, 1.0, 2.3, M.shingles, T + 1.6, 1.0, Math.PI / 2).position.x = 1.6;
  door(g, 1.95, T, 2.02, 0.55, 1.05, M.planks);
  fancyWindow(g, 1.05, T + 0.85, 2.02, 0.4, 0.4, 0, { flowers: 'ideas' });
  signBoard(g, 1.55, T + 1.43, 2.05, 1.4, 0.26, 'Workshop');
  chimney(g, 2.3, T + 2.1, 0.6, 0.35, 0.9);
  g.userData = { district: 'ideas', labelY: 9.6 };
  return g;
}

export function emptyPlot(district, big) {
  const g = new THREE.Group();
  groundTile(g, 5, M.dirt);
  const T = TILE;
  const posts = [[-2, -2], [2, -2], [2, 2], [-2, 2]];
  for (const [x, z] of posts) box(g, 0.14, 0.8, 0.14, M.white, x, T + 0.4, z);
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = posts[i], [x2, z2] = posts[(i + 1) % 4];
    if (i === 3) continue; // open side, the way in
    box(g, Math.abs(x2 - x1) + 0.1 || 0.06, 0.08, Math.abs(z2 - z1) + 0.1 || 0.06, M.white, (x1 + x2) / 2, T + 0.6, (z1 + z2) / 2);
  }
  // a construction site: scaffolding, a crane on the big lot, a billboard
  scaffold(g, -0.2, T, -1.0, 2.6, 1.4, big ? 3 : 2);
  if (big) crane(g, 1.4, T, -1.4, 9, 6);
  const name = district[0].toUpperCase() + district.slice(1);
  billboard(g, 0.9, T, 1.6, `${name}: coming soon`, district);
  crate(g, -1.4, T, 1.0, 0, 0.6);
  crate(g, -0.9, T, 1.4, 0.4, 0.5);
  cyl(g, 0.06, 0.06, 1.6, M.white, -1.6, T + 0.08, 0.3, 6).rotation.z = Math.PI / 2;
  g.userData = { district, labelY: big ? 3.4 : 2.8, plot: true };
  return g;
}
