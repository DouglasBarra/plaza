// Building details: windows with frames and shutters, panelled doors,
// hand-lettered signs, clock hands that tell the real time, roof ridges,
// chimneys, and the construction kit for the empty lots.
import * as THREE from 'three';
import { toon } from './ink.js';
import { M, stamp, mesh, box, cyl } from './kit.js';
import { makeFigure, poseFigure } from './folks.js';
import { registerPane, smoke } from './life.js';

const dark = toon('#3a3a3a');

// ---------- windows ----------
// opts: shutters, flowers ('white' or a district), curtains, books
export function fancyWindow(p, x, y, z, w, h, rotY = 0, o = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  const pane = box(g, w, h, 0.06, M.deep, 0, 0, 0);
  pane.castShadow = false;
  registerPane(pane);
  const t = 0.07, d = 0.12;
  box(g, w + t * 2, t, d, M.white, 0, h / 2 + t / 2, 0.03);
  box(g, w + t * 2, t, d, M.white, 0, -h / 2 - t / 2, 0.03);
  for (const s of [-1, 1]) box(g, t, h, d, M.white, s * (w / 2 + t / 2), 0, 0.03);
  if (o.curtains) for (const s of [-1, 1]) box(g, w * 0.3, h * 0.92, 0.02, M.white, s * (w / 2 - w * 0.15), 0.02, 0.035);
  if (o.books) {
    let bx = -w / 2 + 0.06;
    for (let i = 0; bx < w / 2 - 0.08; i++) {
      const bw = 0.05 + ((i * 7) % 5) * 0.012, bh = 0.18 + ((i * 3) % 4) * 0.04;
      box(g, bw, bh, 0.04, M.white, bx + bw / 2, -h / 2 + bh / 2 + 0.02, 0.035).rotation.z = i % 6 === 5 ? 0.25 : 0;
      bx += bw + 0.012;
    }
  }
  box(g, 0.035, h, 0.05, M.white, 0, 0, 0.045);
  box(g, w, 0.035, 0.05, M.white, 0, h * 0.08, 0.045);
  box(g, w + 0.3, 0.06, 0.22, M.white, 0, -h / 2 - t - 0.03, 0.1);
  if (o.shutters) for (const s of [-1, 1]) {
    const sh = box(g, w * 0.5, h + 0.1, 0.05, M.planks, s * (w / 2 + t + w * 0.25 + 0.02), 0, 0.06);
    sh.rotation.y = s * 0.12;
  }
  if (o.flowers) {
    box(g, w + 0.2, 0.2, 0.24, M.planks, 0, -h / 2 - t - 0.17, 0.17);
    const n = Math.max(3, Math.round(w / 0.13));
    for (let i = 0; i < n; i++) {
      const fx = -w / 2 + (i + 0.5) * (w / n);
      const mat = o.flowers !== 'white' && i % 2 ? stamp[o.flowers] : M.white;
      mesh(new THREE.SphereGeometry(0.07, 6, 5), mat, fx, -h / 2 - t + 0.0, 0.18, g);
    }
  }
  return g;
}

// ---------- doors ----------
// A panelled door standing on y; opts: step (adds a stone step), rotY
export function door(p, x, y, z, w, h, mat, o = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = o.rotY || 0;
  p.add(g);
  box(g, w, h, 0.08, mat, 0, h / 2, 0);
  for (const s of [-1, 1]) {
    box(g, w * 0.34, h * 0.36, 0.03, mat, s * w * 0.22, h * 0.7, 0.05);
    box(g, w * 0.34, h * 0.3, 0.03, mat, s * w * 0.22, h * 0.27, 0.05);
  }
  box(g, w + 0.2, 0.1, 0.14, M.white, 0, h + 0.05, 0.03);
  for (const s of [-1, 1]) box(g, 0.1, h, 0.14, M.white, s * (w / 2 + 0.05), h / 2, 0.03);
  mesh(new THREE.SphereGeometry(0.045, 8, 6), dark, w * 0.32, h * 0.48, 0.09, g);
  if (o.step) box(g, w + 0.5, 0.12, 0.45, M.stone, 0, 0.06, 0.26);
  return g;
}

// ---------- hand-lettered signs ----------
// Text is drawn on a canvas in the Plaza display face. Like the other
// line-art textures it is painted in the current ink color, so signs turn
// to chalk at night.
function signTexture(text, wpx = 512, hpx = 160) {
  const c = document.createElement('canvas');
  c.width = wpx; c.height = hpx;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.lineArt = true;
  const draw = () => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, wpx, hpx);
    g.strokeStyle = g.fillStyle = '#111111';
    g.lineWidth = 8;
    g.strokeRect(14, 14, wpx - 28, hpx - 28);
    let size = hpx * 0.56;
    g.font = `${size}px "Patrick Hand SC", "Comic Neue", sans-serif`;
    while (g.measureText(text).width > wpx - 70 && size > 20) { size -= 4; g.font = `${size}px "Patrick Hand SC", "Comic Neue", sans-serif`; }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, wpx / 2, hpx / 2 + size * 0.06);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load(`64px "Patrick Hand SC"`).then(draw).catch(() => {});
  return tex;
}

// A board with text on its front (+z). Returns the board mesh.
export function signBoard(p, x, y, z, w, h, text, rotY = 0) {
  const front = toon('#ffffff', signTexture(text, 512, Math.round(512 * (h / w))));
  const b = mesh(new THREE.BoxGeometry(w, h, 0.07), [M.white, M.white, M.white, M.white, front, M.white], x, y, z, p);
  b.rotation.y = rotY;
  return b;
}

// A sign hanging from a bracket, parallel to the wall, with a stamp dot.
export function hangingSign(p, x, y, z, text, district, w = 1.4) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  box(g, w + 0.2, 0.06, 0.06, dark, 0, 0.42, 0.02);
  for (const s of [-1, 1]) cyl(g, 0.012, 0.012, 0.22, dark, s * w * 0.4, 0.3, 0.02, 3);
  signBoard(g, 0, 0, 0.02, w, 0.4, text);
  if (district) box(g, 0.12, 0.12, 0.03, stamp[district], -w / 2 + 0.16, 0, 0.07);
  return g;
}

// ---------- clocks ----------
const clocks = [];
// Hands at (x, y, z) on a face of radius r facing +z (rotate the parent for other faces).
export function clockHands(p, x, y, z, r) {
  const mk = (len, wid) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    box(pivot, wid, len, 0.03, dark, 0, len / 2 - wid, 0);
    mesh(new THREE.CylinderGeometry(wid * 0.9, wid * 0.9, 0.035, 10), dark, 0, 0, 0, pivot).rotation.x = Math.PI / 2; // hub
    p.add(pivot);
    return pivot;
  };
  // slim hands, in proportion to the face: the hour hand shorter and a little broader
  const hour = mk(r * 0.52, Math.max(0.028, r * 0.085)), minute = mk(r * 0.82, Math.max(0.02, r * 0.055));
  minute.position.z += 0.02;
  clocks.push({ hour, minute });
}
export function updateClocks() {
  const now = new Date();
  const m = now.getMinutes() + now.getSeconds() / 60;
  const h = (now.getHours() % 12) + m / 60;
  for (const c of clocks) {
    c.minute.rotation.z = -(m / 60) * Math.PI * 2;
    c.hour.rotation.z = -(h / 12) * Math.PI * 2;
  }
}

// ---------- roofs ----------
export function ridge(p, x, y, z, len, rotY = 0) {
  const r = box(p, 0.14, 0.14, len, M.white, x, y, z);
  r.rotation.y = rotY;
  return r;
}
export function chimney(p, x, y, z, w = 0.5, h = 1.3) {
  box(p, w, h, w, M.bricks, x, y, z);
  box(p, w + 0.14, 0.1, w + 0.14, M.white, x, y + h / 2 + 0.05, z);
  cyl(p, w * 0.22, w * 0.22, 0.2, M.white, x, y + h / 2 + 0.2, z, 8);
  smoke(p, x, y + h / 2 + 0.35, z);
}

// ---------- statue: a folk in white stone ----------
export function statue(p, x, y, z, rotY = 0) {
  box(p, 0.8, 0.9, 0.8, M.stone, x, y + 0.45, z);
  box(p, 0.95, 0.1, 0.95, M.white, x, y + 0.95, z);
  const fig = makeFigure({ hat: 'top', item: 'paper', height: 1.15 });
  poseFigure(fig, 'wave', 0);
  fig.position.set(x, y + 1.0, z);
  fig.rotation.y = rotY;
  p.add(fig);
}

// ---------- construction ----------
export function scaffold(p, x, y, z, w, d, levels = 2, lh = 1.5) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const H = levels * lh + 0.9;
  for (const sx of [-w / 2, 0, w / 2]) for (const sz of [-d / 2, d / 2]) cyl(g, 0.04, 0.04, H, M.white, sx, H / 2, sz, 5);
  for (let l = 1; l <= levels; l++) {
    box(g, w + 0.2, 0.06, d, M.planks, 0, l * lh, 0);
    box(g, w, 0.05, 0.05, M.white, 0, l * lh + 0.9, d / 2);
    const br = box(g, Math.hypot(w / 2, lh), 0.05, 0.05, M.white, -w / 4, (l - 0.5) * lh, d / 2 + 0.03);
    br.rotation.z = Math.atan2(lh, w / 2) * (l % 2 ? 1 : -1);
  }
  // a ladder
  for (const s of [-0.18, 0.18]) cyl(g, 0.025, 0.025, lh + 0.4, M.white, w / 2 - 0.4 + s, (lh + 0.4) / 2, -d / 2 - 0.15, 4);
  for (let r = 0.3; r < lh; r += 0.3) box(g, 0.36, 0.03, 0.03, M.white, w / 2 - 0.4, r, -d / 2 - 0.15);
  return g;
}

const cranes = [];
export function crane(p, x, y, z, height = 8, jib = 6) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const s = 0.5;
  for (const cx of [-s / 2, s / 2]) for (const cz of [-s / 2, s / 2]) box(g, 0.07, height, 0.07, M.white, cx, height / 2, cz);
  for (let h = 0.6; h < height; h += 0.9) {
    for (const [rx, rz, ry] of [[0, s / 2, 0], [0, -s / 2, 0], [s / 2, 0, Math.PI / 2], [-s / 2, 0, Math.PI / 2]]) {
      const b = box(g, s * 1.35, 0.04, 0.04, M.white, rx, h + 0.4, rz);
      b.rotation.set(0, ry, (h * 10) % 2 > 1 ? 0.6 : -0.6);
    }
  }
  const top = new THREE.Group();
  top.name = 'craneTop';
  top.position.y = height;
  g.add(top);
  box(top, 0.8, 0.7, 0.7, M.white, 0, 0.35, 0);              // cab
  box(top, 0.4, 0.3, 0.05, M.deep, 0, 0.45, 0.36).castShadow = false;
  box(top, jib, 0.22, 0.3, M.white, jib / 2, 0.8, 0);        // jib
  box(top, 2, 0.22, 0.3, M.white, -1, 0.8, 0);              // counter-jib
  box(top, 0.7, 0.6, 0.6, M.stone, -1.7, 0.5, 0);           // counterweight
  cyl(top, 0.03, 0.03, 1.6, M.white, 0, 1.6, 0, 4);          // tower top
  const cable = cyl(top, 0.015, 0.015, 3, dark, jib * 0.75, -0.7, 0, 3);
  cable.castShadow = false;
  box(top, 0.2, 0.25, 0.2, dark, jib * 0.75, -2.3, 0);       // hook
  cranes.push(top);
  return g;
}
export function animateCranes(time) {
  for (const [i, t] of cranes.entries()) t.rotation.y = Math.sin(time * 0.08 + i) * 1.2;
}

export function billboard(p, x, y, z, text, district, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  for (const s of [-0.9, 0.9]) box(g, 0.12, 2.2, 0.12, M.white, s, 1.1, 0);
  box(g, 2.5, 1.0, 0.1, stamp[district], 0, 1.75, -0.02);
  signBoard(g, 0, 1.75, 0.05, 2.3, 0.82, text);
  return g;
}
