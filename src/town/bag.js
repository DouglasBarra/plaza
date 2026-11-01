// A bag of triangles for one material. The town's still parts (house walls,
// roofs, sidewalks, fences) are poured into bags, and each bag becomes one
// merged mesh, so hundreds of houses cost a handful of draw calls.
// Points are [x, y, z] arrays in world meters; UVs are in meters unless a
// texture wants otherwise (facades map one window bay to one tile).
import * as THREE from 'three';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export class Bag {
  // colors: a per-vertex color (bag.color), win: the window data (bag.win, see windows.js)
  constructor({ colors = false, win = false } = {}) {
    this.pos = []; this.nor = []; this.uv = [];
    this.cols = colors ? [] : null;
    this.wins = win ? [] : null;
    this.color = [1, 1, 1];
    this.win = [0, 0, 1, 1];
  }

  // One triangle. With `facing`, the corners are put in the order that faces
  // that way, so callers never have to think about winding.
  tri(a, b, c, ua = [0, 0], ub = [1, 0], uc = [1, 1], facing = null) {
    let n = cross(sub(b, a), sub(c, a));
    const l = Math.hypot(n[0], n[1], n[2]);
    if (l < 1e-9) return;
    if (facing && dot(n, facing) < 0) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; n = [-n[0], -n[1], -n[2]]; }
    n = [n[0] / l, n[1] / l, n[2] / l];
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.uv.push(u[0], u[1]);
      if (this.cols) this.cols.push(...this.color);
      if (this.wins) this.wins.push(...this.win);
    }
  }

  // A flat four-cornered face, corners in order around it.
  quad(a, b, c, d, ua = [0, 0], ub = [1, 0], uc = [1, 1], ud = [0, 1], facing = null) {
    this.tri(a, b, c, ua, ub, uc, facing);
    this.tri(a, c, d, ua, uc, ud, facing);
  }

  // An axis-aligned box with meter UVs. `skip` names faces to leave out:
  // x/X = the -x/+x side, y/Y = bottom/top, z/Z = -z/+z (the bottom by default).
  box(x0, x1, y0, y1, z0, z1, skip = 'y') {
    if (!skip.includes('X')) this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [z0, y0], [z1, y0], [z1, y1], [z0, y1], [1, 0, 0]);
    if (!skip.includes('x')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-z0, y0], [-z1, y0], [-z1, y1], [-z0, y1], [-1, 0, 0]);
    if (!skip.includes('Y')) this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [x0, z0], [x1, z0], [x1, z1], [x0, z1], [0, 1, 0]);
    if (!skip.includes('y')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, z0], [x1, z0], [x1, z1], [x0, z1], [0, -1, 0]);
    if (!skip.includes('Z')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0], [x1, y0], [x1, y1], [x0, y1], [0, 0, 1]);
    if (!skip.includes('z')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [-x0, y0], [-x1, y0], [-x1, y1], [-x0, y1], [0, 0, -1]);
  }

  // A flat horizontal rectangle facing up (a sidewalk top, a patch of paving).
  floor(x0, x1, z0, z1, y, scale = 1) {
    this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0 * scale, -z0 * scale], [x1 * scale, -z0 * scale], [x1 * scale, -z1 * scale], [x0 * scale, -z1 * scale], [0, 1, 0]);
  }

  // Pour in a three.js geometry, moved by `matrix`.
  geometry(geo, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(matrix);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      this.nor.push(v.x, v.y, v.z);
      this.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      if (this.cols) this.cols.push(...this.color);
      if (this.wins) this.wins.push(...this.win);
    }
  }

  get empty() { return this.pos.length === 0; }

  // The merged mesh, or null if nothing was poured in.
  mesh(material, { shadows = false } = {}) {
    if (this.empty) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.cols) g.setAttribute('color', new THREE.Float32BufferAttribute(this.cols, 3));
    if (this.wins) g.setAttribute('aWin', new THREE.Float32BufferAttribute(this.wins, 4));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.castShadow = shadows;
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    return m;
  }
}

// A facade's frame: A is its left end on the ground line as seen from the
// street, t runs along it to the right, n points out of it. p(s, y, d) is the
// point s meters along, at height y, d meters out from the wall.
export function facadeFrame(ax, az, tx, tz) {
  const nx = -tz, nz = tx;
  return {
    t: [tx, 0, tz], n: [nx, 0, nz],
    p: (s, y, d = 0) => [ax + tx * s + nx * d, y, az + tz * s + nz * d],
  };
}

// A face of the wall itself, from s0 to s1 and y0 to y1, d out from the line.
// `uv(s, y)` maps wall coordinates to the texture.
export function wallQuad(bag, F, s0, s1, y0, y1, d = 0, uv = (s, y) => [s, y]) {
  if (s1 - s0 < 1e-4 || y1 - y0 < 1e-4) return;
  bag.quad(F.p(s0, y0, d), F.p(s1, y0, d), F.p(s1, y1, d), F.p(s0, y1, d), uv(s0, y0), uv(s1, y0), uv(s1, y1), uv(s0, y1), F.n);
}

// The four sides of an opening cut `depth` deep into a wall that stands d0
// out from the facade line (the reveals).
export function reveal(bag, F, s0, s1, y0, y1, depth, d0 = 0) {
  const up = [0, 1, 0], down = [0, -1, 0], t = F.t, mt = [-t[0], 0, -t[2]];
  const q = (a, b, c, d, f, w, h) => bag.quad(a, b, c, d, [0, 0], [w, 0], [w, h], [0, h], f);
  const e = d0 - depth;
  q(F.p(s0, y0, d0), F.p(s0, y0, e), F.p(s0, y1, e), F.p(s0, y1, d0), t, depth, y1 - y0);
  q(F.p(s1, y0, d0), F.p(s1, y0, e), F.p(s1, y1, e), F.p(s1, y1, d0), mt, depth, y1 - y0);
  q(F.p(s0, y1, d0), F.p(s1, y1, d0), F.p(s1, y1, e), F.p(s0, y1, e), down, s1 - s0, depth);
  q(F.p(s0, y0, d0), F.p(s1, y0, d0), F.p(s1, y0, e), F.p(s0, y0, e), up, s1 - s0, depth);
}

// A wall from c0 to c1 and y0 to y1 with a hole from os0 to os1, oy0 to oy1.
export function holeyWall(bag, F, c0, c1, y0, y1, os0, os1, oy0, oy1, uv, d = 0) {
  wallQuad(bag, F, c0, os0, y0, y1, d, uv);
  wallQuad(bag, F, os1, c1, y0, y1, d, uv);
  wallQuad(bag, F, os0, os1, y0, oy0, d, uv);
  wallQuad(bag, F, os0, os1, oy1, y1, d, uv);
}

// A box given in a facade's coordinates (a sill, a cornice, a balcony).
export function frameBox(bag, F, s0, s1, y0, y1, d0, d1, skip = 'y') {
  const a = F.p(s0, y0, d0), b = F.p(s1, y1, d1);
  bag.box(Math.min(a[0], b[0]), Math.max(a[0], b[0]), y0, y1, Math.min(a[2], b[2]), Math.max(a[2], b[2]), skip);
}

// ---------- roofs over an axis-aligned footprint, eaves at height H ----------
// Each works in a frame where the ridge runs along `a` and the slopes fall
// along `b`; alongX says whether a is the world x axis.
function roofFrame(x0, x1, z0, z1, alongX) {
  return alongX
    ? { a0: x0, a1: x1, b0: z0, b1: z1, P: (a, y, b) => [a, y, b] }
    : { a0: z0, a1: z1, b0: x0, b1: x1, P: (a, y, b) => [b, y, a] };
}

// A gable roof; the gable ends go to `wall`. Returns the ridge height.
export function gableRoof(roof, wall, x0, x1, z0, z1, H, alongX, pitch, o = 0.4, oe = 0.12) {
  const { a0, a1, b0, b1, P } = roofFrame(x0, x1, z0, z1, alongX);
  const tan = Math.tan(pitch), half = (b1 - b0) / 2, bm = (b0 + b1) / 2;
  const R = H + half * tan, Ye = H - o * tan, L = (half + o) / Math.cos(pitch);
  for (const [be, sgn] of [[b1 + o, 1], [b0 - o, -1]]) {
    roof.quad(P(a0 - oe, Ye, be), P(a1 + oe, Ye, be), P(a1 + oe, R, bm), P(a0 - oe, R, bm),
      [a0 - oe, 0], [a1 + oe, 0], [a1 + oe, L], [a0 - oe, L], P(0, 1, sgn));
    // the fascia board along the eaves
    wall.quad(P(a0 - oe, Ye - 0.2, be), P(a1 + oe, Ye - 0.2, be), P(a1 + oe, Ye, be), P(a0 - oe, Ye, be),
      [a0, 0], [a1, 0], [a1, 0.2], [a0, 0.2], P(0, 0, sgn));
  }
  // under the eaves, seen from the street
  wall.quad(P(a0 - oe, Ye, b0 - o), P(a1 + oe, Ye, b0 - o), P(a1 + oe, Ye, b1 + o), P(a0 - oe, Ye, b1 + o),
    [a0, b0], [a1, b0], [a1, b1], [a0, b1], [0, -1, 0]);
  for (const [a, sgn] of [[a0, -1], [a1, 1]]) {
    wall.tri(P(a, H, b0), P(a, H, b1), P(a, R, bm), [b0, H], [b1, H], [bm, R], P(sgn, 0, 0));
    // the roof's edge seen end-on: a thin barge board
    roof.quad(P(a + sgn * oe, Ye, b1 + o), P(a + sgn * oe, R, bm), P(a + sgn * oe, R + 0.18, bm), P(a + sgn * oe, Ye + 0.18, b1 + o), [0, 0], [L, 0], [L, 0.18], [0, 0.18], P(sgn, 0, 0));
    roof.quad(P(a + sgn * oe, Ye, b0 - o), P(a + sgn * oe, R, bm), P(a + sgn * oe, R + 0.18, bm), P(a + sgn * oe, Ye + 0.18, b0 - o), [0, 0], [L, 0], [L, 0.18], [0, 0.18], P(sgn, 0, 0));
  }
  return R;
}

// A hipped roof (slopes on all four sides); a square one comes to a point.
export function hipRoof(roof, wall, x0, x1, z0, z1, H, pitch, o = 0.4) {
  const alongX = x1 - x0 >= z1 - z0;
  const { a0, a1, b0, b1, P } = roofFrame(x0, x1, z0, z1, alongX);
  const tan = Math.tan(pitch), half = (b1 - b0) / 2, bm = (b0 + b1) / 2;
  const R = H + half * tan, Ye = H - o * tan, L = (half + o) / Math.cos(pitch);
  const r0 = a0 + half, r1 = a1 - half;
  const A0 = a0 - o, A1 = a1 + o, B0 = b0 - o, B1 = b1 + o;
  roof.quad(P(A0, Ye, B1), P(A1, Ye, B1), P(r1, R, bm), P(r0, R, bm), [A0, 0], [A1, 0], [r1, L], [r0, L], P(0, 1, 1));
  roof.quad(P(A0, Ye, B0), P(A1, Ye, B0), P(r1, R, bm), P(r0, R, bm), [A0, 0], [A1, 0], [r1, L], [r0, L], P(0, 1, -1));
  roof.tri(P(A0, Ye, B0), P(A0, Ye, B1), P(r0, R, bm), [B0, 0], [B1, 0], [bm, L], P(-1, 1, 0));
  roof.tri(P(A1, Ye, B0), P(A1, Ye, B1), P(r1, R, bm), [B0, 0], [B1, 0], [bm, L], P(1, 1, 0));
  wall.quad(P(A0, Ye, B0), P(A1, Ye, B0), P(A1, Ye, B1), P(A0, Ye, B1), [A0, B0], [A1, B0], [A1, B1], [A0, B1], [0, -1, 0]);
  fascia(wall, P(A0, 0, B0), P(A1, 0, B1), Ye);
  return R;
}

// A mansard: a steep lower roof with a low hip on top. Returns the height of
// the steep part's top and the inset there (for dormers).
export function mansardRoof(roof, top, wall, x0, x1, z0, z1, H, steepH = 2.7, inset = 0.85) {
  const o = 0.15, Y0 = H, Y1 = H + steepH;
  const X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o;
  const I = inset;
  const L = Math.hypot(steepH, I + o);
  roof.quad([X0, Y0, Z1], [X1, Y0, Z1], [x1 - I, Y1, z1 - I], [x0 + I, Y1, z1 - I], [X0, 0], [X1, 0], [x1, L], [x0, L], [0, 0.3, 1]);
  roof.quad([X0, Y0, Z0], [X1, Y0, Z0], [x1 - I, Y1, z0 + I], [x0 + I, Y1, z0 + I], [X0, 0], [X1, 0], [x1, L], [x0, L], [0, 0.3, -1]);
  roof.quad([X1, Y0, Z0], [X1, Y0, Z1], [x1 - I, Y1, z1 - I], [x1 - I, Y1, z0 + I], [Z0, 0], [Z1, 0], [z1, L], [z0, L], [1, 0.3, 0]);
  roof.quad([X0, Y0, Z0], [X0, Y0, Z1], [x0 + I, Y1, z1 - I], [x0 + I, Y1, z0 + I], [Z0, 0], [Z1, 0], [z1, L], [z0, L], [-1, 0.3, 0]);
  // a cornice where the wall stops and the roof starts
  wall.box(x0 - 0.3, x1 + 0.3, Y0 - 0.35, Y0, z0 - 0.3, z1 + 0.3, '');
  const R = hipRoof(top, wall, x0 + I, x1 - I, z0 + I, z1 - I, Y1, 0.3, 0.05);
  return { top: Y1, inset: I, ridge: R };
}

// A flat roof behind a low parapet.
export function flatRoof(top, wall, x0, x1, z0, z1, H) {
  top.floor(x0, x1, z0, z1, H + 0.05);
  const t = 0.25, h = 0.7;
  wall.box(x0 - 0.05, x1 + 0.05, H, H + h, z1 - t, z1 + 0.05);
  wall.box(x0 - 0.05, x1 + 0.05, H, H + h, z0 - 0.05, z0 + t);
  wall.box(x0 - 0.05, x0 + t, H, H + h, z0 + t, z1 - t);
  wall.box(x1 - t, x1 + 0.05, H, H + h, z0 + t, z1 - t);
  return H + h;
}

// Thin boards round the eaves of a hipped roof.
function fascia(bag, a, b, Ye) {
  const [x0, , z0] = a, [x1, , z1] = b, y0 = Ye - 0.2;
  bag.quad([x0, y0, z1], [x1, y0, z1], [x1, Ye, z1], [x0, Ye, z1], [x0, 0], [x1, 0], [x1, 0.2], [x0, 0.2], [0, 0, 1]);
  bag.quad([x0, y0, z0], [x1, y0, z0], [x1, Ye, z0], [x0, Ye, z0], [x0, 0], [x1, 0], [x1, 0.2], [x0, 0.2], [0, 0, -1]);
  bag.quad([x1, y0, z0], [x1, y0, z1], [x1, Ye, z1], [x1, Ye, z0], [z0, 0], [z1, 0], [z1, 0.2], [z0, 0.2], [1, 0, 0]);
  bag.quad([x0, y0, z0], [x0, y0, z1], [x0, Ye, z1], [x0, Ye, z0], [z0, 0], [z1, 0], [z1, 0.2], [z0, 0.2], [-1, 0, 0]);
}
