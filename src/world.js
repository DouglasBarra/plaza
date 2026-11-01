// The plaza, built from simple shapes. Units are meters; +z is a building's front.
import * as THREE from 'three';
import { M, stamp, glow, boxGeo, prismGeo, mesh, box, cyl, slab, windowAt, gable } from './kit.js';
import { swapModel } from './models.js';
import { placeFinds, animateFinds } from './finds.js';
import { fountainWater, steam, sway, swingSign, leaves, lampLight, skipND, nightOnly, animateLife } from './life.js';
import { addFolk, folk, animateFigures } from './folks.js';
import { W, D, T, F, TOP, DOOR, HOLES } from './hall.js';
import { fancyWindow, door, signBoard, clockHands, updateClocks, ridge, chimney, statue, scaffold, crane, animateCranes, billboard } from './details.js';

export const beams = [];

const TILE = 0.4; // height of each building's raised ground tile

function groundTile(p, size, top) {
  slab(p, size, TILE, size, top, M.stone, 0, TILE / 2, 0);
}

// ---------- buildings ----------
// Night-only things (the lighthouse beam); main.js toggles them with the theme.

// The town hall, outside: the same building as the inside (hall.js), two
// floors tall, with every window where the inside has one and the same door.
const HALL_BASE = TILE;               // the plinth's top: the ground floor stands here
export const HALL_SIZE = { w: W + T * 2, d: D + T * 2 }; // outer walls

function townHall() {
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
  const win = (hole, x, y, z, rotY, lower) => fancyWindow(g, x, T0 + y, z, hole.w, hole.h, rotY, lower ? { shutters: true, flowers: 'white' } : { curtains: true });
  for (const h of HOLES.front.lower) win(h, h.c, h.y, frontZ, 0, true);
  for (const h of HOLES.front.upper) win(h, h.c, h.y, frontZ, 0, false);
  for (const h of HOLES.back.lower) win(h, h.c, h.y, -frontZ, Math.PI, true);
  for (const h of HOLES.back.upper) win(h, h.c, h.y, -frontZ, Math.PI, false);
  for (const h of HOLES.left.lower) win(h, -OW / 2, h.y, h.c, -Math.PI / 2, true);
  for (const h of HOLES.left.upper) win(h, -OW / 2, h.y, h.c, -Math.PI / 2, false);
  for (const h of HOLES.right.lower) win(h, OW / 2, h.y, h.c, Math.PI / 2, true);
  for (const h of HOLES.right.upper) win(h, OW / 2, h.y, h.c, Math.PI / 2, false);

  // the flag rises to the top when nothing is due (driven from main.js)
  g.userData = {
    district: 'todo', labelY: tip + 2.6, flag, flagLow, flagHigh, flagUp: false,
    hall: true, roofBase, roofH, roofW, doorDist: OD / 2 + 1.9,
  };
  return g;
}

function bank() {
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

function library() {
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

function lighthouse() {
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

function emptyPlot(district, big) {
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

// ---------- props ----------
function crate(p, x, y, z, rotY = 0, size = 0.6) {
  const g = new THREE.Group();
  box(g, size, size, size, M.planks, 0, size / 2, 0);
  g.position.set(x, y, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'crate'));
}

function pine(p, x, z, s = 1) {
  const g = new THREE.Group();
  cyl(g, 0.1, 0.14, 0.6, M.white, 0, 0.3, 0, 6);
  for (let i = 0; i < 3; i++) {
    const c = mesh(new THREE.ConeGeometry((1.0 - i * 0.25), 1.1, 7), M.white, 0, 0.9 + i * 0.6, 0, g);
    c.material = M.white;
  }
  g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = x * 3.1;
  p.add(swapModel(g, 'tree-pine'));
  sway(g);
  return g;
}

function roundTree(p, x, z, s = 1) {
  const g = new THREE.Group();
  cyl(g, 0.1, 0.15, 1.0, M.white, 0, 0.5, 0, 6);
  const crown = mesh(new THREE.IcosahedronGeometry(0.9, 0), M.white, 0, 1.6, 0, g);
  crown.rotation.set(x, z, 0);
  g.position.set(x, 0, z); g.scale.setScalar(s);
  p.add(swapModel(g, 'tree-round'));
  sway(g, 0.03);
  return g;
}

function bench(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 1.5, 0.08, 0.45, M.planks, 0, 0.45, 0);
  box(g, 1.5, 0.4, 0.06, M.planks, 0, 0.75, -0.22);
  for (const lx of [-0.6, 0.6]) box(g, 0.08, 0.45, 0.4, M.white, lx, 0.22, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bench'));
  return g;
}

function lamp(p, x, z) {
  const g = new THREE.Group();
  cyl(g, 0.12, 0.16, 0.2, M.white, 0, 0.1, 0, 8);
  cyl(g, 0.05, 0.05, 2.4, M.white, 0, 1.3, 0, 6);
  const head = box(g, 0.32, 0.4, 0.32, M.white, 0, 2.6, 0);
  mesh(new THREE.ConeGeometry(0.3, 0.25, 4), M.white, 0, 2.92, 0, g).rotation.y = Math.PI / 4;
  const light = lampLight(g, head);
  g.position.set(x, 0, z);
  // in a lamp model, the part named "glow" is the one that lights up
  p.add(swapModel(g, 'lamp', (model) => {
    light.head = model.getObjectByName('glow') || null;
    if (light.head) light.day = light.head.material;
  }));
}

function fountain(p) {
  const g = new THREE.Group();
  cyl(g, 2.3, 2.4, 0.6, M.stone, 0, 0.3, 0, 24);
  cyl(g, 2.0, 2.0, 0.05, M.water, 0, 0.5, 0, 24);
  cyl(g, 0.3, 0.4, 1.5, M.stone, 0, 1.2, 0, 10);
  cyl(g, 0.9, 0.45, 0.3, M.white, 0, 2.0, 0, 16);
  mesh(new THREE.SphereGeometry(0.22, 10, 8), M.white, 0, 2.35, 0, g);
  fountainWater(g);
  p.add(g);
}

const cats = [];
function cat(p, x, z, rotY, follows = false) {
  const g = new THREE.Group();
  box(g, 0.5, 0.22, 0.2, M.white, 0, 0.2, 0);
  box(g, 0.2, 0.2, 0.2, M.white, 0.3, 0.34, 0);
  for (const ez of [-0.06, 0.06]) mesh(new THREE.ConeGeometry(0.05, 0.1, 4), M.white, 0.3, 0.48, ez, g);
  const tail = new THREE.Group();
  tail.position.set(-0.25, 0.28, 0);
  cyl(tail, 0.025, 0.025, 0.35, M.white, 0, 0.17, 0, 5);
  tail.rotation.z = 0.5;
  g.add(tail);
  for (const lx of [-0.18, 0.18]) for (const lz of [-0.06, 0.06]) box(g, 0.05, 0.1, 0.05, M.white, lx, 0.05, lz);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'cat'));
  cats.push({ g, tail, home: new THREE.Vector3(x, 0, z), follows });
}

function bollard(p, x, z) {
  cyl(p, 0.14, 0.17, 0.8, M.white, x, 0.4, z, 8);
  mesh(new THREE.SphereGeometry(0.15, 8, 6), M.white, x, 0.82, z, p);
}

function planter(p, x, z, flowers = 'white') {
  const g = new THREE.Group();
  box(g, 1.6, 0.6, 1.6, M.planks, 0, 0.3, 0);
  for (let i = 0; i < 7; i++) {
    const fx = (Math.random() - 0.5) * 1.1, fz = (Math.random() - 0.5) * 1.1;
    cyl(g, 0.02, 0.02, 0.35, M.white, fx, 0.75, fz, 3);
    mesh(new THREE.SphereGeometry(0.11, 6, 5), flowers === 'white' ? M.white : stamp[flowers], fx, 0.95, fz, g);
  }
  g.position.set(x, 0, z);
  p.add(swapModel(g, 'planter'));
}

function cafe(p, x, z) {
  for (const [tx, tz] of [[-1.3, -0.8], [1.3, 0.6]]) {
    const g = new THREE.Group();
    cyl(g, 0.5, 0.5, 0.06, M.white, 0, 0.75, 0, 14);
    cyl(g, 0.05, 0.05, 0.72, M.white, 0, 0.37, 0, 6);
    cyl(g, 0.03, 0.03, 1.6, M.white, 0, 1.5, 0, 4);
    mesh(new THREE.ConeGeometry(1.1, 0.5, 8), M.stripes, 0, 2.35, 0, g);
    for (const a of [0, Math.PI]) box(g, 0.4, 0.45, 0.4, M.planks, Math.cos(a) * 0.85, 0.22, Math.sin(a) * 0.85);
    mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 8), M.white, 0.15, 0.84, 0, g);
    steam(g, 0.15, 0.93, 0);
    g.position.set(x + tx, 0, z + tz);
    p.add(swapModel(g, 'cafe-table'));
  }
}

function stall(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 3, 0.9, 1.2, M.planks, 0, 0.45, 0);
  for (const sx of [-1.4, 1.4]) for (const sz of [-0.5, 0.5]) cyl(g, 0.05, 0.05, 2.2, M.white, sx, 1.1, sz, 5);
  const roof = box(g, 3.4, 0.08, 1.8, M.stripes, 0, 2.25, 0.1);
  roof.rotation.x = 0.18;
  for (let i = 0; i < 5; i++) box(g, 0.45, 0.3, 0.45, M.planks, -1.1 + i * 0.55, 1.05, 0.2);
  for (let i = 0; i < 9; i++) mesh(new THREE.SphereGeometry(0.1, 6, 5), M.white, -1.2 + (i % 5) * 0.55, 1.28, 0.1 + (i > 4 ? 0.18 : 0), g);
  // a sign swinging from the front of the awning
  const pivot = new THREE.Group();
  pivot.position.set(0, 2.05, 0.95);
  for (const s of [-0.45, 0.45]) cyl(pivot, 0.012, 0.012, 0.3, M.white, s, -0.15, 0, 3);
  signBoard(pivot, 0, -0.45, 0, 1.3, 0.34, 'Fresh fruit');
  pivot.userData.keep = true;
  g.add(pivot);
  swingSign(pivot);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'stall'));
}

function bike(p, x, z, rotY) {
  const g = new THREE.Group();
  const wheel = new THREE.TorusGeometry(0.32, 0.035, 6, 18);
  for (const wx of [-0.5, 0.5]) mesh(wheel, M.white, wx, 0.35, 0, g);
  const bar = (x1, y1, x2, y2) => {
    const m = cyl(g, 0.025, 0.025, Math.hypot(x2 - x1, y2 - y1), M.white, (x1 + x2) / 2, (y1 + y2) / 2, 0, 4);
    m.rotation.z = Math.atan2(x1 - x2, y2 - y1);
  };
  bar(-0.5, 0.35, 0, 0.75); bar(0, 0.75, 0.5, 0.35); bar(0, 0.75, -0.1, 0.35); bar(-0.1, 0.35, -0.5, 0.35);
  bar(0.45, 0.6, 0.5, 0.95); box(g, 0.25, 0.05, 0.12, M.white, -0.05, 0.82, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bike'));
}

function noticeboard(p, x, z, rotY) {
  const g = new THREE.Group();
  for (const sx of [-0.9, 0.9]) box(g, 0.12, 1.9, 0.12, M.white, sx, 0.95, 0);
  box(g, 2, 1.1, 0.08, M.planks, 0, 1.3, 0);
  for (const [nx, ny, w, h] of [[-0.5, 1.45, 0.5, 0.6], [0.15, 1.2, 0.45, 0.5], [0.6, 1.5, 0.35, 0.4]]) box(g, w, h, 0.03, M.white, nx, ny, 0.06);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'noticeboard'));
}

function mailbox(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 0.1, 1.0, 0.1, M.white, 0, 0.5, 0);
  box(g, 0.45, 0.35, 0.6, M.white, 0, 1.15, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'mailbox'));
}

// Pigeons hop about on the 2-frame clock, and fly off when you come close.
const pigeons = [];
function pigeon(p, x, z) {
  const g = new THREE.Group();
  box(g, 0.24, 0.14, 0.12, M.white, 0, 0.12, 0);
  box(g, 0.09, 0.09, 0.09, M.white, 0.13, 0.22, 0);
  box(g, 0.05, 0.02, 0.03, M.deep, 0.2, 0.21, 0);
  const wings = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.position.set(0, 0.17, s * 0.06);
    box(w, 0.16, 0.02, 0.14, M.white, 0, 0, s * 0.07);
    g.add(w);
    return w;
  });
  g.position.set(x, 0, z); g.rotation.y = Math.random() * 6;
  g.userData = { home: new THREE.Vector3(x, 0, z), phase: Math.random() * 4, wings, flight: -1, wary: false, dir: new THREE.Vector3() };
  p.add(g);
  pigeons.push(g);
}

// ---------- the plaza ----------
export const PLAZA_HALF = 20;
// The streets enter the plaza at the middle of each side (x = 0 on the north and
// south, z = 0 on the east and west), 5 m wide. Nothing may block them.
const ROAD_CLEAR = 3.4;

export function buildPlaza(scene) {
  const world = new THREE.Group();
  scene.add(world);
  const H = PLAZA_HALF;

  // the plaza floor: a raised slab with a stone curb
  slab(world, H * 2, 0.4, H * 2, M.paving, M.stone, 0, -0.2, 0);
  // a stepped ring around the fountain
  cyl(world, 6.2, 6.2, 0.1, M.stone, 0, 0.05, 0, 40);

  const buildings = [];
  const colliders = [];
  const place = (b, x, z, rotY = Math.atan2(-x, -z), r = 4.4) => {
    b.position.set(x, 0, z);
    b.rotation.y = rotY; // front faces the fountain
    world.add(b);
    buildings.push(b);
    const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    if (b.userData.hall) {
      // the town hall is as big as its inside: a box, not a circle
      colliders.push({ x, z, hw: HALL_SIZE.w / 2, hd: HALL_SIZE.d / 2 + 0.05, rot: rotY });
      b.userData.door = new THREE.Vector3(x, 0, z).addScaledVector(front, b.userData.doorDist);
    } else {
      colliders.push({ x, z, r });
      b.userData.door = new THREE.Vector3(x, 0, z).addScaledVector(front, r + 0.7); // just outside its collider
    }
  };

  // ---- the buildings
  // The town hall fills the north-west, its back wall on the plaza's edge and
  // its east end stopping short of the north street.
  const HALL = { x: -(ROAD_CLEAR + (HALL_SIZE.w + 1) / 2), z: -H + (HALL_SIZE.d + 1) / 2 };
  place(townHall(), HALL.x, HALL.z, 0);
  const C = 14;
  place(bank(), C, -C);
  place(library(), -C, C);
  place(lighthouse(), C, C);
  place(emptyPlot('projects', true), 5.9, -16.0, 0, 3.4);        // beside the north street
  place(emptyPlot('people'), -17.2, 5.8, Math.PI / 2, 3.4);      // beside the west street

  fountain(world);
  colliders.push({ x: 0, z: 0, r: 2.9 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    bench(world, Math.sin(a) * 4.6, Math.cos(a) * 4.6, a + Math.PI);
  }
  const hallSteps = HALL.z + HALL_SIZE.d / 2 + 0.9;               // just in front of the town hall's steps
  for (const [x, z] of [[7, 0], [-7, 0], [0, 7], [0, -7], [HALL.x - 3.2, hallSteps], [HALL.x + 3.2, hallSteps]]) {
    lamp(world, x, z); colliders.push({ x, z, r: 0.35 });
  }

  // bollards along the edge: the plaza ends here, the town goes on. Gaps at the
  // four street mouths, and none where the town hall stands on the edge.
  const hallEdge = [HALL.x - HALL_SIZE.w / 2 - 1.2, HALL.x + HALL_SIZE.w / 2 + 1.2];
  for (let s = -H + 0.6; s <= H - 0.5; s += 2.1) {
    const atStreet = Math.abs(s) < ROAD_CLEAR - 0.2;
    if (!atStreet && !(s > hallEdge[0] && s < hallEdge[1])) bollard(world, s, -H + 0.4);
    if (!atStreet) { bollard(world, s, H - 0.4); bollard(world, -H + 0.4, s); bollard(world, H - 0.4, s); }
  }

  // ---- street furniture, kept clear of the four streets
  const P = {
    cafe: { x: 15.4, z: -7.4 },
    stall: { x: 16.8, z: 7.0 },
    flowers: { x: -17.8, z: -3.9 },
    trees: [{ x: 6.8, z: 16.8 }, { x: 9.0, z: 16.0 }],
    bikes: [{ x: 4.9, z: 16.2 }, { x: 5.5, z: 15.8 }],
    board: { x: -7.6, z: 17.4 },
    bench: { x: -10.6, z: 16.0 },
    mailbox: { x: -4.6, z: 16.8 },
  };
  cafe(world, P.cafe.x, P.cafe.z); colliders.push({ x: P.cafe.x, z: P.cafe.z, r: 2.3 });
  stall(world, P.stall.x, P.stall.z, -Math.PI / 2); colliders.push({ x: P.stall.x, z: P.stall.z, r: 2 });
  planter(world, P.flowers.x, P.flowers.z, 'ideas'); planter(world, P.flowers.x, P.flowers.z - 1.9);
  colliders.push({ x: P.flowers.x, z: P.flowers.z - 0.95, r: 1.7 });
  for (const t of P.trees) roundTree(world, t.x, t.z, 0.85);
  colliders.push({ x: 7.9, z: 16.4, r: 1.8 });
  for (const [i, b] of P.bikes.entries()) bike(world, b.x, b.z, 0.2 + i * 0.3);
  noticeboard(world, P.board.x, P.board.z, Math.PI); colliders.push({ x: P.board.x, z: P.board.z, r: 1.2 });
  bench(world, P.bench.x, P.bench.z, Math.PI * 0.85);
  mailbox(world, P.mailbox.x, P.mailbox.z, Math.PI);
  planter(world, -17.6, -1.0 - 6.0, 'todo'); colliders.push({ x: -17.6, z: -7.0, r: 1.2 });
  roundTree(world, HALL.x + 8.6, hallSteps + 0.6, 0.8);            // a tree by the town hall's east end
  // a few trees to soften the open middle of the bigger plaza
  roundTree(world, 9.6, 9.4, 0.8); roundTree(world, -9.4, 8.6, 0.75);
  for (const [x, z] of [[1.8, 3.4], [2.3, 3.0], [-3.2, -1.6], [-3.4, -2.2], [3.1, -2.6], [2.2, -3.4]]) pigeon(world, x, z);

  // ---- folks, each busy with something
  const onBench = (i, side = 0) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, rot = a + Math.PI;
    return { x: Math.sin(a) * 4.6 + Math.cos(rot) * side, z: Math.cos(a) * 4.6 - Math.sin(rot) * side, rot, seat: 0.5 };
  };
  addFolk(world, { ...onBench(0, -0.4), pose: 'read', look: { hat: 'bowler', glasses: true, item: 'paper' } });
  addFolk(world, { ...onBench(0, 0.45), pose: 'sit', look: { hair: 'bun', dress: true, height: 0.95 } });
  addFolk(world, { ...onBench(1), pose: 'nap', look: { hat: 'cap' } });
  addFolk(world, { ...onBench(3, 0.3), pose: 'sit', look: { hat: 'top', glasses: true, height: 1.08 } });
  addFolk(world, { x: P.bench.x, z: P.bench.z, rot: Math.PI * 0.85, seat: 0.5, pose: 'read', look: { hair: 'long', item: 'paper' } });
  addFolk(world, { x: 0, z: 2.3, rot: 0, seat: 0.6, pose: 'music', look: { hat: 'cap', item: 'guitar' } });
  addFolk(world, { x: -4.4, z: -1.2, rot: 2.14, pose: 'feed', look: { hair: 'bun', dress: true, height: 0.95 } });
  addFolk(world, { x: 8.5, z: -6.0, rot: 0.93, pose: 'chat', look: { hair: 'long', scarf: true } });
  addFolk(world, { x: 9.3, z: -5.4, rot: 0.93 + Math.PI, pose: 'idle', look: { hat: 'cone', backpack: true } });
  // walkers keep to the open ground between the fountain, the town hall and the south side
  addFolk(world, { pose: 'walk', walk: { r: 7.0, cx: 0, cz: 3.5, speed: 0.09 }, dog: true, look: { hat: 'cap', scarf: true } });
  addFolk(world, { pose: 'walk', walk: { path: [[-7, 9.4], [5, 9.4]], speed: 0.8 }, look: { glasses: true, backpack: true } });
  addFolk(world, { x: HALL.x + 3.4, z: hallSteps + 1.4, rot: 0.8, pose: 'sweep', look: { hat: 'bowler', item: 'broom' } });
  addFolk(world, { x: 6.5, z: 11.0, rot: 2.45, pose: 'kite', kite: true, look: { hat: 'cap', height: 0.72 } });
  addFolk(world, { x: P.stall.x + 1.1, z: P.stall.z, rot: -Math.PI / 2, pose: 'vendor', look: { hat: 'cone' } });
  addFolk(world, { x: P.stall.x - 1.6, z: P.stall.z + 0.5, rot: Math.PI / 2, pose: 'chat', look: { hair: 'long', dress: true } });
  addFolk(world, { x: P.cafe.x - 2.15, z: P.cafe.z - 0.8, rot: Math.PI / 2, seat: 0.45, pose: 'sit', look: { hair: 'bun' } });
  addFolk(world, { x: P.cafe.x + 2.15, z: P.cafe.z + 0.6, rot: -Math.PI / 2, seat: 0.45, pose: 'read', look: { glasses: true, item: 'paper' } });
  addFolk(world, { walk: { path: [[P.cafe.x - 1.2, P.cafe.z + 0.4], [P.cafe.x + 1.2, P.cafe.z - 0.5]], speed: 0.7 }, look: { item: 'tray', hair: 'bun' } });
  addFolk(world, { x: P.board.x, z: P.board.z - 1.0, rot: 0, pose: 'look', look: { hat: 'top' } });
  addFolk(world, { x: -15.0, z: 9.6, rot: 2.2, pose: 'wave', look: { item: 'balloon', balloon: 'people', height: 0.75 } });
  leaves(world, 20, H - 2);
  cat(world, 2.1, 3.9, 0.7, true);
  cat(world, -12.2, 3.0, 2.4);

  placeFinds(world, buildings, P);

  return { world, buildings, colliders };
}

// `player` is your position on the plaza (null when you're indoors).
export function animateFolks(time, player = null, dt = 1 / 60) {
  animateFigures(time);
  animateLife(time);
  animateFinds(time);
  updateClocks();
  animateCranes(time);
  for (const b of beams) b.rotation.y = time * 0.6;

  for (const p of pigeons) {
    const u = p.userData;
    const near = player && Math.hypot(player.x - u.home.x, player.z - u.home.z) < 2.4;
    if (u.flight < 0 && near && !u.wary) {
      u.flight = time;
      u.wary = true;
      u.dir.set(u.home.x - player.x, 0, u.home.z - player.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 1.2);
    }
    if (!near && u.flight < 0) u.wary = false;
    if (u.flight >= 0) {
      const s = (time - u.flight) / 4.5;
      if (s >= 1) { u.flight = -1; p.position.copy(u.home); continue; }
      const arc = Math.sin(Math.PI * s);
      p.position.set(u.home.x + u.dir.x * arc * 6, arc * 4.5, u.home.z + u.dir.z * arc * 6);
      p.rotation.y = Math.atan2(-u.dir.z, u.dir.x) + (s > 0.5 ? Math.PI : 0);
      const flap = Math.floor(time * 12) % 2 ? 0.9 : -0.5;
      u.wings[0].rotation.x = -flap; u.wings[1].rotation.x = flap;
    } else {
      u.wings[0].rotation.x = u.wings[1].rotation.x = 0;
      const k = Math.floor(time * 1.5 + u.phase);
      const hop = k % 5 === 0;
      p.position.y = hop ? 0.12 : 0;
      if (hop) { p.position.x = u.home.x + Math.sin(k) * 0.4; p.position.z = u.home.z + Math.cos(k * 1.3) * 0.4; p.rotation.y = k; }
    }
  }

  // the friendly cat trots after you for a bit, then goes home
  for (const c of cats) {
    const frame = Math.floor(time * 6) % 2;
    let target = c.home;
    if (c.follows && player && player.distanceTo(c.home) < 7) {
      const away = new THREE.Vector3().subVectors(c.g.position, player).setY(0);
      if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
      target = player.clone().setY(0).addScaledVector(away.normalize(), 1.3);
    }
    const d = new THREE.Vector3().subVectors(target, c.g.position).setY(0);
    const moving = d.length() > 0.25;
    if (moving) {
      c.g.position.addScaledVector(d.normalize(), Math.min(d.length(), 2.4 * dt));
      c.g.rotation.y = Math.atan2(-d.z, d.x);
    }
    c.g.position.y = moving && frame ? 0.04 : 0;
    c.tail.rotation.x = (frame ? 0.35 : -0.35) * (moving ? 1.4 : 0.6);
  }
}

export { M, stamp, boxGeo, prismGeo, mesh, box, cyl, windowAt, folk, roundTree };
export { STAMPS } from './kit.js';
