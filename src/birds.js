// Birds, shared by the flocks in the sky (town/sky.js), the pigeons on the
// plaza (plaza/critters.js) and the perched finds (finds.js). A bird faces +x
// with +y up, and its right wing reaches along +z. Each wing has two parts,
// the arm and the hand, so it bends as it beats and folds along the body.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from './ink.js';
import { mesh } from './kit.js';
import { lineArtCanvas, LINE_ART_SIZE as S } from './textures.js';

let seed = 5150;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- the two kinds that fly: sizes in meters ----------
// k: body size against a pigeon's; arm/hand: wing part lengths; chord: wing
// width; beat: shoulder swing; glide: how the wings are held between beats;
// fold: folded along the body (tuck: how far the hand's feathers slide in).
export const PIGEON = {
  name: 'pigeon', k: 1, arm: 0.11, hand: 0.16, chord: 0.11, thick: 0.012,
  shoulder: [0.03, 0.03, 0.04], beat: 0.85, bias: 0.15,
  glide: { shoulder: 0.32, elbow: -0.06, sweep: 0.12, hand: 0.1 },  // pigeons glide with wings raised in a V
  fold: { shoulder: 1.85, elbow: 0.05, sweep: 1.68, hand: 0.04, tuck: 0.72 },
};
export const GULL = {
  name: 'gull', k: 1.6, arm: 0.26, hand: 0.36, chord: 0.15, thick: 0.018,
  shoulder: [0.05, 0.045, 0.055], beat: 0.55, bias: 0.1,
  glide: { shoulder: 0.14, elbow: -0.2, sweep: 0.18, hand: 0.22 },   // the gull's bent "M"
  fold: { shoulder: 1.85, elbow: 0.05, sweep: 1.7, hand: 0.03, tuck: 0.62 },
};

// ---------- feather drawings ----------
// u runs across the wing (0 trailing edge, 1 leading edge), v from the root
// to the tip. Plain strokes with a local random wobble, so drawing these
// never shifts the shared textures' random numbers.
const at = (u, v) => [u * S, (1 - v) * S];
function stroke(g, pts, w = 5) {
  g.lineWidth = w;
  g.beginPath();
  pts.forEach(([u, v], i) => {
    const [x, y] = at(u, v);
    const j = i && i < pts.length - 1 ? (rand() - 0.5) * 3 : 0;
    i ? g.lineTo(x + j, y + j) : g.moveTo(x, y);
  });
  g.stroke();
}
const featherTex = {
  // the arm: secondaries along the trailing edge, a row of coverts; pigeons
  // add their two dark wing bars
  arm: (bars) => lineArtCanvas((g) => {
    for (let i = 0; i <= 8; i++) stroke(g, [[0, i / 8.2], [0.36, i / 8.2 + 0.02]], 4);
    stroke(g, [[0.4, 0], [0.43, 0.5], [0.4, 1]], 4);
    if (bars) for (const u of [0.13, 0.27]) stroke(g, [[u, 0.04], [u + 0.01, 0.5], [u, 0.92]], 13);
    for (let i = 0; i < 4; i++) stroke(g, [[0.62, 0.1 + i * 0.24], [0.72, 0.16 + i * 0.24]], 3);
  }),
  // the hand: long primaries fanning out to the tip; a gull's tip is black
  // with a white spot
  hand: (blackTip) => lineArtCanvas((g) => {
    for (let i = 0; i < 8; i++) stroke(g, [[0.62, 0.04 + i * 0.07], [0.04 + i * 0.05, 0.2 + i * 0.1]], 4);
    stroke(g, [[0.5, 0], [0.5, 0.35], [0.4, 0.7]], 3);
    if (blackTip) {
      g.beginPath();
      [[0, 0.66], [1, 0.58], [1, 1], [0, 1]].forEach(([u, v], i) => { const [x, y] = at(u, v); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(...at(0.42, 0.86), 13, 0, 7); g.fill();
    }
  }),
  // the tail: feather lines from the base, and a pigeon's dark end band
  tail: (band) => lineArtCanvas((g) => {
    for (let i = 1; i < 6; i++) stroke(g, [[0.05, 0.5 + (i - 3) * 0.06], [0.95, 0.5 + (i - 3) * 0.16]], 3);
    if (band) g.fillRect(0.84 * S, 0, 0.16 * S, S);
  }),
};

// ---------- geometry ----------
// A flat plate drawn in (chord x, span y) and laid flat so the span runs
// along +z (side 1) or -z (side -1). UVs: u across the chord, v along the span.
function plate(lead, trail, side, thick, len) {
  const s = new THREE.Shape();
  s.moveTo(lead[0][0], lead[0][1] * side);
  s.splineThru(lead.slice(1).map(([x, y]) => new THREE.Vector2(x, y * side)));
  for (const [x, y] of trail) s.lineTo(x, y * side);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -thick / 2);
  g.rotateX(Math.PI / 2);
  g.computeBoundingBox();
  const { min, max } = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - min.x) / (max.x - min.x), Math.abs(p.getZ(i)) / len);
  return g;
}

// A round body turned on a lathe: [radius, along] pairs from tail to chest.
function lathe(profile, sy = 1, sz = 1, seg = 10) {
  const g = new THREE.LatheGeometry(profile.map(([r, a]) => new THREE.Vector2(r, a)), seg);
  g.rotateZ(-Math.PI / 2);
  g.scale(1, sy, sz);
  return g;
}

// Small shape helpers, also used for the perched owl and rooster (finds.js).
// a squashed ball at (x, y, z)
export const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1, w = 8, h = 6) =>
  new THREE.SphereGeometry(r, w, h).scale(sx, sy, sz).translate(x, y, z);
const flat = (geos) => geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); n.clearGroups(); return n; });
// several shapes as one geometry (no UVs)
export const merge = (geos) => mergeGeometries(flat(geos));
// a beak: a cone pointing +x (drooping by `droop`), its base at (x, y)
export const beak = (r, l, x, y, droop = 0) => new THREE.ConeGeometry(r, l, 5).rotateZ(-Math.PI / 2 - droop)
  .translate(x + Math.cos(droop) * l / 2, y - Math.sin(droop) * l / 2, 0);

// The parts of a kind, made once and shared by every bird of that kind.
const cache = new Map();
export function parts(spec) {
  if (cache.has(spec.name)) return cache.get(spec.name);
  const gull = spec === GULL;
  const k = spec.k;                            // the gull is the pigeon's shape, bigger and slimmer
  const { arm: L1, hand: L2, chord: c, thick } = spec;
  const wing = (side) => ({
    arm: plate([[0.35 * c, 0], [0.4 * c, L1 * 0.5], [0.33 * c, L1]], [[-0.62 * c, L1], [-0.68 * c, L1 * 0.5], [-0.8 * c, 0]], side, thick, L1),
    hand: gull
      ? plate([[0.33 * c, 0], [0.3 * c, L2 * 0.45], [0.05 * c, L2 * 0.85], [-0.3 * c, L2]], [[-0.5 * c, L2 * 0.7], [-0.62 * c, 0]], side, thick * 0.8, L2)
      : plate([[0.33 * c, 0], [0.26 * c, L2 * 0.45], [0.0, L2 * 0.82], [-0.38 * c, L2]], [[-0.62 * c, L2 * 0.68], [-0.62 * c, 0]], side, thick * 0.8, L2),
  });
  const R = wing(1), L = wing(-1);
  // the body, from vent to chest, and a fanned tail behind it
  const body = lathe([[0, -0.104], [0.022, -0.1], [0.04, -0.08], [0.052, -0.05], [0.058, -0.015], [0.059, 0.02], [0.055, 0.05], [0.045, 0.075], [0.028, 0.093], [0, 0.102]]
    .map(([r, a]) => [r * (gull ? 0.88 : 1), a * (gull ? 1.12 : 1)]), 1.06, 0.92, 14).scale(k, k, k);
  const tail = plate([[0, 0.03], [-0.05, 0.04], [-0.095, 0.042], [-0.102, 0], [-0.095, -0.042], [-0.05, -0.04]], [[0, -0.03]], 1, 0.014, 1)
    .scale(k, k, k);
  // re-map the tail's UVs: u from base to tip
  { const p = tail.attributes.position, uv = tail.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, -p.getX(i) / (0.102 * k), 0.5 + p.getZ(i) / (0.09 * k)); }
  tail.translate(-0.08 * k * (gull ? 1.12 : 1), 0.014 * k, 0).rotateZ(0.06);  // drooping a touch
  // the body and tail as one mesh with two materials (groups 0 and 1)
  const bodyTail = mergeGeometries([body.toNonIndexed(), tail], true);
  // head and neck on their own, pivoting at the base of the neck
  const hr = gull ? 0.04 : 0.027;
  const head = merge([
    new THREE.CylinderGeometry(hr * 0.9, 0.03 * k, 0.07 * k, 8).translate(0, 0.035 * k, 0).rotateZ(-0.35),
    ball(hr, 0.034 * k, 0.07 * k, 0, 1.15, 1, 0.95),
  ]);
  const headDark = merge([
    beak(gull ? 0.011 : 0.0075, gull ? 0.05 : 0.022, 0.034 * k + hr * 1.05, 0.065 * k, gull ? 0.12 : 0.18),
    ...[-1, 1].map((s) => ball(hr * 0.2, 0.034 * k + hr * 0.55, 0.077 * k, s * hr * 0.75, 1, 1, 0.6, 6, 4)),
  ]);
  // in flight the neck pulls in: one body piece for birds seen from afar
  const neck = [0.062 * k * (gull ? 1.1 : 1), 0.035 * k];
  const flightBody = merge([body, tail.clone(), head.clone().rotateZ(-0.7).translate(neck[0], neck[1] - 0.01, 0), headDark.clone().rotateZ(-0.7).translate(neck[0], neck[1] - 0.01, 0)]);
  // legs: thin, with three toes forward and one back
  const legLen = gull ? 0.1 : 0.062;
  const leg = merge([
    new THREE.CylinderGeometry(0.0045, 0.004, legLen, 4).translate(0, -legLen / 2, 0),
    ...[-0.5, 0, 0.5].map((a) => new THREE.BoxGeometry(0.03 * k, 0.005, 0.005).translate(0.015 * k, 0, 0).rotateY(a).translate(0, -legLen + 0.003, 0)),
    new THREE.BoxGeometry(0.014, 0.005, 0.005).translate(-0.007, -legLen + 0.003, 0),
  ]);
  const out = { R, L, body, tail, bodyTail, head, headDark, flightBody, leg, legLen, neck, k };
  cache.set(spec.name, out);
  return out;
}

// Materials, also shared per kind.
const matCache = new Map();
export function mats(spec, { fog = true } = {}) {
  const key = spec.name + fog;
  if (matCache.has(key)) return matCache.get(key);
  const gull = spec === GULL;
  const m = {
    white: toon(), dark: toon('#3a3a3a'),
    arm: toon('#ffffff', featherTex.arm(!gull)),
    hand: toon('#ffffff', featherTex.hand(gull)),
    tail: toon('#ffffff', featherTex.tail(!gull)),
  };
  if (!fog) for (const x of Object.values(m)) x.fog = false;
  matCache.set(key, m);
  return m;
}

// ---------- a bird's skeleton ----------
// root → body (tilts) → head; body → arm → hand, each side; root → legs.
// `node(part, side)` makes each piece: a mesh for birds you see up close, or
// an empty Object3D whose matrix fills an instanced mesh for birds far away.
export function skeleton(spec, node) {
  const P = parts(spec);
  const root = node('root');
  root.rotation.order = 'YZX';                 // heading, then pitch, then roll (banking)
  const body = node('body');
  root.add(body);
  const head = node('head');
  if (head) { head.position.set(...P.neck, 0); body.add(head); }
  const arm = [], hand = [];
  for (const s of [-1, 1]) {
    const a = node('arm', s), h = node('hand', s);
    a.position.set(spec.shoulder[0], spec.shoulder[1], s * spec.shoulder[2]);
    h.position.z = s * spec.arm;
    a.add(h);
    body.add(a);
    arm.push(a); hand.push(h);
  }
  const legs = [-1, 1].map((s) => {
    const l = node('leg', s);
    if (l) { l.position.set(0, 0, s * 0.022 * P.k); root.add(l); }
    return l;
  });
  return { root, body, head, arm, hand, legs };
}

// A bird made of meshes, for the ones you see up close: body and tail, head
// (with a dark beak and eyes), two-part wings and legs. Nine meshes.
export function meshBird(spec) {
  const P = parts(spec), m = mats(spec);
  const sk = skeleton(spec, (part, s) => {
    const side = s < 0 ? P.L : P.R;
    switch (part) {
      case 'root': return new THREE.Group();
      case 'body': return mesh(P.bodyTail, [m.white, m.tail]);
      case 'head': { const h = mesh(P.head, m.white); mesh(P.headDark, m.dark, 0, 0, 0, h); return h; }
      case 'arm': return mesh(side.arm, m.arm);
      case 'hand': return mesh(side.hand, m.hand);
      default: return mesh(P.leg, m.dark);  // a leg
    }
  });
  for (const l of sk.legs) l.position.y = P.legLen;
  return sk;
}

// Sets both wings: shoulder (raised +), elbow (hand raised +), sweep (arm
// swept back +), hand (hand swept back +). Index 0 is the left wing.
export function setWings(sk, shoulder, elbow, sweep, hand) {
  for (let i = 0; i < 2; i++) {
    const s = i ? -1 : 1;
    sk.arm[i].rotation.set(s * shoulder, s * sweep, 0);
    sk.hand[i].rotation.set(s * elbow, s * hand, 0);
    sk.arm[i].scale.x = sk.hand[i].scale.z = 1;
  }
}

// One wingbeat. `phase` (radians) runs on; `amount` blends from the glide
// pose (0) to full beats (1). The hand lags the arm, so the wing bends: up
// and folded back on the upstroke, spread wide on the downstroke.
export function flap(sk, spec, phase, amount, big = 1) {
  const sn = Math.sin(phase), up = Math.max(0, Math.cos(phase)), g = spec.glide, A = spec.beat * big;
  setWings(sk,
    lerp(g.shoulder, spec.bias + A * sn, amount),
    lerp(g.elbow, A * 0.5 * Math.sin(phase - 1.2), amount),
    lerp(g.sweep, 0.05 + up * 0.35 * big, amount),
    lerp(g.hand, up * 0.6 * big, amount));
}

// Wings folded along the body; `t` 0..1 blends from the glide pose.
export function fold(sk, spec, t = 1) {
  const g = spec.glide, f = spec.fold;
  setWings(sk, lerp(g.shoulder, f.shoulder, t), lerp(g.elbow, f.elbow, t), lerp(g.sweep, f.sweep, t), lerp(g.hand, f.hand, t));
  // folded, the feathers slide over each other: the wing gets narrower and shorter
  for (let i = 0; i < 2; i++) {
    sk.arm[i].scale.x = lerp(1, 0.62, t);
    sk.hand[i].scale.z = lerp(1, f.tuck, t);
  }
}

// Points a flying bird along its velocity and banks it into the turn.
// `turn` is the heading's rate of change (radians a second).
const G = 9.8;
export function steer(root, vel, turn, bankScale = 1) {
  const sp = Math.hypot(vel.x, vel.z);
  root.rotation.y = Math.atan2(-vel.z, vel.x);
  root.rotation.z = Math.atan2(vel.y, Math.max(sp, 0.01)) * 0.8;
  root.rotation.x = THREE.MathUtils.clamp(-Math.atan((sp * turn) / G) * bankScale, -0.9, 0.9);
}

// A whole flock drawn with one instanced mesh per part: call pose(i) with a
// skeleton posed for bird i, and it copies the matrices in.
export function flockMeshes(spec, n, parent, { scale = 1 } = {}) {
  const P = parts(spec), m = mats(spec, { fog: false });
  const geo = { body: P.flightBody, arm: [P.L.arm, P.R.arm], hand: [P.L.hand, P.R.hand] };
  const make = (g, mat) => {
    const im = new THREE.InstancedMesh(g, mat, n);
    im.frustumCulled = false;                  // the birds move; never cull the lot
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(im);
    return im;
  };
  const meshes = {
    body: make(geo.body, m.white),
    arm: [0, 1].map((i) => make(geo.arm[i], m.arm)),
    hand: [0, 1].map((i) => make(geo.hand[i], m.hand)),
  };
  const sk = skeleton(spec, (part) => (part === 'head' || part === 'leg' ? null : new THREE.Object3D()));
  sk.root.scale.setScalar(scale);
  return {
    sk,
    pose(i) {
      sk.root.updateMatrixWorld(true);
      meshes.body.setMatrixAt(i, sk.body.matrixWorld);
      for (let s = 0; s < 2; s++) {
        meshes.arm[s].setMatrixAt(i, sk.arm[s].matrixWorld);
        meshes.hand[s].setMatrixAt(i, sk.hand[s].matrixWorld);
      }
    },
    done() {
      for (const im of [meshes.body, ...meshes.arm, ...meshes.hand]) im.instanceMatrix.needsUpdate = true;
    },
  };
}
