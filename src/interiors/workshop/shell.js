// The workshop's structure: the keeper's hut — four plank walls under a flat
// ceiling, with the door at the front — and the lighthouse tower built into
// its back-left corner: the stone drum, the archway into it, the spiral
// stair, the lamp room's floor and the lantern's glazing above.
//
// Parts go into the render groups made by `ideas()`, as in the bank: `lower`
// is the workshop, `upper` is the lamp room, `ceilings` is what hides in
// third person but still shades the room, and `cutLower` / `cutUpper` are
// the walls between you and the third-person camera.
import * as THREE from 'three';
import { M, mesh, box, cyl, windowAt } from '../../kit.js';
import { skipND } from '../../life.js';
import {
  W, D, T, CEIL, F, GLAZE, TOP, TOWER, ARCH, CAM, STEPS, WELL,
  TAU, SPAN, DTH, RISE, THETA0, DECK, at, facingCamera,
} from './dims.js';
import { towerStone, iron, brass, dark, paneGlass, capMat } from './materials.js';

const UP = new THREE.Vector3(0, 1, 0);
const DRUM = 8.1e5;        // every stone piece of the drum shares one outline
const HALF = Math.PI;

// ---------- round pieces ----------
// A band of wall round the drum: one skin, from y0 to y1, `len` radians from `th0`.
function arc(parent, mat, r, y0, y1, th0, len, inkId) {
  const segs = Math.max(2, Math.ceil(len / 0.12));
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, segs, 1, true, th0, len);
  const uv = g.attributes.uv;    // UVs in meters, so the stone keeps its scale
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * len, uv.getY(i) * (y1 - y0));
  const m = mesh(g, mat, TOWER.x, (y0 + y1) / 2, TOWER.z, parent);
  if (inkId) m.userData.inkId = inkId;
  return m;
}

// A slice of a disc (the lamp room's floor), its top at `y`.
function wedge(parent, mat, r, y, thick, th0, len) {
  const g = new THREE.CylinderGeometry(r, r, thick, Math.max(2, Math.ceil(len / 0.18)), 1, false, th0, len);
  return mesh(g, mat, TOWER.x, y - thick / 2, TOWER.z, parent);
}

// A slice of a ring (a stair tread), lying flat with its top at `y`. Shapes
// are drawn in their own x-y plane, so a bearing becomes the angle
// (PI/2 - bearing) and the slab is laid down by turning it a quarter turn.
function treadSlab(parent, mat, r0, r1, y, thick, th0, len) {
  const s = new THREE.Shape();
  const n = Math.max(3, Math.ceil(len / 0.1));
  const px = (r, i) => {
    const a = Math.PI / 2 - (th0 + (i / n) * len);
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  s.moveTo(...px(r1, 0));
  for (let i = 1; i <= n; i++) s.lineTo(...px(r1, i));
  for (let i = n; i >= 0; i--) s.lineTo(...px(r0, i));
  s.closePath();
  const m = mesh(new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false }), mat, TOWER.x, y, TOWER.z, parent);
  m.rotation.x = Math.PI / 2;      // lay it flat: the extrusion goes down from y
  return m;
}

// A thin rod between two points (a handrail, a string, a chain).
export function bar(parent, mat, a, b, rad = 0.025) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = mesh(new THREE.CylinderGeometry(rad, rad, d.length(), 6), mat, 0, 0, 0, parent);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.clone().normalize());
  m.castShadow = false;
  return m;
}

// A point on the drum: `th` round it, `r` out from its middle, `y` up.
export const point = (th, r, y) => {
  const [x, z] = at(th, r);
  return new THREE.Vector3(x, y, z);
};

// A window seen from inside: the dark pane in a frame, with a sill and bars.
function windowIn(p, x, y, z, w, h, rotY = 0) {
  windowAt(p, x, y, z, w, h, rotY);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  const t = 0.08;
  for (const s of [-1, 1]) {
    box(g, w + t * 2, t, 0.14, M.white, 0, s * (h / 2 + t / 2), 0.03);
    box(g, t, h, 0.14, M.white, s * (w / 2 + t / 2), 0, 0.03);
  }
  box(g, 0.04, h, 0.07, M.white, 0, 0, 0.05).castShadow = false;            // the bars
  box(g, w, 0.04, 0.07, M.white, 0, h * 0.12, 0.05).castShadow = false;
  box(g, w + 0.3, 0.07, 0.24, M.white, 0, -h / 2 - t - 0.04, 0.09);         // the sill
  return g;
}

// ---------- the hut ----------
function buildHut({ lower, ceilings, cutLower }) {
  box(lower, W + T * 2, 0.3, D + T * 2, M.floor, 0, -0.15, 0);
  box(lower, W + T * 2, CEIL, T, M.planks, 0, CEIL / 2, -D / 2 - T / 2);     // back
  box(lower, T, CEIL, D, M.planks, -W / 2 - T / 2, CEIL / 2, 0);             // left
  box(cutLower, T, CEIL, D, M.planks, W / 2 + T / 2, CEIL / 2, 0);           // right
  const seg = (W - 2) / 2, frontId = 8.2e5;
  box(cutLower, seg, CEIL, T, M.planks, -(W / 2 + 1) / 2, CEIL / 2, D / 2 + T / 2).userData.inkId = frontId;
  box(cutLower, seg, CEIL, T, M.planks, (W / 2 + 1) / 2, CEIL / 2, D / 2 + T / 2).userData.inkId = frontId;
  box(cutLower, 2, CEIL - 2.5, T, M.planks, 0, 2.5 + (CEIL - 2.5) / 2, D / 2 + T / 2).userData.inkId = frontId;
  // the way out: a door frame and a doormat that stay visible in the cutaway
  for (const x of [-1.08, 1.08]) box(lower, 0.16, 2.5, 0.4, M.white, x, 1.25, D / 2 + T / 2);
  box(lower, 2.32, 0.16, 0.4, M.white, 0, 2.5, D / 2 + T / 2);
  box(lower, 1.8, 0.04, 1.0, M.dirt, 0, 0.02, D / 2 - 0.7);
  // windows: one by the chalkboard, a small one over the stove, two on the cut wall
  windowIn(lower, -W / 2 + 0.04, 2.3, 3.6, 1.3, 1.5, Math.PI / 2);
  windowIn(lower, 5.1, 2.9, -D / 2 + 0.04, 1.0, 1.1);
  for (const z of [-1.4, 2.6]) windowIn(cutLower, W / 2 - 0.04, 2.3, z, 1.3, 1.5, -Math.PI / 2);
  // the ceiling, with a round hole where the tower goes through it. It casts
  // no shadow, so the sun still falls into the room.
  const RR = TOWER.r + TOWER.t + 0.05, hole = TOWER.r + TOWER.t, CID = 8.3e5;
  const slab = (x0, x1, z0, z1) => {
    const m = box(ceilings, x1 - x0, 0.2, z1 - z0, M.white, (x0 + x1) / 2, CEIL + 0.1, (z0 + z1) / 2);
    m.castShadow = false;
    m.userData.inkId = CID;
  };
  slab(TOWER.x + RR, W / 2 + T, -D / 2 - T, D / 2 + T);
  slab(-W / 2 - T, TOWER.x + RR, TOWER.z + RR, D / 2 + T);
  const ring = new THREE.Shape();
  ring.moveTo(-RR, -RR); ring.lineTo(RR, -RR); ring.lineTo(RR, RR); ring.lineTo(-RR, RR); ring.closePath();
  const round = new THREE.Path();
  round.absarc(0, 0, hole, 0, TAU, true);
  ring.holes.push(round);
  const corners = mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.2, bevelEnabled: false, curveSegments: 40 }), M.white, TOWER.x, CEIL + 0.2, TOWER.z, ceilings);
  corners.rotation.x = Math.PI / 2;
  corners.castShadow = false;
  corners.userData.inkId = CID;
  // beams across it, so it reads as a hut from inside
  for (const x of [0.2, 2.6, 5.0]) box(ceilings, 0.2, 0.26, D, M.planks, x, CEIL - 0.13, 0).castShadow = false;
}

// ---------- the drum ----------
function buildDrum({ lower, upper, ceilings, cutLower, cutUpper }) {
  const R = TOWER.r + TOWER.t / 2;
  const cut0 = CAM - Math.PI / 2, cut1 = CAM + Math.PI / 2;   // the sector the camera looks through
  const a0 = THETA0, a1 = THETA0 + SPAN;                       // the archway's edges
  // the wall beside the archway, then the full ring above it
  arc(cutLower, towerStone, R, 0, ARCH.h, cut0, a0 - cut0, DRUM);
  arc(cutLower, towerStone, R, 0, ARCH.h, a1, cut1 - a1, DRUM);
  arc(lower, towerStone, R, 0, ARCH.h, cut1, HALF, DRUM);
  arc(cutLower, towerStone, R, ARCH.h, GLAZE, cut0, HALF, DRUM);
  arc(lower, towerStone, R, ARCH.h, GLAZE, cut1, HALF, DRUM);
  // the archway: a jamb each side and a stone lintel over it
  for (const th of [a0, a1]) {
    const [jx, jz] = at(th, R);
    box(cutLower, 0.22, ARCH.h, TOWER.t + 0.08, M.stone, jx, ARCH.h / 2, jz).rotation.y = th;
  }
  arc(cutLower, M.stone, R, ARCH.h, ARCH.h + 0.26, a0 - 0.1, SPAN + 0.2);
  // a course all the way round at that height, so the join reads as stonework
  arc(lower, M.stone, TOWER.r + TOWER.t + 0.06, ARCH.h, ARCH.h + 0.14, cut1, HALF);
  arc(cutLower, M.stone, TOWER.r + TOWER.t + 0.06, ARCH.h, ARCH.h + 0.14, cut0, HALF);
  // a plinth round its foot and a string course under the lamp room
  arc(lower, M.stone, TOWER.r + TOWER.t + 0.09, 0, 0.32, cut1, HALF, DRUM);
  arc(cutLower, M.stone, TOWER.r + TOWER.t + 0.09, 0, 0.32, cut0, HALF, DRUM);
  arc(lower, M.white, TOWER.r + TOWER.t + 0.07, F - 0.14, F, cut1, HALF);
  arc(cutLower, M.white, TOWER.r + TOWER.t + 0.07, F - 0.14, F, cut0, HALF);

  // ---- the lantern: iron posts, glass between them, muntins, sill, cornice
  for (let i = 0; i < 12; i++) {
    const th = (i / 12) * TAU;
    const [px, pz] = at(th, TOWER.r + 0.06);
    const p = box(facingCamera(th) ? cutUpper : upper, 0.1, TOP - GLAZE, 0.16, iron, px, (GLAZE + TOP) / 2, pz);
    p.rotation.y = th;
  }
  for (const [parent, th0] of [[upper, cut1], [cutUpper, cut0]]) {
    const pane = arc(parent, paneGlass, TOWER.r + 0.02, GLAZE + 0.02, TOP - 0.02, th0, HALF);
    pane.castShadow = false;
    pane.userData.inkSkip = true;
    skipND.push(pane);
    for (const y of [GLAZE + 0.85, GLAZE + 1.7]) arc(parent, iron, TOWER.r + 0.08, y, y + 0.07, th0, HALF).castShadow = false;
    arc(parent, M.white, TOWER.r + 0.15, GLAZE - 0.18, GLAZE, th0, HALF);     // the sill
    arc(parent, iron, TOWER.r + 0.15, TOP - 0.14, TOP, th0, HALF);            // the cornice
  }
  // the cap and the vane on top: hidden in third person, so you can look
  // down into the lamp room
  mesh(new THREE.ConeGeometry(TOWER.r + 0.42, 1.2, 24), capMat, TOWER.x, TOP + 0.6, TOWER.z, ceilings).castShadow = false;
  mesh(new THREE.SphereGeometry(0.18, 10, 8), M.white, TOWER.x, TOP + 1.3, TOWER.z, ceilings).castShadow = false;
  cyl(ceilings, 0.02, 0.02, 0.7, dark, TOWER.x, TOP + 1.7, TOWER.z, 4).castShadow = false;
  box(ceilings, 0.45, 0.16, 0.03, dark, TOWER.x + 0.2, TOP + 1.95, TOWER.z).castShadow = false;
}

// ---------- the stair and the lamp room's floor ----------
function buildStair({ lower, upper }) {
  const rail = [];
  for (let i = 0; i < STEPS; i++) {
    const th0 = THETA0 + SPAN + i * DTH, y = (i + 1) * RISE;
    treadSlab(lower, iron, WELL, TOWER.r - 0.06, y, 0.09, th0, DTH);
    arc(lower, iron, TOWER.r - 0.09, y - 0.12, y, th0, DTH).castShadow = false;   // its nosing
    // the inner stringer: each tread propped on the one below it
    if (i > 0) bar(lower, iron, point(th0, WELL + 0.06, y - RISE), point(th0, WELL + 0.06, y), 0.035);
    rail.push(point(th0, TOWER.r - 0.36, y + 0.95));
    if (i % 3 === 0) bar(lower, iron, point(th0, TOWER.r - 0.36, y), point(th0, TOWER.r - 0.36, y + 0.95), 0.022);
  }
  rail.push(point(THETA0 + TAU, TOWER.r - 0.36, F + 0.95));
  for (let i = 1; i < rail.length; i++) bar(lower, brass, rail[i - 1], rail[i], 0.028);

  // the lamp room's floor: half the drum, over the lower half of the stair,
  // so the stair has headroom all the way up and the well stays open
  const DECK_INK = 8.4e5;
  wedge(upper, iron, TOWER.r, F, 0.2, THETA0, DECK).userData.inkId = DECK_INK;
  // a round plate across the middle, so the lens's pedestal stands on floor
  cyl(upper, 0.8, 0.8, 0.2, iron, TOWER.x, F - 0.1, TOWER.z, 20).userData.inkId = DECK_INK;
  for (const th of [THETA0 + 0.5, THETA0 + 1.57, THETA0 + 2.64]) {
    const [bx, bz] = at(th, TOWER.r / 2);
    box(upper, 0.16, 0.2, TOWER.r, M.planks, bx, F - 0.3, bz).rotation.y = th;    // joists
  }
  // the railing round the open well; the stairhead is left open to walk down
  const th1 = THETA0 + DECK;
  for (const r of [0.75, 1.35, 1.95, TOWER.r - 0.12]) bar(upper, brass, point(th1, r, F), point(th1, r, F + 0.98), 0.03);
  for (const y of [F + 0.98, F + 0.5]) bar(upper, brass, point(th1, 0.6, y), point(th1, TOWER.r - 0.1, y), 0.028);
}

export function buildShell(groups) {
  buildHut(groups);
  buildDrum(groups);
  buildStair(groups);

  // The drum is solid except at the archway. A round wall is collided with
  // as a ring of flat segments; the lamp room needs none of its own, because
  // stepping off its floor is too big a step to take (heightAt in index.js).
  const colliders = [{ x: TOWER.x, z: TOWER.z, r: WELL }, { x: TOWER.x, z: TOWER.z, r: 0.7, level: 1 }];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const th = ((i + 0.5) / n) * TAU;
    const away = Math.abs(Math.atan2(Math.sin(th - ARCH.a), Math.cos(th - ARCH.a)));
    if (away < ARCH.half - 0.05) continue;                     // the archway: walk through
    const [x, z] = at(th, TOWER.r + TOWER.t / 2 + 0.05);
    colliders.push({ x, z, hw: (TOWER.r * Math.PI) / n + 0.05, hd: 0.2, rot: th });
  }
  return { colliders };
}
