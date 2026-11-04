// The sky over the town: clouds drifting round it, flocks of pigeons wheeling
// over the roofs and gulls soaring round the lighthouse.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../ink.js';
import { PIGEON, GULL, flockMeshes, flap, steer } from '../birds.js';
import { strip } from './common.js';

// The sky's own random numbers. The seed is where the town's shared ones
// stood when the clouds were first drawn from them, so they keep their look.
let seed = 642880206;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const LIGHTHOUSE = [25.1, 28.9];   // the plaza's south-east corner

export function buildSky(town) {
  // ---------- clouds: clusters of flat-shaded puffs ----------
  const cloudMat = toon(); cloudMat.fog = false; cloudMat.flatShading = true;
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const parts = [];
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const s = 4 + rand() * 4;
      parts.push(new THREE.IcosahedronGeometry(s, 1).scale(1, 0.62, 1).translate(k * 6 - n * 3 + rand() * 2, rand() * 2.5, (rand() - 0.5) * 5));
    }
    const c = new THREE.Mesh(mergeGeometries(strip(parts)), cloudMat);
    const a = rand() * Math.PI * 2, d = 290 + rand() * 130;
    c.position.set(Math.cos(a) * d, 40 + rand() * 45, Math.sin(a) * d);
    c.scale.setScalar(1.6);
    c.rotation.y = rand() * 6;
    // where it drifts, and inkCrisp so its outline keeps its weight that far off
    c.userData = { a, d, speed: 0.004 + rand() * 0.004, inkCrisp: true };
    town.add(c);
    clouds.push(c);
  }

  // ---------- birds ----------
  // Pigeon flocks wheel in wandering loops: a small one low over the open
  // square, two bigger ones higher up over the town. Each bird keeps a loose
  // place in its flock that drifts about; they beat their wings nearly
  // together, then glide, and bank into the turns.
  const flocks = [];
  for (const [n, r, h, v, dir, spread] of [[7, 14, 18, 7.5, 1, 0.65], [9, 42, 28, 9.5, -1, 1], [6, 62, 33, 8, 1, 1]]) {
    flocks.push({
      r, h, w: (dir * v) / r, a0: rand() * 6, p: rand() * 6, beat: 5.5 + rand() * 2,
      birds: Array.from({ length: n }, () => ({
        o: [-rand() * 8 * spread, (rand() - 0.5) * 2.5 * spread, (rand() - 0.5) * 10 * spread],   // back, up, across
        drift: [0.6 + rand() * 0.5, 0.4 + rand() * 0.4, 0.5 + rand() * 0.5],
        q: [rand() * 6, rand() * 6, rand() * 6],
        hz: 4.4 * (0.94 + rand() * 0.12), ph: rand() * 1.2, lag: rand() * 0.5,
      })),
    });
  }
  // gulls circle the lighthouse (its top is ~18 m up) on the sea breeze,
  // hardly beating at all
  const gulls = [0, 1, 2].map((i) => ({
    r: 8 + i * 3.5 + rand() * 2, h: 21 + i * 2.5 + rand() * 2, w: 6.5 / (8 + i * 3.5), a0: rand() * 6, p: rand() * 6,
    every: 9 + rand() * 6, hz: 2.8 + rand() * 0.3,
  }));

  const nPigeons = flocks.reduce((s, f) => s + f.birds.length, 0);
  const pigeonMeshes = flockMeshes(PIGEON, nPigeons, town, { scale: 1.3 });   // a touch big, to read from below
  const gullMeshes = flockMeshes(GULL, gulls.length, town);

  // where a bird is at time t
  const center = (f, t, out) => {
    const a = f.a0 + f.w * t + 0.25 * Math.sin(0.05 * t + f.p);
    const r = f.r * (1 + 0.18 * Math.sin(0.07 * t + f.p));
    return out.set(Math.cos(a) * r, f.h + 3 * Math.sin(0.09 * t + f.p) + 1.5 * Math.sin(0.23 * t), Math.sin(a) * r);
  };
  const c0 = new THREE.Vector3(), c1 = new THREE.Vector3(), fwd = new THREE.Vector3(), side = new THREE.Vector3();
  const flockBird = (f, b, t, out) => {
    center(f, t, c0); center(f, t + 0.2, c1);
    fwd.subVectors(c1, c0).setY(0).normalize();
    side.set(-fwd.z, 0, fwd.x);
    const d = b.drift, q = b.q;
    return out.copy(c0)
      .addScaledVector(fwd, b.o[0] + d[0] * Math.sin(0.31 * t + q[0]))
      .addScaledVector(side, b.o[2] + d[2] * 1.6 * Math.sin(0.23 * t + q[2]))
      .setY(c0.y + b.o[1] + d[1] * Math.sin(0.27 * t + q[1]));
  };
  const gullAt = (g, t, out) => {
    const a = g.a0 + g.w * t;
    const cx = LIGHTHOUSE[0] + 3 * Math.sin(0.03 * t + g.p), cz = LIGHTHOUSE[1] + 3 * Math.cos(0.025 * t + g.p);
    return out.set(cx + Math.cos(a) * g.r, g.h + 2 * Math.sin(0.12 * t + g.p), cz + Math.sin(a) * g.r);
  };

  // flies a bird along its path: heading from where it's going, banking from
  // how fast that heading turns
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), vel = new THREE.Vector3();
  const fly = (sk, at, t) => {
    at(t, p0); at(t + 0.1, p1); at(t + 0.2, p2);
    vel.subVectors(p1, p0).divideScalar(0.1);
    const h1 = Math.atan2(-(p1.z - p0.z), p1.x - p0.x), h2 = Math.atan2(-(p2.z - p1.z), p2.x - p1.x);
    const turn = Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)) / 0.1;
    sk.root.position.copy(p0);
    steer(sk.root, vel, turn, 1.6);
    return vel.y;
  };

  return function animateSky(time) {
    for (const c of clouds) {
      const a = c.userData.a + time * c.userData.speed;
      c.position.x = Math.cos(a) * c.userData.d;
      c.position.z = Math.sin(a) * c.userData.d;
    }
    let i = 0;
    const sk = pigeonMeshes.sk;
    for (const f of flocks) {
      for (const b of f.birds) {
        const vy = fly(sk, (t, out) => flockBird(f, b, t, out), time);
        // the flock's beat-and-glide rhythm, each bird a touch early or late;
        // climbing takes beats, dropping is a glide
        const sched = Math.sin((Math.PI * 2 * (time - b.lag)) / f.beat + f.p);
        const amount = THREE.MathUtils.clamp(THREE.MathUtils.smoothstep(sched, -0.45, -0.05) + vy * 0.5, 0, 1);
        flap(sk, PIGEON, Math.PI * 2 * b.hz * time + b.ph, amount);
        pigeonMeshes.pose(i++);
      }
    }
    pigeonMeshes.done();
    const gk = gullMeshes.sk;
    gulls.forEach((g, k) => {
      fly(gk, (t, out) => gullAt(g, t, out), time);
      // now and then a few slow beats, otherwise a long glide
      const burst = THREE.MathUtils.smoothstep(Math.sin((Math.PI * 2 * time) / g.every + g.p), 0.8, 0.9);
      flap(gk, GULL, Math.PI * 2 * g.hz * time + g.p, burst);
      gk.root.rotation.x += 0.05 * Math.sin(time * 0.9 + g.p);   // riding the gusts
      gullMeshes.pose(k);
    });
    gullMeshes.done();
  };
}
