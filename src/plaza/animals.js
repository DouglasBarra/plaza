// More animals: a dog who takes a liking to you, and ducks on the fountain.
// (The pigeons that scatter as you walk through, and the cats, are in
// critters.js.)
import * as THREE from 'three';
import { toon } from '../ink.js';
import { sfx } from '../sound/index.js';
import { M, mesh, box } from '../kit.js';

const dark = toon('#3a3a3a');

// ---------- the dog ----------
// Naps at home. When you walk by, gets up and trots along beside you for a
// while (about forty seconds), then loses interest and goes home to nap.
export function dog(world, home) {
  const g = new THREE.Group();
  g.position.copy(home);
  world.add(g);
  const body = new THREE.Group();
  g.add(body);
  box(body, 0.55, 0.24, 0.24, M.white, 0, 0.42, 0);                     // body, along +x
  const head = new THREE.Group();
  head.position.set(0.32, 0.58, 0);
  body.add(head);
  box(head, 0.22, 0.2, 0.2, M.white, 0, 0, 0);
  box(head, 0.14, 0.1, 0.13, M.white, 0.15, -0.05, 0);                  // muzzle
  mesh(new THREE.SphereGeometry(0.03, 6, 5), dark, 0.23, -0.02, 0, head);   // nose
  for (const s of [-1, 1]) {
    const ear = box(head, 0.06, 0.16, 0.08, dark, -0.05, 0.02, s * 0.12);
    ear.rotation.x = s * 0.4;
    mesh(new THREE.SphereGeometry(0.02, 6, 4), dark, 0.08, 0.04, s * 0.07, head);   // eyes
  }
  box(body, 0.06, 0.06, 0.26, dark, 0.22, 0.52, 0);                     // collar
  const legs = [];
  for (const [x, z] of [[0.2, 0.08], [0.2, -0.08], [-0.2, 0.08], [-0.2, -0.08]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.32, z);
    body.add(leg);
    box(leg, 0.07, 0.32, 0.07, M.white, 0, -0.16, 0);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(-0.27, 0.5, 0);
  body.add(tail);
  box(tail, 0.05, 0.24, 0.05, M.white, 0, 0.1, 0).rotation.z = -0.6;

  const FOLLOW_FOR = 40, BORED_FOR = 60, NOTICE = 6;
  let mode = 'nap', until = 0;
  return function update(time, player, dt) {
    const frame = Math.floor(time * 7) % 2;
    let target = null;
    if (mode === 'nap' && player && time > until && player.distanceTo(g.position) < NOTICE) { mode = 'follow'; until = time + FOLLOW_FOR; sfx('bark', { at: g.position, dry: true }); }
    if (mode === 'follow') {
      if (!player || time > until) { mode = 'home'; until = time + BORED_FOR; }
      else {
        // trot along at your side, a little behind
        const side = new THREE.Vector3().subVectors(g.position, player).setY(0);
        if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
        target = player.clone().setY(0).addScaledVector(side.normalize(), 1.2);
      }
    }
    if (mode === 'home') target = home;
    const d = target ? new THREE.Vector3().subVectors(target, g.position).setY(0) : new THREE.Vector3();
    const moving = d.length() > 0.2;
    if (moving) {
      g.position.addScaledVector(d.normalize(), Math.min(d.length(), (mode === 'home' ? 1.6 : 4.2) * dt));
      g.rotation.y = Math.atan2(-d.z, d.x);
    } else if (mode === 'home') mode = 'nap';
    // legs and tail: trotting, wagging, or curled up asleep
    const asleep = mode === 'nap';
    body.position.y = asleep ? -0.22 : moving && frame ? 0.03 : 0;
    legs.forEach((l, i) => { l.rotation.z = asleep ? (i < 2 ? 1.2 : -1.2) : moving ? ((i + frame) % 2 ? 0.45 : -0.45) : 0; });
    head.rotation.z = asleep ? -0.35 : 0;
    tail.rotation.x = asleep ? 0 : Math.sin(time * (mode === 'follow' ? 18 : 6)) * 0.6;
  };
}

// ---------- the ducks ----------
// Three ducks paddling slow circles in the fountain's basin, bobbing.
export function ducks(fountainGroup, { water = 0.52, inner = 3.1, outer = 4.4 } = {}) {
  const flock = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const scale = i === 0 ? 1.6 : 1.3;   // a bit big, to read from across the square
    g.scale.setScalar(scale);
    box(g, 0.34, 0.14, 0.2, M.white, 0, 0.06, 0).rotation.z = 0.08;          // body
    box(g, 0.1, 0.1, 0.18, M.white, -0.16, 0.12, 0).rotation.z = 0.6;         // tail up
    const neck = box(g, 0.08, 0.18, 0.08, M.white, 0.13, 0.18, 0);
    neck.rotation.z = -0.15;
    box(g, 0.13, 0.11, 0.11, i === 0 ? toon('#cfd6cf') : M.white, 0.17, 0.3, 0);   // head (the drake's a little darker)
    box(g, 0.08, 0.025, 0.07, toon('#e8c060'), 0.27, 0.28, 0);                 // bill
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.015, 5, 4), dark, 0.2, 0.32, s * 0.05, g);
    fountainGroup.add(g);
    flock.push({ g, r: inner + (outer - inner) * (i / 2), speed: 0.12 + i * 0.03, phase: i * 2.1 });
  }
  let quackAt = 6;
  return function update(time) {
    // now and then one of them says something
    if (time > quackAt) { quackAt = time + 5 + Math.random() * 14; sfx('quack', { at: fountainGroup.getWorldPosition(new THREE.Vector3()).setY(0.6) }); }
    for (const d of flock) {
      // circling, drifting in and out a little
      const a = d.phase + time * d.speed;
      const r = d.r + Math.sin(time * 0.3 + d.phase) * 0.35;
      d.g.position.set(Math.cos(a) * r, water + Math.sin(time * 2 + d.phase) * 0.01, Math.sin(a) * r);
      d.g.rotation.y = -a - Math.PI / 2;               // facing along the circle (they swim with +x ahead)
    }
  };
}
