// Small motions that make the plaza feel lived in: smoke and steam, swaying
// trees, falling leaves, a swinging sign, and the night lights (lamps, pools
// of light, lit windows).
import * as THREE from 'three';
import { M, mesh } from './kit.js';

// See-through things that the outline pass should skip, and things that only
// exist at night. app/engine.js and ui/toggles.js wire both up.
export const skipND = [];
export const nightOnly = [];

const puffs = [];
const swayers = [];
const swings = [];
const leafList = [];
const lamps = [];
const panes = [];
const spinners = [];

const puffGeo = new THREE.IcosahedronGeometry(1, 0);

// ---------- smoke and steam ----------
export function smoke(p, x, y, z, { n = 4, rise = 1.8, size = 0.2, speed = 0.22, drift = 0.6, mat = M.white } = {}) {
  for (let i = 0; i < n; i++) {
    const m = mesh(puffGeo, mat, x, y, z, p);
    m.castShadow = false;
    m.userData.keep = true;
    puffs.push({ m, base: new THREE.Vector3(x, y, z), i, n, rise, size, speed, drift, spin: Math.random() * 6 });
  }
}
export const steam = (p, x, y, z) => smoke(p, x, y, z, { n: 3, rise: 0.5, size: 0.04, speed: 0.5, drift: 0.05 });

// ---------- trees, leaves, signs ----------
export function sway(g, amount = 0.025) {
  swayers.push({ g, amount, phase: Math.random() * 10, rx: g.rotation.x, rz: g.rotation.z });
}

// Turn something steadily around one of its own axes (gears, fans).
export function spin(obj, speed, axis = 'y') {
  spinners.push({ obj, speed, axis });
}

// `axis` is the axis it turns about: 'x' swings it toward and away from a
// viewer facing +z (a sign on an awning); 'z' swings it side to side (a
// pendulum seen from the front); `amount` is the angle in radians.
export function swingSign(pivot, axis = 'x', amount = 0.14, speed = 1.6) {
  swings.push({ pivot, axis, amount, speed, phase: Math.random() * 6 });
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
  for (const s of spinners) s.obj.rotation[s.axis] = time * s.speed;
  for (const s of swings) s.pivot.rotation[s.axis] = Math.sin(time * s.speed + s.phase) * s.amount;
  for (const l of leafList) {
    const u = (time * l.speed + l.k) % 1;
    l.m.position.set(l.x + Math.sin(u * 9 + l.ph) * 0.7 + u * 2.5, 7 * (1 - u) + 0.02, l.z + Math.cos(u * 7 + l.ph) * 0.5);
    l.m.rotation.set(Math.sin(u * 11 + l.ph) * 0.8, u * 8, Math.cos(u * 13) * 0.6);
  }
}
