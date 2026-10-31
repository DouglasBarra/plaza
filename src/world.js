// The plaza, built from simple shapes. Units are meters; +z is a building's front.
import * as THREE from 'three';
import { toon, deep } from './ink.js';
import { tex } from './textures.js';

export const STAMPS = {
  todo: '#ff6a13',
  finance: '#1fcf6a',
  study: '#19a7ff',
  projects: '#ff2e88',
  ideas: '#ffd21f',
  people: '#9b6bff',
};

const TILE = 0.4; // height of each building's raised ground tile

// ---------- materials ----------
const M = {
  white: toon(),
  bricks: toon('#ffffff', tex.bricks()),
  stone: toon('#ffffff', tex.stone()),
  paving: toon('#ffffff', tex.paving()),
  shingles: toon('#ffffff', tex.shingles()),
  planks: toon('#ffffff', tex.planks()),
  dirt: toon('#ffffff', tex.dirt()),
  grass: toon('#ffffff', tex.grass()),
  water: toon('#ffffff', tex.water()),
  stripes: toon('#ffffff', tex.stripes()),
  roofTiles: toon('#ffffff', tex.roofTiles()),
  clock: toon('#ffffff', tex.clock()),
  deep: deep(),
};
const stamp = {};
for (const [k, c] of Object.entries(STAMPS)) stamp[k] = toon(c);
const glow = new THREE.MeshBasicMaterial({ color: STAMPS.ideas });

// ---------- geometry helpers (UVs in meters so textures keep their scale) ----------
function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * sizes[f][0], uv.getY(k) * sizes[f][1]);
  }
  return g;
}

function cylGeo(rt, rb, h, seg = 16) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  const uv = g.attributes.uv;
  const circ = Math.PI * (rt + rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
  return g;
}

// Triangular prism for gable roofs: triangle in x/y, extruded along z.
function prismGeo(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

const box = (p, w, h, d, mat, x, y, z) => mesh(boxGeo(w, h, d), mat, x, y, z, p);
const cyl = (p, rt, rb, h, mat, x, y, z, seg) => mesh(cylGeo(rt, rb, h, seg), mat, x, y, z, p);

// A box with one material on top and another on the sides.
function slab(p, w, h, d, top, side, x, y, z) {
  return mesh(boxGeo(w, h, d), [side, side, top, side, side, side], x, y, z, p);
}

function windowAt(p, x, y, z, w, h, rotY = 0) {
  const m = box(p, w, h, 0.08, M.deep, x, y, z);
  m.rotation.y = rotY;
  m.castShadow = false;
  return m;
}

function gable(p, w, h, d, mat, y, z = 0, rotY = 0) {
  const r = mesh(prismGeo(w, h, d), mat, 0, y, z, p);
  r.rotation.y = rotY;
  return r;
}

function groundTile(p, size, top) {
  slab(p, size, TILE, size, top, M.stone, 0, TILE / 2, 0);
}

// ---------- buildings ----------
function townHall() {
  const g = new THREE.Group();
  groundTile(g, 6, M.grass);
  const T = TILE;
  box(g, 5, 3, 3.6, M.bricks, 0, T + 1.5, 0);
  gable(g, 5.5, 1.6, 4.0, M.shingles, T + 3);
  box(g, 1.6, 3.2, 1.6, M.bricks, 0, T + 3 + 1.6, -0.6);
  const roof = mesh(new THREE.ConeGeometry(1.35, 1.7, 4), M.white, 0, T + 6.2 + 0.85, -0.6, g);
  roof.rotation.y = Math.PI / 4;
  const clock = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), [M.white, M.clock, M.white], 0, T + 5.3, -0.6 + 0.83, g);
  clock.rotation.x = Math.PI / 2;
  // flag on the tower: the ToDos stamp
  cyl(g, 0.04, 0.04, 1.3, M.white, 0, T + 7.9 + 0.5, -0.6);
  box(g, 0.7, 0.4, 0.04, stamp.todo, 0.37, T + 8.8, -0.6);
  // door + awning (stamp)
  box(g, 0.95, 1.55, 0.08, M.deep, 0, T + 0.78, 1.82);
  const awning = box(g, 1.7, 0.08, 0.8, stamp.todo, 0, T + 1.85, 2.15);
  awning.rotation.x = 0.35;
  box(g, 1.6, 0.16, 0.5, M.stone, 0, T + 0.08, 2.05);
  for (const x of [-1.7, 1.7]) windowAt(g, x, T + 2.0, 1.82, 0.6, 0.85);
  for (const x of [-1.7, -0.6, 0.6, 1.7]) windowAt(g, x, T + 2.0, -1.82, 0.5, 0.8);
  for (const z of [-0.8, 0.8]) { windowAt(g, 2.52, T + 1.9, z, 0.5, 0.8, Math.PI / 2); windowAt(g, -2.52, T + 1.9, z, 0.5, 0.8, Math.PI / 2); }
  g.userData = { district: 'todo', labelY: 9.6 };
  return g;
}

function bank() {
  const g = new THREE.Group();
  groundTile(g, 6, M.paving);
  const T = TILE;
  slab(g, 5.6, 0.2, 4.8, M.stone, M.stone, 0, T + 0.1, 0);
  slab(g, 5.2, 0.2, 4.4, M.stone, M.stone, 0, T + 0.3, 0);
  const F = T + 0.4;
  box(g, 4.6, 2.8, 2.8, M.stone, 0, F + 1.4, -0.6);
  for (const x of [-1.8, -0.6, 0.6, 1.8]) {
    cyl(g, 0.2, 0.24, 2.6, M.white, x, F + 1.3, 1.45, 12);
  }
  slab(g, 5.0, 0.4, 4.2, M.white, M.white, 0, F + 2.8, 0);
  gable(g, 5.0, 0.9, 0.7, M.roofTiles, F + 3.0, 1.75);
  gable(g, 4.6, 0.7, 3.4, M.roofTiles, F + 3.0, -0.3);
  // stamp: green doors + sign band
  box(g, 1.1, 1.8, 0.08, stamp.finance, 0, F + 0.9, 0.84);
  box(g, 2.6, 0.32, 0.06, stamp.finance, 0, F + 2.8, 2.13);
  for (const x of [-1.5, 1.5]) windowAt(g, x, F + 1.3, 0.84, 0.5, 1.3);
  g.userData = { district: 'finance', labelY: 6.2 };
  return g;
}

function library() {
  const g = new THREE.Group();
  groundTile(g, 6, M.grass);
  const T = TILE;
  box(g, 4.2, 4.4, 3.6, M.bricks, 0, T + 2.2, 0);
  gable(g, 4.7, 1.9, 4.0, M.roofTiles, T + 4.4);
  box(g, 0.55, 1.4, 0.55, M.bricks, 1.2, T + 5.2, -0.8);
  for (const y of [1.7, 3.3]) for (const x of [-1.15, 1.15]) windowAt(g, x, T + y, 1.82, 0.7, 1.0);
  const round = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 20), M.deep, 0, T + 5.0, 2.0, g);
  round.rotation.x = Math.PI / 2;
  // stamp: blue door + hanging banner
  box(g, 1.0, 1.7, 0.08, stamp.study, 0, T + 0.85, 1.82);
  box(g, 0.08, 0.08, 0.6, M.white, 2.1, T + 3.9, 2.05);
  box(g, 0.05, 1.3, 0.5, stamp.study, 2.15, T + 3.2, 2.2);
  // a stack of books by the door
  box(g, 0.6, 0.18, 0.4, M.white, -0.9, T + 0.09, 2.3);
  box(g, 0.5, 0.18, 0.35, M.white, -0.88, T + 0.27, 2.3).rotation.y = 0.2;
  box(g, 0.45, 0.16, 0.3, stamp.study, -0.92, T + 0.44, 2.28).rotation.y = -0.15;
  for (const z of [-0.9, 0.9]) for (const y of [1.7, 3.3]) { windowAt(g, 2.12, T + y, z, 0.5, 0.9, Math.PI / 2); windowAt(g, -2.12, T + y, z, 0.5, 0.9, Math.PI / 2); }
  g.userData = { district: 'study', labelY: 8.0 };
  return g;
}

function lighthouse() {
  const g = new THREE.Group();
  groundTile(g, 6, M.dirt);
  const T = TILE;
  cyl(g, 1.0, 1.4, 6, M.stripes, -0.6, T + 3, -0.4, 14);
  cyl(g, 1.45, 1.45, 0.2, M.white, -0.6, T + 6.1, -0.4, 14);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    cyl(g, 0.03, 0.03, 0.45, M.white, -0.6 + Math.cos(a) * 1.35, T + 6.42, -0.4 + Math.sin(a) * 1.35, 5);
  }
  const lamp = mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.0, 12), glow, -0.6, T + 6.7, -0.4, g);
  lamp.castShadow = false;
  mesh(new THREE.ConeGeometry(1.05, 0.95, 12), M.white, -0.6, T + 7.68, -0.4, g);
  box(g, 0.7, 1.2, 0.08, M.deep, -0.6, T + 0.6, 0.94);
  for (const y of [2.6, 4.4]) windowAt(g, -0.6, T + y, 0.72 - (y - 2.6) * 0.07, 0.35, 0.5);
  // the keeper's hut
  box(g, 2.2, 1.6, 2.0, M.planks, 1.6, T + 0.8, 1.0);
  gable(g, 2.5, 1.0, 2.3, M.shingles, T + 1.6, 1.0, Math.PI / 2).position.x = 1.6;
  box(g, 0.6, 1.1, 0.08, M.deep, 1.9, T + 0.55, 2.02);
  windowAt(g, 1.1, T + 0.95, 2.02, 0.45, 0.45);
  g.userData = { district: 'ideas', labelY: 9.2 };
  return g;
}

function emptyPlot(district) {
  const g = new THREE.Group();
  groundTile(g, 5, M.dirt);
  const T = TILE;
  const posts = [[-2, -2], [2, -2], [2, 2], [-2, 2]];
  for (const [x, z] of posts) box(g, 0.14, 0.8, 0.14, M.white, x, T + 0.4, z);
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = posts[i], [x2, z2] = posts[(i + 1) % 4];
    if (i === 3) continue; // open side, the way in
    box(g, Math.abs(x2 - x1) + 0.1 || 0.06, 0.08, Math.abs(z2 - z1) + 0.1 || 0.06, M.white, (x1 + x2) / 2, T + 0.6, (z1 + z2) / 2);
  }
  // signpost with a stamp-colored board
  box(g, 0.12, 1.6, 0.12, M.white, 1.2, T + 0.8, 1.6);
  box(g, 1.3, 0.6, 0.08, stamp[district], 1.2, T + 1.4, 1.68);
  // a few crates waiting
  box(g, 0.6, 0.6, 0.6, M.planks, -1.0, T + 0.3, -0.8);
  box(g, 0.5, 0.5, 0.5, M.planks, -0.4, T + 0.25, -1.2).rotation.y = 0.4;
  g.userData = { district, labelY: 2.8, plot: true };
  return g;
}

// ---------- props ----------
function pine(p, x, z, s = 1) {
  const g = new THREE.Group();
  cyl(g, 0.1, 0.14, 0.6, M.white, 0, 0.3, 0, 6);
  for (let i = 0; i < 3; i++) {
    const c = mesh(new THREE.ConeGeometry((1.0 - i * 0.25), 1.1, 7), M.white, 0, 0.9 + i * 0.6, 0, g);
    c.material = M.white;
  }
  g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = x * 3.1;
  p.add(g);
  return g;
}

function roundTree(p, x, z, s = 1) {
  const g = new THREE.Group();
  cyl(g, 0.1, 0.15, 1.0, M.white, 0, 0.5, 0, 6);
  const crown = mesh(new THREE.IcosahedronGeometry(0.9, 0), M.white, 0, 1.6, 0, g);
  crown.rotation.set(x, z, 0);
  g.position.set(x, 0, z); g.scale.setScalar(s);
  p.add(g);
  return g;
}

function bench(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 1.5, 0.08, 0.45, M.planks, 0, 0.45, 0);
  box(g, 1.5, 0.4, 0.06, M.planks, 0, 0.75, -0.22);
  for (const lx of [-0.6, 0.6]) box(g, 0.08, 0.45, 0.4, M.white, lx, 0.22, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(g);
}

function lamp(p, x, z) {
  const g = new THREE.Group();
  cyl(g, 0.12, 0.16, 0.2, M.white, 0, 0.1, 0, 8);
  cyl(g, 0.05, 0.05, 2.4, M.white, 0, 1.3, 0, 6);
  box(g, 0.32, 0.4, 0.32, M.white, 0, 2.6, 0);
  mesh(new THREE.ConeGeometry(0.3, 0.25, 4), M.white, 0, 2.92, 0, g).rotation.y = Math.PI / 4;
  g.position.set(x, 0, z);
  p.add(g);
}

function fountain(p) {
  const g = new THREE.Group();
  cyl(g, 2.3, 2.4, 0.6, M.stone, 0, 0.3, 0, 24);
  cyl(g, 2.0, 2.0, 0.05, M.water, 0, 0.5, 0, 24);
  cyl(g, 0.3, 0.4, 1.5, M.stone, 0, 1.2, 0, 10);
  cyl(g, 0.9, 0.45, 0.3, M.white, 0, 2.0, 0, 16);
  mesh(new THREE.SphereGeometry(0.22, 10, 8), M.white, 0, 2.35, 0, g);
  p.add(g);
}

// Little plaza folks: a capsule, a head, two dot eyes. They wiggle on a
// 2-frame loop like hand-drawn animation.
const folks = [];
function folk(p, x, z, rotY, opts = {}) {
  const g = new THREE.Group();
  mesh(new THREE.CapsuleGeometry(0.2, 0.4, 3, 8), M.white, 0, 0.42, 0, g);
  mesh(new THREE.SphereGeometry(0.2, 10, 8), M.white, 0, 0.98, 0, g);
  for (const ex of [-0.07, 0.07]) {
    const e = mesh(new THREE.SphereGeometry(0.03, 6, 4), M.deep, ex, 1.0, 0.18, g);
    e.castShadow = false;
  }
  if (opts.balloon) {
    cyl(g, 0.008, 0.008, 1.2, M.white, 0.25, 1.2, 0, 3);
    mesh(new THREE.SphereGeometry(0.22, 10, 8), stamp[opts.balloon], 0.25, 1.95, 0, g);
  }
  if (opts.hat) mesh(new THREE.ConeGeometry(0.16, 0.3, 8), M.white, 0, 1.3, 0, g);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  g.userData = { phase: Math.random() * 10, walk: opts.walk };
  p.add(g);
  folks.push(g);
  return g;
}

function cat(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 0.5, 0.22, 0.2, M.white, 0, 0.2, 0);
  box(g, 0.2, 0.2, 0.2, M.white, 0.3, 0.34, 0);
  for (const ez of [-0.06, 0.06]) mesh(new THREE.ConeGeometry(0.05, 0.1, 4), M.white, 0.3, 0.48, ez, g);
  const tail = cyl(g, 0.025, 0.025, 0.35, M.white, -0.3, 0.38, 0, 5);
  tail.rotation.z = 0.5;
  for (const lx of [-0.18, 0.18]) for (const lz of [-0.06, 0.06]) box(g, 0.05, 0.1, 0.05, M.white, lx, 0.05, lz);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(g);
}

function bollard(p, x, z) {
  cyl(p, 0.14, 0.17, 0.8, M.white, x, 0.4, z, 8);
  mesh(new THREE.SphereGeometry(0.15, 8, 6), M.white, x, 0.82, z, p);
}

function planter(p, x, z, flowers = 'white') {
  const g = new THREE.Group();
  box(g, 1.6, 0.6, 1.6, M.planks, 0, 0.3, 0);
  for (let i = 0; i < 7; i++) {
    const fx = (Math.random() - 0.5) * 1.1, fz = (Math.random() - 0.5) * 1.1;
    cyl(g, 0.02, 0.02, 0.35, M.white, fx, 0.75, fz, 3);
    mesh(new THREE.SphereGeometry(0.11, 6, 5), flowers === 'white' ? M.white : stamp[flowers], fx, 0.95, fz, g);
  }
  g.position.set(x, 0, z);
  p.add(g);
}

function cafe(p, x, z) {
  const g = new THREE.Group();
  for (const [tx, tz] of [[-1.3, -0.8], [1.3, 0.6]]) {
    cyl(g, 0.5, 0.5, 0.06, M.white, tx, 0.75, tz, 14);
    cyl(g, 0.05, 0.05, 0.72, M.white, tx, 0.37, tz, 6);
    cyl(g, 0.03, 0.03, 1.6, M.white, tx, 1.5, tz, 4);
    mesh(new THREE.ConeGeometry(1.1, 0.5, 8), M.stripes, tx, 2.35, tz, g);
    for (const a of [0, Math.PI]) box(g, 0.4, 0.45, 0.4, M.planks, tx + Math.cos(a) * 0.85, 0.22, tz + Math.sin(a) * 0.85);
    mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 8), M.white, tx + 0.15, 0.84, tz, g);
  }
  g.position.set(x, 0, z);
  p.add(g);
}

function stall(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 3, 0.9, 1.2, M.planks, 0, 0.45, 0);
  for (const sx of [-1.4, 1.4]) for (const sz of [-0.5, 0.5]) cyl(g, 0.05, 0.05, 2.2, M.white, sx, 1.1, sz, 5);
  const roof = box(g, 3.4, 0.08, 1.8, M.stripes, 0, 2.25, 0.1);
  roof.rotation.x = 0.18;
  for (let i = 0; i < 5; i++) box(g, 0.45, 0.3, 0.45, M.planks, -1.1 + i * 0.55, 1.05, 0.2);
  for (let i = 0; i < 9; i++) mesh(new THREE.SphereGeometry(0.1, 6, 5), M.white, -1.2 + (i % 5) * 0.55, 1.28, 0.1 + (i > 4 ? 0.18 : 0), g);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(g);
}

function bike(p, x, z, rotY) {
  const g = new THREE.Group();
  const wheel = new THREE.TorusGeometry(0.32, 0.035, 6, 18);
  for (const wx of [-0.5, 0.5]) mesh(wheel, M.white, wx, 0.35, 0, g);
  const bar = (x1, y1, x2, y2) => {
    const m = cyl(g, 0.025, 0.025, Math.hypot(x2 - x1, y2 - y1), M.white, (x1 + x2) / 2, (y1 + y2) / 2, 0, 4);
    m.rotation.z = Math.atan2(x1 - x2, y2 - y1);
  };
  bar(-0.5, 0.35, 0, 0.75); bar(0, 0.75, 0.5, 0.35); bar(0, 0.75, -0.1, 0.35); bar(-0.1, 0.35, -0.5, 0.35);
  bar(0.45, 0.6, 0.5, 0.95); box(g, 0.25, 0.05, 0.12, M.white, -0.05, 0.82, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(g);
}

function noticeboard(p, x, z, rotY) {
  const g = new THREE.Group();
  for (const sx of [-0.9, 0.9]) box(g, 0.12, 1.9, 0.12, M.white, sx, 0.95, 0);
  box(g, 2, 1.1, 0.08, M.planks, 0, 1.3, 0);
  for (const [nx, ny, w, h] of [[-0.5, 1.45, 0.5, 0.6], [0.15, 1.2, 0.45, 0.5], [0.6, 1.5, 0.35, 0.4]]) box(g, w, h, 0.03, M.white, nx, ny, 0.06);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(g);
}

function mailbox(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 0.1, 1.0, 0.1, M.white, 0, 0.5, 0);
  box(g, 0.45, 0.35, 0.6, M.white, 0, 1.15, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(g);
}

// Pigeons hop between two spots on the 2-frame clock.
const pigeons = [];
function pigeon(p, x, z) {
  const g = new THREE.Group();
  box(g, 0.24, 0.14, 0.12, M.white, 0, 0.12, 0);
  box(g, 0.09, 0.09, 0.09, M.white, 0.13, 0.22, 0);
  box(g, 0.05, 0.02, 0.03, M.deep, 0.2, 0.21, 0);
  g.position.set(x, 0, z); g.rotation.y = Math.random() * 6;
  g.userData = { home: new THREE.Vector3(x, 0, z), phase: Math.random() * 4 };
  p.add(g);
  pigeons.push(g);
}

// ---------- the plaza ----------
export const PLAZA_HALF = 16;

export function buildPlaza(scene) {
  const world = new THREE.Group();
  scene.add(world);
  const H = PLAZA_HALF;

  // the plaza floor: a raised slab with a stone curb
  slab(world, H * 2, 0.4, H * 2, M.paving, M.stone, 0, -0.2, 0);
  // a stepped ring around the fountain
  cyl(world, 6.2, 6.2, 0.1, M.stone, 0, 0.05, 0, 40);

  const buildings = [];
  const colliders = [];
  const place = (b, x, z, rotY = Math.atan2(-x, -z), r = 4.4) => {
    b.position.set(x, 0, z);
    b.rotation.y = rotY; // front faces the fountain
    world.add(b);
    buildings.push(b);
    colliders.push({ x, z, r });
    const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    b.userData.door = new THREE.Vector3(x, 0, z).addScaledVector(front, r + 0.7); // just outside its collider
  };
  const C = 11.2;
  place(townHall(), -C, -C);
  place(bank(), C, -C);
  place(library(), -C, C);
  place(lighthouse(), C, C);
  place(emptyPlot('projects'), -4.8, -12.6, 0, 3.4);
  place(emptyPlot('people'), -12.6, 4.8, Math.PI / 2, 3.4);

  fountain(world);
  colliders.push({ x: 0, z: 0, r: 2.9 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    bench(world, Math.sin(a) * 4.6, Math.cos(a) * 4.6, a + Math.PI);
  }
  for (const [x, z] of [[7, 0], [-7, 0], [0, 7], [0, -7]]) { lamp(world, x, z); colliders.push({ x, z, r: 0.35 }); }

  // bollards along the edge: the plaza ends here, the town goes on
  for (let s = -H + 0.6; s <= H - 0.5; s += 2.1) {
    bollard(world, s, -H + 0.4); bollard(world, s, H - 0.4);
    bollard(world, -H + 0.4, s); bollard(world, H - 0.4, s);
  }

  // the free lots along the edges, waiting for future districts
  cafe(world, 4.8, -12.6); colliders.push({ x: 4.8, z: -12.6, r: 2.3 });
  stall(world, 12.8, -4.8, -Math.PI / 2); colliders.push({ x: 12.8, z: -4.8, r: 2 });
  planter(world, 12.6, 3.6, 'ideas'); planter(world, 12.6, 6.2); colliders.push({ x: 12.6, z: 4.9, r: 2.2 });
  roundTree(world, 4.2, 13, 0.9); roundTree(world, 6.3, 12.2, 0.75); colliders.push({ x: 5.2, z: 12.6, r: 1.8 });
  bike(world, 2.8, 11.4, 0.2); bike(world, 3.4, 11.0, 0.5);
  noticeboard(world, -4.8, 13.2, Math.PI); colliders.push({ x: -4.8, z: 13.2, r: 1.2 });
  bench(world, -6.6, 11.6, Math.PI * 0.85);
  mailbox(world, -2.8, 12.4, Math.PI);
  planter(world, -13.2, -4.8, 'todo'); colliders.push({ x: -13.2, z: -4.8, r: 1.2 });
  roundTree(world, -12.2, -7.0, 0.7);
  for (const [x, z] of [[1.8, 3.4], [2.3, 3.0], [-3.2, -1.6], [-3.4, -2.2], [3.1, -2.6], [2.2, -3.4]]) pigeon(world, x, z);

  // folks
  folk(world, 3.6, 3.2, 2.4);
  folk(world, 4.2, 2.5, -0.9, { hat: true });
  folk(world, -4.0, 3.8, 0.6, { balloon: 'projects' });
  folk(world, 7, -3, -2.0, { walk: { r: 7.6, speed: 0.1 } });
  folk(world, -7, -1.2, 1.0, { walk: { r: 8.4, speed: -0.08, offset: 2 } });
  folk(world, 1.4, -7.8, 3.1, { hat: true });
  folk(world, 4.8, -11.0, 0.3);
  folk(world, 11.4, -4.6, 1.6);
  folk(world, -10.6, 7.6, 2.2, { balloon: 'people' });
  folk(world, -5.0, 12.2, 0);
  cat(world, 2.1, 3.9, 0.7);
  cat(world, -12.2, 2.0, 2.4);

  return { world, buildings, colliders };
}

export function animateFolks(time) {
  const frame = Math.floor(time * 3); // 3 drawings per second
  for (const f of folks) {
    const flip = (frame + Math.floor(f.userData.phase * 3)) % 2;
    f.rotation.z = flip ? 0.06 : -0.06;
    const w = f.userData.walk;
    if (w) {
      const a = time * w.speed + (w.offset || 0);
      f.position.set(Math.cos(a) * w.r, flip ? 0.05 : 0, Math.sin(a) * w.r);
      f.rotation.y = -a + (w.speed > 0 ? 0 : Math.PI);
    } else {
      f.position.y = flip ? 0.03 : 0;
    }
  }
  for (const p of pigeons) {
    const k = Math.floor(time * 1.5 + p.userData.phase);
    const hop = k % 5 === 0;
    p.position.y = hop ? 0.12 : 0;
    if (hop) { p.position.x = p.userData.home.x + Math.sin(k) * 0.4; p.position.z = p.userData.home.z + Math.cos(k * 1.3) * 0.4; p.rotation.y = k; }
  }
}

export { M, boxGeo, prismGeo, mesh, folk };
