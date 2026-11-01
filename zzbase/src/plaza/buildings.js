// The plaza's buildings, each built around its own origin with its front
// facing +z: the town hall (outside), the bank, the library, the lighthouse
// workshop, the Works and the post office. plaza/index.js places them.
import * as THREE from 'three';
import { M, stamp, glow, mesh, box, cyl, slab, gable } from '../kit.js';
import { skipND, nightOnly, smoke } from '../life.js';
import { W, D, T, F, TOP, DOOR, HOLES } from '../interiors/townhall/dims.js';
import { fancyWindow, door, signBoard, hangingSign, clockHands, ridge, chimney, statue } from '../details.js';
import { folk } from '../folks.js';
import { ladder } from '../decor.js';
import { toon } from '../ink.js';
import { bench, crate, bike, lamp } from './props.js';

export const beams = [];

const TILE = 0.4; // height of each building's raised ground tile

// The raised yard a building stands on, w x d meters.
function groundTile(p, w, d, top) {
  slab(p, w, TILE, d, top, M.stone, 0, TILE / 2, 0);
}

// Real-size standards, so every building on the plaza matches the town hall
// (interiors/townhall/dims.js): a story is about 3.6 m, a door about 2.4 m
// tall, a window about 1.1 x 1.7 m with its middle 1.9 m above its floor.
const STORY = 3.6, WIN = { w: 1.1, h: 1.7, y: 1.9 };

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

const dark = toon('#3a3a3a'); // iron: rails, pulleys, hooks, lantern frames

// Finance: the Bank of Plaza. A stone temple front on a podium: steps up to
// four columns under a pediment, green doors, the name on the frieze, and a
// dome behind. Lamps flank the steps; a statue stands to one side.
export function bank() {
  const g = new THREE.Group();
  groundTile(g, 12, 10, M.paving);
  const T = TILE, P = 1.0, top = T + P;               // the podium's top
  const bz = -1.4, BW = 8.6, BD = 5.4, BH = 6.6;      // the hall behind the portico
  const front = bz + BD / 2;                          // its front wall
  slab(g, 10.2, P, 8.2, M.paving, M.stone, 0, T + P / 2, -0.4);
  for (let i = 0; i < 3; i++) {                       // three steps up to the podium
    const h = P * (3 - i) / 3, d = 0.45;
    box(g, 8.2, h, d, M.stone, 0, T + h / 2, 3.7 + i * d - 0.0);
  }
  box(g, BW, BH, BD, M.stone, 0, top + BH / 2, bz);
  box(g, BW + 0.3, 0.3, BD + 0.3, M.white, 0, top + BH + 0.15, bz);       // cornice
  // the portico: four columns, an entablature with the name, a pediment
  const CH = 5.6, cz = 2.6;
  for (const x of [-3.3, -1.1, 1.1, 3.3]) {
    box(g, 0.95, 0.22, 0.95, M.white, x, top + 0.11, cz);
    cyl(g, 0.34, 0.4, CH - 0.44, M.white, x, top + CH / 2, cz, 14);
    box(g, 0.95, 0.22, 0.95, M.white, x, top + CH - 0.11, cz);
  }
  const ez = (front + cz + 0.5) / 2, ed = cz + 0.5 - front;  // from the wall to just past the columns
  box(g, 8.4, 0.9, ed, M.stone, 0, top + CH + 0.45, ez);
  box(g, 8.6, 0.16, ed + 0.2, M.white, 0, top + CH + 0.98, ez);
  signBoard(g, 0, top + CH + 0.45, ez + ed / 2 + 0.04, 3.4, 0.5, 'Bank of Plaza');
  for (const sx of [-1, 1]) box(g, 1.6, 0.14, 0.05, stamp.finance, sx * 2.9, top + CH + 0.45, ez + ed / 2 + 0.03);
  gable(g, 8.6, 1.5, ed + 0.2, M.stone, top + CH + 1.06, ez);
  // the doors and windows behind the columns
  door(g, 0, top, front + 0.02, 1.8, 3.0, stamp.finance);
  for (const sx of [-1, 1]) fancyWindow(g, sx * 2.5, top + 2.3, front + 0.02, 1.1, 2.2);
  for (const sx of [-1, 1]) for (const wz of [-1.4, 0.8]) fancyWindow(g, sx * (BW / 2 + 0.02), top + 2.3, bz + wz, 1.1, 2.2, sx * Math.PI / 2);
  // the dome on its drum
  const dz = bz - 0.4, dy = top + BH + 0.3;
  cyl(g, 2.5, 2.5, 1.1, M.stone, 0, dy + 0.55, dz, 28);
  for (let i = 0; i < 12; i++) {                      // pilasters around the drum
    const a = (i / 12) * Math.PI * 2;
    box(g, 0.18, 1.1, 0.12, M.white, Math.cos(a) * 2.52, dy + 0.55, dz + Math.sin(a) * 2.52).rotation.y = -a;
  }
  mesh(new THREE.SphereGeometry(2.4, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.roofTiles, 0, dy + 1.1, dz, g);
  cyl(g, 0.35, 0.45, 0.8, M.white, 0, dy + 3.9, dz, 10);
  mesh(new THREE.SphereGeometry(0.22, 10, 8), M.white, 0, dy + 4.45, dz, g);
  // out front: lamps on the steps' corners, the founder's statue
  const yard = new THREE.Group();
  yard.position.y = T;
  g.add(yard);
  for (const sx of [-1, 1]) lamp(yard, sx * 4.6, 4.3);
  statue(g, -5.0, T, 2.2, 0.4);
  g.userData = { district: 'finance', labelY: 13.4, footprint: { w: 12, d: 10 } };
  return g;
}

// Study: the library. Two brick stories under a steep tiled gable that faces
// the square, a round window in the gable, a blue door with the name over
// it, books in the ground-floor windows, a banner, and a reading garden.
export function library() {
  const g = new THREE.Group();
  groundTile(g, 10, 9, M.grass);
  const T = TILE, BW = 8.0, BD = 6.4, H = STORY * 2, bz = -0.9, front = bz + BD / 2;
  box(g, BW, H, BD, M.bricks, 0, T + H / 2, bz);
  box(g, BW + 0.12, 0.5, BD + 0.12, M.stone, 0, T + 0.25, bz);           // stone base
  box(g, BW + 0.16, 0.16, BD + 0.16, M.white, 0, T + STORY, bz);         // string course between floors
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.5, H, 0.5, M.stone, sx * (BW / 2 - 0.2), T + H / 2, bz + sz * (BD / 2 - 0.2)); // corner stones
  const RH = 3.6;
  gable(g, BW + 0.7, RH, BD + 0.6, M.roofTiles, T + H, bz);
  ridge(g, 0, T + H + RH, bz, BD + 0.7);
  chimney(g, 2.2, T + H + RH * 0.45 + 0.6, bz - 1.6, 0.6, 1.8);
  // the round window in the gable
  const ry = T + H + 1.4;
  mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), M.deep, 0, ry, front + 0.32, g).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 24), M.white, 0, ry, front + 0.34, g);
  for (const a of [0, Math.PI / 2]) box(g, 1.1, 0.05, 0.05, M.white, 0, ry, front + 0.36).rotation.z = a;
  // the door, the name, the windows
  door(g, 0, T, front + 0.02, 1.3, 2.5, stamp.study, { step: true });
  signBoard(g, 0, T + 3.05, front + 0.05, 2.0, 0.42, 'Library');
  for (const sx of [-1, 1]) {
    fancyWindow(g, sx * 2.5, T + WIN.y, front + 0.02, WIN.w, WIN.h, 0, { books: true });
  }
  for (const x of [-2.5, 0, 2.5]) fancyWindow(g, x, T + STORY + WIN.y, front + 0.02, WIN.w, WIN.h, 0, { curtains: true, flowers: 'white' });
  for (const sx of [-1, 1]) for (const wz of [-1.6, 1.2]) for (const f of [0, 1]) {
    fancyWindow(g, sx * (BW / 2 + 0.02), T + f * STORY + WIN.y, bz + wz, 0.9, WIN.h, sx * Math.PI / 2, f ? { curtains: true } : { books: true });
  }
  // a blue banner on a bracket at the corner
  box(g, 0.08, 0.08, 0.9, M.white, BW / 2 + 0.1, T + 5.6, front - 0.1);
  box(g, 0.05, 1.8, 0.7, stamp.study, BW / 2 + 0.12, T + 4.6, front + 0.15);
  // the reading garden: a bench, a stack of books, hedges along the path
  const yard = new THREE.Group();
  yard.position.y = T;
  g.add(yard);
  bench(yard, -2.6, 3.3, 0);
  box(yard, 0.6, 0.18, 0.4, M.white, 2.4, 0.09, 3.2);
  box(yard, 0.5, 0.18, 0.35, M.white, 2.42, 0.27, 3.2).rotation.y = 0.2;
  box(yard, 0.45, 0.16, 0.3, stamp.study, 2.38, 0.44, 3.18).rotation.y = -0.15;
  for (const sx of [-1, 1]) box(yard, 2.4, 0.7, 0.6, M.grass, sx * 3.6, 0.35, 4.0);
  g.userData = { district: 'study', labelY: 12.8, footprint: { w: 10, d: 9 } };
  return g;
}

// Ideas: the lighthouse, with the keeper's hut beside it, now the workshop
// where ideas get tinkered with. The striped tower carries a gallery and a
// lantern that glows yellow (and sweeps the town at night).
export function lighthouse() {
  const g = new THREE.Group();
  groundTile(g, 11, 11, M.dirt);
  const T = TILE, tx = -1.8, tz = -1.6, TH = 12.5, R0 = 2.1, R1 = 1.55;
  const rAt = (y) => R0 + (R1 - R0) * (y / TH);       // the tower's radius at height y
  cyl(g, R0 + 0.35, R0 + 0.45, 0.7, M.stone, tx, T + 0.35, tz, 20);      // stone footing
  cyl(g, R1, R0, TH, M.stripes, tx, T + 0.7 + TH / 2, tz, 20);
  const gy = T + 0.7 + TH;                            // the gallery floor
  cyl(g, R1 + 0.55, R1 + 0.4, 0.28, M.white, tx, gy + 0.14, tz, 20);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    cyl(g, 0.03, 0.03, 0.8, M.white, tx + Math.cos(a) * (R1 + 0.45), gy + 0.68, tz + Math.sin(a) * (R1 + 0.45), 5);
  }
  mesh(new THREE.TorusGeometry(R1 + 0.45, 0.04, 4, 32), M.white, tx, gy + 1.08, tz, g).rotation.x = Math.PI / 2;
  // the lantern room: glowing glass between iron posts, a cap and a vane
  const lantern = mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.7, 14), glow, tx, gy + 0.28 + 0.85, tz, g);
  lantern.castShadow = false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(g, 0.08, 1.7, 0.08, dark, tx + Math.cos(a) * 1.07, gy + 1.13, tz + Math.sin(a) * 1.07);
  }
  mesh(new THREE.ConeGeometry(1.5, 1.3, 14), M.white, tx, gy + 1.98 + 0.65, tz, g);
  mesh(new THREE.SphereGeometry(0.2, 10, 8), M.white, tx, gy + 3.4, tz, g);
  cyl(g, 0.025, 0.025, 0.8, dark, tx, gy + 3.85, tz, 4);
  box(g, 0.5, 0.18, 0.03, dark, tx + 0.2, gy + 4.1, tz);
  // its door and the little windows climbing the stair
  door(g, tx, T + 0.7, tz + R0 + 0.05, 1.0, 2.2, M.planks);
  for (const [y, a] of [[4.2, 0.35], [7.4, -0.3], [10.4, 0.25]]) {
    const r = rAt(y);
    fancyWindow(g, tx + Math.sin(a) * (r + 0.02), T + 0.7 + y, tz + Math.cos(a) * (r + 0.02), 0.5, 0.75, a);
  }
  // the beam sweeps the town at night
  const beam = new THREE.Group();
  beam.position.set(tx, gy + 1.13, tz);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd21f', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.6, 30, 20, 1, true), beamMat);
    cone.rotation.z = s * Math.PI / 2;
    cone.position.x = s * 15;
    beam.add(cone);
  }
  beam.visible = false;
  g.add(beam);
  nightOnly.push(beam);
  skipND.push(beam);
  beams.push(beam);
  // the keeper's hut, now the workshop: planks, a shingled roof, a sign
  const hx = 2.4, hz = 1.6, HW = 4.6, HD = 3.6, HH = 3.0;
  box(g, HW, HH, HD, M.planks, hx, T + HH / 2, hz);
  gable(g, HD + 0.5, 1.5, HW + 0.5, M.shingles, T + HH, hz, Math.PI / 2).position.x = hx;
  ridge(g, hx, T + HH + 1.5, hz, HW + 0.6, Math.PI / 2);
  door(g, hx + 1.0, T, hz + HD / 2 + 0.02, 0.95, 2.2, M.planks);
  fancyWindow(g, hx - 1.0, T + WIN.y - 0.2, hz + HD / 2 + 0.02, 1.0, 1.0, 0, { flowers: 'ideas' });
  signBoard(g, hx, T + 2.6, hz + HD / 2 + 0.05, 1.6, 0.3, 'Workshop');
  fancyWindow(g, hx + HW / 2 + 0.02, T + WIN.y - 0.2, hz, 0.9, 1.0, Math.PI / 2);
  chimney(g, hx + 1.3, T + HH + 1.1, hz - 0.6, 0.45, 1.2);
  // an anchor and a coil of rope by the door: it was a lighthouse first
  const yard = new THREE.Group();
  yard.position.y = T;
  g.add(yard);
  mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 16), M.white, -4.2, 0.1, 3.6, yard).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 14), M.white, -4.2, 0.24, 3.6, yard).rotation.x = Math.PI / 2;
  const anchor = new THREE.Group();
  anchor.position.set(-2.8, 0, 4.1);
  anchor.rotation.set(0, 0.5, -0.35);
  box(anchor, 0.12, 1.3, 0.12, dark, 0, 0.65, 0);
  box(anchor, 0.7, 0.1, 0.12, dark, 0, 1.15, 0);
  mesh(new THREE.TorusGeometry(0.45, 0.07, 5, 12, Math.PI), dark, 0, 0.45, 0, anchor).rotation.z = Math.PI;
  yard.add(anchor);
  g.userData = { district: 'ideas', labelY: gy + 5.2, footprint: { w: 11, d: 11 }, tower: { x: tx, z: tz, top: gy + 3.6 }, hut: { x: hx, z: hz, ridge: T + HH + 1.5 } };
  return g;
}

// A wedge: a right triangle in z/y (the tall side at +z) extruded along x,
// for sawtooth roofs. UVs in meters, like the kit's shapes.
function wedgeGeo(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(d / 2, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

// Projects: "The Works", a brick workshop where things get built. A sawtooth
// roof with its glazing toward the plaza, a smokestack, a sliding door, a
// loading hoist over the yard, and in the yard a boat on trestles.
export function works() {
  const g = new THREE.Group();
  groundTile(g, 11, 10, M.paving);
  const T = TILE, W = 8.0, D = 5.6, H = 5.2, bz = -1.6, front = bz + D / 2;
  box(g, W, H, D, M.bricks, 0, T + H / 2, bz);
  box(g, W + 0.2, 0.18, D + 0.2, M.white, 0, T + H + 0.02, bz);            // cornice
  for (const sx of [-1, 1]) box(g, 0.45, H, 0.45, M.stone, sx * (W / 2 - 0.15), T + H / 2, front - 0.15); // corner piers
  // the sawtooth: three teeth, each glazed on its tall side, facing the plaza
  const n = 3, tooth = D / n, th = 1.2;
  for (let i = 0; i < n; i++) {
    const zc = front - (i + 0.5) * tooth;
    mesh(wedgeGeo(W, th, tooth), M.bricks, 0, T + H + 0.1, zc, g);
    const len = Math.hypot(tooth, th);
    const roof = box(g, W + 0.2, 0.08, len + 0.06, M.shingles, 0, T + H + 0.1 + th / 2 + 0.05, zc);
    roof.rotation.x = -Math.atan2(th, tooth);                              // high at the glazing, low behind
    const glass = box(g, W - 0.3, th - 0.14, 0.06, M.deep, 0, T + H + 0.1 + th / 2, zc + tooth / 2 + 0.01);
    glass.castShadow = false;
    for (let k = 0; k <= 8; k++) box(g, 0.05, th - 0.1, 0.08, M.white, -(W - 0.3) / 2 + k * (W - 0.3) / 8, T + H + 0.1 + th / 2, zc + tooth / 2 + 0.03);
  }
  // a tall round smokestack at the back corner
  const sx0 = 2.8, sz0 = bz - 2.0;
  cyl(g, 0.38, 0.52, 9.0, M.bricks, sx0, T + 4.5, sz0, 12);
  for (const y of [3.0, 6.0]) cyl(g, 0.5, 0.5, 0.16, M.white, sx0, T + y, sz0, 12);
  cyl(g, 0.48, 0.48, 0.24, M.white, sx0, T + 9.0, sz0, 12);
  smoke(g, sx0, T + 9.3, sz0, { n: 5, rise: 2.6, size: 0.32 });
  // the sliding barn door on its rail, braced in a Z
  const dx = 1.4;
  box(g, 3.0, 0.08, 0.1, dark, dx, T + 3.05, front + 0.09);                // rail
  const leaf = new THREE.Group();
  leaf.position.set(dx + 0.3, T, front + 0.06);                            // slid a little open
  g.add(leaf);
  box(leaf, 2.3, 2.9, 0.08, M.planks, 0, 1.45, 0);
  for (const y of [0.25, 2.65]) box(leaf, 2.3, 0.14, 0.05, M.white, 0, y, 0.06);
  box(leaf, 0.14, 2.9, 0.05, M.white, 0, 1.45, 0.06).rotation.z = Math.atan2(2.1, 2.3);
  box(g, 0.6, 2.9, 0.04, M.deep, dx - 1.15, T + 1.45, front + 0.01).castShadow = false; // the gap it opens on
  hangingSign(g, dx, T + 3.5, front + 0.12, 'The Works', 'projects', 1.8);
  // tall factory windows, and on the ends
  fancyWindow(g, -2.4, T + 1.6, front + 0.02, 1.2, 1.8);
  for (const sxx of [-1, 1]) for (const wz of [-1.4, 1.0]) fancyWindow(g, sxx * (W / 2 + 0.02), T + 1.9, bz + wz, 1.0, 1.8, sxx * Math.PI / 2);
  // the loading hoist: a door up top, a beam over the yard, a rope and hook
  box(g, 1.0, 1.2, 0.06, M.planks, -2.4, T + H - 0.9, front + 0.02);
  box(g, 0.14, 0.14, 1.5, M.planks, -2.4, T + H - 0.12, front + 0.72);
  cyl(g, 0.11, 0.11, 0.08, dark, -2.4, T + H - 0.3, front + 1.32, 10).rotation.z = Math.PI / 2; // pulley
  cyl(g, 0.012, 0.012, 1.5, M.white, -2.4, T + H - 1.05, front + 1.32, 4);
  const hook = new THREE.Group();
  hook.name = 'hoistHook';                                                  // finds.js hangs a sock here
  hook.position.set(-2.4, T + H - 1.84, front + 1.32);
  box(hook, 0.16, 0.18, 0.16, dark, 0, 0, 0);
  g.add(hook);
  // the yard: a boat on trestles, crates, a ladder and someone sizing it up
  const yard = new THREE.Group();
  yard.position.y = T;
  g.add(yard);
  const by = 0.95, bx = 1.6, bzz = 3.3;
  for (const ox of [-1.0, 1.0]) {                                          // trestles
    box(yard, 0.08, 0.08, 0.8, M.planks, bx + ox, 0.72, bzz);
    for (const oz of [-0.3, 0.3]) box(yard, 0.06, 0.75, 0.06, M.white, bx + ox, 0.36, bzz + oz).rotation.x = oz * 0.5;
  }
  const hull = mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.9, 14, 1, true, 0, Math.PI), M.planks, bx, by, bzz, yard);
  hull.rotation.set(0, 0, -Math.PI / 2);                                   // an upturned hull, keel up
  hull.material = hull.material.clone();
  hull.material.side = THREE.DoubleSide;
  box(yard, 2.92, 0.06, 0.04, stamp.projects, bx, by + 0.05, bzz + 0.61);  // a fresh stripe of paint
  for (const rx of [-0.9, 0, 0.9]) mesh(new THREE.TorusGeometry(0.6, 0.03, 4, 14, Math.PI), M.white, bx + rx, by, bzz, yard).rotation.y = Math.PI / 2;
  crate(yard, -3.6, 0, 3.4, 0.3, 0.6);
  crate(yard, -4.1, 0, 2.6, -0.2, 0.5);
  crate(yard, -3.75, 0.6, 3.3, 0.8, 0.4);
  ladder(yard, -0.7, front + 0.3, 3.2, 0, 0.3);
  folk(yard, 3.6, 3.2, -Math.PI / 2, { pose: 'look', look: { hat: 'cap', glasses: true } });
  g.userData = { district: 'projects', labelY: 11.0, footprint: { w: 11, d: 10 } };
  return g;
}

// People: the post office, a half-timbered house where letters and parcels
// come and go. A tiled roof with dormers, a purple door under a canopy, a
// pillar box, the mail bike, and neighbors catching up on the bench.
export function postOffice() {
  const g = new THREE.Group();
  groundTile(g, 10, 9, M.paving);
  const T = TILE, W = 7.2, D = 5.2, H = STORY * 2, F1 = STORY, bz = -1.0, front = bz + D / 2;
  box(g, W, H, D, M.white, 0, T + H / 2, bz);                               // plaster walls
  box(g, W + 0.12, 0.6, D + 0.12, M.stone, 0, T + 0.3, bz);                 // stone base
  // the timber frame on the front and the ends
  const beam = (w, h, x, y, z, rotY = 0) => { const b = box(g, w, h, 0.1, M.planks, x, y, z); b.rotation.y = rotY; return b; };
  for (const y of [T + F1, T + H - 0.06]) beam(W, 0.14, 0, y, front + 0.05);
  for (const x of [-W / 2 + 0.07, -1.25, 1.25, W / 2 - 0.07]) beam(0.14, H - 0.6, x, T + 0.6 + (H - 0.6) / 2, front + 0.05);
  for (const sx of [-1, 1]) {
    const run = W / 2 - 1.25 - 0.4;
    const brace = beam(0.12, Math.hypot(run, H - F1 - 0.2), sx * (1.25 + 0.2 + run / 2), T + F1 + (H - F1) / 2, front + 0.06);
    brace.rotation.z = sx * Math.atan2(run, H - F1 - 0.2);
    for (const y of [T + F1, T + H - 0.06]) beam(D, 0.14, sx * (W / 2 + 0.05), y, bz, Math.PI / 2);
  }
  // roof: tiles, the ridge along the front, two dormers and a chimney
  const RH = 2.8, RD = D + 1.0;
  gable(g, RD, RH, W + 0.8, M.roofTiles, T + H, bz, Math.PI / 2);
  ridge(g, 0, T + H + RH, bz, W + 0.9, Math.PI / 2);
  chimney(g, 2.3, T + H + RH - 0.2, bz - 0.5, 0.6, 1.8);
  const slopeY = (z) => T + H + RH * (1 - Math.abs(z - bz) / (RD / 2));
  for (const x of [-1.8, 1.8]) {
    const zf = bz + 1.7;                                                   // the dormer's face, on the front slope
    const ys = slopeY(zf);
    box(g, 1.2, 1.05, 1.6, M.white, x, ys + 0.5, zf - 0.8);
    gable(g, 1.45, 0.55, 1.75, M.roofTiles, ys + 1.02, zf - 0.8);
    fancyWindow(g, x, ys + 0.5, zf + 0.01, 0.6, 0.7);
  }
  // ground floor: the counter window, the door, the sign; upstairs, three windows
  fancyWindow(g, -2.45, T + WIN.y - 0.1, front + 0.02, 1.6, 1.5, 0, { curtains: true });
  door(g, 0.0, T, front + 0.02, 1.1, 2.4, stamp.people, { step: true });
  const canopy = box(g, 1.9, 0.08, 1.0, M.roofTiles, 0, T + 2.85, front + 0.46);
  canopy.rotation.x = 0.22;
  for (const sx of [-0.85, 0.85]) box(g, 0.06, 0.06, 0.7, dark, sx, T + 2.8, front + 0.3);
  fancyWindow(g, 2.45, T + WIN.y - 0.1, front + 0.02, 1.1, 1.5, 0, { curtains: true });
  signBoard(g, -2.45, T + 3.0, front + 0.06, 1.8, 0.36, 'Post Office');
  for (const x of [-2.45, 0, 2.45]) fancyWindow(g, x, T + F1 + WIN.y, front + 0.02, 0.9, 1.3, 0, { shutters: true, flowers: 'people' });
  for (const sx of [-1, 1]) for (const f of [0, 1]) fancyWindow(g, sx * (W / 2 + 0.02), T + f * F1 + WIN.y, bz, 0.9, 1.3, sx * Math.PI / 2, { shutters: !!f });
  // out front: the pillar box, the mail bike, a parcel pile, and the bench
  const yard = new THREE.Group();
  yard.position.y = T;
  g.add(yard);
  cyl(yard, 0.24, 0.26, 1.2, M.white, -3.6, 0.6, 3.2, 14);
  mesh(new THREE.SphereGeometry(0.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.white, -3.6, 1.2, 3.2, yard);
  box(yard, 0.28, 0.05, 0.06, stamp.people, -3.6, 1.0, 3.45);              // the slot
  bike(yard, 3.9, 2.4, Math.PI / 2 + 0.2);
  for (const [px, py, s] of [[2.6, 0.15, 0.3], [2.9, 0.12, 0.24], [2.7, 0.4, 0.22]]) box(yard, s * 1.3, s, s, M.planks, px, py, 1.9).rotation.y = px;
  bench(yard, 1.8, 3.6, 0);
  folk(yard, 1.45, 3.6, 0, { pose: 'sit', seat: 0.5, look: { hair: 'bun', dress: true, item: 'paper' } });
  folk(yard, -1.4, 3.4, -0.6, { pose: 'chat', look: { hat: 'cap', backpack: true } });
  folk(yard, -0.3, 3.6, 0.9 + Math.PI, { pose: 'chat', look: { hair: 'long', scarf: true } });
  g.userData = { district: 'people', labelY: 12.2, footprint: { w: 10, d: 9 } };
  return g;
}
