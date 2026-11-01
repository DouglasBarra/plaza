// The town hall's structure: walls with real openings, windows with panes,
// wood trim, and the stairs between the floors.
import * as THREE from 'three';
import { M, mesh, box, cyl } from '../../kit.js';
import { W, D, T, F, TOP, DOOR, DOOR_HOLE, HOLES } from './dims.js';
import { dark, glassDay } from './materials.js';

// ---------- walls with real openings ----------
// A wall along `axis` ('x' runs left-right at z = at, 'z' runs front-back at
// x = at) from `from` to `to`, between heights y0 and y1, with rectangular
// holes { c (center along the wall), y (center height), w, h }.
export function wall(p, axis, at, from, to, y0, y1, holes, mat) {
  const parts = [];
  const seg = (a, b, lo, hi) => {
    if (b - a < 0.01 || hi - lo < 0.01) return;
    const c = (a + b) / 2, len = b - a, y = (lo + hi) / 2, h = hi - lo;
    parts.push(axis === 'x' ? box(p, len, h, T, mat, c, y, at) : box(p, T, h, len, mat, at, y, c));
  };
  let cursor = from;
  for (const hole of [...holes].sort((a, b) => a.c - b.c)) {
    const a = hole.c - hole.w / 2, b = hole.c + hole.w / 2;
    seg(cursor, a, y0, y1);
    seg(a, b, y0, Math.max(y0, hole.y - hole.h / 2));
    seg(a, b, Math.min(y1, hole.y + hole.h / 2), y1);
    cursor = b;
  }
  seg(cursor, to, y0, y1);
  // one wall, one outline: its pieces share an ink id so they show no seams
  const id = 1e5 + Math.random() * 1e5;
  for (const part of parts) part.userData.inkId = id;
  return parts;
}

// Frame, cross bars and sill on the inside of a hole, plus a pane that shows
// either glass or (first person) the real plaza. `inward` is the room-facing
// normal of the wall: '+z' | '-z' | '+x' | '-x'.
export function windowIn(p, axis, at, hole, inward, panes, door = false) {
  const g = new THREE.Group();
  const rotY = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[inward];
  if (axis === 'x') g.position.set(hole.c, hole.y, at); else g.position.set(at, hole.y, hole.c);
  g.rotation.y = rotY;
  p.add(g);
  const f = T / 2 + 0.03, t = 0.08;
  box(g, hole.w + t * 2, t, 0.1, M.white, 0, hole.h / 2 + t / 2, f);
  if (!door) box(g, hole.w + t * 2, t, 0.1, M.white, 0, -hole.h / 2 - t / 2, f);
  for (const k of [-1, 1]) box(g, t, hole.h, 0.1, M.white, k * (hole.w / 2 + t / 2), 0, f);
  const pane = mesh(new THREE.PlaneGeometry(hole.w, hole.h), glassDay, 0, 0, 0, g);
  pane.castShadow = false;
  pane.userData.door = door;
  panes.push(pane);
  if (!door) {
    box(g, 0.04, hole.h, 0.04, M.white, 0, 0, f - 0.02).castShadow = false;
    box(g, hole.w, 0.04, 0.04, M.white, 0, hole.h * 0.1, f - 0.02).castShadow = false;
    box(g, hole.w + 0.34, 0.06, 0.28, M.white, 0, -hole.h / 2 - 0.1, f + 0.08);
    // curtains on a rod, gathered to each side
    box(g, hole.w + 0.7, 0.035, 0.035, dark, 0, hole.h / 2 + 0.22, f + 0.12);
    for (const k of [-1, 1]) {
      const c = new THREE.Group();
      c.position.set(k * (hole.w / 2 + 0.12), 0.0, f + 0.1);
      // folds: slats at alternating depths, gathered in the middle by a band
      for (let i = 0; i < 4; i++) box(c, 0.1, hole.h + 0.18, 0.04, M.white, (i - 1.5) * 0.09, 0, (i % 2) * 0.05);
      box(c, 0.44, 0.045, 0.12, M.white, 0, -0.1, 0.02);
      g.add(c);
    }
    for (const k of [-1, 1]) cyl(g, 0.03, 0.03, 0.06, dark, k * (hole.w / 2 + 0.38), hole.h / 2 + 0.22, f + 0.12, 6).rotation.z = Math.PI / 2; // rod ends
  }
  return g;
}

// Wood paneling on the lower part of a wall, with a rail on top, a baseboard
// below and crown molding at the ceiling. `axis`/`at`/`inward` as for wall();
// skips spans listed in `gaps` ([from, to] along the wall).
export function trim(p, axis, at, from, to, y0, ceiling, inward, gaps = []) {
  const s = inward[0] === '+' ? 1 : -1;
  const face = at + s * (T / 2 + 0.02);
  const piece = (a, b, y, h, d, mat) => {
    const len = b - a, c = (a + b) / 2, off = face + s * d / 2;
    const m = axis === 'x' ? box(p, len, h, d, mat, c, y, off) : box(p, d, h, len, mat, off, y, c);
    m.castShadow = false;
    m.userData.inkId = 3e5 + y;
    return m;
  };
  let cursor = from;
  for (const [a, b] of [...gaps, [to, to]].sort((u, v) => u[0] - v[0])) {
    if (a - cursor > 0.05) {
      piece(cursor, a, y0 + 0.55, 1.1, 0.04, M.planks);   // panels
      piece(cursor, a, y0 + 1.12, 0.07, 0.09, M.white);   // chair rail
      piece(cursor, a, y0 + 0.08, 0.16, 0.07, M.white);   // baseboard
    }
    cursor = Math.max(cursor, b);
  }
  piece(from, to, ceiling - 0.08, 0.16, 0.14, M.white);   // crown molding
}
// ---------- stairs ----------
export const STAIR = { x0: 4.35, x1: 5.85, zBottom: 2.0, zTop: -3.0 };
export const inStair = (x, z) => x > STAIR.x0 && x < STAIR.x1 && z < STAIR.zBottom + 0.3 && z > STAIR.zTop - 0.05;
export const stairHeight = (z) => THREE.MathUtils.clamp((STAIR.zBottom - z) / (STAIR.zBottom - STAIR.zTop), 0, 1) * F;

export function stairs(p) {
  const n = 16, run = (STAIR.zBottom - STAIR.zTop) / n, rise = F / n;
  const w = STAIR.x1 - STAIR.x0, cx = (STAIR.x0 + STAIR.x1) / 2;
  for (let i = 0; i < n; i++) {
    const z = STAIR.zBottom - (i + 0.5) * run;
    box(p, w, rise * (i + 1), run, M.planks, cx, (rise * (i + 1)) / 2, z);
    box(p, w + 0.04, 0.04, run + 0.02, M.white, cx, rise * (i + 1) + 0.02, z);
  }
  // the banister on the open side, rising with the steps
  const len = Math.hypot(STAIR.zBottom - STAIR.zTop, F);
  const rail = box(p, 0.08, 0.08, len, M.planks, STAIR.x0 + 0.05, F / 2 + 0.95, (STAIR.zBottom + STAIR.zTop) / 2);
  rail.rotation.x = Math.atan2(F, STAIR.zBottom - STAIR.zTop);
  for (let i = 0; i <= n; i += 2) {
    const z = STAIR.zBottom - i * run;
    box(p, 0.04, 0.95, 0.04, M.white, STAIR.x0 + 0.05, rise * i + 0.47, z);
  }
  box(p, 0.14, 1.1, 0.14, M.planks, STAIR.x0 + 0.05, 0.55, STAIR.zBottom);
}

// The whole house: floor, walls with their windows, the open front door,
// the upper floor with the stairwell, ceiling beams, roof, stairs and trim.
// Parts go into the render groups made by buildTownHall. Returns the door's
// hinge and the direction of its leaf, for the door's colliders.
export function buildHouse({ lower, upper, ceilings, cutLower, cutUpper, panes }) {
  box(lower, W + T * 2, 0.3, D + T * 2, M.floor, 0, -0.15, 0);
  const backHoles = HOLES.back.lower, leftHoles = HOLES.left.lower, rightHoles = HOLES.right.lower;
  const frontHoles = [...HOLES.front.lower, DOOR_HOLE];
  const bz = -D / 2 - T / 2, fz = D / 2 + T / 2, lx = -W / 2 - T / 2, rx = W / 2 + T / 2;
  wall(lower, 'x', bz, -W / 2 - T, W / 2 + T, 0, F, backHoles, M.bricks);
  wall(lower, 'z', lx, -D / 2, D / 2, 0, F, leftHoles, M.bricks);
  wall(cutLower, 'z', rx, -D / 2, D / 2, 0, F, rightHoles, M.bricks);
  wall(cutLower, 'x', fz, -W / 2 - T, W / 2 + T, 0, F, frontHoles, M.bricks);
  backHoles.forEach((h) => windowIn(lower, 'x', bz, h, '+z', panes));
  leftHoles.forEach((h) => windowIn(lower, 'z', lx, h, '+x', panes));
  rightHoles.forEach((h) => windowIn(cutLower, 'z', rx, h, '-x', panes));
  frontHoles.forEach((h) => windowIn(cutLower, 'x', fz, h, '-z', panes, h === DOOR_HOLE));
  // the door frame and mat stay visible in the cutaway, so you can find the way out
  for (const x of [-1, 1]) box(lower, 0.16, DOOR.h + 0.1, 0.4, M.white, x * (DOOR.w / 2 + 0.08), (DOOR.h + 0.1) / 2, fz);
  box(lower, DOOR.w + 0.32, 0.16, 0.4, M.white, 0, DOOR.h + 0.08, fz);
  box(lower, DOOR.w + 0.1, 0.04, 1.0, M.dirt, 0, 0.02, D / 2 - 0.7);
  // the door itself, hinged on the right and standing open into the room, same size as the one outside
  const hinge = new THREE.Vector3(DOOR.w / 2, 0, D / 2 - 0.05);
  const swing = -1.87;                                     // a little past square: the opening stays clear
  const leaf = new THREE.Group();
  leaf.position.copy(hinge);
  leaf.rotation.y = swing;
  lower.add(leaf);
  box(leaf, DOOR.w, DOOR.h, 0.07, M.planks, -DOOR.w / 2, DOOR.h / 2, 0);
  for (const s2 of [-1, 1]) for (const side of [-1, 1]) {
    box(leaf, DOOR.w * 0.34, DOOR.h * 0.36, 0.03, M.planks, -DOOR.w / 2 + s2 * DOOR.w * 0.2, DOOR.h * 0.72, side * 0.05);
    box(leaf, DOOR.w * 0.34, DOOR.h * 0.3, 0.03, M.planks, -DOOR.w / 2 + s2 * DOOR.w * 0.2, DOOR.h * 0.27, side * 0.05);
  }
  box(leaf, DOOR.w + 0.1, 0.08, 0.1, M.white, -DOOR.w / 2, DOOR.h + 0.04, 0);
  for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(0.045, 8, 6), dark, -DOOR.w + 0.16, DOOR.h * 0.46, side * 0.09, leaf);
  for (const hy of [0.35, DOOR.h - 0.35]) box(leaf, 0.12, 0.2, 0.09, dark, -0.04, hy, 0);   // hinges
  const doorDir = new THREE.Vector3(Math.cos(swing + Math.PI), 0, -Math.sin(swing + Math.PI)); // along the leaf, from the hinge

  // upper floor: a slab with the stairwell left open
  const slab = (x0, x1, z0, z1) => { box(upper, x1 - x0, 0.3, z1 - z0, M.floor, (x0 + x1) / 2, F - 0.15, (z0 + z1) / 2).userData.inkId = 424242; };
  slab(-W / 2, STAIR.x0, -D / 2, D / 2);
  slab(STAIR.x0, W / 2, -D / 2, STAIR.zTop);
  slab(STAIR.x0, W / 2, STAIR.zBottom, D / 2);
  // ceiling beams under the upper floor (hidden in third person so they don't block the view)
  for (const z of [-3.6, -1.2, 1.2, 3.6]) {
    const reach = z > STAIR.zTop && z < STAIR.zBottom ? STAIR.x0 : W / 2;
    box(ceilings, reach + W / 2, 0.26, 0.24, M.planks, (reach - W / 2) / 2, F - 0.43, z); // seen in first person
  }
  const upBack = HOLES.back.upper, upLeft = HOLES.left.upper, upRight = HOLES.right.upper, upFront = HOLES.front.upper;
  wall(upper, 'x', bz, -W / 2 - T, W / 2 + T, F, TOP, upBack, M.bricks);
  wall(upper, 'z', lx, -D / 2, D / 2, F, TOP, upLeft, M.bricks);
  wall(cutUpper, 'z', rx, -D / 2, D / 2, F, TOP, upRight, M.bricks);
  wall(cutUpper, 'x', fz, -W / 2 - T, W / 2 + T, F, TOP, upFront, M.bricks);
  upBack.forEach((h) => windowIn(upper, 'x', bz, h, '+z', panes));
  upLeft.forEach((h) => windowIn(upper, 'z', lx, h, '+x', panes));
  upRight.forEach((h) => windowIn(cutUpper, 'z', rx, h, '-x', panes));
  upFront.forEach((h) => windowIn(cutUpper, 'x', fz, h, '-z', panes));
  // the railing around the stairwell upstairs
  box(upper, 0.08, 0.08, STAIR.zBottom - STAIR.zTop, M.planks, STAIR.x0 - 0.05, F + 1.0, (STAIR.zBottom + STAIR.zTop) / 2);
  box(upper, W / 2 - STAIR.x0, 0.08, 0.08, M.planks, (STAIR.x0 + W / 2) / 2, F + 1.0, STAIR.zBottom + 0.05);
  for (let z = STAIR.zTop + 0.4; z < STAIR.zBottom; z += 0.5) box(upper, 0.04, 1.0, 0.04, M.white, STAIR.x0 - 0.05, F + 0.5, z);
  for (let x = STAIR.x0 + 0.4; x < W / 2; x += 0.5) box(upper, 0.04, 1.0, 0.04, M.white, x, F + 0.5, STAIR.zBottom + 0.05);
  // roof: beams and a skylight (hidden in third person)
  box(ceilings, W + T * 2, 0.2, D + T * 2, M.white, 0, TOP + 0.1, 0);
  for (const x of [-4, 0, 4]) box(ceilings, 0.24, 0.3, D, M.planks, x, TOP - 0.15, 0);

  stairs(lower);

  // paneling, rails, baseboards and molding
  trim(lower, 'x', bz, -W / 2, W / 2, 0, F - 0.3, '+z');
  trim(lower, 'z', lx, -D / 2, D / 2, 0, F - 0.3, '+x', [[-1.3, 1.5]]); // not behind the fireplace
  trim(cutLower, 'z', rx, -D / 2, D / 2, 0, F - 0.3, '-x', [[STAIR.zTop - 0.2, STAIR.zBottom + 0.1]]);
  trim(cutLower, 'x', fz, -W / 2, W / 2, 0, F - 0.3, '-z', [[-(DOOR.w / 2 + 0.3), DOOR.w / 2 + 0.3]]); // around the door
  trim(upper, 'x', bz, -W / 2, W / 2, F, TOP, '+z');
  trim(upper, 'z', lx, -D / 2, D / 2, F, TOP, '+x');
  trim(cutUpper, 'x', fz, -W / 2, W / 2, F, TOP, '-z');
  return { hinge, doorDir };
}
