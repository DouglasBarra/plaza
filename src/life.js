// Small motions that make the plaza feel lived in: fountain water, smoke
// and steam, swaying trees, falling leaves, a swinging sign, and the night
// lights (lamps, pools of light, lit windows).
import * as THREE from 'three';
import { M, mesh } from './kit.js';

// See-through things that the outline pass should skip, and things that only
// exist at night. main.js wires both up.
export const skipND = [];
export const nightOnly = [];

const puffs = [];
const swayers = [];
const swings = [];
const fountains = [];
const leafList = [];
const lamps = [];
const panes = [];

const puffGeo = new THREE.IcosahedronGeometry(1, 0);

// ---------- smoke and steam ----------
export function smoke(p, x, y, z, { n = 4, rise = 1.8, size = 0.2, speed = 0.22, drift = 0.6 } = {}) {
  for (let i = 0; i < n; i++) {
    const m = mesh(puffGeo, M.white, x, y, z, p);
    m.castShadow = false;
    m.userData.keep = true;
    puffs.push({ m, base: new THREE.Vector3(x, y, z), i, n, rise, size, speed, drift, spin: Math.random() * 6 });
  }
}
export const steam = (p, x, y, z) => smoke(p, x, y, z, { n: 3, rise: 0.5, size: 0.04, speed: 0.5, drift: 0.05 });

// ---------- the fountain's water ----------
export function fountainWater(p) {
  const arcs = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const at = (r, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const curve = new THREE.CatmullRomCurve3([at(0.85, 2.08), at(1.15, 2.3), at(1.5, 1.6), at(1.75, 0.56)]);
    mesh(new THREE.TubeGeometry(curve, 20, 0.03, 5), M.white, 0, 0, 0, p).castShadow = false;
    arcs.push(curve);
  }
  const jet = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.45, 0), new THREE.Vector3(0, 3.0, 0), new THREE.Vector3(0.05, 3.1, 0)]);
  mesh(new THREE.TubeGeometry(jet, 8, 0.04, 6), M.white, 0, 0, 0, p).castShadow = false;
  const drops = [];
  for (let i = 0; i < 16; i++) {
    const d = mesh(new THREE.SphereGeometry(0.05, 6, 4), M.white, 0, 0, 0, p);
    d.castShadow = false;
    drops.push({ d, curve: arcs[i % 8], k: i / 16 });
  }
  const ripples = [];
  for (let i = 0; i < 3; i++) {
    const r = mesh(new THREE.TorusGeometry(1, 0.018, 4, 40), M.white, 0, 0.545, 0, p);
    r.rotation.x = Math.PI / 2;
    r.castShadow = false;
    ripples.push({ r, k: i / 3 });
  }
  fountains.push({ drops, ripples });
}

// ---------- trees, leaves, signs ----------
export function sway(g, amount = 0.025) {
  swayers.push({ g, amount, phase: Math.random() * 10, rx: g.rotation.x, rz: g.rotation.z });
}

export function swingSign(pivot) {
  swings.push({ pivot, phase: Math.random() * 6 });
}

const leafGeo = new THREE.BoxGeometry(0.16, 0.012, 0.09);
export function leaves(p, count, half) {
  for (let i = 0; i < count; i++) {
    const m = mesh(leafGeo, M.white, 0, 0, 0, p);
    m.castShadow = false;
    leafList.push({ m, x: (Math.random() * 2 - 1) * half, z: (Math.random() * 2 - 1) * half, k: Math.random(), speed: 0.05 + Math.random() * 0.04, ph: Math.random() * 6 });
  }
}

// ---------- night lights ----------
const lampGlow = new THREE.MeshBasicMaterial({ color: '#fff1b8' });
const poolMat = new THREE.MeshBasicMaterial({ color: '#ffe38a', transparent: true, opacity: 0.16, depthWrite: false });
const litPane = new THREE.MeshBasicMaterial({ color: '#ffe9a8' });

export function lampLight(lampGroup, head) {
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.03;
  pool.visible = false;
  pool.userData.keep = true;
  lampGroup.add(pool);
  skipND.push(pool);
  nightOnly.push(pool);
  const lamp = { head };
  lamps.push(lamp);
  return lamp;
}

// Some windows light up at night (not all: somebody is always out).
export function registerPane(pane) {
  pane.userData.dark = pane.material;
  pane.userData.lightsOn = panes.length % 5 !== 2;
  panes.push(pane);
}

let night = false;
export const isNight = () => night;

export function setNight(on) {
  for (const o of nightOnly) o.visible = on;
  night = on;
  for (const l of lamps) if (l.head) l.head.material = on ? lampGlow : l.day ?? M.white;
  for (const p of panes) p.material = on && p.userData.lightsOn ? litPane : p.userData.dark;
}

// ---------- the clock that drives it all ----------
export function animateLife(time) {
  for (const f of puffs) {
    const u = (time * f.speed + f.i / f.n) % 1;
    f.m.position.set(f.base.x + Math.sin(u * 3 + f.spin) * 0.1 + u * f.drift, f.base.y + u * f.rise, f.base.z + u * f.drift * 0.3);
    f.m.scale.setScalar(f.size * (0.5 + u * 1.4) * Math.min(1, (1 - u) * 4));
    f.m.rotation.set(u * 2 + f.spin, u * 3, 0);
  }
  for (const s of swayers) {
    s.g.rotation.x = s.rx + Math.sin(time * 1.1 + s.phase) * s.amount;
    s.g.rotation.z = s.rz + Math.cos(time * 0.9 + s.phase) * s.amount;
  }
  for (const s of swings) s.pivot.rotation.x = Math.sin(time * 1.6 + s.phase) * 0.14;
  for (const f of fountains) {
    for (const d of f.drops) d.d.position.copy(d.curve.getPoint((time * 0.7 + d.k) % 1));
    for (const r of f.ripples) {
      const u = (time * 0.35 + r.k) % 1;
      r.r.scale.setScalar(0.4 + u * 1.45);
    }
  }
  for (const l of leafList) {
    const u = (time * l.speed + l.k) % 1;
    l.m.position.set(l.x + Math.sin(u * 9 + l.ph) * 0.7 + u * 2.5, 7 * (1 - u) + 0.02, l.z + Math.cos(u * 7 + l.ph) * 0.5);
    l.m.rotation.set(Math.sin(u * 11 + l.ph) * 0.8, u * 8, Math.cos(u * 13) * 0.6);
  }
}
