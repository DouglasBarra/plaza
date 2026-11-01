// The bank's structure: stone walls with real openings, tall windows with
// small panes, a marble dado, columns carrying the gallery, its balustrade,
// the stone stairs, the double door, and a coffered ceiling with a skylight
// under the dome.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, mesh, box, cyl } from '../../kit.js';
import { wall } from '../townhall/shell.js';
import { W, D, T, F, TOP, DOOR, DOOR_HOLE, HOLES, GALLERY, STAIR, OCULUS } from './dims.js';
import { marble, polished, brass, dark, glassDay } from './materials.js';

// ---------- windows ----------
// A tall window seen from inside: a deep stone reveal, a frame with small
// panes (four rows of two, the top row a fanlight of radiating bars), a
// stone sill. The pane shows glass or, in first person, the real plaza.
function windowIn(p, axis, at, hole, inward, panes, door = false) {
  const g = new THREE.Group();
  const rotY = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[inward];
  if (axis === 'x') g.position.set(hole.c, hole.y, at); else g.position.set(at, hole.y, hole.c);
  g.rotation.y = rotY;
  p.add(g);
  const f = T / 2 + 0.03, t = 0.1;
  // an architrave around the opening
  box(g, hole.w + t * 2, t, 0.12, polished, 0, hole.h / 2 + t / 2, f);
  if (!door) box(g, hole.w + t * 2, t, 0.12, polished, 0, -hole.h / 2 - t / 2, f);
  for (const k of [-1, 1]) box(g, t, hole.h, 0.12, polished, k * (hole.w / 2 + t / 2), 0, f);
  // a keystone over it
  box(g, 0.24, 0.3, 0.16, polished, 0, hole.h / 2 + t + 0.1, f + 0.02);
  const pane = mesh(new THREE.PlaneGeometry(hole.w, hole.h), glassDay, 0, 0, 0, g);
  pane.castShadow = false;
  pane.userData.door = door;
  panes.push(pane);
  if (door) return g;
  const bar = (w, h, x, y) => { box(g, w, h, 0.035, M.white, x, y, f - 0.03).castShadow = false; };
  const fan = hole.h * 0.22;                                   // the fanlight's height
  bar(0.035, hole.h - fan, 0, -fan / 2);                       // the middle mullion
  for (let i = 1; i < 3; i++) bar(hole.w, 0.03, 0, -hole.h / 2 + i * (hole.h - fan) / 3);
  bar(hole.w, 0.05, 0, hole.h / 2 - fan);                      // the transom
  for (let i = 1; i < 6; i++) {                                // fan bars from the transom's middle to the frame
    const a = (i / 6) * Math.PI;
    const len = Math.min(fan / Math.sin(a), hole.w / 2 / Math.max(1e-3, Math.abs(Math.cos(a))));
    const r = box(g, 0.025, len, 0.03, M.white, 0, 0, f - 0.03);
    r.geometry.translate(0, len / 2, 0);
    r.position.y = hole.h / 2 - fan;
    r.rotation.z = a - Math.PI / 2;
    r.castShadow = false;
  }
  box(g, hole.w + 0.4, 0.08, 0.32, polished, 0, -hole.h / 2 - 0.12, f + 0.1);  // sill
  return g;
}

// ---------- the dado ----------
// Polished stone panels on the lower part of a wall with a rail and a
// skirting, and a cornice under the ceiling. Like the town hall's trim().
function dado(p, axis, at, from, to, y0, ceiling, inward, gaps = []) {
  const s = inward[0] === '+' ? 1 : -1;
  const face = at + s * (T / 2 + 0.02);
  const piece = (a, b, y, h, d, mat) => {
    const len = b - a, c = (a + b) / 2, off = face + s * d / 2;
    const m = axis === 'x' ? box(p, len, h, d, mat, c, y, off) : box(p, d, h, len, mat, off, y, c);
    m.castShadow = false;
    m.userData.inkId = 6e5 + y;
    return m;
  };
  let cursor = from;
  for (const [a, b] of [...gaps, [to, to]].sort((u, v) => u[0] - v[0])) {
    if (a - cursor > 0.05) {
      piece(cursor, a, y0 + 0.6, 1.2, 0.05, polished);
      piece(cursor, a, y0 + 1.22, 0.08, 0.1, M.white);
      piece(cursor, a, y0 + 0.1, 0.2, 0.08, M.stone);
    }
    cursor = Math.max(cursor, b);
  }
  piece(from, to, ceiling - 0.12, 0.24, 0.2, M.white);
  piece(from, to, ceiling - 0.3, 0.08, 0.1, M.white);
}

// ---------- a column ----------
// Base, a fluted shaft (a ring of thin boxes), and a capital with a scroll.
export function column(p, x, z, h, r = 0.26) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  box(g, r * 3, 0.16, r * 3, polished, 0, 0.08, 0);
  cyl(g, r * 1.25, r * 1.35, 0.14, polished, 0, 0.23, 0, 18);
  cyl(g, r, r * 1.08, h - 0.7, M.white, 0, 0.3 + (h - 0.7) / 2, 0, 18);
  for (let i = 0; i < 10; i++) {                       // flutes
    const a = (i / 10) * Math.PI * 2;
    box(g, 0.025, h - 0.9, 0.025, M.white, Math.cos(a) * r * 1.02, 0.3 + (h - 0.7) / 2, Math.sin(a) * r * 1.02).castShadow = false;
  }
  cyl(g, r * 1.4, r, 0.22, polished, 0, h - 0.3, 0, 18);
  box(g, r * 3.2, 0.18, r * 3.2, polished, 0, h - 0.09, 0);
  for (const sx of [-1, 1]) mesh(new THREE.TorusGeometry(0.07, 0.025, 5, 10), M.white, sx * r * 1.25, h - 0.28, r * 1.2, g);
  return g;
}

// ---------- stairs ----------
export const inStair = (x, z) => x > STAIR.x0 && x < STAIR.x1 && z < STAIR.zBottom + 0.3 && z > STAIR.zTop - 0.05;
export const stairHeight = (z) => THREE.MathUtils.clamp((STAIR.zBottom - z) / (STAIR.zBottom - STAIR.zTop), 0, 1) * F;

function stairs(p) {
  const n = 18, run = (STAIR.zBottom - STAIR.zTop) / n, rise = F / n;
  const w = STAIR.x1 - STAIR.x0, cx = (STAIR.x0 + STAIR.x1) / 2;
  for (let i = 0; i < n; i++) {
    const z = STAIR.zBottom - (i + 0.5) * run;
    box(p, w, rise * (i + 1), run, M.stone, cx, (rise * (i + 1)) / 2, z);
    box(p, w + 0.04, 0.05, run + 0.03, polished, cx, rise * (i + 1) + 0.025, z);
  }
  // a runner carpet up the middle
  const len = Math.hypot(STAIR.zBottom - STAIR.zTop, F);
  const runner = box(p, 0.8, 0.02, len, M.stripes, cx, F / 2 + 0.06, (STAIR.zBottom + STAIR.zTop) / 2);
  runner.rotation.x = Math.atan2(F, STAIR.zBottom - STAIR.zTop);
  runner.castShadow = false;
  // the balustrade on the open side: a brass rail on stone balusters
  const rail = box(p, 0.09, 0.09, len, brass, STAIR.x0 + 0.05, F / 2 + 1.0, (STAIR.zBottom + STAIR.zTop) / 2);
  rail.rotation.x = Math.atan2(F, STAIR.zBottom - STAIR.zTop);
  for (let i = 0; i <= n; i += 2) {
    const z = STAIR.zBottom - i * run;
    baluster(p, STAIR.x0 + 0.05, rise * i, z, 0.95);
  }
  box(p, 0.3, 1.2, 0.3, polished, STAIR.x0 + 0.05, 0.6, STAIR.zBottom);   // the newel post
  mesh(new THREE.SphereGeometry(0.13, 10, 8), brass, STAIR.x0 + 0.05, 1.3, STAIR.zBottom, p);
}

// A turned stone baluster, h tall, standing at (x, y, z).
const balGeo = new THREE.LatheGeometry([
  [0, 0], [0.07, 0], [0.07, 0.05], [0.05, 0.1], [0.08, 0.3], [0.04, 0.55], [0.035, 0.7], [0.06, 0.74], [0.06, 0.8], [0, 0.8],
].map(([r, y]) => new THREE.Vector2(r, y)), 8);
function baluster(p, x, y, z, h) {
  const b = mesh(balGeo, M.white, x, y, z, p);
  b.scale.y = h / 0.8;
  return b;
}

// A balustrade from (x0, z0) to (x1, z1) at height y: plinth, balusters, a top rail.
function balustrade(p, x0, z0, x1, z1, y) {
  const len = Math.hypot(x1 - x0, z1 - z0), rot = Math.atan2(x1 - x0, z1 - z0);
  const g = new THREE.Group();
  g.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  g.rotation.y = rot;
  p.add(g);
  box(g, 0.2, 0.12, len, polished, 0, 0.06, 0);
  box(g, 0.22, 0.1, len + 0.04, polished, 0, 1.0, 0);
  box(g, 0.06, 0.05, len, brass, 0, 1.08, 0);
  const n = Math.max(2, Math.round(len / 0.32));
  for (let i = 0; i <= n; i++) baluster(g, 0, 0.12, -len / 2 + (i / n) * len, 0.84);
  return g;
}

// ---------- the whole hall ----------
// Parts go into the render groups made by buildBank (as in the town hall:
// `lower`, `upper`, `ceilings`, and the walls facing the third-person
// camera in `cutLower` / `cutUpper`). Returns the door leaves' colliders.
export function buildHall({ lower, upper, ceilings, cutLower, cutUpper, panes }) {
  box(lower, W + T * 2, 0.3, D + T * 2, marble, 0, -0.15, 0);
  const bz = -D / 2 - T / 2, fz = D / 2 + T / 2, lx = -W / 2 - T / 2, rx = W / 2 + T / 2;
  const frontLow = [...HOLES.front.lower, DOOR_HOLE];
  wall(lower, 'x', bz, -W / 2 - T, W / 2 + T, 0, F, HOLES.back.lower, M.stone);
  wall(lower, 'z', lx, -D / 2, D / 2, 0, F, HOLES.left.lower, M.stone);
  wall(cutLower, 'z', rx, -D / 2, D / 2, 0, F, HOLES.right.lower, M.stone);
  wall(cutLower, 'x', fz, -W / 2 - T, W / 2 + T, 0, F, frontLow, M.stone);
  HOLES.left.lower.forEach((h) => windowIn(lower, 'z', lx, h, '+x', panes));
  HOLES.right.lower.forEach((h) => windowIn(cutLower, 'z', rx, h, '-x', panes));
  frontLow.forEach((h) => windowIn(cutLower, 'x', fz, h, '-z', panes, h === DOOR_HOLE));

  // the doorway: a frame and a mat that stay in the cutaway, so you can find the way out
  for (const x of [-1, 1]) box(lower, 0.2, DOOR.h + 0.1, 0.42, polished, x * (DOOR.w / 2 + 0.1), (DOOR.h + 0.1) / 2, fz);
  box(lower, DOOR.w + 0.4, 0.2, 0.42, polished, 0, DOOR.h + 0.1, fz);
  box(lower, DOOR.w + 0.2, 0.04, 1.1, M.dirt, 0, 0.02, D / 2 - 0.75);
  // two door leaves, standing open against the wall on each side
  const colliders = [];
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set(s * DOOR.w / 2, 0, D / 2 - 0.05);
    leaf.rotation.y = -s * 1.75;                           // swung in, toward the wall
    lower.add(leaf);
    const lw = DOOR.w / 2;
    box(leaf, lw, DOOR.h, 0.08, M.planks, -s * lw / 2, DOOR.h / 2, 0);
    for (const y of [0.75, 1.9]) for (const side of [-1, 1]) box(leaf, lw * 0.7, y > 1 ? 1.2 : 0.9, 0.03, M.planks, -s * lw / 2, y, side * 0.055);
    mesh(new THREE.SphereGeometry(0.05, 8, 6), brass, -s * (lw - 0.12), 1.3, 0.09, leaf);
    const dir = new THREE.Vector3(-s, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), leaf.rotation.y);
    for (const t of [0.3, 0.7]) colliders.push({ x: leaf.position.x + dir.x * t, z: leaf.position.z + dir.z * t, r: 0.2 });
  }

  // ---- the gallery: a strip along the back and one along the left, on columns
  const slab = (x0, x1, z0, z1) => {
    const m = box(upper, x1 - x0, 0.4, z1 - z0, marble, (x0 + x1) / 2, F - 0.2, (z0 + z1) / 2);
    m.userData.inkId = 525252;
  };
  slab(-W / 2, W / 2, -D / 2, GALLERY.back);
  slab(-W / 2, GALLERY.left, GALLERY.back, D / 2);
  // its edge, seen from below: an entablature with dentils
  const edge = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = z0 === z1;
    const e = alongX ? box(lower, len, 0.5, 0.3, M.white, (x0 + x1) / 2, F - 0.45, z0) : box(lower, 0.3, 0.5, len, M.white, x0, F - 0.45, (z0 + z1) / 2);
    e.userData.inkId = 535353;
    for (let k = 0.15; k < len; k += 0.3) {
      const d = alongX ? box(lower, 0.12, 0.1, 0.06, M.white, x0 + k, F - 0.75, z0 + 0.17) : box(lower, 0.06, 0.1, 0.12, M.white, x0 + 0.17, F - 0.75, z0 + k);
      d.castShadow = false;
    }
  };
  edge(GALLERY.left, GALLERY.back + 0.15, STAIR.x0, GALLERY.back + 0.15);
  edge(GALLERY.left + 0.15, GALLERY.back, GALLERY.left + 0.15, D / 2);
  const cols = [];
  for (const x of [GALLERY.left + 0.15, -0.4, 2.2]) cols.push([x, GALLERY.back + 0.15]);
  for (const z of [0.8, 3.4]) cols.push([GALLERY.left + 0.15, z]);
  for (const [x, z] of cols) column(lower, x, z, F - 0.7);
  // the gallery's balustrade, open where the stairs arrive
  balustrade(upper, GALLERY.left, GALLERY.back + 0.12, STAIR.x0 - 0.05, GALLERY.back + 0.12, F);
  balustrade(upper, GALLERY.left + 0.12, GALLERY.back, GALLERY.left + 0.12, D / 2, F);
  // beams under the gallery (hidden in third person)
  for (const x of [-4.5, -1.5, 1.5, 4.5]) box(ceilings, 0.22, 0.24, D / 2 + GALLERY.back, M.white, x, F - 0.52, (-D / 2 + GALLERY.back) / 2);

  // ---- upstairs walls, windows
  wall(upper, 'x', bz, -W / 2 - T, W / 2 + T, F, TOP, HOLES.back.upper, M.stone);
  wall(upper, 'z', lx, -D / 2, D / 2, F, TOP, HOLES.left.upper, M.stone);
  wall(cutUpper, 'z', rx, -D / 2, D / 2, F, TOP, HOLES.right.upper, M.stone);
  wall(cutUpper, 'x', fz, -W / 2 - T, W / 2 + T, F, TOP, HOLES.front.upper, M.stone);
  HOLES.back.upper.forEach((h) => windowIn(upper, 'x', bz, h, '+z', panes));
  HOLES.left.upper.forEach((h) => windowIn(upper, 'z', lx, h, '+x', panes));
  HOLES.right.upper.forEach((h) => windowIn(cutUpper, 'z', rx, h, '-x', panes));
  HOLES.front.upper.forEach((h) => windowIn(cutUpper, 'x', fz, h, '-z', panes));

  // ---- pilasters between the windows, both floors
  const pilaster = (p, axis, at, c, y0, h, s) => {
    const m = axis === 'x' ? box(p, 0.5, h, 0.16, M.white, c, y0 + h / 2, at + s * 0.08) : box(p, 0.16, h, 0.5, M.white, at + s * 0.08, y0 + h / 2, c);
    m.castShadow = false;
    const cap = axis === 'x' ? box(p, 0.64, 0.16, 0.24, polished, c, y0 + h - 0.08, at + s * 0.1) : box(p, 0.24, 0.16, 0.64, polished, at + s * 0.1, y0 + h - 0.08, c);
    cap.castShadow = false;
  };
  for (const z of [-4.2, 0, 4.2]) {
    pilaster(lower, 'z', -W / 2, z, 0, F - 0.6, 1);
    pilaster(cutLower, 'z', W / 2, z, 0, F - 0.6, -1);
    pilaster(upper, 'z', -W / 2, z, F, TOP - F - 0.4, 1);
    pilaster(cutUpper, 'z', W / 2, z, F, TOP - F - 0.4, -1);
  }
  for (const x of [-5.4, -1.9, 1.9, 5.4]) pilaster(upper, 'x', -D / 2, x, F, TOP - F - 0.4, 1);

  // ---- the ceiling: coffers around a round skylight, and the dome above it
  const ceil = toon('#ffffff');
  const hole = OCULUS.r;
  const { x: ox, z: oz } = OCULUS;
  const ceilPart = (x0, x1, z0, z1) => box(ceilings, x1 - x0, 0.25, z1 - z0, ceil, (x0 + x1) / 2, TOP + 0.12, (z0 + z1) / 2);
  ceilPart(-W / 2 - T, W / 2 + T, -D / 2 - T, oz - hole);
  ceilPart(-W / 2 - T, W / 2 + T, oz + hole, D / 2 + T);
  ceilPart(-W / 2 - T, ox - hole, oz - hole, oz + hole);
  ceilPart(ox + hole, W / 2 + T, oz - hole, oz + hole);
  // the square opening's corners, filled to make it round
  const ring = new THREE.Shape();
  ring.moveTo(-hole, -hole); ring.lineTo(hole, -hole); ring.lineTo(hole, hole); ring.lineTo(-hole, hole); ring.closePath();
  const circle = new THREE.Path(); circle.absarc(0, 0, hole * 0.98, 0, Math.PI * 2, true);
  ring.holes.push(circle);
  const corners = mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.25, bevelEnabled: false, curveSegments: 32 }), ceil, ox, TOP + 0.25, oz, ceilings);
  corners.rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(hole, 0.1, 6, 40), polished, ox, TOP - 0.02, oz, ceilings).rotation.x = Math.PI / 2;
  // coffers: a grid of ribs under the ceiling
  for (let x = -W / 2 + 1.5; x < W / 2; x += 1.5) box(ceilings, 0.14, 0.22, D, M.white, x, TOP - 0.11, 0).castShadow = false;
  for (let z = -D / 2 + 1.25; z < D / 2; z += 1.25) box(ceilings, W, 0.22, 0.14, M.white, 0, TOP - 0.11, z).castShadow = false;
  // the inside of the dome over the skylight, ribbed, with a glass eye at the top
  const domeMat = toon('#ffffff'); domeMat.side = THREE.BackSide;
  mesh(new THREE.CylinderGeometry(hole, hole, 0.9, 32, 1, true), domeMat, ox, TOP + 0.7, oz, ceilings).castShadow = false;
  mesh(new THREE.SphereGeometry(hole, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, ox, TOP + 1.15, oz, ceilings).castShadow = false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = mesh(new THREE.TorusGeometry(hole * 0.97, 0.04, 4, 16, Math.PI / 2), M.white, ox, TOP + 1.15, oz, ceilings);
    rib.rotation.set(0, a, Math.PI / 2);
  }
  const eye = mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: '#f6f7f2' }), ox, TOP + 1.15 + hole - 0.08, oz, ceilings);
  eye.rotation.x = Math.PI / 2;
  // over it all, the roof (hidden in third person)
  box(ceilings, W + T * 2, 0.2, D + T * 2, M.white, 0, TOP + 2.95, 0).visible = false;

  stairs(lower);

  // ---- dado and cornices
  dado(lower, 'x', bz, -W / 2, W / 2, 0, F - 0.8, '+z');
  dado(lower, 'z', lx, -D / 2, D / 2, 0, F - 0.8, '+x');
  dado(cutLower, 'z', rx, -D / 2, D / 2, 0, F - 0.8, '-x', [[STAIR.zTop - 0.2, STAIR.zBottom + 0.2]]);
  dado(cutLower, 'x', fz, -W / 2, W / 2, 0, F - 0.8, '-z', [[-(DOOR.w / 2 + 0.35), DOOR.w / 2 + 0.35]]);
  dado(upper, 'x', bz, -W / 2, W / 2, F, TOP, '+z');
  dado(upper, 'z', lx, -D / 2, D / 2, F, TOP, '+x');
  dado(cutUpper, 'x', fz, -W / 2, W / 2, F, TOP, '-z');
  dado(cutUpper, 'z', rx, -D / 2, D / 2, F, TOP, '-x');

  // colliders: the columns, and (upstairs) the balustrade and the drop beside the stairs
  for (const [x, z] of cols) colliders.push({ x, z, r: 0.42 });
  const rail = (x0, z0, x1, z1) => colliders.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.abs(x1 - x0) / 2 + 0.1, hd: Math.abs(z1 - z0) / 2 + 0.1, rot: 0, level: 1 });
  rail(GALLERY.left, GALLERY.back + 0.1, STAIR.x0 - 0.05, GALLERY.back + 0.1);
  rail(GALLERY.left + 0.1, GALLERY.back, GALLERY.left + 0.1, D / 2);
  rail(STAIR.x0 - 0.05, GALLERY.back, STAIR.x0 - 0.05, STAIR.zBottom);  // the stairs' open side, from above
  return { colliders, dark };
}
