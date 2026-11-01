// The town hall's structure: walls with real openings, windows with panes,
// wood trim, and the stairs between the floors.
import * as THREE from 'three';
import { M, mesh, box, cyl } from '../../kit.js';
import { T, F } from './dims.js';
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
