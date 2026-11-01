// The plaza's animals: cats (one follows you for a bit) and pigeons that
// hop about and fly off when you come close.
import * as THREE from 'three';
import { M, mesh, box, cyl } from '../kit.js';
import { swapModel } from '../models.js';

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
// Pigeons hop about on the 2-frame clock, and fly off when you come close.
const pigeons = [];
export function pigeon(p, x, z) {
  const g = new THREE.Group();
  box(g, 0.24, 0.14, 0.12, M.white, 0, 0.12, 0);
  box(g, 0.09, 0.09, 0.09, M.white, 0.13, 0.22, 0);
  box(g, 0.05, 0.02, 0.03, M.deep, 0.2, 0.21, 0);
  const wings = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.position.set(0, 0.17, s * 0.06);
    box(w, 0.16, 0.02, 0.14, M.white, 0, 0, s * 0.07);
    g.add(w);
    return w;
  });
  g.position.set(x, 0, z); g.rotation.y = Math.random() * 6;
  g.userData = { home: new THREE.Vector3(x, 0, z), phase: Math.random() * 4, wings, flight: -1, wary: false, dir: new THREE.Vector3() };
  p.add(g);
  pigeons.push(g);
}

// `player` is your position on the plaza (null when you're indoors).
export function animateCritters(time, player = null, dt = 1 / 60) {
  for (const p of pigeons) {
    const u = p.userData;
    const near = player && Math.hypot(player.x - u.home.x, player.z - u.home.z) < 2.4;
    if (u.flight < 0 && near && !u.wary) {
      u.flight = time;
      u.wary = true;
      u.dir.set(u.home.x - player.x, 0, u.home.z - player.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 1.2);
    }
    if (!near && u.flight < 0) u.wary = false;
    if (u.flight >= 0) {
      const s = (time - u.flight) / 4.5;
      if (s >= 1) { u.flight = -1; p.position.copy(u.home); continue; }
      const arc = Math.sin(Math.PI * s);
      p.position.set(u.home.x + u.dir.x * arc * 6, arc * 4.5, u.home.z + u.dir.z * arc * 6);
      p.rotation.y = Math.atan2(-u.dir.z, u.dir.x) + (s > 0.5 ? Math.PI : 0);
      const flap = Math.floor(time * 12) % 2 ? 0.9 : -0.5;
      u.wings[0].rotation.x = -flap; u.wings[1].rotation.x = flap;
    } else {
      u.wings[0].rotation.x = u.wings[1].rotation.x = 0;
      const k = Math.floor(time * 1.5 + u.phase);
      const hop = k % 5 === 0;
      p.position.y = hop ? 0.12 : 0;
      if (hop) { p.position.x = u.home.x + Math.sin(k) * 0.4; p.position.z = u.home.z + Math.cos(k * 1.3) * 0.4; p.rotation.y = k; }
    }
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
