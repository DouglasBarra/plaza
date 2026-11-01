// What moves on the streets: cars and vans driving the grid (keeping right,
// stopping at every crossing, turning, queueing behind each other, never into
// the plaza), cyclists, a tram going up and down its street, and people
// walking round the blocks on the sidewalks. Each kind is one instanced mesh
// whose matrices are set every frame; the tram is a small group.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../ink.js';
import { STAMPS } from '../kit.js';
import { skipND, nightOnly } from '../life.js';
import { Bag, facadeFrame } from './bag.js';
import { addWindow, windowMaterial, KIND } from './windows.js';
import { ROAD_PITCH, ROAD_W, GROUND_Y, strip } from './common.js';
import { TRAM_Z } from './streetscape.js';
import { LINE } from './houses.js';

// The moving things' own random numbers, so they never reshuffle the town.
let seed = 5150;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const P = ROAD_PITCH, HALF = ROAD_W / 2;
const STOP = HALF + 1.4;           // the stop line, from a crossing's middle
const REACH = 3;                   // the grid the cars drive: crossings up to 3 blocks out
const YR = GROUND_Y + 0.03, YS = GROUND_Y + 0.15;
const white = toon(), dark = toon('#3a3a3a');

// ---------- shapes ----------
// Merge white parts and dark parts into one geometry with two groups.
function twoTone(whites, darks) {
  return mergeGeometries([mergeGeometries(strip(whites)), mergeGeometries(strip(darks))], true);
}
function profile(pts, width) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  return new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false }).translate(0, 0, -width / 2).rotateY(-Math.PI / 2);
}
function wheels(x, zs, r = 0.31) {
  return zs.flatMap((z) => [-x, x].map((wx) => new THREE.CylinderGeometry(r, r, 0.22, 10).rotateZ(Math.PI / 2).translate(wx, r, z)));
}
function carGeo() {
  return twoTone([
    profile([[-2.0, 0.3], [2.0, 0.3], [2.05, 0.75], [1.2, 0.95], [-2.0, 1.0]], 1.7),
    new THREE.BoxGeometry(1.42, 0.06, 1.5).translate(0, 1.56, -0.45),
    new THREE.BoxGeometry(1.72, 0.12, 0.12).translate(0, 0.42, 2.02),
    new THREE.BoxGeometry(1.72, 0.12, 0.12).translate(0, 0.42, -2.02),
  ], [
    profile([[-1.75, 0.94], [0.95, 0.94], [0.35, 1.55], [-1.5, 1.55]], 1.44),
    ...wheels(0.74, [-1.3, 1.3]),
  ]);
}
function vanGeo() {
  return twoTone([
    profile([[-2.4, 0.35], [2.3, 0.35], [2.35, 1.1], [1.9, 1.35], [1.5, 2.25], [-2.4, 2.3]], 1.85),
    new THREE.BoxGeometry(1.88, 0.14, 0.14).translate(0, 0.45, 2.33),
  ], [
    profile([[1.42, 1.38], [1.86, 1.36], [1.52, 2.05], [1.15, 2.05]], 1.87),
    new THREE.BoxGeometry(1.9, 0.5, 0.9).translate(0, 1.72, 0.85),
    ...wheels(0.8, [-1.5, 1.5], 0.36),
  ]);
}
// A bicycle and its rider, with the legs in one of two pedalling poses.
function bikeGeo(pose) {
  const bar = (x1, y1, x2, y2, r = 0.025) => new THREE.CylinderGeometry(r, r, Math.hypot(x2 - x1, y2 - y1), 4)
    .rotateX(Math.atan2(x2 - x1, y2 - y1)).translate(0, (y1 + y2) / 2, (x1 + x2) / 2);
  const wheel = new THREE.TorusGeometry(0.33, 0.03, 4, 16).rotateY(Math.PI / 2);
  const legA = pose ? [0.15, 0.95, 0.05, 0.58] : [0.15, 0.95, 0.28, 0.5];
  const legB = pose ? [0.15, 0.95, 0.28, 0.5] : [0.15, 0.95, 0.05, 0.58];
  return twoTone([
    wheel.clone().translate(0, 0.35, 0.52), wheel.clone().translate(0, 0.35, -0.52),
    bar(-0.52, 0.35, 0, 0.72), bar(0, 0.72, 0.52, 0.35), bar(0, 0.72, -0.1, 0.35), bar(0.45, 0.62, 0.5, 0.98),
    new THREE.CapsuleGeometry(0.17, 0.4, 3, 8).rotateX(-0.45).translate(0, 1.22, 0.05),
    new THREE.SphereGeometry(0.15, 8, 6).translate(0, 1.66, 0.22),
    bar(0.12, 1.32, 0.44, 1.0, 0.045),
  ], [
    bar(legA[0], legA[1], legA[2], legA[3], 0.06).translate(0.1, 0, 0), bar(legB[0], legB[1], legB[2], legB[3], 0.06).translate(-0.1, 0, 0),
    new THREE.SphereGeometry(0.155, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.69, 0.22),
  ]);
}
// A walker, in one of two strides.
function walkerGeo(pose) {
  const leg = (side, swing) => new THREE.CapsuleGeometry(0.065, 0.62, 3, 6).translate(0, -0.37, 0).rotateX(swing).translate(side * 0.09, 0.82, 0);
  const s = pose ? 0.32 : -0.32;
  return twoTone([
    new THREE.CapsuleGeometry(0.17, 0.42, 3, 8).translate(0, 1.17, 0),
    new THREE.SphereGeometry(0.13, 8, 6).translate(0, 1.66, 0),
    new THREE.CapsuleGeometry(0.05, 0.5, 3, 6).translate(0, -0.27, 0).rotateX(-s * 0.8).translate(0.24, 1.38, 0),
    new THREE.CapsuleGeometry(0.05, 0.5, 3, 6).translate(0, -0.27, 0).rotateX(s * 0.8).translate(-0.24, 1.38, 0),
  ], [
    leg(1, s), leg(-1, -s),
    new THREE.SphereGeometry(0.135, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.69, -0.01),
  ]);
}

function instances(town, geo, mats, n, shadows = true) {
  const m = new THREE.InstancedMesh(geo, mats, n);
  m.castShadow = shadows; m.receiveShadow = true;
  m.frustumCulled = false; // they roam the whole town
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  town.add(m);
  return m;
}

// ---------- the road grid ----------
const key = (x, z) => `${x},${z}`;
function roadGrid() {
  const nodes = new Map();
  for (let a = -REACH; a <= REACH; a++) {
    for (let b = -REACH; b <= REACH; b++) {
      if (a === 0 && b === 0) continue; // the plaza
      nodes.set(key(a * P, b * P), { x: a * P, z: b * P, next: [] });
    }
  }
  for (const n of nodes.values()) {
    for (const [dx, dz] of [[P, 0], [-P, 0], [0, P], [0, -P]]) {
      const m = nodes.get(key(n.x + dx, n.z + dz));
      if (!m) continue;
      if (dz === 0 && n.z === TRAM_Z) continue; // cars cross the tram's street but don't drive along it
      n.next.push(m);
    }
  }
  return [...nodes.values()];
}

// ---------- vehicles: cars, vans and bikes ----------
class Vehicle {
  constructor(nodes, kind) {
    this.kind = kind;
    this.bike = kind === 'bike';
    this.speed = this.bike ? 4 + rand() : 6.5 + rand() * 2;
    this.lane = this.bike ? HALF - 0.55 : 1.15;
    this.len = kind === 'van' ? 5 : this.bike ? 1.4 : 4.2;
    let a = nodes[Math.floor(rand() * nodes.length)];
    while (!a.next.length) a = nodes[Math.floor(rand() * nodes.length)];
    this.from = a; this.to = a.next[Math.floor(rand() * a.next.length)];
    this.s = rand() * (P - 2 * STOP);
    this.state = 'drive';
    this.wait = 0;
    this.pos = new THREE.Vector3(); this.heading = 0;
  }
  get dir() { return [Math.sign(this.to.x - this.from.x), Math.sign(this.to.z - this.from.z)]; }
}
const right = ([dx, dz]) => [-dz, dx];

function chooseNext(v) {
  const options = v.to.next.filter((n) => n !== v.from);
  return options.length ? options[Math.floor(rand() * options.length)] : v.from;
}
// The curve through a crossing from one street into the next.
function turnCurve(v) {
  const n = v.to, d1 = v.dir, d2 = [Math.sign(v.next.x - n.x), Math.sign(v.next.z - n.z)];
  const r1 = right(d1), r2 = right(d2), L = v.lane;
  const p0 = new THREE.Vector3(n.x - d1[0] * STOP + r1[0] * L, YR, n.z - d1[1] * STOP + r1[1] * L);
  const p2 = new THREE.Vector3(n.x + d2[0] * STOP + r2[0] * L, YR, n.z + d2[1] * STOP + r2[1] * L);
  const straight = d1[0] === d2[0] && d1[1] === d2[1];
  const p1 = straight ? p0.clone().lerp(p2, 0.5)
    : new THREE.Vector3(n.x + d1[0] * (r2[0] * d1[0] + r2[1] * d1[1]) * L + d2[0] * (r1[0] * d2[0] + r1[1] * d2[1]) * L, YR,
      n.z + d1[1] * (r2[0] * d1[0] + r2[1] * d1[1]) * L + d2[1] * (r1[0] * d2[0] + r1[1] * d2[1]) * L);
  const c = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  return { c, length: c.getLength() };
}

export function buildTraffic(town) {
  const nodes = roadGrid();
  const vehicles = [];
  for (let i = 0; i < 11; i++) vehicles.push(new Vehicle(nodes, i < 8 ? 'car' : 'van'));
  for (let i = 0; i < 5; i++) vehicles.push(new Vehicle(nodes, 'bike'));
  const mats = [white, dark];
  const cars = instances(town, carGeo(), mats, vehicles.filter((v) => v.kind === 'car').length);
  const vans = instances(town, vanGeo(), mats, vehicles.filter((v) => v.kind === 'van').length);
  const bikes = [bikeGeo(0), bikeGeo(1)].map((g) => instances(town, g, mats, 5));
  // at night: headlights and tail lights, and a wash of light on the road ahead
  const lampGeo = mergeGeometries([
    ...[-0.6, 0.6].map((x) => new THREE.BoxGeometry(0.3, 0.14, 0.05).translate(x, 0.72, 2.06)),
  ]);
  const tailGeo = mergeGeometries([-0.62, 0.62].map((x) => new THREE.BoxGeometry(0.26, 0.12, 0.05).translate(x, 0.78, -2.06)));
  const beamGeo = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.8, 2.2), new THREE.Vector2(0.8, 2.2), new THREE.Vector2(2.2, 9), new THREE.Vector2(-2.2, 9)]))
    .rotateX(Math.PI / 2).translate(0, 0.03, 0);
  const motor = vehicles.filter((v) => !v.bike);
  const head = instances(town, lampGeo, new THREE.MeshBasicMaterial({ color: '#fff4c8' }), motor.length, false);
  const tail = instances(town, tailGeo, new THREE.MeshBasicMaterial({ color: '#ff6a55' }), motor.length, false);
  const beam = instances(town, beamGeo, new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }), motor.length, false);
  for (const m of [head, tail, beam]) { m.visible = false; m.userData.keep = true; nightOnly.push(m); }
  skipND.push(beam);

  const tram = buildTram(town);
  const walkers = buildWalkers(town);
  const busy = new Map(); // crossing -> the vehicle turning through it
  const o = new THREE.Object3D(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const tan = new THREE.Vector3();
  let last = null;

  function step(v, dt, tramX) {
    const edgeLen = P - 2 * STOP;
    if (v.state === 'drive') {
      // keep a gap behind whoever is ahead on this street
      let limit = edgeLen;
      for (const u of vehicles) {
        if (u === v || u.from !== v.from || u.to !== v.to || u.state !== 'drive' || u.s <= v.s) continue;
        limit = Math.min(limit, u.s - (u.len + v.len) / 2 - 1.5);
      }
      v.s = Math.min(v.s + v.speed * dt, Math.max(v.s, limit));
      if (v.s >= edgeLen - 1e-3) { v.state = 'wait'; v.wait = v.bike ? 0.4 : 0.7 + rand() * 1.1; v.next = chooseNext(v); }
    } else if (v.state === 'wait') {
      v.wait -= dt;
      const n = v.to;
      const clear = !busy.has(n) && vehicles.every((u) => u === v || !(u.from === n && u.to === v.next && u.state === 'drive' && u.s < u.len + 2))
        && !(n.z === TRAM_Z && Math.abs(tramX - n.x) < 16);
      if (v.wait <= 0 && clear) { v.state = 'turn'; v.turn = turnCurve(v); v.u = 0; busy.set(n, v); }
    } else {
      v.u += (v.speed * 0.6 * dt) / v.turn.length;
      if (v.u >= 1) {
        busy.delete(v.to);
        v.from = v.to; v.to = v.next; v.s = 0; v.state = 'drive';
      }
    }
    // where it is and which way it faces
    if (v.state === 'turn') {
      const u = Math.min(v.u, 1);
      v.turn.c.getPoint(u, v.pos); v.turn.c.getTangent(u, tan);
      v.heading = Math.atan2(tan.x, tan.z);
    } else {
      const d = v.dir, r = right(d), s = STOP + v.s, L = v.lane;
      v.pos.set(v.from.x + d[0] * s + r[0] * L, YR, v.from.z + d[1] * s + r[1] * L);
      v.heading = Math.atan2(d[0], d[1]);
    }
  }

  return function animateTraffic(time) {
    const dt = last === null ? 0 : Math.min(0.1, Math.max(0, time - last));
    last = time;
    const tramX = tram.update(time);
    let ci = 0, vi = 0, bi = 0, mi = 0;
    const frame = Math.floor(time * 4) % 2; // pedalling on the 2-frame clock
    for (const v of vehicles) {
      step(v, dt, tramX);
      o.position.copy(v.pos); o.rotation.set(0, v.heading, 0); o.updateMatrix();
      if (v.bike) {
        bikes[frame].setMatrixAt(bi, o.matrix); bikes[1 - frame].setMatrixAt(bi, hidden); bi++;
        continue;
      }
      (v.kind === 'van' ? vans : cars).setMatrixAt(v.kind === 'van' ? vi++ : ci++, o.matrix);
      if (head.visible) {
        const front = v.kind === 'van' ? 0.3 : 0;
        o.translateZ(front); o.updateMatrix();
        head.setMatrixAt(mi, o.matrix); beam.setMatrixAt(mi, o.matrix);
        o.translateZ(-2 * front - (v.kind === 'van' ? 0.05 : 0)); o.updateMatrix();
        tail.setMatrixAt(mi, o.matrix);
      }
      mi++;
    }
    for (const m of [cars, vans, ...bikes, head, tail, beam]) m.instanceMatrix.needsUpdate = true;
    walkers(time, dt);
  };
}

// ---------- the tram ----------
// Two cars coupled together, going to and fro along its street, stopping at
// the stop and turning back at both ends of town (out in the fog).
function buildTram(town) {
  const g = new THREE.Group();
  const body = new Bag(), glass = new Bag({ win: true }), darkBag = new Bag(), stripe = new Bag();
  const W = 2.3, segs = [[-10.4, -0.2], [0.2, 10.4]];
  for (const [z0, z1] of segs) {
    body.box(-W / 2, W / 2, 0.45, 3.1, z0, z1, '');
    darkBag.box(-W / 2 + 0.05, W / 2 - 0.05, 0.15, 0.45, z0 + 0.3, z1 - 0.3, 'y');
    stripe.box(-W / 2 - 0.02, W / 2 + 0.02, 0.85, 1.0, z0, z1, 'yY');
    body.box(-0.5, 0.5, 3.1, 3.4, z0 + 2, z1 - 2, 'y');
    // windows down both sides, doors between some
    for (const [ax, az, tx, tz] of [[W / 2, z1, 0, -1], [-W / 2, z0, 0, 1]]) {
      const F = facadeFrame(ax, az, tx, tz), L = z1 - z0;
      for (let s = 0.4; s < L - 1.2; s += 1.62) {
        if (Math.abs(s + 0.7 - L / 2) < 0.9) {
          darkBag.quad(F.p(s, 0.5, 0.02), F.p(s + 1.4, 0.5, 0.02), F.p(s + 1.4, 2.55, 0.02), F.p(s, 2.55, 0.02), [0, 0], [1, 0], [1, 1], [0, 1], F.n);
          continue;
        }
        addWindow(glass, F, s, s + 1.4, 1.25, 2.45, 0.02, rand(), KIND.tram);
      }
    }
  }
  // the ends: a windscreen at each
  for (const [z, tx] of [[10.4, 1], [-10.4, -1]]) {
    const F = facadeFrame(-tx * W / 2, z, tx, 0);
    addWindow(glass, F, 0.25, W - 0.25, 1.3, 2.6, 0.02, rand(), KIND.tram);
    body.box(-0.9, 0.9, 0.55, 0.7, z, z + tx * 0.08, '');
  }
  // the pantograph up to the wire
  const arm = (x1, y1, x2, y2) => darkBag.geometry(new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(x2 - x1, y2 - y1), 4)
    .rotateX(Math.atan2(x2 - x1, y2 - y1)).translate(0, (y1 + y2) / 2, (x1 + x2) / 2), new THREE.Matrix4());
  arm(-1.4, 3.45, 0, 4.7); arm(0, 4.7, -1.2, 6.25); darkBag.box(-0.6, 0.6, 6.25, 6.3, -1.25, -1.15, '');
  for (const [b, mat] of [[body, white], [darkBag, dark], [stripe, toon(STAMPS.study)], [glass, windowMaterial()]]) {
    const m = b.mesh(mat, { shadows: b !== glass });
    m.matrixAutoUpdate = true;
    g.add(m);
  }
  g.position.set(0, GROUND_Y + 0.05, TRAM_Z + 0.0);
  g.rotation.y = Math.PI / 2;
  town.add(g);
  // the timetable: to the stop, on to the end, back to the stop, back to the other end
  const STOP_X = 20, END = 150, V = 7, DWELL = 7;
  const legs = [[-END, STOP_X], [STOP_X, END], [END, STOP_X], [STOP_X, -END]];
  const legTime = legs.map(([a, b]) => Math.abs(b - a) / V * 1.25 + DWELL);
  const cycle = legTime.reduce((a, b) => a + b, 0);
  return {
    update(time) {
      let t = (time + 30) % cycle, i = 0;
      while (t > legTime[i]) { t -= legTime[i]; i++; }
      const [a, b] = legs[i], move = legTime[i] - DWELL;
      const u = Math.min(1, t / move);
      const e = u - Math.sin(2 * Math.PI * u) / (2 * Math.PI); // ease out of and into each stop
      g.position.x = a + (b - a) * e;
      return g.position.x;
    },
  };
}

// ---------- people on the sidewalks ----------
// Each walks round one block, some stopping now and then to look in a window.
function buildWalkers(town) {
  const people = [];
  for (let bi = -3; bi < 3; bi++) {
    for (let bj = -3; bj < 3; bj++) {
      if ((bi === -1 || bi === 0) && (bj === -1 || bj === 0)) continue;
      const d = Math.hypot(bi * P + P / 2, bj * P + P / 2);
      if (d > 115) continue;
      const n = d < 70 ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const cw = rand() < 0.5;
        const off = LINE - (cw ? 0.75 : 1.3);
        people.push({ x0: bi * P + off, z0: bj * P + off, side: P - 2 * off, p: rand() * 4 * (P - 2 * off), cw, speed: 1.1 + rand() * 0.5, pause: 0, tint: rand() < 0.4 ? 0.7 : 1 });
      }
    }
  }
  const mats = [white, dark];
  const poses = [walkerGeo(0), walkerGeo(1)].map((g) => instances(town, g, mats, people.length));
  const c = new THREE.Color();
  people.forEach((w, i) => { c.setScalar(w.tint); poses.forEach((m) => m.setColorAt(i, c)); });
  const o = new THREE.Object3D(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  return function walk(time, dt) {
    const frame = Math.floor(time * 4);
    people.forEach((w, i) => {
      if (w.pause > 0) w.pause -= dt;
      else {
        w.p += w.speed * dt * (w.cw ? 1 : -1);
        if (rand() < dt * 0.02) w.pause = 2 + rand() * 4;
      }
      const L = 4 * w.side, p = ((w.p % L) + L) % L, side = Math.floor(p / w.side), a = p - side * w.side;
      // round the block: along +x, then +z, then -x, then -z
      const corners = [[w.x0, w.z0], [w.x0 + w.side, w.z0], [w.x0 + w.side, w.z0 + w.side], [w.x0, w.z0 + w.side]];
      const [sx, sz] = corners[side], [ex, ez] = corners[(side + 1) % 4];
      const dx = Math.sign(ex - sx) * (w.cw ? 1 : -1), dz = Math.sign(ez - sz) * (w.cw ? 1 : -1);
      o.position.set(sx + Math.sign(ex - sx) * a, YS, sz + Math.sign(ez - sz) * a);
      o.rotation.set(0, Math.atan2(dx, dz), 0);
      o.updateMatrix();
      const pose = w.pause > 0 ? 0 : (frame + i) % 2;
      poses[pose].setMatrixAt(i, o.matrix);
      poses[1 - pose].setMatrixAt(i, hidden);
    });
    for (const m of poses) m.instanceMatrix.needsUpdate = true;
  };
}
