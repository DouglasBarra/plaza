// The plaza's animals: cats (one follows you for a bit) and pigeons that
// strut about and fly off when you come close.
import * as THREE from 'three';
import { M, mesh, box, cyl } from '../kit.js';
import { swapModel } from '../models.js';
import { PIGEON, parts, meshBird, fold, flap, steer } from '../birds.js';

const cats = [];
export function cat(p, x, z, rotY, follows = false) {
  const g = new THREE.Group();
  box(g, 0.5, 0.22, 0.2, M.white, 0, 0.2, 0);
  box(g, 0.2, 0.2, 0.2, M.white, 0.3, 0.34, 0);
  for (const ez of [-0.06, 0.06]) mesh(new THREE.ConeGeometry(0.05, 0.1, 4), M.white, 0.3, 0.48, ez, g);
  const tail = new THREE.Group();
  tail.position.set(-0.25, 0.28, 0);
  cyl(tail, 0.025, 0.025, 0.35, M.white, 0, 0.17, 0, 5);
  tail.rotation.z = 0.5;
  g.add(tail);
  for (const lx of [-0.18, 0.18]) for (const lz of [-0.06, 0.06]) box(g, 0.05, 0.1, 0.05, M.white, lx, 0.05, lz);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'cat'));
  cats.push({ g, tail, home: new THREE.Vector3(x, 0, z), follows });
}

// Pigeons walk about the paving round the fountain, bobbing their heads,
// pecking, turning, now and then puffing up to coo. Come close and one bursts
// up with a flurry of wingbeats, its neighbours follow, and they swing round
// and glide back down to land somewhere else. Small motions step on the
// 2-frame clock; flight is smooth.
const RING_IN = 7.3, RING_OUT = 9.3;      // they keep to this ring of paving (the fountain is inside)
const SCARE = 2.6;                         // how close you can come
const pigeons = [];
export function pigeon(p, x, z) {
  const sk = meshBird(PIGEON);
  const g = sk.root;
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * 6;
  g.userData = { pigeon: true, sk, home: new THREE.Vector3(x, 0, z), mode: 'look', until: 0, tick: -1, n: 0,
    target: new THREE.Vector3(), scare: 0, flight: null, folding: 0, turn: 1 };
  ground(sk, 'stand');
  p.add(g);
  pigeons.push(g);
}

// The paving's height under a pigeon, read once from the plaza itself (the
// stone ring and the paving inside it are raised a little).
let groundTable = null;
function groundAt(world, x, z) {
  if (!groundTable) {
    groundTable = [];
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
    world.updateMatrixWorld(true);
    for (let i = 0; i <= 50; i++) {
      const r = 6 + i * 0.1;
      ray.set(new THREE.Vector3(r * Math.cos(2.1), 1, r * Math.sin(2.1)), down);
      const hit = ray.intersectObject(world, true).find((h) => h.point.y < 0.4 && !isPigeon(h.object));
      groundTable.push(hit ? hit.point.y : 0);
    }
  }
  return groundTable[Math.round(THREE.MathUtils.clamp((Math.hypot(x, z) - 6) / 0.1, 0, 50))];
}
function isPigeon(o) {
  for (; o; o = o.parent) if (o.userData.pigeon) return true;
  return false;
}

// Poses on the ground: the body tilted, wings folded, the head held level.
function ground(sk, pose, n = 0) {
  const { body, head, legs } = sk;
  const neck = parts(PIGEON).neck;
  fold(sk, PIGEON);
  body.position.set(0, 0.098, 0);
  body.rotation.set(0, 0, 0.24);
  body.scale.set(1, 1, 1);
  head.position.set(neck[0], neck[1], 0);
  head.rotation.set(0, 0, -0.22);
  head.scale.set(1, 1, 1);
  for (const l of legs) l.rotation.set(0, 0, 0);
  if (pose === 'walk') {
    // the head thrusts forward, then holds still while the body catches up
    head.position.x += n % 2 ? 0.026 : -0.006;
    body.rotation.x = n % 2 ? 0.07 : -0.07;
    legs[0].rotation.z = n % 2 ? 0.3 : -0.25;
    legs[1].rotation.z = n % 2 ? -0.25 : 0.3;
  } else if (pose === 'peck') {
    body.rotation.z = -0.22;
    body.position.y = 0.088;
    head.position.x += 0.01;
    head.rotation.z = n % 2 ? -1.45 : -0.75;
  } else if (pose === 'look') {
    head.rotation.y = (n % 3 - 1) * 0.7;
  } else if (pose === 'coo') {
    // puffed up, bowing and turning
    body.scale.set(1.05, 1.1, 1.12);
    body.rotation.z = 0.45;
    head.scale.set(1.15, 1.25, 1.35);
    head.rotation.z = n % 2 ? -0.75 : -0.3;
    head.position.x -= 0.01;
  }
}

function pickTarget(u, from, player) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, d = 0.4 + Math.random() * 1.1;
    const x = from.x + Math.cos(a) * d, z = from.z + Math.sin(a) * d;
    const r = Math.hypot(x, z);
    if (r < RING_IN || r > RING_OUT) continue;
    if (Math.hypot(x - u.home.x, z - u.home.z) > 3) continue;   // stay near their spot
    if (player && Math.hypot(x - player.x, z - player.z) < SCARE + 0.5) continue;
    return u.target.set(x, 0, z);
  }
  return u.target.copy(u.home);
}

// One step of the 2-frame clock on the ground.
function groundStep(b, time, player) {
  const u = b.userData, sk = u.sk;
  u.n++;
  if (u.n === 1) b.position.y = groundAt(b.parent, b.position.x, b.position.z);   // the first step: stand on the paving
  if (u.folding > 0) { u.folding--; fold(sk, PIGEON, u.folding ? 0.6 : 1); return; }
  if (time > u.until) {
    const near = pigeons.some((o) => o !== b && !o.userData.flight && o.position.distanceTo(b.position) < 1.3);
    const r = Math.random();
    u.mode = r < 0.4 ? 'walk' : r < 0.7 ? 'peck' : r < 0.82 ? 'look' : r < 0.92 || !near ? 'turn' : 'coo';
    u.until = time + { walk: 2.5, peck: 1.4, look: 2, turn: 0.8, coo: 3.5 }[u.mode] * (0.6 + Math.random() * 0.8);
    u.turn = Math.random() < 0.5 ? -1 : 1;
    if (u.mode === 'walk') pickTarget(u, b.position, player);
  }
  if (u.mode === 'walk') {
    const dx = u.target.x - b.position.x, dz = u.target.z - b.position.z, d = Math.hypot(dx, dz);
    if (d < 0.06) { u.mode = 'look'; u.until = time + 1 + Math.random(); ground(sk, 'stand'); return; }
    // turn toward where it's going, a little each step, and step forward
    let dh = Math.atan2(-dz, dx) - b.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    b.rotation.y += THREE.MathUtils.clamp(dh, -0.5, 0.5);
    if (Math.abs(dh) < 1.2) {
      const step = Math.min(d, 0.055);
      b.position.x += Math.cos(b.rotation.y) * step;
      b.position.z -= Math.sin(b.rotation.y) * step;
    }
    b.position.y = groundAt(b.parent, b.position.x, b.position.z);
    ground(sk, 'walk', u.n);
  } else if (u.mode === 'peck') {
    ground(sk, Math.random() < 0.75 ? 'peck' : 'stand', u.n);
  } else if (u.mode === 'turn') {
    b.rotation.y += u.turn * 0.4;
    ground(sk, 'walk', u.n);
  } else if (u.mode === 'coo') {
    if (u.n % 2) b.rotation.y += u.turn * 0.35;
    ground(sk, 'coo', u.n);
  } else {
    ground(sk, u.n % 4 ? 'look' : 'stand', Math.floor(u.n / 4));
  }
}

// Off it goes, away from you: up steeply, round in a wide swing above the
// plaza, and back down in a glide to land somewhere clear of you.
const UP = new THREE.Vector3(0, 1, 0);
function takeOff(b, time, player) {
  const u = b.userData, A = b.position.clone();
  const out = new THREE.Vector3(A.x, 0, A.z).normalize();               // away from the fountain
  const away = player ? new THREE.Vector3(A.x - player.x, 0, A.z - player.z) : out.clone();
  if (away.lengthSq() < 1e-4) away.copy(out);
  away.normalize().applyAxisAngle(UP, (Math.random() - 0.5) * 0.9);
  if (away.dot(out) < -0.2) away.addScaledVector(out, 0.9).normalize();   // not into the fountain
  // where to land: near its spot, as far from you as it can find
  let B = null, best = -Infinity;
  const ha = Math.atan2(u.home.z, u.home.x);
  for (let i = 0; i < 14; i++) {
    const a = ha + (Math.random() - 0.5) * 1.8, r = RING_IN + 0.2 + Math.random() * (RING_OUT - RING_IN - 0.4);
    const c = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    const dp = player ? Math.hypot(c.x - player.x, c.z - player.z) : 9;
    const crowd = pigeons.some((o) => o !== b && (o.userData.flight?.B ?? o.position).distanceTo(c) < 0.45);
    const score = Math.min(dp, 7) + Math.random() - (crowd ? 5 : 0);
    if (score > best) { best = score; B = c; }
  }
  B.y = groundAt(b.parent, B.x, B.z);
  const s = Math.random() < 0.5 ? -1 : 1;              // which way round it swings
  const aA = Math.atan2(A.z, A.x), aB = Math.atan2(B.z, B.x);
  const ring = (a, r, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  const W = ring((aA + aB) / 2 + s * 0.55, 12 + Math.random() * 2, 4.2 + Math.random() * 1.5);
  const approach = new THREE.Vector3(B.x - W.x, 0, B.z - W.z).normalize();
  const side = new THREE.Vector3(-away.z * s, 0, away.x * s);
  const pts = [
    A,
    A.clone().addScaledVector(away, 0.7).setY(A.y + 0.9),
    A.clone().addScaledVector(away, 3.2).addScaledVector(side, 1.5).setY(A.y + 3),
    W,
    B.clone().addScaledVector(approach, -3.2).setY(B.y + 1.4),
    B.clone().addScaledVector(approach, -0.7).setY(B.y + 0.22),
    B,
  ];
  // keep the low parts of the swing clear of the fountain
  for (const q of pts.slice(1, -1)) {
    const r = Math.hypot(q.x, q.z);
    if (r < RING_IN) { q.x *= RING_IN / r; q.z *= RING_IN / r; }
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  u.flight = { curve, t0: time, T: curve.getLength() / 5.2 + 0.8, B, phase: Math.random() * 6, last: time, heading: b.rotation.y };
  // the ones nearby go too, a moment later
  for (const o of pigeons) {
    const v = o.userData;
    if (o !== b && !v.flight && !v.scare && o.position.distanceTo(A) < 2.6) v.scare = time + 0.15 + Math.random() * 0.5;
  }
}

const ease = (t) => 0.55 * t + 0.45 * (0.5 - 0.5 * Math.cos(Math.PI * t));  // slow out of the start, slow into the landing
const pa = new THREE.Vector3(), pb = new THREE.Vector3(), vel = new THREE.Vector3();
function flyStep(b, time) {
  const u = b.userData, f = u.flight, sk = u.sk, t = time - f.t0;
  if (t >= f.T) {
    // landed: the wings fold over the next two steps
    b.position.copy(f.B);
    b.rotation.set(0, f.heading, 0);
    u.flight = null;
    u.folding = 2;
    u.mode = 'look'; u.until = time + 1.2 + Math.random();
    ground(sk, 'stand');
    fold(sk, PIGEON, 0.2);
    return;
  }
  const s0 = ease(t / f.T), s1 = ease(Math.min(1, (t + 0.05) / f.T));
  f.curve.getPointAt(s0, pa);
  f.curve.getPointAt(Math.min(1, Math.max(s1, s0 + 1e-4)), pb);
  vel.subVectors(pb, pa).divideScalar(0.05);
  b.position.copy(pa);
  const h = Math.atan2(-vel.z, vel.x);
  let turn = h - f.heading;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn)) / Math.max(1 / 60, time - f.last);
  f.last = time; f.heading = h;
  steer(b, vel, THREE.MathUtils.clamp(turn, -3, 3), 1.3);
  // body level, neck pulled in, legs tucked until the landing
  const left = f.T - t, neck = parts(PIGEON).neck;
  sk.body.position.set(0, 0.1, 0);
  sk.body.rotation.set(0, 0, 0);
  sk.body.scale.set(1, 1, 1);
  sk.head.position.set(neck[0] + 0.01, neck[1] - 0.012, 0);
  sk.head.rotation.set(0, 0, -0.75);
  sk.head.scale.set(1, 1, 1);
  for (const l of sk.legs) l.rotation.set(0, 0, left < 0.9 ? -0.2 : -1.45);
  const ph = f.phase + time * Math.PI * 2 * 7.5;
  if (t < 0.9) {
    flap(sk, PIGEON, f.phase + time * Math.PI * 2 * 9.5, 1, 1.25);    // the flurry of take-off
    b.rotation.z += 0.5 * (1 - t / 0.9);
  } else if (left < 0.55) {
    flap(sk, PIGEON, ph * 1.2, 1, 0.9);                               // braking: nose up, wings beating
    b.rotation.z += 0.9 * (1 - left / 0.55);
  } else if (vel.y < -0.6) {
    flap(sk, PIGEON, ph, 0);                                          // gliding down, wings in a V
  } else {
    flap(sk, PIGEON, ph, Math.sin(time * 3.2 + f.phase) > -0.45 ? 1 : 0);   // flap-flap-glide
  }
}

// `player` is your position on the plaza (null when you're indoors).
export function animateCritters(time, player = null, dt = 1 / 60) {
  const tick = Math.floor(time * 6);
  for (const b of pigeons) {
    const u = b.userData;
    if (u.flight) { flyStep(b, time); continue; }
    if (!u.scare && player && Math.hypot(player.x - b.position.x, player.z - b.position.z) < SCARE) u.scare = time + Math.random() * 0.2;
    if (u.scare && time >= u.scare) { u.scare = 0; takeOff(b, time, player); flyStep(b, time); continue; }
    if (tick !== u.tick) { u.tick = tick; groundStep(b, time, player); }
  }

  // the friendly cat trots after you for a bit, then goes home
  for (const c of cats) {
    const frame = Math.floor(time * 6) % 2;
    let target = c.home;
    if (c.follows && player && player.distanceTo(c.home) < 7) {
      const away = new THREE.Vector3().subVectors(c.g.position, player).setY(0);
      if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
      target = player.clone().setY(0).addScaledVector(away.normalize(), 1.3);
    }
    const d = new THREE.Vector3().subVectors(target, c.g.position).setY(0);
    const moving = d.length() > 0.25;
    if (moving) {
      c.g.position.addScaledVector(d.normalize(), Math.min(d.length(), 2.4 * dt));
      c.g.rotation.y = Math.atan2(-d.z, d.x);
    }
    c.g.position.y = moving && frame ? 0.04 : 0;
    c.tail.rotation.x = (frame ? 0.35 : -0.35) * (moving ? 1.4 : 0.6);
  }
}
