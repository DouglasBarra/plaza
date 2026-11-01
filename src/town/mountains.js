// The mountains around the town, drawn the way an illustrator would: three
// ranges one behind the other. The near one has ridges, cliffs, strata, scree
// and snow lying in its gullies and on its shaded side, with forests that
// climb the foothills and thin out with height; the middle one has fewer
// marks; the far one is a pale outline with snow. Each range is one mesh
// built from a height field. On the mountain behind the plaza: a lake with a
// waterfall, a switchback path, a cabin with a smoking chimney and a lookout
// with a flag.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../ink.js';
import { tex, lineArtCanvas, LINE_ART_SIZE as S } from '../textures.js';
import { boxGeo, prismGeo, M } from '../kit.js';
import { smoke, nightOnly } from '../life.js';
import { GROUND_Y, rand as townRand, strip } from './common.js';

// The mountains' own random numbers, so changing them never moves the sky.
let seed = 31337;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => a + rand() * (b - a);

const TAU = Math.PI * 2;
const SUN = new THREE.Vector3(-14, 26, 12).normalize(); // where the plaza's sun shines from (engine.js)
const FEATURE = -2.1; // the angle of the mountain behind the plaza, as the camera first looks
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrapAngle = (a) => a - Math.round(a / TAU) * TAU;

// ---------- noise ----------
function hash(i, j, s) { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }
function noise(x, z, s) { // smooth value noise, 0..1
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// ridged noise: sharp crests where the noise crosses its middle (crags, notches)
function ridged(x, z, s, octaves) {
  let sum = 0, amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(noise(x, z, s + o * 13) * 2 - 1);
    sum += n * n * amp; norm += amp; amp *= 0.5; x *= 2.03; z *= 2.03;
  }
  return sum / norm;
}
// noise around the ring, with no seam: about 6 * k bumps all the way round
const ring = (a, k, s) => noise(Math.cos(a) * k + 50, Math.sin(a) * k + 50, s);
// spurs and gullies running downhill, toward the town: ridged noise drawn out
// along the radius, n cells round the ring (wrapping, so no seam)
function spurs(a, rho, n, len, s) {
  const x = ((a / TAU) + 1) * n, i = Math.floor(x), fx = x - i, z = rho / len, j = Math.floor(z), fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz), i0 = i % n, i1 = (i + 1) % n;
  const a0 = hash(i0, j, s), b0 = hash(i1, j, s), c0 = hash(i0, j + 1, s), d0 = hash(i1, j + 1, s);
  const nz = a0 + (b0 - a0) * u + (c0 - a0) * v + (a0 - b0 - c0 + d0) * u * v;
  return 1 - Math.abs(nz * 2 - 1);
}

// ---------- the height of a range ----------
// A range is a ridge running round the town, with peaks standing on it. A
// peak is a pyramid of arêtes (ridges that run far) with steep faces between
// them, cut by gullies that fan out downhill.
function addPeak(L, a, rho, H, R, ridges) {
  const n = 3 + Math.floor(rand() * 2), start = rand() * TAU;
  L.peaks.push({
    x: Math.cos(a) * rho, z: Math.sin(a) * rho, H, R, R2: R * R,
    ridges: ridges || Array.from({ length: n }, (_, i) => start + (i + (rand() - 0.5) * 0.6) * TAU / n),
    w: between(0.26, 0.38), gamma: between(1.55, 2.0), ribs: between(1.8, 2.8), s: rand() * 50,
  });
}
// The profile is concave (k^gamma): a steep summit pyramid over long, gentler
// slopes, like real peaks, rather than a cone's straight sides.
function peakHeight(p, x, z) {
  const dx = x - p.x, dz = z - p.z, d2 = dx * dx + dz * dz;
  if (d2 >= p.R2) return 0;
  const d = Math.sqrt(d2), phi = Math.atan2(dz, dx);
  let ridge = 0;
  for (const a of p.ridges) { const da = wrapAngle(phi - a) / p.w; ridge = Math.max(ridge, Math.exp(-da * da)); }
  const rib = noise(Math.cos(phi) * p.ribs + 9, Math.sin(phi) * p.ribs + 9, p.s) - 0.5;
  const reach = p.R * (0.58 + 0.42 * ridge) * (1 + rib * 0.5 * Math.min(1, d / (p.R * 0.3)));
  const k = 1 - d / reach;
  return k > 0 ? p.H * Math.pow(k, p.gamma) : 0;
}
// sort the peaks into slices round the ring, so a spot only asks the few nearby
const BINS = 96;
function binPeaks(L) {
  L.bins = Array.from({ length: BINS }, () => []);
  for (const p of L.peaks) {
    const a = Math.atan2(p.z, p.x), rho = Math.hypot(p.x, p.z), half = p.R < rho ? Math.asin(p.R / rho) : Math.PI;
    const j0 = Math.floor(((a - half) / TAU) * BINS), j1 = Math.floor(((a + half) / TAU) * BINS);
    for (let j = j0; j <= Math.min(j1, j0 + BINS - 1); j++) L.bins[((j % BINS) + BINS) % BINS].push(p);
  }
}
function rangeHeight(L, x, z) {
  const rho = Math.hypot(x, z), a = Math.atan2(z, x);
  const crest = L.crest + 24 * (ring(a, 2.2, L.s) - 0.5);
  const dr = (rho - crest) / L.baseW;
  let h = (L.base[0] + (L.base[1] - L.base[0]) * ring(a, 1.6, L.s + 1)) * Math.exp(-dr * dr);
  for (const p of L.bins[Math.floor((a / TAU + 1) * BINS) % BINS]) { const v = peakHeight(p, x, z); if (v > h) h = v; }
  if (L.foot) { // rolling foothills in front of the near range
    const f = noise(x / 80, z / 80, L.s + 2) * 0.7 + noise(x / 25, z / 25, L.s + 3) * 0.3;
    h = Math.max(h, L.foot * f * f * 1.8 * (1 - smooth(crest - 40, crest, rho)));
  }
  // the slopes worn into spurs and gullies; crags and notches higher up
  const n = Math.round((TAU * L.crest) / L.gully);
  h *= 1 + (spurs(a, rho, n, L.gully * 3, L.s + 7) * 0.65 + spurs(a, rho, n * 2, L.gully * 1.5, L.s + 8) * 0.35 - 0.5) * 0.4 * smooth(4, 30, h);
  h += (ridged(x / L.roughS, z / L.roughS, L.s + 4, 3) - 0.3) * L.rough * smooth(0, L.base[1], h);
  h *= smooth(L.r0, L.r0 + L.rise, rho) * (1 - smooth(L.r1 - 50, L.r1, rho));
  for (const pad of L.pads) h = pad(x, z, h);
  return Math.max(0, h);
}
// height, slope, which way it faces and how hollow it is, at one spot
function probe(L, x, z, h = rangeHeight(L, x, z)) {
  const e = 5;
  const hx1 = rangeHeight(L, x + e, z), hx0 = rangeHeight(L, x - e, z);
  const hz1 = rangeHeight(L, x, z + e), hz0 = rangeHeight(L, x, z - e);
  const nx = -(hx1 - hx0) / (2 * e), nz = -(hz1 - hz0) / (2 * e), len = Math.hypot(nx, 1, nz);
  return { h, ny: 1 / len, sun: (nx * SUN.x + SUN.y + nz * SUN.z) / len, hollow: (hx1 + hx0 + hz1 + hz0 - 4 * h) / (e * e) };
}
// > 0 where snow lies: high up, on the shaded side, in gullies; not on cliffs
function snowAt(L, x, z, pr) {
  const line = L.snow * (0.85 + 0.3 * ring(Math.atan2(z, x), 3, L.s + 5));
  return (pr.h - line) / L.snowBand + (0.5 - pr.sun) * 1.6 + Math.max(-0.6, Math.min(1.2, pr.hollow * 7))
    - smooth(0.42, 0.58, 1 - pr.ny) * 2.6 + (noise(x / 9, z / 9, L.s + 6) - 0.5) * 0.7;
}

// ---------- line-art textures, drawn with the mountains' own random numbers ----------
function stroke(g, x1, y1, x2, y2, wob = 2) {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 20));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, j = i === 0 || i === n ? 0 : 1;
    pts.push([x1 + (x2 - x1) * t + (rand() - 0.5) * wob * 2 * j, y1 + (y2 - y1) * t + (rand() - 0.5) * wob * 2 * j]);
  }
  for (const dx of [-S, 0, S]) { // drawn three times so it wraps round the tile
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y) : g.moveTo(x + dx, y)));
    g.stroke();
  }
}
// rock beds: a few broken strokes along the strata, some doubled
const strataTex = (dashes, width, ink) => lineArtCanvas((g) => {
  g.lineWidth = width; g.strokeStyle = ink;
  for (let i = 0; i < dashes; i++) {
    const x = rand() * S, y = rand() * S, len = 16 + rand() * 70;
    stroke(g, x, y, x + len, y + (rand() - 0.5) * 8, 2);
    if (rand() < 0.3) stroke(g, x + 8 + rand() * 10, y + 9, x + len * (0.4 + rand() * 0.4), y + 10, 1.5);
  }
});
// cliffs: broken ledges with cracks under them; on the shaded side, groups
// of hatching down the face as well
const cliffTex = (ledges, hatches, width) => lineArtCanvas((g) => {
  g.lineWidth = width;
  for (let i = 0; i < ledges; i++) {
    const x = rand() * S, y = rand() * S, len = 50 + rand() * 80;
    stroke(g, x, y, x + len, y + (rand() - 0.5) * 12, 3);
    for (let k = Math.floor(rand() * 3); k > 0; k--) { const cx = x + rand() * len; stroke(g, cx, y + 5, cx + (rand() - 0.5) * 20, y + 12 + rand() * 30, 1); }
  }
  for (let i = 0; i < hatches; i++) {
    const x = rand() * S, y = rand() * S, l = 26 + rand() * 40, lean = (rand() - 0.3) * 14;
    for (let k = 0; k < 3 + Math.floor(rand() * 3); k++) stroke(g, x + k * 9, y + k * 3, x + k * 9 + lean, y + k * 3 + l, 1);
  }
});
// a still lake: rows of ripples
const lakeTex = () => lineArtCanvas((g) => {
  g.lineWidth = 7;
  for (let i = 0; i < 6; i++) { const x = rand() * S, y = (i + rand() * 0.5) * S / 6; stroke(g, x, y, x + 50 + rand() * 70, y, 1); }
});
// scree: stones and dots
const screeTex = () => lineArtCanvas((g) => {
  g.lineWidth = 4;
  for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(rand() * S, rand() * S, 2 + rand() * 2.5, 0, TAU); g.fill(); }
  for (let i = 0; i < 9; i++) {
    const x = rand() * S, y = rand() * S, r = 7 + rand() * 7;
    g.beginPath(); g.moveTo(x - r, y + r * 0.5); g.lineTo(x - r * 0.3, y - r * 0.6); g.lineTo(x + r, y + r * 0.5); g.closePath(); g.stroke();
  }
});
// snow: a few wind lines, light
const snowTex = () => lineArtCanvas((g) => {
  g.lineWidth = 4; g.strokeStyle = '#9a9a96';
  for (let i = 0; i < 7; i++) { const x = rand() * S, y = rand() * S; stroke(g, x, y, x + 30 + rand() * 40, y + (rand() - 0.5) * 8, 1.5); }
});
// a texture that is all ink: black by day, chalk at night
const inkTex = () => lineArtCanvas((g) => g.fillRect(0, 0, S, S));
// falling water: streaks
const fallTex = () => lineArtCanvas((g) => {
  g.lineWidth = 5;
  for (let i = 0; i < 9; i++) { const y = rand() * S, x = rand() * S; stroke(g, x, y, x + 60 + rand() * 90, y + (rand() - 0.5) * 6, 1); }
});

export function buildMountains(town) {
  // The mountains used to draw this many numbers from the town's shared
  // generator; skip them so the sky (built next) stays where it was.
  for (let i = 0; i < 12527; i++) townRand();

  const crisp = (o) => { o.userData.inkCrisp = true; o.castShadow = o.receiveShadow = false; return o; };
  const unfogged = (m) => { m.fog = false; return m; };
  const tiled = (t, size) => { t.repeat.set(1 / size, 1 / size); return t; };
  // the shared textures the mountains always drew, in the same order, so the
  // textures made after them come out the same
  const oldRock = tex.rock(), grass = tex.grass(); tex.water(); tex.water();

  // Three ranges, near to far. Nearer ones have more kinds of ground and more
  // marks; farther ones are smoother (fewer creases to draw lines on), shaded
  // flatter and paler, like an illustrator's atmospheric perspective.
  const near = {
    name: 'near', r0: 178, r1: 330, rise: 34, crest: 262, baseW: 40, base: [34, 62], foot: 24,
    rough: 12, roughS: 30, gully: 22, snow: 58, snowBand: 18, tree: 44, rows: 22, cols: 380, bunch: 1.35, crease: 40, flat: 0, s: 11,
    peaks: [], pads: [],
    mats: {
      cliff: unfogged(toon('#efefeb', tiled(cliffTex(3, 0, 5), 24))),
      cliffShade: unfogged(toon('#ebebe7', tiled(cliffTex(2, 6, 5), 22))),
      rock: unfogged(toon('#f6f6f3', tiled(strataTex(8, 5, '#111111'), 42))),
      rockShade: unfogged(toon('#f4f4f1', tiled(cliffTex(1, 4, 4), 26))),
      scree: unfogged(toon('#ffffff', tiled(screeTex(), 8))),
      meadow: unfogged(toon('#ffffff', tiled(grass, 4))),
      snow: unfogged(toon('#ffffff', tiled(snowTex(), 16))),
    },
    // like an illustrator: hatching on the faces turned away from the sun
    classify: (ny, h, sun) => {
      const shade = sun < 0.35 ? 'Shade' : '';
      return ny < 0.56 ? 'cliff' + shade : ny < 0.8 ? 'rock' + shade : h > near.tree ? 'scree' : 'meadow';
    },
    snowApart: true,
  };
  const mid = {
    name: 'mid', r0: 285, r1: 450, rise: 40, crest: 375, baseW: 50, base: [70, 108],
    rough: 14, roughS: 46, gully: 34, snow: 92, snowBand: 24, rows: 12, cols: 264, bunch: 1.2, crease: 65, flat: 0.5, s: 23,
    peaks: [], pads: [],
    mats: {
      rock: unfogged(toon('#f7f7f4', tiled(strataTex(4, 8, '#7a7a76'), 40))),
      plain: unfogged(toon('#fafaf8', tiled(oldRock, 30))),
      snow: unfogged(toon('#ffffff')),
    },
    classify: (ny) => (ny < 0.72 ? 'rock' : 'plain'),
    snowApart: true,
  };
  const far = {
    name: 'far', r0: 400, r1: 590, rise: 40, crest: 500, baseW: 60, base: [100, 150],
    rough: 16, roughS: 70, gully: 50, snow: 135, snowBand: 30, rows: 8, cols: 200, bunch: 1.1, crease: 180, flat: 1.2, s: 37,
    peaks: [], pads: [],
    mats: { rock: unfogged(toon('#ecece8')), snow: unfogged(toon('#ffffff')) },
    classify: () => 'rock',
    snowApart: false,
  };

  // the peaks; the near range leaves room for the mountain behind the plaza
  // massifs: a peak with shoulders and twin summits beside it
  const scatter = (L, n, rho, H, shoulders, avoid = 0) => {
    for (let k = 0; k < n; k++) {
      const a = ((k + 0.2 + rand() * 0.6) / n) * TAU, r = between(...rho), h = between(...H);
      if (avoid && Math.abs(wrapAngle(a - FEATURE)) < avoid) continue;
      addPeak(L, a, r, h, h * between(1.5, 1.8));
      for (let s = 0; s < shoulders; s++) {
        if (rand() < 0.25) continue;
        const off = (rand() < 0.5 ? -1 : 1) * between(0.35, 0.6) * h * 1.6 / r, hs = h * between(0.55, 0.8);
        if (avoid && Math.abs(wrapAngle(a + off - FEATURE)) < avoid) continue;
        addPeak(L, a + off, r + between(-18, 10), hs, hs * between(1.5, 1.8));
      }
    }
  };
  scatter(near, 15, [250, 290], [62, 108], 2, 0.3);
  scatter(near, 12, [222, 255], [28, 48], 0, 0.32);
  scatter(mid, 16, [355, 395], [110, 172], 1);
  scatter(far, 14, [478, 520], [160, 248], 1);

  // ---- the mountain behind the plaza: two spurs reach toward the town with
  // a hollow between them, where a lake lies under a waterfall
  const toPlaza = FEATURE + Math.PI;
  addPeak(near, FEATURE, 285, 128, 150, [toPlaza - 0.62, toPlaza + 0.55, FEATURE - 0.5, FEATURE + 0.7]);
  const peak = near.peaks[near.peaks.length - 1];
  peak.gamma = 1.7;
  for (const L of [near, mid, far]) binPeaks(L);
  const from = (phi, d) => [peak.x + Math.cos(phi) * d, peak.z + Math.sin(phi) * d];
  const spur = toPlaza + 0.55;
  const flatten = ([cx, cz], r0, r1) => {
    const h0 = rangeHeight(near, cx, cz);
    near.pads.push((x, z, h) => { const d = Math.hypot(x - cx, z - cz); return d >= r1 ? h : h0 + (h - h0) * smooth(r0, r1, d); });
    return h0;
  };
  const LAKE_R = 12;
  const LAKE_D = 66; // how far the lake lies from the summit
  const lakeAt = from(toPlaza, LAKE_D);
  // the lake's hollow, opening toward the town down a little valley
  const dirX = Math.cos(toPlaza), dirZ = Math.sin(toPlaza);
  near.pads.push((x, z, h) => {
    const t = Math.max(0, Math.min(45, (x - lakeAt[0]) * dirX + (z - lakeAt[1]) * dirZ));
    const d = Math.hypot(x - lakeAt[0] - dirX * t, z - lakeAt[1] - dirZ * t), r = LAKE_R - t * 0.12;
    return d >= r + 8 ? h : h * smooth(r - 1, r + 8, d);
  });
  const cabinAt = from(spur, 86), cabinH = flatten(cabinAt, 6, 12);
  const lookoutAt = from(spur, 30), lookoutH = flatten(lookoutAt, 4, 9);
  const groundY = (L, x, z) => GROUND_Y - 1.2 + rangeHeight(L, x, z);

  // ---------- build each range as one mesh (plus its snow) ----------
  for (const L of [near, mid, far]) buildRange(L);

  function buildRange(L) {
    const { rows, cols } = L;
    const P = [], snow = [], rhos = [];
    const at = (i, j) => i * cols + ((j + cols) % cols);
    const H = new Float32Array((rows + 1) * cols);
    for (let i = 0; i <= rows; i++) {
      const rho = L.r0 + (L.r1 - L.r0) * Math.pow(i / rows, L.bunch);
      rhos.push(rho);
      for (let j = 0; j < cols; j++) {
        const a = (j / cols) * TAU, x = Math.cos(a) * rho, z = Math.sin(a) * rho;
        H[at(i, j)] = rangeHeight(L, x, z);
        P.push(x, GROUND_Y - 1.2 + H[at(i, j)], z);
      }
    }
    // slope, facing and hollowness from the neighbours on the grid
    for (let i = 0; i <= rows; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(rows, i + 1), ds = (rhos[i] * TAU) / cols;
      for (let j = 0; j < cols; j++) {
        const h = H[at(i, j)], hl = H[at(i, j - 1)], hn = H[at(i, j + 1)];
        const hr = (H[at(i1, j)] - H[at(i0, j)]) / (rhos[i1] - rhos[i0]), ht = (hn - hl) / (2 * ds);
        let hollow = (hn + hl - 2 * h) / (ds * ds);
        if (i > 0 && i < rows) {
          const d0 = rhos[i] - rhos[i - 1], d1 = rhos[i + 1] - rhos[i];
          hollow += (2 * (d0 * H[at(i + 1, j)] - (d0 + d1) * h + d1 * H[at(i - 1, j)])) / (d0 * d1 * (d0 + d1));
        }
        const a = (j / cols) * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const gx = hr * ca - ht * sa, gz = hr * sa + ht * ca, len = Math.hypot(gx, 1, gz);
        const pr = { h, ny: 1 / len, sun: (SUN.y - gx * SUN.x - gz * SUN.z) / len, hollow };
        snow.push(snowAt(L, ca * rhos[i], sa * rhos[i], pr));
      }
    }
    const y = (v) => P[v * 3 + 1];
    // where a gully's snow ends: split triangles along the snow line, so the
    // snowfields follow the ground instead of the grid
    const cut = new Map();
    const edgePoint = (a, b) => {
      const key = a < b ? a * 1e6 + b : b * 1e6 + a;
      let v = cut.get(key);
      if (v === undefined) {
        const [p, q] = a < b ? [a, b] : [b, a];
        const t = snow[p] / (snow[p] - snow[q]);
        v = P.length / 3;
        for (let k = 0; k < 3; k++) P.push(P[p * 3 + k] + (P[q * 3 + k] - P[p * 3 + k]) * t);
        snow.push(0);
        cut.set(key, v);
      }
      return v;
    };
    const faces = [], kinds = []; // three pool indices per face; 'snow' or a ground kind
    const emit = (a, b, c, kind) => { faces.push(a, b, c); kinds.push(kind); };
    const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const pos = (v, out) => out.set(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
    const tri = (a, b, c) => {
      if (y(a) < GROUND_Y - 0.4 && y(b) < GROUND_Y - 0.4 && y(c) < GROUND_Y - 0.4) return; // under the ground
      pos(a, n); pos(b, e1).sub(n); pos(c, e2).sub(n);
      n.crossVectors(e1, e2);
      if (n.y < 0) { [b, c] = [c, b]; n.negate(); }
      n.normalize();
      const kind = L.classify(n.y, (y(a) + y(b) + y(c)) / 3 - GROUND_Y + 1.2, n.dot(SUN));
      const sa = snow[a] > 0, sb = snow[b] > 0, sc = snow[c] > 0, count = sa + sb + sc;
      if (count === 0 || count === 3) { emit(a, b, c, count ? 'snow' : kind); return; }
      // the odd one out first, keeping the winding
      const odd1 = count === 1;
      const [v0, v1, v2] = sa === odd1 ? [a, b, c] : sb === odd1 ? [b, c, a] : [c, a, b];
      const m01 = edgePoint(v0, v1), m02 = edgePoint(v0, v2);
      const odd = count === 1 ? 'snow' : kind, rest = count === 1 ? kind : 'snow';
      emit(v0, m01, m02, odd);
      emit(m01, v1, v2, rest); emit(m01, v2, m02, rest);
    };
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j), d = at(i + 1, j + 1);
        // cut each cell along the diagonal that keeps ridges and gullies sharp
        if (Math.abs(y(a) - y(d)) < Math.abs(y(b) - y(c))) { tri(a, b, d); tri(a, d, c); } else { tri(a, b, c); tri(b, d, c); }
      }
    }

    // normals: smooth, but creased where ridges and gullies are sharper than
    // the range's crease angle; farther ranges lean toward the sun (paler)
    const nv = P.length / 3, nf = kinds.length;
    const fn = new Float32Array(nf * 3), fa = new Float32Array(nf * 3);
    const deg = new Uint32Array(nv + 1);
    for (let f = 0; f < nf; f++) {
      const a = faces[f * 3], b = faces[f * 3 + 1], c = faces[f * 3 + 2];
      pos(a, n); pos(b, e1).sub(n); pos(c, e2).sub(n);
      n.crossVectors(e1, e2);
      fa[f * 3] = n.x; fa[f * 3 + 1] = n.y; fa[f * 3 + 2] = n.z;
      n.normalize();
      fn[f * 3] = n.x; fn[f * 3 + 1] = n.y; fn[f * 3 + 2] = n.z;
      deg[a + 1]++; deg[b + 1]++; deg[c + 1]++;
    }
    for (let v = 0; v < nv; v++) deg[v + 1] += deg[v];
    const adj = new Uint32Array(deg[nv]), fill = deg.slice(0, nv);
    for (let f = 0; f < nf * 3; f++) adj[fill[faces[f]]++] = Math.floor(f / 3);
    const creaseDot = Math.cos((L.crease * Math.PI) / 180);
    const cornerN = new Float32Array(nf * 9);
    for (let f = 0; f < nf; f++) {
      for (let k = 0; k < 3; k++) {
        const v = faces[f * 3 + k];
        let x = 0, yy = 0, z = 0;
        for (let q = deg[v]; q < deg[v + 1]; q++) {
          const g = adj[q];
          if (fn[g * 3] * fn[f * 3] + fn[g * 3 + 1] * fn[f * 3 + 1] + fn[g * 3 + 2] * fn[f * 3 + 2] < creaseDot) continue;
          x += fa[g * 3]; yy += fa[g * 3 + 1]; z += fa[g * 3 + 2];
        }
        n.set(x, yy, z).normalize().addScaledVector(SUN, L.flat).normalize();
        const o = (f * 3 + k) * 3;
        cornerN[o] = n.x; cornerN[o + 1] = n.y; cornerN[o + 2] = n.z;
      }
    }

    // UVs in meters: rock and cliffs follow the strata, tilted beds with a few
    // folds in them; flatter ground is mapped from above
    const circ = Math.round((TAU * L.crest) / 48) * 48;
    const kindsOf = Object.keys(L.mats).filter((k) => k !== 'snow' || !L.snowApart);
    const facesOf = {};
    kinds.forEach((kind, f) => (facesOf[kind] ||= []).push(f));
    const build = (wanted) => {
      const p = [], nn = [], uv = [], groups = [];
      wanted.forEach((kind, gi) => {
        const start = p.length / 3, strata = /^(rock|cliff)/.test(kind);
        for (const f of facesOf[kind] || []) {
          const a0 = Math.atan2(P[faces[f * 3] * 3 + 2], P[faces[f * 3] * 3]);
          for (let k = 0; k < 3; k++) {
            const v = faces[f * 3 + k], x = P[v * 3], yv = P[v * 3 + 1], z = P[v * 3 + 2];
            const a = a0 + wrapAngle(Math.atan2(z, x) - a0), u = (a / TAU) * circ;
            p.push(x, yv, z);
            nn.push(cornerN[(f * 3 + k) * 3], cornerN[(f * 3 + k) * 3 + 1], cornerN[(f * 3 + k) * 3 + 2]);
            uv.push(u, strata ? yv + 0.3 * x + 0.12 * z + 10 * noise(x / 70, z / 70, L.s) : Math.hypot(x, z));
          }
        }
        groups.push([start, p.length / 3 - start, gi]);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      for (const [s0, c, m] of groups) if (c) g.addGroup(s0, c, m);
      g.computeBoundingSphere();
      return g;
    };
    const range = crisp(new THREE.Mesh(build(kindsOf), kindsOf.map((k) => L.mats[k])));
    range.name = `mountains-${L.name}`;
    town.add(range);
    if (L.snowApart) {
      const snowMesh = crisp(new THREE.Mesh(build(['snow']), L.mats.snow));
      snowMesh.name = `mountains-${L.name}-snow`;
      town.add(snowMesh);
    }
  }

  // ---------- forests: thick on the foothills, thinning out up the slopes ----------
  const sceneryMat = unfogged(toon());
  const pineGeo = mergeGeometries(strip([
    new THREE.ConeGeometry(1.5, 2.7, 5).translate(0, 1.65, 0),
    new THREE.ConeGeometry(1.05, 2.1, 5).translate(0, 3.2, 0),
  ]));
  const keepClear = [[...lakeAt, LAKE_R + 5], [...cabinAt, 11], [...lookoutAt, 8]];
  const trees = [];
  for (let tries = 0; trees.length < 560 && tries < 9000; tries++) {
    const a = rand() * TAU, rho = between(near.r0 + 3, near.crest + 15);
    const x = Math.cos(a) * rho, z = Math.sin(a) * rho;
    const h = rangeHeight(near, x, z);
    const line = near.tree * (0.75 + 0.5 * noise(x / 50, z / 50, 5)), up = h / line;
    if (up > 1 || keepClear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue;
    const forest = noise(x / 38, z / 38, 6) > 0.4 ? 1 : 0.15;
    if (rand() > forest * (1 - up * up)) continue;
    const pr = probe(near, x, z, h);
    if (pr.ny < 0.72 || snowAt(near, x, z, pr) > 0) continue;
    const s = (1.6 + rand() * 0.9) * (1 - 0.5 * up); // smaller toward the tree line
    trees.push({ x, y: GROUND_Y - 1.2 + h - 0.3 * s, z, s, rot: rand() * 6 });
  }
  const pines = new THREE.InstancedMesh(pineGeo, sceneryMat, trees.length);
  const o3 = new THREE.Object3D();
  trees.forEach((t, i) => { o3.position.set(t.x, Math.max(t.y, GROUND_Y - 0.4), t.z); o3.rotation.set(0, t.rot, 0); o3.scale.setScalar(t.s); o3.updateMatrix(); pines.setMatrixAt(i, o3.matrix); });
  pines.computeBoundingSphere();
  pines.name = 'mountain-pines';
  town.add(crisp(pines));

  // ---------- the lake, the waterfall and the stream above it ----------
  const lakeShape = new THREE.Shape();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * TAU, r = (LAKE_R + 1.5) * (0.88 + 0.2 * noise(Math.cos(a) * 1.3 + 3, Math.sin(a) * 1.3, 7));
    i ? lakeShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : lakeShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const lake = crisp(new THREE.Mesh(new THREE.ShapeGeometry(lakeShape), unfogged(toon('#ffffff', tiled(lakeTex(), 9)))));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(lakeAt[0], GROUND_Y + 0.12, lakeAt[1]);
  lake.name = 'mountain-lake';
  town.add(lake);

  // a ribbon down the fall line from the snow, over the lip and into the lake
  const side = [-Math.sin(toPlaza), Math.cos(toPlaza)];
  const fallP = [], fallUV = [], fallI = [];
  let run = 0, last = null;
  const LIP = LAKE_D - LAKE_R - 7;
  for (let d = LIP - 12; d <= LAKE_D - LAKE_R + 2; d += 1.2) {
    const wig = Math.sin(d * 0.35) * 1.5 * smooth(LIP, LIP - 6, d);
    const [cx, cz] = from(toPlaza, d).map((c, k) => c + side[k] * wig);
    const lip = smooth(LIP - 3, LIP + 1, d); // a narrow stream above, a wide fall below
    const w = 0.5 + lip * 1.1, yy = Math.max(groundY(near, cx, cz) + 0.7, GROUND_Y + 0.2);
    if (last) run += Math.hypot(cx - last[0], yy - last[1], cz - last[2]);
    last = [cx, yy, cz];
    const k = fallP.length / 3;
    fallP.push(cx - side[0] * w, yy, cz - side[1] * w, cx + side[0] * w, yy, cz + side[1] * w);
    fallUV.push(run, 0, run, w * 2);
    if (k) fallI.push(k - 2, k - 1, k, k - 1, k + 1, k);
  }
  const fallGeo = new THREE.BufferGeometry();
  fallGeo.setAttribute('position', new THREE.Float32BufferAttribute(fallP, 3));
  fallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fallUV, 2));
  fallGeo.setIndex(fallI);
  // every normal toward the sun: falling water always catches the light
  fallGeo.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: fallP.length / 3 }, () => SUN.toArray()).flat(), 3));
  const fallMat = unfogged(toon('#ffffff', tiled(fallTex(), 6)));
  fallMat.side = THREE.DoubleSide;
  const fall = crisp(new THREE.Mesh(fallGeo, fallMat));
  fall.name = 'mountain-waterfall';
  town.add(fall);
  // foam where it lands
  const foamAt = from(toPlaza, LAKE_D - LAKE_R + 1);
  const foam = [];
  for (let i = 0; i < 7; i++) {
    foam.push(new THREE.IcosahedronGeometry(0.9 + rand() * 0.9, 0).translate(foamAt[0] + side[0] * (rand() - 0.5) * 7 + (rand() - 0.5) * 2, GROUND_Y + 0.4, foamAt[1] + side[1] * (rand() - 0.5) * 7 + (rand() - 0.5) * 2));
  }
  town.add(crisp(new THREE.Mesh(mergeGeometries(strip(foam)), sceneryMat)));

  // ---------- a switchback path from the lake up the spur, past the cabin to the lookout ----------
  // waypoints: distance from the summit along the spur, and how far off its crest
  const legs = [[122, -18], [112, 6], [104, -14], [96, 8], [88, -6], [86, 0], [78, -10], [70, 8], [62, -9], [54, 7], [46, -7], [39, 6], [33, -3], [30, 0]];
  const pathAt = ([d, off]) => { const [x, z] = from(spur, d); return [x - Math.sin(spur) * off, z + Math.cos(spur) * off]; };
  const dashes = [];
  let walked = 0;
  for (let l = 0; l < legs.length - 1; l++) {
    const [ax, az] = pathAt(legs[l]), [bx, bz] = pathAt(legs[l + 1]);
    const len = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.round(len / 1.3));
    const sx = -(bz - az) / len * 0.35, sz = (bx - ax) / len * 0.35;
    for (let s = 0; s < steps; s++, walked++) {
      if (walked % 2) continue; // dashed
      const t0 = s / steps, t1 = (s + 1) / steps;
      const p0 = [ax + (bx - ax) * t0, az + (bz - az) * t0], p1 = [ax + (bx - ax) * t1, az + (bz - az) * t1];
      const corners = [[p0[0] - sx, p0[1] - sz], [p0[0] + sx, p0[1] + sz], [p1[0] + sx, p1[1] + sz], [p1[0] - sx, p1[1] - sz]];
      const yy = corners.map(([x, z]) => Math.max(groundY(near, x, z), GROUND_Y) + 0.45);
      const q = new THREE.BufferGeometry();
      q.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap(([x, z], k) => [x, yy[k], z]), 3));
      q.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      q.setIndex([0, 2, 1, 0, 3, 2]);
      dashes.push(q);
    }
  }
  const pathGeo = mergeGeometries(dashes);
  pathGeo.computeVertexNormals();
  const pathMat = unfogged(toon('#ffffff', inkTex()));
  pathMat.side = THREE.DoubleSide;
  const path = crisp(new THREE.Mesh(pathGeo, pathMat));
  path.name = 'mountain-path';
  town.add(path);

  // ---------- the cabin on its ledge, with a smoking chimney and a lit window at night ----------
  const cabin = crisp(new THREE.Group());
  cabin.name = 'mountain-cabin';
  cabin.position.set(cabinAt[0], GROUND_Y - 1.2 + cabinH - 0.2, cabinAt[1]);
  cabin.rotation.y = -toPlaza + Math.PI / 2; // its door faces the town
  const part = (g, x, y, z) => g.translate(x, y, z);
  cabin.add(new THREE.Mesh(mergeGeometries(strip([
    part(boxGeo(8, 4.6, 6), 0, 2.3, 0),
    part(prismGeo(9.4, 3.8, 7.2), 0, 4.6, 0),
    part(boxGeo(1.2, 3.4, 1.2), 2.4, 7.2, -1.2),
    part(boxGeo(10, 0.4, 3), 0, 0.2, 4.2), // the porch
  ])), sceneryMat));
  cabin.add(new THREE.Mesh(mergeGeometries(strip([
    part(boxGeo(1.4, 2.4, 0.2), -1.2, 1.2, 3.05),
    part(boxGeo(1.4, 1.2, 0.2), 2, 2.6, 3.05),
  ])), M.deep));
  const litWindow = new THREE.Mesh(part(boxGeo(1.2, 1, 0.22), 2, 2.6, 3.06), new THREE.MeshBasicMaterial({ color: '#ffe9a8' }));
  litWindow.visible = false;
  nightOnly.push(litWindow);
  cabin.add(litWindow);
  town.add(cabin);
  smoke(cabin, 2.4, 9.2, -1.2, { n: 5, rise: 9, size: 1.1, speed: 0.12, drift: 3, mat: sceneryMat });

  // ---------- the lookout on the shoulder, with a flag ----------
  const tower = crisp(new THREE.Group());
  tower.name = 'mountain-lookout';
  tower.position.set(lookoutAt[0], GROUND_Y - 1.2 + lookoutH - 0.3, lookoutAt[1]);
  tower.rotation.y = -toPlaza;
  const towerParts = [];
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) towerParts.push(part(boxGeo(0.5, 12, 0.5), x, 6, z));
  towerParts.push(part(boxGeo(0.3, 0.3, 4.6), -2, 6, 0), part(boxGeo(0.3, 0.3, 4.6), 2, 6, 0)); // cross bars
  towerParts.push(part(boxGeo(6, 0.6, 6), 0, 12, 0), part(boxGeo(4, 3, 4), 0, 13.8, 0));
  towerParts.push(new THREE.ConeGeometry(3.6, 2.6, 4).rotateY(Math.PI / 4).translate(0, 16.6, 0));
  towerParts.push(part(boxGeo(0.2, 4, 0.2), 0, 19.8, 0));
  tower.add(new THREE.Mesh(mergeGeometries(strip(towerParts)), sceneryMat));
  const flag = new THREE.Mesh(boxGeo(2.4, 1.4, 0.1), unfogged(toon('#ff6a13')));
  flag.position.set(1.2, 21, 0);
  tower.add(flag);
  town.add(tower);
}
