// Things in the town hall that show your tasks: cork boards whose notes are
// real tasks, the calendar, and the paper-ball jar of finished ones.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, mesh, box, cyl } from '../../kit.js';
import { tex } from '../../textures.js';
import { signBoard } from '../../details.js';
import { skipND } from '../../life.js';
import { alertPin } from './materials.js';

// ---------- notes ----------
const noteGeo = new THREE.BoxGeometry(0.56, 0.64, 0.02);
const pinGeo = new THREE.SphereGeometry(0.05, 10, 8);
// a darker cork, so the white notes stand out from across the room
const cork = toon('#bdbdb7', tex.dirt());

function wrap(g, text, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function noteTexture(title, footer) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 292;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.lineArt = true;
  const draw = () => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 292);
    g.fillStyle = '#111111';
    g.font = '48px "Patrick Hand", "Comic Neue", sans-serif';
    let lines = wrap(g, title, 224);
    if (lines.length > 4) { lines = lines.slice(0, 4); lines[3] = `${lines[3].slice(0, -1)}…`; }
    lines.forEach((l, i) => g.fillText(l, 16, 62 + i * 46));
    g.font = '32px "Patrick Hand SC", "Comic Neue", sans-serif';
    g.fillText(footer, 16, 274);
    g.fillRect(16, 240, 224, 4);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load('48px "Patrick Hand"').then(draw).catch(() => {});
  return tex;
}

// A cork board whose notes are real tasks. `slots` is how many fit.
export function taskBoard(p, x, y, z, w, h, cols, rows, pin) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  box(g, w + 0.24, h + 0.24, 0.1, M.planks, 0, 0, 0);
  box(g, w, h, 0.12, cork, 0, 0, 0.02);
  const layer = new THREE.Group();
  g.add(layer);
  const slots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    slots.push([-w / 2 + (c + 0.5) * (w / cols), h / 2 - (r + 0.5) * (h / rows)]);
  }
  let shown = new Set();
  const pops = [];
  return {
    group: g,
    notes: layer,
    pops,
    set(tasks, label) {
      for (const n of [...layer.children]) { n.traverse((o) => o.material?.[4]?.map?.dispose?.()); layer.remove(n); }
      const fits = slots.length;
      const list = tasks.length > fits ? tasks.slice(0, fits - 1) : tasks;
      const next = new Set();
      list.forEach((t, i) => {
        const [nx, ny] = slots[i];
        const late = t.late;
        const footer = label(t);
        const n = new THREE.Group();
        n.position.set(nx + Math.sin(i * 7.3) * 0.05, ny + Math.cos(i * 3.1) * 0.04, 0.1);
        n.rotation.z = (late ? 0.16 : 0.05) * Math.sin(i * 12.9 + 1);
        const front = toon('#ffffff', noteTexture(t.title, footer));
        mesh(noteGeo, [M.white, M.white, M.white, M.white, front, M.white], 0, 0, 0, n);
        mesh(pinGeo, late ? alertPin : pin, 0, 0.27, 0.03, n);
        if (late) {
          // the corner curls up
          const curl = box(n, 0.16, 0.16, 0.02, M.white, 0.22, -0.26, 0.04);
          curl.rotation.set(-0.7, 0.4, 0.78);
        }
        n.traverse((o) => { o.userData.task = t; });
        n.userData.task = t;
        layer.add(n);
        next.add(t.id);
        if (shown.size && !shown.has(t.id)) { n.scale.setScalar(0.2); pops.push({ n, t0: performance.now() }); }
      });
      if (tasks.length > list.length) {
        const [nx, ny] = slots[fits - 1];
        const more = signBoard(layer, nx, ny, 0.1, 0.56, 0.36, `+${tasks.length - list.length} more`);
        more.userData.more = true;
      }
      shown = next;
    },
  };
}

// ---------- the calendar ----------
export function calendarTexture() {
  const c = document.createElement('canvas');
  c.width = 560; c.height = 480;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.lineArt = true;
  tex.userData.draw = (dueDays) => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 560, 480);
    g.fillStyle = g.strokeStyle = '#111111';
    g.lineWidth = 4;
    g.font = '52px "Patrick Hand SC", "Comic Neue", sans-serif';
    g.textAlign = 'center';
    g.fillText(now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), 280, 60);
    g.font = '24px "Patrick Hand SC", "Comic Neue", sans-serif';
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d, i) => g.fillText(d, 50 + i * 76, 100));
    g.font = '28px "Patrick Hand", "Comic Neue", sans-serif';
    for (let d = 1; d <= days; d++) {
      const idx = first + d - 1, cx = 50 + (idx % 7) * 76, cy = 140 + Math.floor(idx / 7) * 62;
      g.strokeRect(cx - 34, cy - 30, 68, 56);
      g.fillText(String(d), cx, cy + 4);
      const due = dueDays.get(d) || 0;
      for (let k = 0; k < Math.min(due, 3); k++) { g.beginPath(); g.arc(cx - 12 + k * 12, cy + 16, 4, 0, 7); g.fill(); }
      if (d === now.getDate()) { g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy - 2, 32, 26, 0, 0, 7); g.stroke(); g.lineWidth = 4; }
    }
    tex.needsUpdate = true;
  };
  return tex;
}

// ---------- the paper-ball jar ----------
export const ballGeo = new THREE.IcosahedronGeometry(0.05, 0);
const glassMat = new THREE.MeshBasicMaterial({ color: '#dfe8ee', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
export function jar(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const R = 0.2, H = 0.46;
  cyl(g, R + 0.02, R + 0.02, 0.04, M.stone, 0, 0.02, 0, 18);                                    // heavy base
  const glass = mesh(new THREE.CylinderGeometry(R, R, H, 20, 1, true), glassMat, 0, 0.04 + H / 2, 0, g); // the glass walls
  glass.castShadow = false;
  glass.userData.inkSkip = true;
  skipND.push(glass);
  for (const ry of [0.04, 0.04 + H]) mesh(new THREE.TorusGeometry(R, 0.012, 5, 24), M.white, 0, ry, 0, g).rotation.x = Math.PI / 2; // base and rim, so you see its shape
  for (const a of [0.3, 2.2, 4.1]) box(g, 0.01, H * 0.8, 0.012, M.white, Math.cos(a) * R, 0.04 + H / 2, Math.sin(a) * R); // glints
  cyl(g, R + 0.015, R + 0.015, 0.05, M.planks, 0, 0.04 + H + 0.03, 0, 18);                       // cork lid
  cyl(g, 0.03, 0.03, 0.05, M.planks, 0, 0.04 + H + 0.08, 0, 8);                                  // its knob
  const balls = new THREE.Group();
  g.add(balls);
  return {
    set(n) {
      balls.clear();
      const k = Math.min(n, 60);
      for (let i = 0; i < k; i++) {
        const layer = Math.floor(i / 9), a = (i % 9) / 9 * Math.PI * 2 + layer * 0.7;
        const r = layer % 2 ? 0.07 : 0.13;
        const b = mesh(ballGeo, M.white, Math.cos(a) * r, 0.1 + layer * 0.075, Math.sin(a) * r, balls);
        b.rotation.set(i, i * 2, 0);
        b.castShadow = false;
      }
    },
  };
}
