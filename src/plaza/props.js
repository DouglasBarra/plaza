// Street furniture and plants. Each builder adds one object to parent `p`;
// most can be swapped for a hand-made model of the same name (models.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, stamp, mesh, cylGeo } from '../kit.js';
import { swapModel } from '../models.js';
import { sway, lampLight } from '../life.js';
import { signBoard } from '../details.js';
import { boxGeo, prismGeo } from '../kit.js';
import { toon } from '../ink.js';
import { nightOnly, skipND } from '../life.js';
import { clockHands } from '../details.js';
import { lineArtCanvas, inkLine, LINE_ART_SIZE as S } from '../textures.js';

// ---------- merged parts ----------
// A prop is drawn from many small parts, but the parts that share a material
// are merged into one mesh: a bench is two draw calls, not forty. Parts are
// placed in the prop's own frame (meters, +z its front).
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

class Parts {
  constructor() { this.by = new Map(); }

  // `geo` at (x, y, z), turned by `rot` ([x, y, z] angles or a quaternion), scaled by `s`
  add(geo, mat, x = 0, y = 0, z = 0, rot = null, s = null) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    if (rot?.isQuaternion) _q.copy(rot); else if (rot) _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])); else _q.identity();
    if (typeof s === 'number') _s.setScalar(s); else if (s) _s.set(s[0], s[1], s[2]); else _s.set(1, 1, 1);
    g.applyMatrix4(_m.compose(_p.set(x, y, z), _q, _s));
    if (!this.by.has(mat)) this.by.set(mat, []);
    this.by.get(mat).push(g);
    return this;
  }
  box(w, h, d, mat, x, y, z, rot) { return this.add(boxGeo(w, h, d), mat, x, y, z, rot); }
  cyl(rt, rb, h, mat, x, y, z, seg = 8, rot) { return this.add(cylGeo(rt, rb, h, seg), mat, x, y, z, rot); }
  ball(r, mat, x, y, z, s = null, seg = 8) { return this.add(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), mat, x, y, z, null, s); }
  // a round bar from a to b, `r` thick at a and `r2` at b
  rod(mat, a, b, r = 0.02, seg = 6, r2 = r) {
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
    const len = _a.distanceTo(_b);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, _b.clone().sub(_a).normalize());
    return this.add(cylGeo(r2, r, len, seg), mat, (_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2, q);
  }
  // a square bar from a to b
  bar(mat, a, b, w = 0.04, d = w) {
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
    const len = _a.distanceTo(_b);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, _b.clone().sub(_a).normalize());
    return this.add(boxGeo(w, len, d), mat, (_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2, q);
  }
  // a bent bar through the points (a smooth curve)
  tube(mat, pts, r = 0.02, seg = 5, n = 14) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    return this.add(new THREE.TubeGeometry(curve, n, r, seg, false), mat);
  }
  merged() {
    const out = new Map();
    for (const [mat, list] of this.by) out.set(mat, mergeGeometries(list));
    return out;
  }
  // one mesh per material, added to `g`; returns them by material
  into(g) {
    const out = new Map();
    for (const [mat, geo] of this.merged()) out.set(mat, mesh(geo, mat, 0, 0, 0, g));
    return out;
  }
}

// Props that repeat (lamps, benches, bins) build their parts once and share them.
const kits = new Map();
function fromKit(g, key, make) {
  if (!kits.has(key)) { const P = new Parts(); make(P); kits.set(key, P.merged()); }
  const out = new Map();
  for (const [mat, geo] of kits.get(key)) out.set(mat, mesh(geo, mat, 0, 0, 0, g));
  return out;
}

// Each prop that varies gets its own little generator, seeded by where it
// stands, so moving one never reshuffles another.
const seeded = (n) => {
  let s = (Math.abs(Math.round(n * 7919)) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};

// Bumps a round shape's surface a little so a clump of leaves isn't a ball.
function lumpy(geo, amt, k) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = Math.sin(x * 5.3 + k) * Math.sin(y * 4.1 + k * 2.1) * Math.sin(z * 4.7 + k * 3.7);
    pos.setXYZ(i, x * (1 + amt * n), y * (1 + amt * n), z * (1 + amt * n));
  }
  return geo;
}

// A plane showing one cell of a texture atlas (cols x rows, cells counted
// from the top left), facing +z.
function atlasPlane(w, h, cols, rows, i) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv, cx = i % cols, cy = Math.floor(i / cols);
  for (let k = 0; k < uv.count; k++) uv.setXY(k, (cx + uv.getX(k)) / cols, 1 - (cy + 1 - uv.getY(k)) / rows);
  return g;
}

// A hand-lettered canvas texture, drawn in ink so night mode re-inks it like
// the other line art; drawn again once the display face has loaded.
const FACE = '"Patrick Hand SC", "Comic Neue", sans-serif';
function letteredTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.lineArt = true;
  const paint = () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = g.fillStyle = '#111111';
    g.lineCap = g.lineJoin = 'round';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    draw(g);
    t.needsUpdate = true;
  };
  paint();
  document.fonts?.load(`40px ${FACE.split(',')[0]}`).then(paint).catch(() => {});
  return t;
}
const once = (make) => { let v; return () => (v ??= make()); };

// Lit at night: lamp glass, festoon bulbs, a kiosk's and a phone box's windows.
const bulbGlow = new THREE.MeshBasicMaterial({ color: '#fff1b8' });
const litPane = new THREE.MeshBasicMaterial({ color: '#ffe9a8' });
function nightGlow(geo, mat, parent) {
  const m = mesh(geo, mat, 0, 0, 0, parent);
  m.castShadow = m.receiveShadow = false;
  m.visible = false;
  nightOnly.push(m);
  return m;
}

// ---------- the props ----------

// A slatted wooden crate: corner posts, three boards a side, a boarded lid.
export function crate(p, x, y, z, rotY = 0, size = 0.6) {
  const g = new THREE.Group();
  fromKit(g, `crate-${size}`, (P) => {
    const s = size, t = s * 0.07, slat = s * 0.26, gap = (s - 3 * slat) / 2;
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) P.box(t * 1.4, s, t * 1.4, M.planks, cx * (s / 2 - t * 0.7), s / 2, cz * (s / 2 - t * 0.7));
    for (let i = 0; i < 3; i++) {
      const sy = slat / 2 + i * (slat + gap);
      P.box(s, slat, t, M.planks, 0, sy, s / 2 - t / 2);
      P.box(s, slat, t, M.planks, 0, sy, -s / 2 + t / 2);
      P.box(t, slat, s - t * 2, M.planks, s / 2 - t / 2, sy, 0);
      P.box(t, slat, s - t * 2, M.planks, -s / 2 + t / 2, sy, 0);
    }
    for (let i = 0; i < 4; i++) P.box(s * 0.94, t * 0.6, s * 0.22, M.planks, 0, s - t * 0.3, -s * 0.36 + i * s * 0.24);
  });
  g.position.set(x, y, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'crate'));
}

// A spruce: a straight trunk and tiers of drooping, ragged boughs.
export function pine(p, x, z, s = 1) {
  const g = new THREE.Group();
  fromKit(g, 'pine', (P) => {
    P.cyl(0.08, 0.17, 1.5, M.white, 0, 0.75, 0, 7);
    for (let i = 0; i < 6; i++) {
      const r = 1.45 - i * 0.22, h = 1.2 - i * 0.07;
      const cone = new THREE.ConeGeometry(r, h, 12, 1);
      // every other point of the skirt droops and tucks in: boughs, not a cone
      const pos = cone.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        if (pos.getY(k) > -h / 2 + 1e-4) continue;
        const a = Math.atan2(pos.getZ(k), pos.getX(k)), odd = Math.round(a / (Math.PI / 6)) % 2 !== 0;
        if (odd) pos.setXYZ(k, pos.getX(k) * 0.8, pos.getY(k) + 0.14, pos.getZ(k) * 0.8);
      }
      cone.computeVertexNormals();
      P.add(cone, M.white, 0, 1.0 + i * 0.6 + h / 2, 0, [0, i * 0.4, 0]);
    }
  });
  g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = x * 3.1;
  p.add(swapModel(g, 'tree-pine'));
  sway(g);
  return g;
}

// A plaza tree (a lime or a plane): a tapering trunk that forks into limbs,
// and a crown of leafy clumps. Three shapes, picked by where it stands.
export const TREE_LOW_BRANCH = 2.6;  // how high its first limbs are (at scale 1)
export function roundTree(p, x, z, s = 1) {
  const g = new THREE.Group();
  const v = Math.abs(Math.round(x * 3 + z * 5)) % 3;
  fromKit(g, `tree-round-${v}`, (P) => {
    const r = seeded(v * 977 + 13);
    P.cyl(0.12, 0.19, 2.6, M.white, 0, 1.3, 0, 9);
    P.cyl(0.19, 0.3, 0.3, M.white, 0, 0.15, 0, 9);                   // root flare
    const limbs = 4 + (v % 2);
    for (let i = 0; i < limbs; i++) {
      const a = (i / limbs) * Math.PI * 2 + r() * 0.8;
      const y0 = TREE_LOW_BRANCH - 0.4 + r() * 0.5, out = 0.9 + r() * 0.6, up = 1.3 + r() * 0.6;
      const end = [Math.cos(a) * out, y0 + up, Math.sin(a) * out];
      P.rod(M.white, [0, y0, 0], end, 0.1, 6, 0.045);
      const mid = [end[0] * 0.55, y0 + up * 0.55, end[2] * 0.55], a2 = a + (r() - 0.5) * 1.8;
      P.rod(M.white, mid, [mid[0] + Math.cos(a2) * 0.7, mid[1] + 0.5, mid[2] + Math.sin(a2) * 0.7], 0.045, 5, 0.02);
      const rad = 1.0 + r() * 0.35;
      P.add(lumpy(new THREE.IcosahedronGeometry(1, 1), 0.12, i + v), M.white, end[0] * 1.2, end[1] + 0.35, end[2] * 1.2, [r() * 3, r() * 3, 0], [rad, rad * 0.8, rad]);
    }
    P.add(lumpy(new THREE.IcosahedronGeometry(1, 1), 0.1, 7 + v), M.white, 0, 4.6, 0, [0, r() * 3, 0], [1.5, 1.15, 1.5]);
    P.add(lumpy(new THREE.IcosahedronGeometry(1, 1), 0.12, 9 + v), M.white, (r() - 0.5) * 0.8, 5.5, (r() - 0.5) * 0.8, [r(), 0, r()], [1.0, 0.85, 1.0]);
  });
  g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = (x * 1.7 + z) % (Math.PI * 2);
  p.add(swapModel(g, 'tree-round'));
  sway(g, 0.012);
  return g;
}

// A park bench: two cast-iron ends (legs, a raked back standard, a scrolled
// arm), a front rail, and wooden slats. Seat 0.45 m up; it faces +z.
export function bench(p, x, z, rotY) {
  const g = new THREE.Group();
  fromKit(g, 'bench', (P) => {
    const iron = M.white;
    for (const sx of [-0.74, 0.74]) {
      P.tube(iron, [[sx, 0, 0.27], [sx, 0.2, 0.23], [sx, 0.42, 0.21]], 0.026);                    // front leg
      P.tube(iron, [[sx, 0, -0.27], [sx, 0.22, -0.21], [sx, 0.42, -0.22], [sx, 0.66, -0.29], [sx, 0.9, -0.35]], 0.026, 5, 18); // back leg and standard
      P.bar(iron, [sx, 0.415, 0.25], [sx, 0.415, -0.25], 0.035, 0.05);                            // seat rail
      P.tube(iron, [[sx, 0.42, 0.22], [sx, 0.55, 0.27], [sx, 0.64, 0.2], [sx, 0.65, -0.02], [sx, 0.67, -0.27]], 0.022, 5, 16); // arm
      P.add(new THREE.TorusGeometry(0.035, 0.012, 4, 10), iron, sx, 0.6, 0.255, [0, Math.PI / 2, 0]);   // the scroll under the arm
      for (const fz of [0.27, -0.27]) P.ball(0.04, iron, sx, 0.02, fz, [1, 0.5, 1.3]);            // feet
    }
    P.bar(iron, [-0.74, 0.37, 0.2], [0.74, 0.37, 0.2], 0.025, 0.025);                              // front rail
    P.bar(iron, [-0.74, 0.37, -0.2], [0.74, 0.37, -0.2], 0.025, 0.025);
    for (let i = 0; i < 5; i++) P.box(1.66, 0.032, 0.075, M.planks, 0, 0.447 - (i === 0 ? 0.008 : 0), 0.2 - i * 0.1);
    const tilt = Math.atan2(0.08, 0.3);
    for (let i = 0; i < 3; i++) {
      const t = 0.2 + i * 0.3;
      P.box(1.66, 0.085, 0.028, M.planks, 0, 0.52 + t * 0.32, -0.245 - t * 0.08 + 0.035, [-tilt, 0, 0]);
    }
  });
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bench'));
  return g;
}

// A cast-iron street lamp: a fluted base, a tapering post with collars and
// the lamplighter's ladder bar, scroll brackets, and a four-sided lantern
// with a hipped cap. The lantern's glass (named "glow") lights up at night.
export const LAMP_TOP = 4.22;    // the flat top of its cap, where a bird can sit
const lampGlass = once(() => cylGeo(0.195, 0.135, 0.42, 4).rotateY(Math.PI / 4).translate(0, 3.71, 0));
export function lamp(p, x, z) {
  const g = new THREE.Group();
  fromKit(g, 'lamp', (P) => {
    const w = M.white, sq = [0, Math.PI / 4, 0];
    P.cyl(0.22, 0.25, 0.12, w, 0, 0.06, 0, 8);
    P.cyl(0.16, 0.2, 0.55, w, 0, 0.395, 0, 8);
    P.cyl(0.19, 0.19, 0.05, w, 0, 0.69, 0, 8);
    P.cyl(0.075, 0.15, 0.28, w, 0, 0.855, 0, 8);
    P.cyl(0.05, 0.068, 2.4, w, 0, 2.19, 0, 8);
    for (const y of [1.05, 2.0, 3.32]) P.cyl(0.085, 0.085, 0.045, w, 0, y, 0, 10);
    P.box(0.72, 0.03, 0.03, w, 0, 3.0, 0);                                        // ladder bar
    for (const s of [-0.36, 0.36]) P.ball(0.03, w, s, 3.0, 0);
    for (let i = 0; i < 4; i++) {                                                 // scroll brackets
      const a = i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      P.tube(w, [[c * 0.05, 3.18, s * 0.05], [c * 0.12, 3.26, s * 0.12], [c * 0.13, 3.36, s * 0.13], [c * 0.08, 3.42, s * 0.08]], 0.014, 4, 10);
    }
    P.cyl(0.14, 0.05, 0.12, w, 0, 3.42, 0, 8);                                    // the cup under the lantern
    P.cyl(0.15, 0.15, 0.03, w, 0, 3.49, 0, 4, sq);
    for (let i = 0; i < 4; i++) {                                                 // corner posts of the lantern
      const a = Math.PI / 4 + i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      P.rod(w, [c * 0.14, 3.5, s * 0.14], [c * 0.2, 3.92, s * 0.2], 0.012, 4);
    }
    P.cyl(0.245, 0.245, 0.035, w, 0, 3.94, 0, 4, sq);                             // top rim
    P.cyl(0.07, 0.27, 0.2, w, 0, 4.06, 0, 4, sq);                                 // hipped cap
    P.cyl(0.08, 0.08, 0.06, w, 0, LAMP_TOP - 0.03, 0, 8);                         // vent
  });
  const head = mesh(lampGlass(), M.white, 0, 0, 0, g);
  head.name = 'glow';
  head.castShadow = false;
  const light = lampLight(g, head);
  g.position.set(x, 0, z);
  // in a lamp model, the part named "glow" is the one that lights up
  p.add(swapModel(g, 'lamp', (model) => {
    light.head = model.getObjectByName('glow') || null;
    if (light.head) light.day = light.head.material;
  }));
}

export function bollard(p, x, z) {
  mesh(bollardGeo(), M.white, x, 0, z, p);
}

// A cast-iron bollard, turned on a lathe: a flared foot, a waisted shaft
// with a collar, and a domed cap with a knob. About 0.9 m tall.
const bollardGeo = once(() => new THREE.LatheGeometry([
  [0, 0], [0.19, 0], [0.19, 0.05], [0.15, 0.1], [0.13, 0.2], [0.12, 0.55], [0.15, 0.58], [0.15, 0.63], [0.125, 0.66],
  [0.13, 0.76], [0.15, 0.78], [0.14, 0.82], [0.1, 0.87], [0.04, 0.88], [0.045, 0.92], [0, 0.94],
].map(([r, y]) => new THREE.Vector2(r, y)), 8));

// A whole row of bollards as one mesh: the plaza's edge has well over a
// hundred, and one draw call is much cheaper than hundreds.
export function bollards(p, spots) {
  const one = bollardGeo().toNonIndexed();
  const parts = spots.map(([x, z]) => one.clone().translate(x, 0, z));
  return mesh(mergeGeometries(parts), M.white, 0, 0, 0, p);
}

// A wooden planter box on little feet, with corner posts and a capping
// rail, filled to the brim with earth and flowers (white, or a district's).
export function planter(p, x, z, flowers = 'white') {
  const g = new THREE.Group();
  const P = new Parts(), r = seeded(x * 13 + z * 7);
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) {
    P.box(0.1, 0.62, 0.1, M.white, cx * 0.76, 0.31, cz * 0.76);
    P.box(0.14, 0.05, 0.14, M.white, cx * 0.76, 0.025, cz * 0.76);
  }
  P.box(1.5, 0.5, 1.5, M.planks, 0, 0.32, 0);
  for (const s of [-1, 1]) {
    P.box(1.68, 0.04, 0.1, M.white, 0, 0.6, s * 0.79);
    P.box(0.1, 0.04, 1.68, M.white, s * 0.79, 0.6, 0);
  }
  P.box(1.46, 0.03, 1.46, M.dirt, 0, 0.57, 0);
  const bloom = flowers === 'white' ? M.white : stamp[flowers];
  for (let i = 0; i < 16; i++) {
    const fx = (r() - 0.5) * 1.2, fz = (r() - 0.5) * 1.2, h = 0.25 + r() * 0.2;
    P.rod(M.white, [fx, 0.57, fz], [fx + (r() - 0.5) * 0.08, 0.57 + h, fz + (r() - 0.5) * 0.08], 0.012, 3);
    P.ball(0.05, M.white, fx + 0.06, 0.62 + r() * 0.06, fz, [1.6, 0.35, 0.8], 6);  // a leaf
    P.add(new THREE.IcosahedronGeometry(0.07 + r() * 0.03, 0), i % 3 === 2 ? M.white : bloom, fx, 0.6 + h, fz, [r() * 3, r() * 3, 0]);
  }
  P.into(g);
  g.position.set(x, 0, z);
  p.add(swapModel(g, 'planter'));
}

export function bike(p, x, z, rotY) {
  // A city bike parked on its kickstand, leaning a little toward it (+z):
  // diamond frame, spoked wheels with mudguards, a sprung saddle, swept
  // handlebars, a rack, and (on some) a wicker basket. Front is +x.
  const g = new THREE.Group();
  const lean = new THREE.Group();
  lean.rotation.x = 0.09;
  g.add(lean);
  fromKit(lean, 'bike', bikeParts);
  if (Math.abs(Math.round(x * 5 + z * 3)) % 2) {
    fromKit(lean, 'bike-basket', (P) => {
      P.box(0.3, 0.2, 0.34, M.planks, 0.58, 0.86, 0);
      P.box(0.32, 0.025, 0.36, M.white, 0.58, 0.965, 0);
      P.rod(M.white, [0.45, 0.8, 0], [0.42, 0.98, 0], 0.01, 4);
    });
  }
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bike'));
}
function bikeParts(P) {
  const w = M.white, R = [-0.52, 0.34], F = [0.55, 0.34], BB = [-0.06, 0.3];
  const ST = [-0.2, 0.86], H1 = [0.36, 0.88], H2 = [0.4, 0.7];
  const at = ([x, y], z = 0) => [x, y, z];
  for (const [cx, cy] of [R, F]) {
    P.add(new THREE.TorusGeometry(0.325, 0.022, 5, 28), w, cx, cy, 0);            // tyre
    P.add(new THREE.TorusGeometry(0.29, 0.01, 4, 28), w, cx, cy, 0);              // rim
    P.cyl(0.03, 0.03, 0.11, w, cx, cy, 0, 8, [Math.PI / 2, 0, 0]);                // hub
    for (let i = 0; i < 16; i++) {                                                // spokes, laced from both flanges
      const a = (i / 16) * Math.PI * 2, side = i % 2 ? 0.035 : -0.035;
      P.rod(w, [cx, cy, side], [cx + Math.cos(a) * 0.285, cy + Math.sin(a) * 0.285, 0], 0.0045, 3);
    }
    // mudguard over the top of the wheel
    P.add(new THREE.TorusGeometry(0.36, 0.018, 3, 18, Math.PI * 0.62), w, cx, cy, 0, [0, 0, cx < 0 ? Math.PI * 0.3 : Math.PI * 0.12], [1, 1, 2.2]);
  }
  P.rod(w, at(ST), at(H1), 0.017);                                                // top tube
  P.rod(w, at(BB), at(H2), 0.02);                                                 // down tube
  P.rod(w, at(BB), at(ST), 0.017);                                                // seat tube
  P.rod(w, at(H2), at(H1), 0.024);                                                // head tube
  for (const z of [-0.045, 0.045]) {
    P.rod(w, at(BB, z * 0.6), at(R, z), 0.011);                                   // chain stays
    P.rod(w, [ST[0] + 0.01, ST[1] - 0.05, z * 0.4], at(R, z), 0.01);             // seat stays
    P.tube(w, [at(H2, z * 0.5), [0.45, 0.52, z], [0.5, 0.42, z], [0.55, 0.34, z]], 0.012, 4, 8); // fork
    P.rod(w, [-0.24, 0.72, z * 1.5], [-0.72, 0.72, z * 1.5], 0.009, 4);          // rack
    P.rod(w, [-0.66, 0.72, z * 1.5], at(R, z * 1.2), 0.008, 4);
  }
  for (let i = 0; i < 3; i++) P.rod(w, [-0.3 - i * 0.18, 0.72, -0.07], [-0.3 - i * 0.18, 0.72, 0.07], 0.008, 4);
  P.rod(w, at(ST), [-0.23, 0.95, 0], 0.013);                                      // seat post
  P.ball(0.1, w, -0.25, 0.985, 0, [1.25, 0.32, 0.85]);                           // saddle
  P.ball(0.05, w, -0.14, 0.985, 0, [1.4, 0.4, 0.7]);
  for (const z of [-0.04, 0.04]) P.cyl(0.014, 0.014, 0.05, w, -0.3, 0.945, z, 6);   // its springs
  P.rod(w, at(H1), [0.33, 1.0, 0], 0.016);                                        // stem
  P.tube(w, [[0.22, 1.03, -0.29], [0.34, 1.02, -0.22], [0.36, 1.0, 0], [0.34, 1.02, 0.22], [0.22, 1.03, 0.29]], 0.012, 5, 16); // swept bars
  for (const z of [-0.28, 0.28]) P.rod(w, [0.26, 1.03, z], [0.19, 1.035, z * 1.05], 0.018, 6);  // grips
  P.ball(0.03, w, 0.39, 0.82, 0);                                                 // headlamp
  P.cyl(0.1, 0.1, 0.012, w, BB[0], BB[1], 0.06, 16, [Math.PI / 2, 0, 0]);         // chainring
  P.rod(w, [BB[0], BB[1] + 0.1, 0.062], [R[0], R[1] + 0.035, 0.062], 0.005, 3);   // chain
  P.rod(w, [BB[0], BB[1] - 0.1, 0.062], [R[0], R[1] - 0.035, 0.062], 0.005, 3);
  P.cyl(0.04, 0.04, 0.015, w, R[0], R[1], 0.062, 10, [Math.PI / 2, 0, 0]);       // rear cog
  P.bar(w, [BB[0], BB[1], 0.085], [BB[0] + 0.1, BB[1] - 0.13, 0.085], 0.025, 0.012);  // cranks
  P.bar(w, [BB[0], BB[1], -0.085], [BB[0] - 0.1, BB[1] + 0.13, -0.085], 0.025, 0.012);
  P.box(0.09, 0.02, 0.08, w, BB[0] + 0.1, BB[1] - 0.13, 0.13);                   // pedals
  P.box(0.09, 0.02, 0.08, w, BB[0] - 0.1, BB[1] + 0.13, -0.13);
  P.rod(w, [BB[0] - 0.08, BB[1] - 0.02, 0.04], [BB[0] - 0.16, 0.025, 0.24], 0.011, 4);  // kickstand
}

// A notice board under a little gabled roof: a cork board in a frame on two
// posts, pinned with posters and notes. It faces +z.
export function noticeboard(p, x, z, rotY) {
  const g = new THREE.Group();
  fromKit(g, 'noticeboard', (P) => {
    for (const sx of [-0.9, 0.9]) {
      P.box(0.12, 2.3, 0.12, M.white, sx, 1.15, 0);
      P.box(0.18, 0.06, 0.18, M.white, sx, 0.03, 0);
    }
    P.box(1.7, 1.1, 0.05, M.planks, 0, 1.45, 0);
    P.box(1.8, 0.07, 0.09, M.white, 0, 2.03, 0.01);
    P.box(1.8, 0.07, 0.09, M.white, 0, 0.87, 0.01);
    for (const sx of [-0.87, 0.87]) P.box(0.06, 1.1, 0.09, M.white, sx, 1.45, 0.01);
    P.box(1.68, 0.16, 0.04, M.white, 0, 2.17, 0.02);                              // header board
    for (const s of [-1, 1]) P.box(2.2, 0.035, 0.36, M.shingles, 0, 2.38, s * 0.14, [s * 0.62, 0, 0]);
    P.cyl(0.03, 0.03, 2.24, M.white, 0, 2.48, 0, 6, [0, 0, Math.PI / 2]);        // ridge
    for (const sx of [-1.08, 1.08]) P.add(prismGeo(0.5, 0.22, 0.03), M.white, sx * 0.84, 2.27, 0, [0, Math.PI / 2, 0]); // gable boards
  });
  const P = new Parts();
  const notes = [[-0.5, 1.52, 0.48, 0.62, 0.04, 0], [0.12, 1.66, 0.42, 0.36, -0.05, 1], [0.6, 1.4, 0.36, 0.52, 0.06, 3],
    [0.08, 1.2, 0.5, 0.4, 0.02, 2], [-0.55, 1.08, 0.3, 0.24, -0.08, 1]];
  for (const [nx, ny, w, h, tilt, i] of notes) {
    P.add(atlasPlane(w, h, 2, 2, i), posterMat(), nx, ny, 0.03 + Math.abs(tilt) * 0.02, [0, 0, tilt]);
    P.ball(0.014, M.white, nx, ny + h / 2 - 0.04, 0.04, null, 6);
  }
  P.into(g);
  signBoard(g, 0, 2.17, 0.045, 0.7, 0.14, 'Notices');
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'noticeboard'));
}

// A post box on a post: a round-topped iron box with a slot under a rain
// flap, a door, the post horn in People's color, and a collection plate.
export function mailbox(p, x, z, rotY) {
  const g = new THREE.Group();
  fromKit(g, 'mailbox', (P) => {
    P.cyl(0.05, 0.06, 1.0, M.white, 0, 0.5, 0, 8);
    P.cyl(0.1, 0.12, 0.05, M.white, 0, 0.025, 0, 8);
    P.box(0.44, 0.5, 0.32, M.white, 0, 1.2, 0);
    P.cyl(0.16, 0.16, 0.44, M.white, 0, 1.45, 0, 14, [0, 0, Math.PI / 2]);        // the round top
    for (const s of [-1, 1]) P.cyl(0.175, 0.175, 0.02, M.white, s * 0.225, 1.45, 0, 14, [0, 0, Math.PI / 2]);
    P.box(0.48, 0.04, 0.36, M.white, 0, 0.94, 0);                                 // foot of the box
    P.box(0.3, 0.05, 0.05, M.white, 0, 1.365, 0.185, [0.5, 0, 0]);               // rain flap
    P.box(0.34, 0.36, 0.02, M.white, 0, 1.12, 0.165);                            // door
    P.box(0.17, 0.09, 0.012, M.white, 0, 1.0, 0.18);                             // collection plate
    P.box(0.025, 0.06, 0.03, M.white, 0.14, 1.12, 0.18);                         // keyhole boss
    P.box(0.24, 0.03, 0.02, M.deep, 0, 1.33, 0.165);                             // the slot
  });
  const horn = mesh(new THREE.TorusGeometry(0.045, 0.014, 5, 12), stamp.people, 0, 1.2, 0.18, g);
  horn.castShadow = false;
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'mailbox'));
}

// ---------- more street furniture ----------

// A round cast-iron litter bin, about a meter tall: ribbed sides, two bands,
// and a domed lid with a mouth in front. It faces +z.
export function bin(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  fromKit(g, 'bin', (P) => {
    P.cyl(0.24, 0.27, 0.06, M.white, 0, 0.03, 0, 16);
    P.cyl(0.235, 0.215, 0.74, M.white, 0, 0.43, 0, 16);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      P.box(0.03, 0.62, 0.02, M.white, Math.sin(a) * 0.232, 0.43, Math.cos(a) * 0.232, [-0.02, a, 0]);
    }
    for (const y of [0.16, 0.66]) P.cyl(0.245, 0.245, 0.04, M.white, 0, y, 0, 16);
    P.cyl(0.27, 0.27, 0.05, M.white, 0, 0.82, 0, 16);
    P.add(new THREE.SphereGeometry(0.26, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.white, 0, 0.845, 0, null, [1, 0.5, 1]);
    P.ball(0.035, M.white, 0, 0.985, 0);
    P.box(0.24, 0.08, 0.08, M.deep, 0, 0.895, 0.22, [-0.4, 0, 0]);
  });
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bin'));
  return g;
}

// A drinking fountain: a stone pedestal, a fluted iron column with a ball on
// top, a basin, and a spout that never stops. It faces +z.
export function drinkingFountain(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  const P = new Parts();
  P.box(0.8, 0.1, 0.8, M.stone, 0, 0.05, 0);
  P.box(0.4, 0.14, 0.3, M.stone, 0, 0.17, 0.45);                                  // a step for small drinkers
  P.cyl(0.2, 0.25, 0.5, M.stone, 0, 0.35, 0, 8);
  P.add(new THREE.LatheGeometry([[0.06, 0], [0.18, 0.02], [0.3, 0.1], [0.34, 0.2], [0.31, 0.2], [0.27, 0.12], [0.06, 0.1]]
    .map(([r, y]) => new THREE.Vector2(r, y)), 16), M.white, 0, 0.62, 0.05);
  P.cyl(0.08, 0.11, 0.62, M.white, 0, 0.92, 0, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    P.box(0.02, 0.5, 0.02, M.white, Math.sin(a) * 0.095, 0.95, Math.cos(a) * 0.095);
  }
  P.cyl(0.15, 0.09, 0.08, M.white, 0, 1.27, 0, 12);
  P.ball(0.08, M.white, 0, 1.38, 0);
  P.tube(M.white, [[0, 1.08, 0.08], [0, 1.1, 0.18], [0, 1.06, 0.24]], 0.02, 6, 8);   // spout
  P.tube(M.water, [[0, 1.05, 0.25], [0, 0.95, 0.3], [0, 0.8, 0.31]], 0.01, 4, 8);   // the trickle
  P.cyl(0.25, 0.25, 0.02, M.water, 0, 0.73, 0.05, 16);
  P.into(g);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'drinking-fountain'));
  return g;
}

// Sheffield bike stands: inverted-U hoops in a row along local z, a bike's
// length (local x) each; bikes lean on either side.
export function bikeRack(p, x, z, rotY = 0, n = 3) {
  const g = new THREE.Group();
  fromKit(g, `bike-rack-${n}`, (P) => {
    for (let i = 0; i < n; i++) {
      const hz = (i - (n - 1) / 2) * 1.0;
      P.tube(M.white, [[-0.38, 0, hz], [-0.38, 0.55, hz], [-0.33, 0.75, hz], [-0.15, 0.82, hz], [0.15, 0.82, hz], [0.33, 0.75, hz], [0.38, 0.55, hz], [0.38, 0, hz]], 0.03, 7, 30);
      for (const s of [-0.38, 0.38]) P.cyl(0.06, 0.07, 0.03, M.white, s, 0.015, hz, 10);
    }
  });
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bike-rack'));
  return g;
}

// A newspaper and flower kiosk: eight plank walls on a stone plinth, a
// serving window with a counter and a striped awning, the day's papers
// clipped to racks, a tiled roof with a finial, and buckets of flowers out
// front. It faces +z; somebody can stand inside, behind the counter.
export const KIOSK = { R: 1.2, inside: 0.55 };   // its radius, and where the vendor stands (from the middle, toward the front)
export function kiosk(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  const P = new Parts(), R = KIOSK.R, H = 2.4, apo = R * Math.cos(Math.PI / 8), side = 2 * R * Math.sin(Math.PI / 8);
  const oct = [0, Math.PI / 8, 0];
  P.cyl(R + 0.1, R + 0.14, 0.2, M.stone, 0, 0.1, 0, 8, oct);
  P.cyl(R - 0.06, R - 0.06, 0.02, M.planks, 0, 0.21, 0, 8, oct);                  // floor
  const face = (k) => { const a = (k * Math.PI) / 4; return { a, s: Math.sin(a), c: Math.cos(a) }; };
  for (let k = 0; k < 8; k++) {
    const { a, s, c } = face(k);
    if (k === 0) {
      // the front: a wall up to the counter, the window, and a deep lintel
      P.box(side + 0.02, 0.8, 0.06, M.planks, s * apo, 0.6, c * apo, [0, a, 0]);
      P.box(side + 0.02, 0.5, 0.06, M.planks, 0, H - 0.25, apo, [0, a, 0]);
      for (const sx of [-1, 1]) P.box(0.07, 1.0, 0.08, M.white, sx * (side / 2 - 0.035), 1.45, apo);
      P.box(side + 0.2, 0.05, 0.32, M.white, 0, 1.02, apo + 0.06);               // counter
      for (let i = 0; i < 4; i++) P.box(0.2, 0.012, 0.27, M.white, -0.27 + i * 0.18, 1.055 + i * 0.004, apo + 0.08, [0.06, (i - 1.5) * 0.15, 0]); // magazines
    } else {
      P.box(side + 0.02, H - 0.2, 0.06, M.planks, s * apo, 0.2 + (H - 0.2) / 2, c * apo, [0, a, 0]);
    }
    // corner posts and a cornice
    const ca = a + Math.PI / 8;
    P.box(0.07, H - 0.2, 0.07, M.white, Math.sin(ca) * R, 0.2 + (H - 0.2) / 2, Math.cos(ca) * R, [0, ca, 0]);
    // the day's papers on the two walls either side of the window
    if (k === 1 || k === 7) {
      for (let r = 0; r < 2; r++) for (let q = 0; q < 2; q++) {
        const lx = (q - 0.5) * 0.36, ly = 1.15 + r * 0.5;
        P.box(0.3, 0.42, 0.012, M.white, s * (apo + 0.04) + c * lx, ly, c * (apo + 0.04) - s * lx, [0, a, 0.03 * (q ? 1 : -1)]);
      }
      P.box(side - 0.06, 0.03, 0.04, M.white, s * (apo + 0.05), 1.42, c * (apo + 0.05), [0, a, 0]);
    }
    if (k === 3 || k === 5) P.add(atlasPlane(0.55, 0.75, 2, 2, k === 3 ? 0 : 1), posterMat(), s * (apo + 0.035), 1.3, c * (apo + 0.035), [0, a, 0]);
  }
  P.cyl(R + 0.14, R + 0.06, 0.16, M.white, 0, H + 0.08, 0, 8, oct);                // cornice
  P.cyl(R - 0.05, R - 0.05, 0.02, M.white, 0, H - 0.01, 0, 8, oct);               // ceiling
  P.cyl(0.14, R + 0.34, 0.78, M.roofTiles, 0, H + 0.16 + 0.39, 0, 8, oct);
  P.cyl(0.05, 0.16, 0.16, M.white, 0, H + 1.02, 0, 8);
  P.ball(0.09, M.white, 0, H + 1.16, 0);
  P.box(side + 0.24, 0.03, 0.62, M.stripes, 0, 1.84, apo + 0.3, [0.32, 0, 0]);   // awning
  for (const sx of [-1, 1]) P.rod(M.white, [sx * side / 2, 1.6, apo + 0.04], [sx * side / 2, 1.74, apo + 0.55], 0.012, 4);
  // flower buckets by the front
  const r = seeded(7);
  for (let i = 0; i < 3; i++) {
    const bx = 0.72 + i * 0.3, bz = apo + 0.38 - i * 0.12;
    P.cyl(0.13, 0.1, 0.32, M.white, bx, 0.16, bz, 10);
    for (let f = 0; f < 6; f++) {
      const fx = bx + (r() - 0.5) * 0.18, fz = bz + (r() - 0.5) * 0.18, h = 0.55 + r() * 0.2;
      P.rod(M.white, [bx, 0.3, bz], [fx, h, fz], 0.008, 3);
      P.add(new THREE.IcosahedronGeometry(0.055, 0), f % 2 ? M.white : stamp[['todo', 'projects', 'ideas'][i]], fx, h + 0.02, fz, [r() * 3, r() * 3, 0]);
    }
  }
  P.into(g);
  signBoard(g, 0, H - 0.25, apo + 0.045, side - 0.06, 0.3, 'News');
  nightGlow(boxGeo(side + 0.1, 1.0, 0.02).translate(0, 1.5, -apo + 0.06), litPane, g);   // the light inside
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'kiosk'));
  return g;
}

// A finger signpost: a fluted post with one arm per place, each pointing its
// way, its name on both faces and its tip in the district's color.
// arms: [{ text, district, angle }] (angle: rotation.y that points local +x the right way)
export function signpost(p, x, z, arms) {
  const g = new THREE.Group();
  const P = new Parts();
  P.cyl(0.13, 0.16, 0.25, M.white, 0, 0.125, 0, 8);
  P.cyl(0.055, 0.065, 3.1, M.white, 0, 1.8, 0, 8);
  P.cyl(0.09, 0.09, 0.05, M.white, 0, 0.28, 0, 8);
  P.cyl(0.075, 0.075, 0.06, M.white, 0, 3.32, 0, 8);
  P.ball(0.07, M.white, 0, 3.42, 0);
  const tex = signpostTexture(arms.map((a) => a.text));
  const textMat = toon('#ffffff', tex);
  arms.forEach((arm, i) => {
    const y = 3.1 - i * 0.22, L = 0.95, h = 0.17, rot = [0, arm.angle, 0];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, arm.angle, 0));
    const at = (lx, lz = 0) => new THREE.Vector3(lx, 0, lz).applyQuaternion(q);
    let c = at(0.06 + L / 2);
    P.box(L, h, 0.035, M.white, c.x, y, c.z, rot);
    for (const s of [-1, 1]) {
      c = at(0.07 + L / 2 - 0.05, s * 0.019);
      P.add(atlasPlane(L - 0.14, h - 0.03, 1, arms.length, i), textMat, c.x, y, c.z, [0, arm.angle + (s < 0 ? Math.PI : 0), 0]);
    }
    c = at(0.06 + L);
    P.add(prismGeo(h, 0.12, 0.035), stamp[arm.district], c.x, y, c.z, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, arm.angle, -Math.PI / 2, 'YXZ')));
  });
  P.into(g);
  g.position.set(x, 0, z);
  p.add(swapModel(g, 'signpost'));
  return g;
}
function signpostTexture(names) {
  const W = 512, RH = 80;
  return letteredTexture(W, RH * names.length, (g) => {
    names.forEach((n, i) => {
      g.font = `52px ${FACE}`;
      g.fillText(n, W / 2, RH * i + RH / 2 + 3);
    });
  });
}

// A street clock: a two-faced drum on a fluted post. The hands tell the
// real time. Its faces look along z.
export function streetClock(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  const P = new Parts(), Y = 3.2;
  P.cyl(0.22, 0.26, 0.14, M.white, 0, 0.07, 0, 8);
  P.cyl(0.16, 0.21, 0.6, M.white, 0, 0.44, 0, 8);
  P.cyl(0.08, 0.16, 0.3, M.white, 0, 0.89, 0, 8);
  P.cyl(0.055, 0.075, 1.9, M.white, 0, 1.95, 0, 8);
  for (const y of [1.25, 2.6]) P.cyl(0.09, 0.09, 0.05, M.white, 0, y, 0, 10);
  for (const s of [-1, 1]) P.tube(M.white, [[0, 2.72, 0], [s * 0.18, 2.78, 0], [s * 0.26, 2.92, 0], [s * 0.2, 3.0, 0]], 0.018, 4, 10);
  P.cyl(0.08, 0.1, 0.12, M.white, 0, 2.86, 0, 8);
  P.cyl(0.4, 0.4, 0.18, M.white, 0, Y, 0, 28, [Math.PI / 2, 0, 0]);               // the drum
  for (const s of [-1, 1]) P.add(new THREE.TorusGeometry(0.38, 0.03, 6, 28), M.white, 0, Y, s * 0.09);
  P.cyl(0.05, 0.09, 0.14, M.white, 0, Y + 0.45, 0, 8);
  P.ball(0.06, M.white, 0, Y + 0.56, 0);
  P.add(new THREE.CircleGeometry(0.35, 28), M.clock, 0, Y, 0.091);
  P.add(new THREE.CircleGeometry(0.35, 28), M.clock, 0, Y, -0.091, [0, Math.PI, 0]);
  P.into(g);
  clockHands(g, 0, Y, 0.1, 0.32);
  const back = new THREE.Group();
  back.rotation.y = Math.PI;
  g.add(back);
  clockHands(back, 0, Y, 0.1, 0.32);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'street-clock'));
  return g;
}

// A telephone box: corner posts, glazing bars over small panes, a sign band
// on every side, a shallow domed roof. Lit inside at night. Door in front (+z).
export function phoneBox(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  const P = new Parts(), W = 0.96, H = 2.3, glass = new Parts();
  const sign = phoneSignMat();
  P.box(W + 0.12, 0.1, W + 0.12, M.stone, 0, 0.05, 0);
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) P.box(0.1, H - 0.1, 0.1, M.white, cx * (W / 2 - 0.05), 0.1 + (H - 0.1) / 2, cz * (W / 2 - 0.05));
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, s = Math.sin(a), c = Math.cos(a), rot = [0, a, 0], d = W / 2 - 0.04;
    const put = (w, h, t, mat, lx, y, off = 0) => P.box(w, h, t, mat, s * (d + off) + c * lx, y, c * (d + off) - s * lx, rot);
    put(W - 0.2, 0.42, 0.05, M.white, 0, 0.32);                                   // kick panel
    put(W - 0.2, 1.42, 0.03, M.deep, 0, 1.24, -0.01);                             // the panes
    for (const lx of [-0.13, 0.13]) put(0.03, 1.42, 0.04, M.white, lx, 1.24, 0.01);
    for (let i = 0; i <= 6; i++) put(W - 0.2, 0.03, 0.04, M.white, 0, 0.54 + i * 0.235, 0.01);
    put(W - 0.2, 0.26, 0.07, M.white, 0, 2.1);                                     // sign band
    P.add(new THREE.PlaneGeometry(W - 0.3, 0.17), sign, s * (d + 0.037), 2.1, c * (d + 0.037), rot);
    glass.add(new THREE.PlaneGeometry(W - 0.24, 1.4), litPane, s * (d + 0.012), 1.24, c * (d + 0.012), rot);
  }
  P.box(0.03, 0.14, 0.04, M.white, W / 2 - 0.2, 1.1, W / 2 + 0.01);              // door handle
  P.box(W + 0.12, 0.08, W + 0.12, M.white, 0, H + 0.04, 0);
  P.add(new THREE.SphereGeometry(0.66, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.white, 0, H + 0.06, 0, null, [1, 0.3, 1]);
  P.into(g);
  for (const [, geo] of glass.merged()) nightGlow(geo, litPane, g);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'phone-box'));
  return g;
}
const phoneSignMat = once(() => toon('#ffffff', letteredTexture(512, 112, (g) => {
  g.font = `76px ${FACE}`;
  g.fillText('Telephone', 256, 60);
})));

// The plaza's map on a framed board under a little roof, drawn from the real
// layout, with "you are here" where the board stands. It faces +z; north
// is up on the map, so stand it where people face north to read it.
// plan: { hx, hz, ring, basin, walks: [[x1, z1, x2, z2, w]], places: [{ n, label, x, z, w, d, rot }] }
export function mapBoard(p, x, z, rotY, plan) {
  const g = new THREE.Group();
  const P = new Parts(), W = 1.6, H = 1.15, Y = 1.45;
  for (const sx of [-1, 1]) {
    P.box(0.1, Y + H / 2 + 0.25, 0.1, M.white, sx * (W / 2 + 0.05), (Y + H / 2 + 0.25) / 2, 0);
    P.box(0.16, 0.05, 0.16, M.white, sx * (W / 2 + 0.05), 0.025, 0);
  }
  P.box(W, H, 0.05, M.planks, 0, Y, -0.02);
  P.box(W + 0.1, 0.06, 0.09, M.white, 0, Y + H / 2, 0);
  P.box(W + 0.1, 0.06, 0.09, M.white, 0, Y - H / 2, 0);
  P.box(W + 0.5, 0.04, 0.42, M.shingles, 0, Y + H / 2 + 0.3, 0.04, [0.25, 0, 0]);
  P.add(new THREE.PlaneGeometry(W - 0.06, H - 0.06), toon('#ffffff', mapTexture(plan, [x, z])), 0, Y, 0.012);
  P.into(g);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'map-board'));
  return g;
}
function mapTexture(plan, here) {
  const Wpx = 1024, Hpx = Math.round(1024 * (1.09 / 1.54));
  return letteredTexture(Wpx, Hpx, (g) => {
    const m = 40, size = Hpx - m * 2 - 30, sc = size / (plan.hz * 2), ox = m, oy = m + 30;
    const X = (x) => ox + (x + plan.hx) * sc, Y = (z) => oy + (z + plan.hz) * sc;
    g.lineWidth = 5;
    g.strokeRect(12, 12, Wpx - 24, Hpx - 24);
    g.font = `44px ${FACE}`;
    g.textAlign = 'left';
    g.fillText('The Plaza', ox, 46);
    // the square, its three street openings, and the walks
    g.lineWidth = 4;
    g.strokeRect(X(-plan.hx), Y(-plan.hz), plan.hx * 2 * sc, plan.hz * 2 * sc);
    g.fillStyle = '#ffffff';
    for (const [x, z, w, h] of [[0, plan.hz, 5, 2], [plan.hx, 0, 2, 5], [-plan.hx, 0, 2, 5]]) g.fillRect(X(x) - (w / 2) * sc, Y(z) - (h / 2) * sc, w * sc, h * sc);
    g.fillStyle = '#111111';
    g.lineWidth = 2;
    for (const [x1, z1, x2, z2, w] of plan.walks) {
      const len = Math.hypot(x2 - x1, z2 - z1), nx = -(z2 - z1) / len * (w / 2) * sc, nz = (x2 - x1) / len * (w / 2) * sc;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(x1) + s * nx, Y(z1) + s * nz); g.lineTo(X(x2) + s * nx, Y(z2) + s * nz); g.stroke(); }
    }
    g.fillStyle = '#ffffff';
    g.lineWidth = 3;
    g.beginPath(); g.arc(X(0), Y(0), plan.ring * sc, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(X(0), Y(0), plan.basin * sc, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(X(0), Y(0), plan.basin * sc * 0.55, 0, Math.PI * 2); g.stroke();
    // the buildings, hatched and numbered
    g.fillStyle = '#111111';
    for (const b of plan.places) {
      g.save();
      g.translate(X(b.x), Y(b.z));
      g.rotate(-b.rot);
      const w = b.w * sc, d = b.d * sc;
      g.fillStyle = '#ffffff';
      g.fillRect(-w / 2, -d / 2, w, d);
      g.fillStyle = '#111111';
      g.lineWidth = 3;
      g.strokeRect(-w / 2, -d / 2, w, d);
      g.lineWidth = 1.5;
      g.save();
      g.beginPath(); g.rect(-w / 2, -d / 2, w, d); g.clip();
      for (let k = -w - d; k < w + d; k += 9) { g.beginPath(); g.moveTo(k - d, d / 2); g.lineTo(k + d, -d / 2); g.stroke(); }
      g.restore();
      g.rotate(b.rot);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3; g.stroke();
      g.fillStyle = '#111111';
      g.font = `28px ${FACE}`;
      g.textAlign = 'center';
      g.fillText(String(b.n), 0, 2);
      g.restore();
    }
    // you are here
    const [hx, hz] = [X(here[0]), Y(here[1])];
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 7 : 16;
      g.lineTo(hx + Math.cos(a) * r, hz + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
    // the key: each building and its district
    const kx = ox + size + 40;
    plan.places.forEach((b, i) => {
      const ky = oy + 24 + i * 76;
      g.lineWidth = 3;
      g.beginPath(); g.arc(kx + 16, ky, 17, 0, Math.PI * 2); g.stroke();
      g.textAlign = 'center';
      g.font = `28px ${FACE}`;
      g.fillText(String(b.n), kx + 16, ky + 2);
      g.textAlign = 'left';
      g.font = `36px ${FACE}`;
      g.fillText(b.label, kx + 46, ky);
      g.font = `26px ${FACE}`;
      g.fillText(b.district, kx + 46, ky + 30);
    });
    const ky = oy + 24 + plan.places.length * 76 + 6;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 7 : 16;
      g.lineTo(kx + 16 + Math.cos(a) * r, ky + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
    g.fillText('You are here', kx + 46, ky + 2);
    // a north arrow
    const nx = Wpx - 70, ny = Hpx - 110;
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(nx, ny + 40); g.lineTo(nx, ny - 30); g.stroke();
    g.beginPath(); g.moveTo(nx - 14, ny - 12); g.lineTo(nx, ny - 34); g.lineTo(nx + 14, ny - 12); g.stroke();
    g.textAlign = 'center';
    g.fillText('N', nx, ny - 56);
  });
}

// Bunting and festoon lights strung between two poles across a walk: the
// poles stand at local x = ±span/2; pennants alternate white and the
// districts' colors, and the bulbs between them light up at night.
export function bunting(p, x, z, rotY = 0, span = 6, height = 3.5) {
  const g = new THREE.Group();
  fromKit(g, `bunting-${span}-${height}`, (P) => {
    const sag = 0.55, half = span / 2;
    const yAt = (lx) => height - sag * (1 - (lx / half) ** 2);
    for (const s of [-1, 1]) {
      P.cyl(0.14, 0.17, 0.12, M.white, s * half, 0.06, 0, 8);
      P.cyl(0.045, 0.06, height + 0.25, M.white, s * half, (height + 0.25) / 2, 0, 8);
      P.ball(0.07, M.white, s * half, height + 0.3, 0);
      P.cyl(0.065, 0.065, 0.04, M.white, s * half, height, 0, 8);
    }
    const rope = [];
    for (let i = 0; i <= 16; i++) { const lx = -half + (i / 16) * span; rope.push([lx, yAt(lx), 0]); }
    P.tube(M.white, rope, 0.008, 4, 40);
    const colors = ['todo', 'finance', 'study', 'ideas', 'projects', 'people'];
    const n = Math.floor((span - 0.6) / 0.4);
    for (let i = 0; i < n; i++) {
      const lx = -half + 0.3 + (i + 0.5) * ((span - 0.6) / n), y = yAt(lx), slope = Math.atan((2 * sag * lx) / (half * half));
      const mat = i % 2 ? stamp[colors[((i - 1) / 2) % colors.length]] : M.white;
      P.add(prismGeo(0.24, 0.3, 0.008), mat, lx, y - 0.005, 0, [((i * 7) % 5 - 2) * 0.06, 0, Math.PI + slope]);
      if (i % 2) {
        P.cyl(0.014, 0.014, 0.05, M.white, lx + 0.2, yAt(lx + 0.2) - 0.03, 0, 5);
        P.ball(0.04, M.white, lx + 0.2, yAt(lx + 0.2) - 0.08, 0, [1, 1.25, 1], 7);
      }
    }
  });
  const bulbs = new Parts(), half = span / 2, n = Math.floor((span - 0.6) / 0.4);
  for (let i = 1; i < n; i += 2) {
    const lx = -half + 0.3 + (i + 0.5) * ((span - 0.6) / n) + 0.2;
    bulbs.ball(0.046, bulbGlow, lx, height - 0.55 * (1 - (lx / half) ** 2) - 0.08, 0, [1, 1.25, 1], 7);
  }
  for (const [, geo] of bulbs.merged()) nightGlow(geo, bulbGlow, g);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bunting'));
  return g;
}

// An iron tree grate set flush in the paving around a trunk.
const GRATE = 1.5;
export function treeGrate(p, x, z) {
  const m = mesh(boxGeo(GRATE, 0.02, GRATE), grateMat(), x, 0.01, z, p);
  m.castShadow = false;
  return m;
}
const grateMat = once(() => {
  const t = grateTexture();
  t.repeat.set(1 / GRATE, 1 / GRATE);
  return toon('#ffffff', t);
});
const grateTexture = () => lineArtCanvas((g) => {
  g.lineWidth = 6;
  inkLine(g, 6, 6, S - 6, 6, 0.5); inkLine(g, S - 6, 6, S - 6, S - 6, 0.5); inkLine(g, S - 6, S - 6, 6, S - 6, 0.5); inkLine(g, 6, S - 6, 6, 6, 0.5);
  g.lineWidth = 4;
  for (const r of [0.2, 0.31, 0.42]) { g.beginPath(); g.arc(S / 2, S / 2, S * r, 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const out = Math.min(Math.abs(0.47 / c), Math.abs(0.47 / s)) * S;
    inkLine(g, S / 2 + c * S * 0.2, S / 2 + s * S * 0.2, S / 2 + c * out, S / 2 + s * out, 0.4);
  }
});

// Chalk on the paving: a hopscotch with a sun and a flower beside it, drawn
// flat on the ground (no outline of its own). It runs along local z.
export function chalkDrawing(p, x, z, rotY = 0) {
  const W = 2.0, L = 3.6;
  const m = mesh(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2), chalkMat(), x, 0.006, z, p);
  m.rotation.y = rotY;
  m.castShadow = false;
  skipND.push(m);
  return m;
}
const chalkMat = once(() => {
  // the drawing twice: ink on paper (what to draw) and white on black (where)
  const paint = (g, ink, paper) => {
    const r = seeded(31);
    g.fillStyle = paper; g.fillRect(0, 0, 400, 720);
    g.strokeStyle = g.fillStyle = ink;
    g.lineCap = g.lineJoin = 'round';
    g.lineWidth = 7;
    const sketch = (x1, y1, x2, y2) => {
      for (let k = 0; k < 2; k++) {
        g.beginPath();
        g.moveTo(x1 + (r() - 0.5) * 4, y1 + (r() - 0.5) * 4);
        g.lineTo(x2 + (r() - 0.5) * 4, y2 + (r() - 0.5) * 4);
        g.stroke();
      }
    };
    const sq = (x, y, s, n) => {
      sketch(x, y, x + s, y); sketch(x + s, y, x + s, y + s); sketch(x + s, y + s, x, y + s); sketch(x, y + s, x, y);
      g.font = '56px "Patrick Hand", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), x + s / 2, y + s / 2 + 3);
    };
    // the hopscotch, 1 at the bottom (the +z end), home at the top
    const s = 100, cx = 150;
    const rows = [[1], [2], [3, 4], [5], [6, 7], [8]];
    rows.forEach((row, i) => {
      const y = 680 - (i + 1) * s;
      if (row.length === 1) sq(cx - s / 2, y, s, row[0]);
      else row.forEach((n, j) => sq(cx - s + j * s, y, s, n));
    });
    g.beginPath(); g.arc(cx, 680 - 6 * s, s * 0.7, Math.PI, 0); g.stroke();
    g.font = '40px "Patrick Hand", sans-serif';
    g.fillText('home', cx, 680 - 6 * s - 30);
    // a sun and a flower
    g.lineWidth = 6;
    g.beginPath(); g.arc(320, 120, 34, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; sketch(320 + Math.cos(a) * 46, 120 + Math.sin(a) * 46, 320 + Math.cos(a) * 66, 120 + Math.sin(a) * 66); }
    sketch(330, 640, 330, 520);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.arc(330 + Math.cos(a) * 22, 500 + Math.sin(a) * 22, 14, 0, Math.PI * 2); g.stroke(); }
    sketch(330, 600, 300, 580); sketch(330, 610, 360, 585);
  };
  const layer = (ink, paper) => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 720;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.userData.redraw = () => { paint(c.getContext('2d'), ink, paper); t.needsUpdate = true; };
    t.userData.redraw();
    return t;
  };
  const lines = layer('#111111', '#ffffff'), where = layer('#ffffff', '#000000');
  lines.colorSpace = THREE.SRGBColorSpace;
  lines.userData.lineArt = true;
  document.fonts?.load('56px "Patrick Hand"').then(() => { lines.userData.redraw(); where.userData.redraw(); }).catch(() => {});
  const m = toon('#ffffff', lines);
  m.alphaMap = where;
  m.alphaTest = 0.5;
  return m;
});

// A potted shrub for a doorstep: 'ball' (a clipped bay on a stem, in a
// square stone planter), 'cone' (a clipped cone) or 'bush' (in a wooden tub).
export function pottedShrub(p, x, z, kind = 'ball', s = 1) {
  const g = new THREE.Group();
  fromKit(g, `potted-${kind}`, (P) => {
    const sq = [0, Math.PI / 4, 0];
    if (kind === 'bush') {
      P.cyl(0.3, 0.25, 0.46, M.planks, 0, 0.23, 0, 12);
      for (const y of [0.08, 0.38]) P.cyl(0.31, 0.29, 0.035, M.white, 0, y, 0, 12);
      P.cyl(0.28, 0.28, 0.02, M.dirt, 0, 0.44, 0, 12);
      for (const [bx, by, bz, br] of [[0, 0.75, 0, 0.36], [0.17, 0.62, 0.1, 0.26], [-0.16, 0.64, -0.08, 0.27], [0.02, 0.98, 0.04, 0.22]]) {
        P.add(lumpy(new THREE.IcosahedronGeometry(1, 1), 0.15, bx * 9), M.white, bx, by, bz, [bx, by, 0], br);
      }
    } else {
      P.cyl(0.34, 0.27, 0.55, M.stone, 0, 0.275, 0, 4, sq);
      P.cyl(0.38, 0.38, 0.05, M.white, 0, 0.575, 0, 4, sq);
      P.cyl(0.3, 0.3, 0.02, M.dirt, 0, 0.59, 0, 4, sq);
      if (kind === 'ball') {
        P.cyl(0.025, 0.035, 0.6, M.white, 0, 0.88, 0, 6);
        P.add(lumpy(new THREE.IcosahedronGeometry(0.36, 1), 0.08, 3), M.white, 0, 1.38, 0);
      } else {
        P.add(lumpy(new THREE.ConeGeometry(0.32, 1.1, 10, 3), 0.06, 5), M.white, 0, 1.15, 0);
      }
    }
  });
  g.position.set(x, 0, z); g.scale.setScalar(s);
  p.add(swapModel(g, 'potted-shrub'));
  return g;
}

// A long stone trough with a clipped hedge in it. It runs along local x.
export function shrubPlanter(p, x, z, rotY = 0, len = 2.4) {
  const g = new THREE.Group();
  fromKit(g, `shrub-planter-${len}`, (P) => {
    P.box(len, 0.5, 0.7, M.stone, 0, 0.25, 0);
    P.box(len + 0.08, 0.06, 0.78, M.white, 0, 0.53, 0);
    P.box(len - 0.1, 0.02, 0.6, M.dirt, 0, 0.56, 0);
    const n = Math.round(len / 0.45);
    for (let i = 0; i < n; i++) {
      const lx = -len / 2 + 0.3 + (i * (len - 0.6)) / (n - 1);
      P.add(lumpy(new THREE.IcosahedronGeometry(1, 1), 0.14, i), M.white, lx, 0.86, 0, [i, i * 2, 0], [0.36, 0.38, 0.32]);
    }
    P.box(len - 0.4, 0.5, 0.5, M.white, 0, 0.82, 0);
  });
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'shrub-planter'));
  return g;
}

// Posters and notes for boards and kiosk walls: one sheet with four on it.
const posterMat = once(() => toon('#ffffff', letteredTexture(512, 512, (g) => {
  const r = seeded(11);
  const scribble = (x, y, w, rows, gap = 22) => {
    g.lineWidth = 3;
    for (let i = 0; i < rows; i++) {
      g.beginPath();
      const len = w * (0.6 + r() * 0.4);
      for (let k = 0; k <= len; k += 12) g.lineTo(x + k, y + i * gap + Math.sin(k * 0.3 + i) * 2);
      g.stroke();
    }
  };
  g.lineWidth = 4;
  // a lost cat
  g.strokeRect(10, 10, 236, 236);
  g.font = `44px ${FACE}`;
  g.fillText('Lost cat!', 128, 46);
  g.beginPath(); g.arc(128, 130, 44, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(92, 104); g.lineTo(96, 66); g.lineTo(116, 90); g.moveTo(164, 104); g.lineTo(160, 66); g.lineTo(140, 90); g.stroke();
  g.beginPath(); g.arc(112, 124, 5, 0, 7); g.arc(144, 124, 5, 0, 7); g.fill();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 12, 146); g.lineTo(128 + s * 52, 140); g.moveTo(128 + s * 12, 150); g.lineTo(128 + s * 52, 156); g.stroke(); }
  scribble(40, 200, 176, 2, 22);
  // a concert
  g.lineWidth = 4;
  g.strokeRect(266, 10, 236, 236);
  g.font = `40px ${FACE}`;
  g.fillText('Band night', 384, 44);
  g.beginPath(); g.ellipse(360, 160, 22, 16, -0.4, 0, 7); g.fill();
  g.beginPath(); g.ellipse(424, 146, 22, 16, -0.4, 0, 7); g.fill();
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(380, 156); g.lineTo(380, 84); g.lineTo(444, 70); g.lineTo(444, 142); g.stroke();
  scribble(296, 206, 176, 2, 18);
  // a letter
  g.lineWidth = 4;
  g.strokeRect(10, 266, 236, 236);
  g.font = `34px ${FACE}`;
  g.fillText('Garden club', 128, 300);
  scribble(32, 340, 190, 7, 22);
  // tear-off tabs
  g.strokeRect(266, 266, 236, 236);
  g.font = `38px ${FACE}`;
  g.fillText('Piano lessons', 384, 302);
  scribble(290, 336, 190, 3, 22);
  g.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const tx = 274 + i * 28;
    g.beginPath(); g.moveTo(tx, 420); g.lineTo(tx, 500); g.stroke();
    g.beginPath(); g.moveTo(tx + 14, 430); g.lineTo(tx + 14, 490); g.stroke();
  }
  g.beginPath(); g.moveTo(266, 420); g.lineTo(502, 420); g.stroke();
})));
