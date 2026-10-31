// Things that make a room feel lived in: framed pictures with little ink
// doodles, wall shelves with odds and ends, rugs, a coat rack, a ladder,
// gears that turn, a tool wall, a typewriter. Every wall-mounted piece faces
// +z; rotate it with `rotY` for other walls.
import * as THREE from 'three';
import { toon } from './ink.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, stamp, mesh, box, cyl, boxGeo } from './kit.js';
import { spin } from './life.js';
import { swapModel } from './models.js';
import { roundTree } from './world.js';

const dark = toon('#3a3a3a');

// ---------- doodles for the pictures ----------
function doodle(kind) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = g.fillStyle = '#111111';
  g.lineWidth = 7;
  g.lineCap = g.lineJoin = 'round';
  const path = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const circle = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); };
  const draw = {
    mountains: () => { path([[20, 200], [90, 90], [130, 150], [175, 70], [240, 200]]); circle(195, 55, 22); path([[20, 225], [236, 225]]); },
    portrait: () => { g.beginPath(); g.ellipse(128, 105, 48, 58, 0, 0, 7); g.stroke(); path([[50, 240], [70, 180], [186, 180], [206, 240]]); circle(110, 100, 5); circle(146, 100, 5); path([[112, 132], [128, 140], [144, 132]]); },
    boat: () => { path([[50, 160], [206, 160], [180, 195], [76, 195], [50, 160]]); path([[128, 160], [128, 50]]); path([[128, 60], [190, 140], [128, 140]]); for (const y of [215, 235]) path([[20, y], [60, y - 8], [100, y], [140, y - 8], [180, y], [236, y - 8]]); },
    map: () => { g.lineWidth = 4; for (let i = 1; i < 4; i++) { path([[i * 64, 10], [i * 64, 246]]); path([[10, i * 64], [246, i * 64]]); } g.lineWidth = 7; g.setLineDash([10, 12]); path([[40, 210], [90, 150], [70, 90], [150, 70], [200, 110]]); g.setLineDash([]); path([[190, 100], [212, 122]]); path([[212, 100], [190, 122]]); },
    chart: () => { path([[40, 30], [40, 220], [230, 220]]); [[70, 150], [110, 120], [150, 90], [190, 50]].forEach(([x, y]) => g.strokeRect(x - 14, y, 28, 220 - y)); path([[56, 140], [110, 105], [150, 80], [205, 35]]); },
    blueprint: () => { g.lineWidth = 3; for (let i = 16; i < S; i += 32) { path([[i, 0], [i, S]]); path([[0, i], [S, i]]); } g.lineWidth = 7; path([[100, 220], [110, 80], [146, 80], [156, 220], [100, 220]]); g.strokeRect(104, 50, 48, 30); path([[96, 50], [128, 22], [160, 50]]); path([[160, 65], [236, 40]]); path([[160, 65], [236, 90]]); },
    cat: () => { g.beginPath(); g.ellipse(128, 170, 70, 45, 0, 0, 7); g.stroke(); circle(128, 105, 38); path([[98, 82], [92, 50], [116, 72]]); path([[158, 82], [164, 50], [140, 72]]); path([[196, 175], [235, 120]]); circle(116, 102, 4); circle(140, 102, 4); },
  };
  (draw[kind] || draw.mountains)();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.lineArt = true;
  return tex;
}

export function picture(p, x, y, z, w, h, rotY = 0, kind = 'mountains') {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, w + 0.16, h + 0.16, 0.06, M.planks, 0, 0, 0);
  mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', doodle(kind)), 0, 0, 0.035, g);
  return g;
}

// ---------- shelves, rugs, furniture ----------
export function wallShelf(p, x, y, z, w, rotY = 0, rand = Math.random) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, w, 0.06, 0.3, M.planks, 0, 0, 0.15);
  for (const s of [-1, 1]) box(g, 0.05, 0.2, 0.05, dark, s * (w / 2 - 0.15), -0.1, 0.05).rotation.x = 0.6;
  let sx = -w / 2 + 0.12;
  while (sx < w / 2 - 0.15) {
    const kind = Math.floor(rand() * 4);
    if (kind === 0) { cyl(g, 0.08, 0.08, 0.2, M.white, sx + 0.08, 0.13, 0.15, 10); cyl(g, 0.085, 0.085, 0.04, dark, sx + 0.08, 0.25, 0.15, 10); sx += 0.22; }
    else if (kind === 1) { for (let i = 0; i < 4; i++) box(g, 0.05, 0.2 + rand() * 0.06, 0.18, M.white, sx + i * 0.06, 0.13, 0.15); sx += 0.3; }
    else if (kind === 2) { cyl(g, 0.09, 0.07, 0.14, M.planks, sx + 0.09, 0.1, 0.15, 10); mesh(new THREE.IcosahedronGeometry(0.12, 0), M.white, sx + 0.09, 0.25, 0.15, g); sx += 0.26; }
    else { box(g, 0.2, 0.14, 0.18, M.white, sx + 0.1, 0.1, 0.15); sx += 0.26; }
  }
  return g;
}

export function rug(p, x, z, w, d, rotY = 0) {
  const r = box(p, w, 0.03, d, M.stripes, x, 0.015, z);
  r.rotation.y = rotY;
  r.castShadow = false;
  box(p, w + 0.14, 0.02, 0.1, M.white, x, 0.01, z - d / 2).rotation.y = rotY;
  return r;
}

export function coatRack(p, x, z) {
  cyl(p, 0.25, 0.3, 0.06, dark, x, 0.03, z, 12);
  cyl(p, 0.04, 0.04, 1.9, M.planks, x, 0.95, z, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    box(p, 0.25, 0.03, 0.03, dark, x + Math.cos(a) * 0.1, 1.75, z + Math.sin(a) * 0.1).rotation.set(0, -a, 0.4);
  }
  // a coat and a hat on the hooks
  box(p, 0.4, 0.75, 0.12, M.white, x + 0.17, 1.35, z).rotation.z = 0.08;
  mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 12), dark, x - 0.16, 1.92, z, p);
  mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 14), dark, x - 0.16, 1.86, z, p);
}

export function ladder(p, x, z, h = 3, rotY = 0, lean = 0.25) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.set(-lean, rotY, 0, 'YXZ');
  p.add(g);
  for (const s of [-0.22, 0.22]) box(g, 0.06, h, 0.06, M.planks, s, h / 2, 0);
  for (let y = 0.3; y < h; y += 0.32) box(g, 0.44, 0.04, 0.05, M.planks, 0, y, 0);
  return g;
}

export function gear(p, x, y, z, r, speed, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  const wheel = new THREE.Group();
  g.add(wheel);
  const disc = mesh(new THREE.CylinderGeometry(r, r, 0.08, 20), M.white, 0, 0, 0.06, wheel);
  disc.rotation.x = Math.PI / 2;
  const n = Math.round(r * 24);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const t = box(wheel, 0.09, 0.12, 0.08, M.white, Math.cos(a) * (r + 0.04), Math.sin(a) * (r + 0.04), 0.06);
    t.rotation.z = a;
  }
  const hub = mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.25, 0.12, 12), dark, 0, 0, 0.08, wheel);
  hub.rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) box(wheel, r * 1.6, 0.05, 0.04, M.white, 0, 0, 0.1).rotation.z = (i * Math.PI) / 3;
  spin(wheel, speed, 'z');
  return g;
}

export function pegboard(p, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 1.8, 1.1, 0.04, M.dirt, 0, 0, 0);
  // hammer, saw, wrench, ruler
  box(g, 0.05, 0.4, 0.04, M.planks, -0.6, -0.05, 0.05); box(g, 0.2, 0.08, 0.06, dark, -0.6, 0.17, 0.05);
  box(g, 0.45, 0.2, 0.02, M.white, -0.1, 0.1, 0.05); box(g, 0.12, 0.18, 0.05, M.planks, 0.17, 0.1, 0.05);
  const w = box(g, 0.05, 0.38, 0.03, dark, 0.45, -0.05, 0.05); w.rotation.z = 0.3;
  box(g, 0.6, 0.06, 0.02, M.white, 0.05, -0.38, 0.05);
  return g;
}

export function typewriter(p, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 0.42, 0.12, 0.32, dark, 0, 0.06, 0);
  box(g, 0.44, 0.06, 0.08, dark, 0, 0.16, -0.1);
  box(g, 0.28, 0.32, 0.01, M.white, 0, 0.3, -0.1).rotation.x = -0.15;
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) cyl(g, 0.018, 0.018, 0.02, M.white, -0.15 + k * 0.06, 0.13, 0.05 + r * 0.04, 6);
  return g;
}

export function sack(p, x, z, s = 1) {
  mesh(new THREE.SphereGeometry(0.28 * s, 10, 8).scale(1, 1.1, 1), M.white, x, 0.26 * s, z, p);
  cyl(p, 0.08 * s, 0.12 * s, 0.14 * s, M.white, x, 0.6 * s, z, 8);
  box(p, 0.16 * s, 0.03, 0.17 * s, stamp.finance, x, 0.52 * s, z);
}

// ---------- furniture shared by the rooms ----------
export function chair(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 0.5, 0.06, 0.5, M.planks, 0, 0.48, 0);
  box(g, 0.5, 0.6, 0.06, M.planks, 0, 0.8, -0.22);
  for (const lx of [-0.2, 0.2]) for (const lz of [-0.2, 0.2]) box(g, 0.05, 0.46, 0.05, M.white, lx, 0.23, lz);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'chair'));
}

export function desk(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 2.4, 0.1, 1.1, M.planks, 0, 0.8, 0);
  for (const sx of [-1.05, 1.05]) box(g, 0.25, 0.75, 1.0, M.planks, sx, 0.38, 0);
  box(g, 2.1, 0.6, 0.06, M.planks, 0, 0.45, -0.45);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'desk'));
  return g;
}

export function plant(p, x, z) {
  cyl(p, 0.3, 0.24, 0.5, M.planks, x, 0.25, z, 10);
  roundTree(p, x, z, 0.55);
}

// A shelf unit full of books, merged into one mesh so a room of them stays cheap.
export function bookshelf(p, x, z, rotY, rand) {
  const g = new THREE.Group();
  const w = 2.2, h = 3.0, d = 0.5;
  box(g, w, 0.08, d, M.planks, 0, h, 0);
  for (const sx of [-w / 2, w / 2]) box(g, 0.08, h, d, M.planks, sx, h / 2, 0);
  box(g, w, h, 0.04, M.planks, 0, h / 2, -d / 2);
  const books = [];
  for (let s = 0; s < 4; s++) {
    const y = 0.1 + s * 0.74;
    box(g, w, 0.05, d, M.planks, 0, y, 0);
    let bx = -w / 2 + 0.1;
    while (bx < w / 2 - 0.2) {
      const bw = 0.07 + rand() * 0.08, bh = 0.38 + rand() * 0.24;
      if (rand() > 0.12) books.push(boxGeo(bw, bh, 0.32).translate(bx + bw / 2, y + 0.03 + bh / 2, 0.04));
      bx += bw + 0.01;
    }
  }
  if (books.length) g.add(mesh(mergeGeometries(books), M.white));
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bookshelf'));
}

