// The fountain in the middle of the plaza, at real size (meters): a wide
// round basin on a low step, with a molded stone rim you can sit on, and a
// pedestal standing in the water that carries three tiered bowls. Water
// spills over the two upper bowls as thin sheets, pours from eight lips on
// the big bowl and from four lion masks, and a bell-shaped jet crowns it;
// it splashes and rings out where it lands. At night the water glows softly
// (unlit materials, no real lights).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, stamp, mesh } from '../kit.js';
import { toon } from '../ink.js';
import { isNight, skipND } from '../life.js';
import { swapModel } from '../models.js';

// Sizes index.js needs: the step's outer radius, the rim's outer edge, and
// where a person sits on the rim (radius, seat height).
export const FOUNTAIN = { step: 6.35, rim: 5.72, seatR: 5.5, seat: 0.71 };

const BASIN_IN = 5.13;   // inside face of the rim
const FLOOR = 0.18;      // the basin's floor
const POOL = 0.52;       // the basin's water level
const DRUM = 1.3;        // the pedestal's drum, standing in the water
const MOUTH = [DRUM + 0.3, 0.8]; // where a lion's jet leaves its mouth [r, y]
const G = 9.8;

let seed = 5150;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- line-art textures (one tile = 1 m unless the UVs say otherwise) ----------
function lineArt(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = g.fillStyle = '#111111';
  g.lineCap = g.lineJoin = 'round';
  g.lineWidth = 4;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.userData.lineArt = true; // drawn in the ink color (ink.js)
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// a pen stroke through points, with a little tremor
function stroke(g, pts, wob = 1.2) {
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const j = i && i < pts.length - 1 ? wob : 0;
    const px = x + (rand() - 0.5) * j * 2, py = y + (rand() - 0.5) * j * 2;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  });
  g.stroke();
}

// stone blocks: one joint per tile (u counts blocks), a few chisel marks
const jointsTex = lineArt((g) => {
  g.lineWidth = 5;
  stroke(g, [[3, 0], [4, 64], [3, 128], [4, 192], [3, 256]], 1);
  g.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) {
    const x = 40 + rand() * 170, y = rand() * 230;
    stroke(g, [[x, y], [x + 10, y + 5], [x + 16, y + 3]], 0.5);
  }
});
// the basin's floor: square slabs (0.7 m), a few pits
const slabTex = lineArt((g) => {
  g.lineWidth = 4;
  stroke(g, [[0, 2], [128, 3], [256, 2]], 1);
  stroke(g, [[2, 0], [3, 128], [2, 256]], 1);
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(rand() * 256, rand() * 256, 2, 0, 7); g.fill(); }
});
slabTex.repeat.set(1 / 0.7, 1 / 0.7);
// water surfaces: broken wavy rings (v runs across the rings, in meters)
const ringTex = lineArt((g) => {
  g.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const x = (i * 37 + rand() * 20) % 256, y = (i * 83 + rand() * 30) % 256, w = 26 + rand() * 30;
    for (const [dx, dy] of [[0, 0], [-256, 0], [0, -256], [-256, -256]]) {
      stroke(g, [[x + dx, y + dy], [x + dx + w * 0.25, y + dy - 4], [x + dx + w * 0.5, y + dy], [x + dx + w * 0.75, y + dy - 4], [x + dx + w, y + dy]], 0.3);
    }
  }
});
// falling water: long streaks along the flow (v, meters); a tile is 0.5 m across
const streakTex = lineArt((g) => {
  g.lineWidth = 5;
  for (const [x, y0, len] of [[20, 0, 180], [70, 120, 220], [118, 30, 130], [165, 170, 160], [205, 60, 200], [240, 200, 90]]) {
    const pts = [];
    for (let k = 0; k <= 6; k++) pts.push([x + Math.sin(k + x) * 2, y0 + (len * k) / 6]);
    stroke(g, pts, 0.8);
    stroke(g, pts.map(([px, py]) => [px, py - 256]), 0.8);
  }
});

// ---------- materials ----------
const stone = M.white;
const blocks = toon('#ffffff', jointsTex);
const floorMat = toon('#cfcfc9', slabTex);
const coinMat = toon('#d2d2cc');
const see = (m, opacity) => { m.transparent = true; m.opacity = opacity; m.depthWrite = false; return m; };
const day = {
  fall: see(new THREE.MeshBasicMaterial({ color: '#ffffff', map: streakTex }), 0.6),
  bowl: toon('#f4f6f5', ringTex),
  pool: see(toon('#d9dddc', ringTex), 0.7),
  foam: toon('#ffffff'),
};
day.fall.side = THREE.DoubleSide;
day.foam.side = THREE.DoubleSide;
// at night the water gives off a soft light of its own
const unlit = (color, map, opacity) => {
  const m = new THREE.MeshBasicMaterial({ color, map: map || null });
  return opacity ? see(m, opacity) : m;
};
const night = {
  fall: unlit('#dfe6e4', streakTex, 0.8),
  bowl: unlit('#a9b3b1', ringTex),
  pool: unlit('#6f7a79', ringTex, 0.8),
  foam: unlit('#eef2f1'),
};
night.fall.side = night.foam.side = THREE.DoubleSide;

// ---------- geometry ----------
// Turn a profile [[r, y, corner, bulge], ...] about the y axis. A corner
// point is doubled so the shading breaks there. UVs: u counts `blocks`
// around the circle, v is meters along the profile. `lobes` pushes points
// out and in around the circle by their `bulge` weight (gadroons); `dip(a)`
// (0..1) lowers points by their `drop` weight (notches in a lip).
// Trace the outside going up and across the top inward, so it faces out.
function revolve(profile, { seg = 64, blocks: nb = seg / 4, a0 = 0, arc = Math.PI * 2, lobes = 0, amp = 0.05, dip = null } = {}) {
  const pts = [];
  for (const p of profile) { pts.push(p); if (p[2]) pts.push(p); }
  const vs = [0];
  for (let i = 1; i < pts.length; i++) vs.push(vs[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const pos = [], uv = [], idx = [], n = pts.length;
  for (let j = 0; j <= seg; j++) {
    const t = j / seg, a = a0 + t * arc, c = Math.cos(a), s = Math.sin(a);
    const lobe = lobes ? Math.pow(Math.abs(Math.cos((a * lobes) / 2)), 0.6) - 0.6 : 0;
    const notch = dip ? dip(a) : 0;
    for (let i = 0; i < n; i++) {
      const r = pts[i][0] * (1 + (pts[i][3] || 0) * amp * lobe);
      pos.push(c * r, pts[i][1] - (pts[i][4] || 0) * notch, s * r);
      uv.push(t * nb, vs[i]);
    }
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + n;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  return finish(pos, uv, idx);
}
function finish(pos, uv, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A tube along a path [[r, y], ...] in the vertical half-plane at angle `a`,
// `w` wide (across) and `t` thick (in the plane), both half sizes and
// functions of how far along it is (0..1). UVs: u in 0.5 m tiles around,
// v meters along the flow.
function flowTube(path, a, w, t, n = 8) {
  const B = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
  const P = path.map(([r, y]) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  const pos = [], uv = [], idx = [];
  let v = 0;
  P.forEach((p, i) => {
    if (i) v += p.distanceTo(P[i - 1]);
    const T = P[Math.min(i + 1, P.length - 1)].clone().sub(P[Math.max(i - 1, 0)]).normalize();
    const N = new THREE.Vector3().crossVectors(B, T);
    const f = i / (P.length - 1), ww = w(f), tt = t(f);
    for (let k = 0; k <= n; k++) {
      const phi = (k / n) * Math.PI * 2;
      const q = p.clone().addScaledVector(B, Math.cos(phi) * ww).addScaledVector(N, Math.sin(phi) * tt);
      pos.push(q.x, q.y, q.z);
      uv.push(((k / n) * 2 * Math.PI * Math.sqrt((ww * ww + tt * tt) / 2)) / 0.5, v);
    }
  });
  for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < n; k++) {
    const a0 = i * (n + 1) + k, b0 = a0 + n + 1;
    idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
  }
  return finish(pos, uv, idx);
}

// Water thrown from (r0, y0) at speed (vr, vy), until it falls to yEnd.
function arc(r0, y0, vr, vy, yEnd, steps = 14) {
  const disc = vy * vy + 2 * G * (y0 - yEnd);
  const T = (vy + Math.sqrt(disc)) / G;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (T * i) / steps;
    pts.push([r0 + vr * t, y0 + vy * t - 0.5 * G * t * t]);
  }
  return pts;
}

// Place a primitive: scale, then turn (x, y, z), then move.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function put(geo, [x, y, z], [rx, ry, rz] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1]) {
  _q.setFromEuler(_e.set(rx, ry, rz));
  return geo.applyMatrix4(_m.compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(sx, sy, sz)));
}
const sphere = (r, ws = 10, hs = 8) => new THREE.SphereGeometry(r, ws, hs);

// A lion mask facing +z, its mouth at (0, -0.04, 0.15); white stone parts
// go in `w`, the dark mouth, eyes and nostrils in `d`.
function lionMask(w, d) {
  w.push(put(sphere(0.25, 16, 10), [0, 0.06, -0.06], [0, 0, 0], [1, 1.05, 0.38]));        // mane
  for (const [n, rr, z, sc] of [[16, 0.25, -0.03, 1], [12, 0.18, 0.0, 0.75]]) {          // its locks
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5 * (n % 16 ? 1 : 0)) / n) * Math.PI * 2;
      w.push(put(new THREE.ConeGeometry(0.06 * sc, 0.17 * sc, 6), [Math.sin(a) * rr, 0.06 + Math.cos(a) * rr, z], [0, 0, -a], [1, 1, 0.6]));
    }
  }
  w.push(put(sphere(0.15, 14, 10), [0, 0.06, 0.04], [0, 0, 0], [1, 1.15, 0.75]));        // face
  w.push(put(new THREE.ConeGeometry(0.07, 0.14, 8), [0, -0.12, 0.07], [Math.PI, 0, 0], [1, 1, 0.7])); // beard
  for (const s of [-1, 1]) {
    w.push(put(new THREE.BoxGeometry(0.11, 0.03, 0.06), [s * 0.05, 0.135, 0.14], [0.2, 0, s * -0.3])); // frowning brows
    w.push(put(sphere(0.06, 8, 6), [s * 0.045, -0.0, 0.15], [0, 0, 0], [1, 0.85, 1]));  // whisker pads
    w.push(put(sphere(0.05, 8, 6), [s * 0.16, 0.25, 0.0]));                              // ears
    d.push(put(sphere(0.024, 8, 6), [s * 0.058, 0.095, 0.14]));                          // eyes
    d.push(put(sphere(0.012, 6, 4), [s * 0.018, 0.033, 0.2]));                           // nostrils
  }
  w.push(put(new THREE.BoxGeometry(0.07, 0.09, 0.07), [0, 0.07, 0.165], [-0.35, 0, 0])); // nose
  w.push(put(new THREE.TorusGeometry(0.042, 0.014, 6, 14), [0, -0.04, 0.15], [0, 0, 0], [1, 0.85, 1])); // lips round the spout
  d.push(put(new THREE.CircleGeometry(0.04, 14), [0, -0.04, 0.152]));                    // mouth
}

// A ragged ring of splash where falling water lands: a frill of spray and
// a band of foam on the water. `r` is the ring's radius around (cx, cz).
function splash(out, cx, cz, r, y, h, n) {
  const pos = [], uv = [], idx = [];
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const tall = k % 2 ? 0.25 + rand() * 0.25 : 0.6 + rand() * 0.4;
    const ro = r * (1.05 + rand() * 0.12) + h * 0.35 * tall;
    pos.push(cx + c * r * 0.97, y, cz + s * r * 0.97, cx + c * ro, y + h * tall, cz + s * ro);
    uv.push(k / n, 0, k / n, 1);
  }
  for (let k = 0; k < n; k++) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  out.push(finish(pos, uv, idx));
  // the foam, lying on the water
  const fp = [], fu = [], fi = [];
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const ri = Math.max(0.01, r * 0.78 - rand() * 0.04), ro = r * 1.18 + rand() * Math.max(0.05, r * 0.12);
    fp.push(cx + c * ri, y + 0.006, cz + s * ri, cx + c * ro, y + 0.006, cz + s * ro);
    fu.push(k / n, 0, k / n, 1);
  }
  for (let k = 0; k < n; k++) { const a = k * 2; fi.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  out.push(finish(fp, fu, fi));
}

// ---------- the bowls and the water's path, in one place ----------
// [lip radius, lip top, water level, inner radius]
const BOWLS = {
  low: { lip: 2.52, top: 2.19, water: 2.155, inner: 2.36 },
  mid: { lip: 1.35, top: 3.55, water: 3.545, inner: 1.27 },
  top: { lip: 0.63, top: 4.38, water: 4.375, inner: 0.57 },
};
const POUR = 8;     // lips on the big bowl
const LIONS = 4;
// where things land: [radius, level]
const LAND = {
  mid: arc(BOWLS.mid.lip + 0.01, BOWLS.mid.top, 0.55, 0.05, BOWLS.low.water).pop(),
  top: arc(BOWLS.top.lip + 0.01, BOWLS.top.top, 0.45, 0.05, BOWLS.mid.water).pop(),
  pour: arc(2.54, 2.15, 0.9, 0.12, POOL).pop(),
  lion: arc(...MOUTH, 2.2, 0.75, POOL).pop(),
};
const pourAngle = (i) => ((i + 0.5) / POUR) * Math.PI * 2;
const lionAngle = (i) => (i / LIONS) * Math.PI * 2 + Math.PI / 2; // one faces the south (+z)

function stoneWork() {
  const w = [], b = [], d = [];
  // the step all round, and the basin's wall
  b.push(revolve([[FOUNTAIN.step, 0], [FOUNTAIN.step, 0.27, 1], [FOUNTAIN.step - 0.04, 0.32, 1], [5.62, 0.32, 1]], { seg: 96, blocks: 30 }));
  b.push(revolve([[5.62, 0.32, 1], [5.62, 0.35], [5.585, 0.39, 1], [5.55, 0.40, 1], [5.55, 0.556, 1]], { seg: 96, blocks: 34 }));
  // the coping: a rounded stone lip you can sit on, overhanging the wall
  b.push(revolve([[5.55, 0.556, 1], [5.69, 0.565, 1], [5.72, 0.595], [5.725, 0.63], [5.70, 0.665], [5.64, 0.68, 1],
    [5.17, 0.68, 1], [5.14, 0.665], [5.13, 0.64, 1], [BASIN_IN, FLOOR, 1]], { seg: 96, blocks: 24 }));
  // the pedestal: a drum in the water with a cornice, then a baluster
  w.push(revolve([[1.48, FLOOR], [1.48, 0.33, 1], [1.42, 0.38], [1.35, 0.40, 1], [DRUM, 0.42, 1], [DRUM, 1.2, 1],
    [1.36, 1.22], [1.42, 1.27, 1], [1.46, 1.28, 1], [1.46, 1.35, 1], [1.38, 1.37, 1], [0.62, 1.38, 1],
    [0.6, 1.42], [0.5, 1.46, 1], [0.42, 1.5], [0.4, 1.56], [0.46, 1.63], [0.44, 1.7], [0.34, 1.76, 1]], { seg: 48 }));
  // the big bowl, gadrooned underneath, with a rolled lip
  // with a rolled lip, notched where it pours (between the lions)
  w.push(revolve([[0.34, 1.76, 1], [0.6, 1.8, 0, 0.4], [1.1, 1.86, 0, 1], [1.7, 1.93, 0, 1], [2.15, 1.99, 0, 0.6], [2.36, 2.0, 1],
    [2.45, 2.03, 0, 0, 0.005], [2.51, 2.08, 0, 0, 0.01], [2.535, 2.135, 0, 0, 0.03], [2.515, 2.175, 0, 0, 0.05], [2.45, 2.19, 1, 0, 0.05], [2.37, 2.17, 1, 0, 0.03],
    [BOWLS.low.inner, 2.11, 1], [0.44, 2.11, 1]],
  { seg: 192, lobes: 24, amp: 0.06, dip: (a) => {
    const x = (((a - pourAngle(0)) % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4), d = Math.min(x, Math.PI / 4 - x);
    return Math.max(0, 1 - (d / 0.11) ** 2);
  } }));
  // the middle shaft with a knop, and the middle bowl
  w.push(revolve([[0.44, 2.11, 1], [0.44, 2.17, 1], [0.34, 2.22], [0.25, 2.34], [0.22, 2.55], [0.25, 2.75], [0.32, 2.86],
    [0.33, 2.92], [0.26, 3.0], [0.2, 3.06], [0.22, 3.12], [0.27, 3.16, 1]], { seg: 32 }));
  w.push(revolve([[0.27, 3.16, 1], [0.5, 3.21, 0, 0.5], [0.9, 3.33, 0, 1], [1.24, 3.44, 1], [1.32, 3.48], [BOWLS.mid.lip, 3.52],
    [1.32, BOWLS.mid.top], [1.27, BOWLS.mid.top, 1], [1.24, 3.5, 1], [0.26, 3.5, 1]], { seg: 64, lobes: 16, amp: 0.04 }));
  // the top shaft and the little top bowl
  w.push(revolve([[0.26, 3.5, 1], [0.24, 3.58], [0.16, 3.7], [0.13, 3.9], [0.14, 4.02], [0.19, 4.1], [0.2, 4.16, 1]], { seg: 24 }));
  w.push(revolve([[0.2, 4.16, 1], [0.36, 4.23, 0, 0.6], [0.55, 4.32, 1], [0.61, 4.35], [BOWLS.top.lip, 4.37], [0.6, BOWLS.top.top],
    [0.57, BOWLS.top.top, 1], [0.55, 4.36, 1], [0.1, 4.36, 1], [0.09, 4.43], [0.06, 4.5], [0.055, 4.56, 1], [0, 4.56]], { seg: 32, lobes: 12 }));
  // four lion masks on the drum
  for (let i = 0; i < LIONS; i++) {
    const a = lionAngle(i), parts = [], dark = [];
    lionMask(parts, dark);
    const at = (g) => put(g, [Math.cos(a) * (DRUM + 0.08), MOUTH[1] + 0.054, Math.sin(a) * (DRUM + 0.08)], [0, Math.PI / 2 - a, 0], [1.35, 1.35, 1.35]);
    w.push(...parts.map(at));
    d.push(...dark.map(at));
    w.push(put(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), [Math.cos(a) * (MOUTH[0] - 0.05), MOUTH[1], Math.sin(a) * (MOUTH[0] - 0.05)], [0, -a, Math.PI / 2]));
  }
  // two drains in the floor: a dark hole under a round grate
  for (const [a, r] of [[0.9, 4.2], [3.6, 3.8]]) {
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    d.push(put(new THREE.CircleGeometry(0.17, 16), [x, FLOOR + 0.004, z], [-Math.PI / 2, 0, 0]));
    w.push(put(new THREE.TorusGeometry(0.17, 0.025, 4, 20), [x, FLOOR + 0.01, z], [-Math.PI / 2, 0, 0]));
    for (let k = -2; k <= 2; k++) w.push(put(new THREE.BoxGeometry(0.3 * Math.cos(Math.asin(Math.abs(k) / 3)), 0.015, 0.02), [x, FLOOR + 0.012, z + k * 0.055], [0, a, 0]));
  }
  return { white: mergeGeometries(w), blocks: mergeGeometries(b), dark: mergeGeometries(d) };
}

function waterWork() {
  const fall = [], bowl = [];
  // the water standing in the bowls
  for (const k of ['low', 'mid', 'top']) {
    const bw = BOWLS[k];
    bowl.push(revolve([[bw.inner + 0.02, bw.water], [k === 'top' ? 0.09 : 0.3, bw.water]], { seg: k === 'low' ? 72 : 40, blocks: Math.round(bw.inner * 4) }));
  }
  // sheets over the two upper bowls' lips
  for (const [k, vr] of [['mid', 0.55], ['top', 0.45]]) {
    const bw = BOWLS[k];
    const land = k === 'mid' ? BOWLS.low.water : BOWLS.mid.water;
    const path = [[bw.inner, bw.top + 0.004], [bw.lip - 0.02, bw.top + 0.016], ...arc(bw.lip + 0.01, bw.top, vr, 0.05, land)];
    fall.push(revolve(path, { seg: k === 'mid' ? 72 : 40, blocks: Math.round((bw.lip * Math.PI * 2) / 0.5) }));
  }
  // the crowning jet: straight up from the nozzle, breaking up at the top
  // and raining back into the top bowl
  fall.push(revolve([[0.055, 4.55], [0.05, 4.8], [0.048, 5.05], [0.065, 5.2], [0.07, 5.28], [0.045, 5.34], [0, 5.36]], { seg: 16, blocks: 1 }));
  // sheets pouring from the big bowl's notches, narrowing as they fall
  for (let i = 0; i < POUR; i++) {
    const path = [[2.38, BOWLS.low.water + 0.002], [2.5, 2.156], ...arc(2.54, 2.15, 0.9, 0.12, POOL, 16)];
    fall.push(flowTube(path, pourAngle(i), (f) => 0.25 - 0.1 * f * f, (f) => 0.012 + 0.03 * f, 12));
  }
  // the lions' jets
  for (let i = 0; i < LIONS; i++) fall.push(flowTube(arc(...MOUTH, 2.2, 0.75, POOL, 16), lionAngle(i), (f) => 0.045 + f * 0.01, (f) => 0.045 + f * 0.01, 8));
  // the basin's water, round the drum
  const pool = revolve([[BASIN_IN, POOL], [DRUM, POOL]], { seg: 128, blocks: 28 });
  return { fall: mergeGeometries(fall), bowl: mergeGeometries(bowl), pool };
}

function splashWork() {
  const variants = [];
  for (let v = 0; v < 2; v++) {
    const out = [];
    splash(out, 0, 0, LAND.mid[0], BOWLS.low.water, 0.13, 90);
    splash(out, 0, 0, LAND.top[0], BOWLS.mid.water, 0.09, 50);
        for (let i = 0; i < POUR; i++) {
      const a = pourAngle(i);
      splash(out, Math.cos(a) * LAND.pour[0], Math.sin(a) * LAND.pour[0], 0.2, POOL, 0.16, 16);
    }
    for (let i = 0; i < LIONS; i++) {
      const a = lionAngle(i);
      splash(out, Math.cos(a) * LAND.lion[0], Math.sin(a) * LAND.lion[0], 0.06, POOL, 0.09, 9);
    }
    variants.push(mergeGeometries(out));
  }
  return variants;
}

// Where droplets jump from: rings (r, level) and points (x, z, level).
function dropSources() {
  const src = [];
  const ring = (r, y, n, up) => { for (let i = 0; i < n; i++) src.push({ r, y, up }); };
  ring(LAND.mid[0], BOWLS.low.water, 18, 1.6);
  ring(LAND.top[0], BOWLS.mid.water, 8, 1.2);
  for (let i = 0; i < 14; i++) src.push({ r: 0.07, y: 5.28, up: 0.6, end: BOWLS.top.water, out: 0.9 });
  for (let i = 0; i < POUR; i++) {
    const a = pourAngle(i);
    for (let k = 0; k < 4; k++) src.push({ x: Math.cos(a) * LAND.pour[0], z: Math.sin(a) * LAND.pour[0], y: POOL, up: 1.8 });
  }
  for (let i = 0; i < LIONS; i++) {
    const a = lionAngle(i);
    for (let k = 0; k < 2; k++) src.push({ x: Math.cos(a) * LAND.lion[0], z: Math.sin(a) * LAND.lion[0], y: POOL, up: 1.0 });
  }
  return src.map((s) => ({ ...s, phase: rand() * 10, size: 0.03 + rand() * 0.02 }));
}

// Ripples spreading on the basin from where the streams land.
function rippleSources() {
  const src = [];
  for (let i = 0; i < POUR; i++) {
    const a = pourAngle(i);
    src.push({ x: Math.cos(a) * LAND.pour[0], z: Math.sin(a) * LAND.pour[0], max: 1.1, life: 2.6 });
  }
  for (let i = 0; i < LIONS; i++) {
    const a = lionAngle(i);
    src.push({ x: Math.cos(a) * LAND.lion[0], z: Math.sin(a) * LAND.lion[0], max: 0.7, life: 1.9 });
  }
  // stray drops from the spray, here and there on the basin
  for (let i = 0; i < 6; i++) src.push({ stray: true, max: 0.45, life: 1.6 });
  return src.map((s, i) => ({ ...s, phase: (i * 0.37) % 1 }));
}

const fountains = [];

export function fountain(p) {
  const g = new THREE.Group();
  g.name = 'fountain';
  const s = stoneWork();
  mesh(s.white, stone, 0, 0, 0, g);
  mesh(s.blocks, blocks, 0, 0, 0, g);
  mesh(s.dark, M.deep, 0, 0, 0, g).castShadow = false;
  // the basin's floor, seen through the water, with coins people threw in
  const floorGeo = new THREE.CircleGeometry(BASIN_IN, 64).rotateX(-Math.PI / 2);
  const fuv = floorGeo.attributes.uv, fpos = floorGeo.attributes.position;
  for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fpos.getX(i), fpos.getZ(i));
  mesh(floorGeo, floorMat, 0, FLOOR, 0, g);
  const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 10), coinMat, 45);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < coins.count; i++) {
    const a = rand() * Math.PI * 2, r = 4.3 + rand() * 0.78;
    q.setFromEuler(e.set((rand() - 0.5) * 0.3, rand() * 6, (rand() - 0.5) * 0.3));
    coins.setMatrixAt(i, m4.compose(new THREE.Vector3(Math.cos(a) * r, FLOOR + 0.003, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1)));
    // one lucky gold coin
    coins.setColorAt(i, new THREE.Color(i === 7 ? stamp.ideas.color : '#ffffff'));
  }
  coins.castShadow = false;
  g.add(coins);

  // the water: it keeps flowing even if a model replaces the stone
  const w = waterWork();
  const water = new THREE.Group();
  water.userData.keep = true;
  g.add(water);
  const swaps = [];
  const wet = (geo, kind, order) => {
    const m = mesh(geo, day[kind], 0, 0, 0, water);
    m.castShadow = false;
    m.renderOrder = order;
    swaps.push([m, kind]);
    return m;
  };
  wet(w.bowl, 'bowl', 0);
  const pool = wet(w.pool, 'pool', 1);
  skipND.push(pool); // you see the floor and the coins through it
  wet(w.fall, 'fall', 2);
  const frames = splashWork();
  const foam = wet(frames[0], 'foam', 0);

  const dropGeo = new THREE.IcosahedronGeometry(1, 0);
  const drops = new THREE.InstancedMesh(dropGeo, day.foam, 80);
  const ripples = new THREE.InstancedMesh(new THREE.RingGeometry(0.975, 1, 48).rotateX(-Math.PI / 2), day.foam, 18);
  for (const m of [drops, ripples]) { m.castShadow = false; m.frustumCulled = false; water.add(m); }
  swaps.push([drops, 'foam'], [ripples, 'foam']);

  p.add(swapModel(g, 'fountain'));
  fountains.push({ foam, frames, drops, dropSrc: dropSources().slice(0, drops.count), ripples, rippleSrc: rippleSources(), swaps, night: false });
  return g;
}

// a steady pseudo-random number from two integers
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _id = new THREE.Quaternion(), _mm = new THREE.Matrix4();

export function animateFountain(time) {
  if (!fountains.length) return;
  // falling water streams down, the rings on the water spread outward
  streakTex.offset.y = -time * 1.7;
  ringTex.offset.y = time * 0.22;
  const nightNow = isNight();
  for (const f of fountains) {
    if (f.night !== nightNow) {
      f.night = nightNow;
      for (const [m, kind] of f.swaps) m.material = (nightNow ? night : day)[kind];
    }
    // the splashes boil between two drawings
    f.foam.geometry = f.frames[Math.floor(time * 7) % 2];
    // droplets hop up from where the water lands and fall back
    f.dropSrc.forEach((d, i) => {
      const fallTo = d.end ?? d.y;
      const T = (d.up + Math.sqrt(d.up * d.up + 2 * G * (d.y - fallTo))) / G;
      const k = time / T + d.phase, cycle = Math.floor(k), t = (k - cycle) * T;
      const a = hash(i, cycle) * Math.PI * 2, out = (d.out ?? 0.65) * (0.25 + hash(cycle, i) * 0.75);
      let x, z;
      if (d.r !== undefined) { x = Math.cos(a) * d.r; z = Math.sin(a) * d.r; } else { x = d.x; z = d.z; }
      const da = d.out ? a : hash(i + 3, cycle) * Math.PI * 2;
      _p.set(x + Math.cos(da) * out * t, d.y + d.up * t - 0.5 * G * t * t, z + Math.sin(da) * out * t);
      _s.setScalar(d.size * (1 - 0.4 * (t / T)));
      f.drops.setMatrixAt(i, _mm.compose(_p, _id, _s));
    });
    f.drops.instanceMatrix.needsUpdate = true;
    // rings spreading on the basin
    f.rippleSrc.forEach((r, i) => {
      const k = time / r.life + r.phase, cycle = Math.floor(k), u = k - cycle;
      let x = r.x, z = r.z;
      if (r.stray) {
        const a = hash(i, cycle) * Math.PI * 2, rr = 3.4 + hash(cycle, i) * 1.3;
        x = Math.cos(a) * rr; z = Math.sin(a) * rr;
      }
      _p.set(x, POOL + 0.004, z);
      _s.setScalar(u < 0.92 ? 0.06 + u * r.max : 0);
      f.ripples.setMatrixAt(i, _mm.compose(_p, _id, _s));
    });
    f.ripples.instanceMatrix.needsUpdate = true;
  }
}
