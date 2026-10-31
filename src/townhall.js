// The town hall, inside: the ToDos district as a two-story building.
//
// Ground floor (Today): the task board, where each note is one of today's
// tasks; the clerk's desk with the typewriter for adding tasks; a fireplace
// that burns brighter as you clear the day; the paper-ball jar and streak
// plaque on the mantel.
// Upstairs (Upcoming and Done): the planning wall with a calendar and the
// notes for later, and the archive where finished tasks are filed.
//
// Walls have real openings, so sunlight falls through the windows onto the
// floor and moves with the real time of day. Panes show the real plaza in
// first person (main.js renders it); in third person the walls facing the
// camera, the upper floor (while you're downstairs) and the ceilings are cut
// away, using render layers so they still cast shadows.
import * as THREE from 'three';
import { toon } from './ink.js';
import { M, stamp, mesh, box, cyl } from './kit.js';
import { tex } from './textures.js';
import { folk } from './folks.js';
import { clockHands, signBoard } from './details.js';
import { steam, swingSign, isNight } from './life.js';
import { picture, wallShelf, rug, coatRack, typewriter, chair, desk, plant, bookshelf } from './decor.js';
import { DISTRICTS } from './districts/index.js';

export const W = 12, D = 10, T = 0.3, F = 4.4, TOP = 8.6;
export const LAYER_CEILING = 1, LAYER_UPPER = 2;

const todos = () => DISTRICTS.todo.api;
const dark = toon('#3a3a3a');
const alertPin = toon('#c8202b');
const flameA = new THREE.MeshBasicMaterial({ color: '#ff6a13' });
const flameB = new THREE.MeshBasicMaterial({ color: '#ffd21f' });
const lampOn = new THREE.MeshBasicMaterial({ color: '#fff1b8' });
export const glassDay = new THREE.MeshBasicMaterial({ color: '#eef1ee' });
export const glassNight = new THREE.MeshBasicMaterial({ color: '#2a2d33' });

const onLayer = (o, layer) => { o.traverse((c) => c.layers.set(layer)); return o; };

// ---------- walls with real openings ----------
// A wall along `axis` ('x' runs left-right at z = at, 'z' runs front-back at
// x = at) from `from` to `to`, between heights y0 and y1, with rectangular
// holes { c (center along the wall), y (center height), w, h }.
function wall(p, axis, at, from, to, y0, y1, holes, mat) {
  const parts = [];
  const seg = (a, b, lo, hi) => {
    if (b - a < 0.01 || hi - lo < 0.01) return;
    const c = (a + b) / 2, len = b - a, y = (lo + hi) / 2, h = hi - lo;
    parts.push(axis === 'x' ? box(p, len, h, T, mat, c, y, at) : box(p, T, h, len, mat, at, y, c));
  };
  let cursor = from;
  for (const hole of [...holes].sort((a, b) => a.c - b.c)) {
    const a = hole.c - hole.w / 2, b = hole.c + hole.w / 2;
    seg(cursor, a, y0, y1);
    seg(a, b, y0, Math.max(y0, hole.y - hole.h / 2));
    seg(a, b, Math.min(y1, hole.y + hole.h / 2), y1);
    cursor = b;
  }
  seg(cursor, to, y0, y1);
  return parts;
}

// Frame, cross bars and sill on the inside of a hole, plus a pane that shows
// either glass or (first person) the real plaza. `inward` is the room-facing
// normal of the wall: '+z' | '-z' | '+x' | '-x'.
function windowIn(p, axis, at, hole, inward, panes, door = false) {
  const g = new THREE.Group();
  const s = inward[0] === '+' ? 1 : -1;
  const rotY = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[inward];
  if (axis === 'x') g.position.set(hole.c, hole.y, at); else g.position.set(at, hole.y, hole.c);
  g.rotation.y = rotY;
  p.add(g);
  const f = T / 2 + 0.03, t = 0.08;
  box(g, hole.w + t * 2, t, 0.1, M.white, 0, hole.h / 2 + t / 2, f);
  if (!door) box(g, hole.w + t * 2, t, 0.1, M.white, 0, -hole.h / 2 - t / 2, f);
  for (const k of [-1, 1]) box(g, t, hole.h, 0.1, M.white, k * (hole.w / 2 + t / 2), 0, f);
  const pane = mesh(new THREE.PlaneGeometry(hole.w, hole.h), glassDay, 0, 0, 0, g);
  pane.castShadow = false;
  pane.userData.door = door;
  panes.push(pane);
  if (!door) {
    box(g, 0.04, hole.h, 0.04, M.white, 0, 0, f - 0.02).castShadow = false;
    box(g, hole.w, 0.04, 0.04, M.white, 0, hole.h * 0.1, f - 0.02).castShadow = false;
    box(g, hole.w + 0.34, 0.06, 0.28, M.white, 0, -hole.h / 2 - 0.1, f + 0.08);
  }
  return g;
}

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
function taskBoard(p, x, y, z, w, h, cols, rows, pin) {
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
function calendarTexture() {
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
const ballGeo = new THREE.IcosahedronGeometry(0.045, 0);
function jar(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  cyl(g, 0.2, 0.2, 0.03, M.white, 0, 0.015, 0, 16);
  for (const ry of [0.42, 0.44]) mesh(new THREE.TorusGeometry(0.2, 0.012, 4, 24), M.white, 0, ry, 0, g).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    box(g, 0.012, 0.42, 0.012, M.white, Math.cos(a) * 0.2, 0.22, Math.sin(a) * 0.2);
  }
  cyl(g, 0.22, 0.22, 0.04, M.planks, 0.02, 0.5, 0, 16).rotation.z = 0.25;
  const balls = new THREE.Group();
  g.add(balls);
  return {
    set(n) {
      balls.clear();
      const k = Math.min(n, 48);
      for (let i = 0; i < k; i++) {
        const layer = Math.floor(i / 8), a = (i % 8) / 8 * Math.PI * 2 + layer;
        const r = 0.12 * ((i * 37) % 10) / 10;
        const b = mesh(ballGeo, M.white, Math.cos(a) * r, 0.06 + layer * 0.07, Math.sin(a) * r, balls);
        b.rotation.set(i, i * 2, 0);
        b.castShadow = false;
      }
    },
  };
}

// ---------- the fireplace ----------
function fireplace(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.PI / 2; // faces +x, into the room
  p.add(g);
  box(g, 2.4, 1.3, 0.6, M.bricks, 0, 0.65, 0);          // surround
  box(g, 1.2, 0.9, 0.62, M.deep, 0, 0.45, 0.01).castShadow = false; // firebox
  box(g, 2.7, 0.12, 0.8, M.planks, 0, 1.36, 0.08);       // mantel
  box(g, 1.6, 2.9, 0.5, M.bricks, 0, 2.9, -0.05);        // chimney breast
  box(g, 2.6, 0.06, 0.9, M.stone, 0, 0.03, 0.55);        // hearth
  for (const [lx, r] of [[-0.25, 0.1], [0.2, -0.15]]) { const log = cyl(g, 0.08, 0.08, 0.7, M.planks, lx * 0.3, 0.12, 0.05, 8); log.rotation.set(0, r, Math.PI / 2); }
  const flames = [];
  for (const [fx, fh, mat] of [[-0.2, 0.42, flameA], [0.05, 0.6, flameA], [0.28, 0.38, flameA], [0, 0.34, flameB], [-0.12, 0.24, flameB]]) {
    const f = mesh(new THREE.ConeGeometry(0.12, 1, 6), mat, fx, 0.2, 0.08, g);
    f.castShadow = false;
    f.userData = { h: fh, x: fx };
    flames.push(f);
  }
  // firewood stack and tools
  for (let i = 0; i < 5; i++) cyl(g, 0.07, 0.07, 0.5, M.planks, 1.55, 0.08 + Math.floor(i / 3) * 0.14, -0.1 + (i % 3) * 0.15 + (i > 2 ? 0.07 : 0), 7).rotation.x = Math.PI / 2;
  cyl(g, 0.015, 0.015, 0.9, dark, -1.45, 0.45, 0.25, 4).rotation.z = 0.15;
  const light = new THREE.PointLight('#ffb070', 0, 7, 1.5);
  light.position.set(0, 0.6, 0.7);
  g.add(light);
  return { group: g, flames, light };
}

// ---------- lamps ----------
function pendant(p, x, y, z, ceiling) {
  const g = new THREE.Group();
  g.position.set(x, ceiling, z);
  p.add(g);
  const len = ceiling - y;
  cyl(g, 0.012, 0.012, len, dark, 0, -len / 2, 0, 4).castShadow = false;
  const shade = mesh(new THREE.ConeGeometry(0.32, 0.26, 14, 1, true), M.white, 0, -len, 0, g);
  shade.material = M.white;
  shade.castShadow = false;
  const bulb = mesh(new THREE.SphereGeometry(0.08, 8, 6), M.white, 0, -len - 0.08, 0, g);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe6b0', 0, 9, 1.4);
  light.position.set(0, -len - 0.2, 0);
  g.add(light);
  return { shade, bulb, light };
}

function chandelier(p, x, y, z, ceiling) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  cyl(g, 0.015, 0.015, ceiling - y, dark, 0, (ceiling - y) / 2, 0, 4).castShadow = false;
  mesh(new THREE.TorusGeometry(0.6, 0.03, 6, 24), dark, 0, 0, 0, g).rotation.x = Math.PI / 2;
  const bulbs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cyl(g, 0.04, 0.03, 0.12, M.white, Math.cos(a) * 0.6, 0.07, Math.sin(a) * 0.6, 6);
    const b = mesh(new THREE.SphereGeometry(0.05, 6, 5), M.white, Math.cos(a) * 0.6, 0.18, Math.sin(a) * 0.6, g);
    b.castShadow = false;
    bulbs.push(b);
  }
  const light = new THREE.PointLight('#ffe6b0', 0, 12, 1.2);
  light.position.y = -0.2;
  g.add(light);
  return { bulbs, light };
}

// ---------- stairs ----------
const STAIR = { x0: 4.35, x1: 5.85, zBottom: 2.0, zTop: -3.0 };
const inStair = (x, z) => x > STAIR.x0 && x < STAIR.x1 && z < STAIR.zBottom + 0.3 && z > STAIR.zTop - 0.05;
const stairHeight = (z) => THREE.MathUtils.clamp((STAIR.zBottom - z) / (STAIR.zBottom - STAIR.zTop), 0, 1) * F;

function stairs(p) {
  const n = 16, run = (STAIR.zBottom - STAIR.zTop) / n, rise = F / n;
  const w = STAIR.x1 - STAIR.x0, cx = (STAIR.x0 + STAIR.x1) / 2;
  for (let i = 0; i < n; i++) {
    const z = STAIR.zBottom - (i + 0.5) * run;
    box(p, w, rise * (i + 1), run, M.planks, cx, (rise * (i + 1)) / 2, z);
    box(p, w + 0.04, 0.04, run + 0.02, M.white, cx, rise * (i + 1) + 0.02, z);
  }
  // the banister on the open side, rising with the steps
  const len = Math.hypot(STAIR.zBottom - STAIR.zTop, F);
  const rail = box(p, 0.08, 0.08, len, M.planks, STAIR.x0 + 0.05, F / 2 + 0.95, (STAIR.zBottom + STAIR.zTop) / 2);
  rail.rotation.x = Math.atan2(F, STAIR.zBottom - STAIR.zTop);
  for (let i = 0; i <= n; i += 2) {
    const z = STAIR.zBottom - i * run;
    box(p, 0.04, 0.95, 0.04, M.white, STAIR.x0 + 0.05, rise * i + 0.47, z);
  }
  box(p, 0.14, 1.1, 0.14, M.planks, STAIR.x0 + 0.05, 0.55, STAIR.zBottom);
}

// ---------- building the house ----------
export function buildTownHall(scene, rand, lights) {
  const panes = [];
  const lower = new THREE.Group();   // the ground floor (layer 0)
  const upper = new THREE.Group();   // everything at or above the upper floor (layer 2)
  const ceilings = new THREE.Group(); // hidden in third person, still casts shadows (layer 1)
  const cutLower = new THREE.Group(), cutUpper = new THREE.Group(); // walls facing the third-person camera
  scene.add(lower, upper, ceilings, cutLower, cutUpper);

  // ---- shell: floor, walls with openings, upper floor, roof
  box(lower, W + T * 2, 0.3, D + T * 2, M.floor, 0, -0.15, 0);
  const backHoles = [{ c: -4.4, y: 2.2, w: 1.3, h: 1.7 }];
  const leftHoles = [{ c: -3.3, y: 2.2, w: 1.3, h: 1.7 }, { c: 3.4, y: 2.2, w: 1.3, h: 1.7 }];
  const rightHoles = [{ c: 3.3, y: 2.2, w: 1.3, h: 1.7 }];
  const frontHoles = [{ c: -3.4, y: 2.2, w: 1.3, h: 1.7 }, { c: 0, y: 1.3, w: 2.0, h: 2.6 }, { c: 3.4, y: 2.2, w: 1.3, h: 1.7 }];
  const bz = -D / 2 - T / 2, fz = D / 2 + T / 2, lx = -W / 2 - T / 2, rx = W / 2 + T / 2;
  wall(lower, 'x', bz, -W / 2 - T, W / 2 + T, 0, F, backHoles, M.bricks);
  wall(lower, 'z', lx, -D / 2, D / 2, 0, F, leftHoles, M.bricks);
  wall(cutLower, 'z', rx, -D / 2, D / 2, 0, F, rightHoles, M.bricks);
  wall(cutLower, 'x', fz, -W / 2 - T, W / 2 + T, 0, F, frontHoles, M.bricks);
  backHoles.forEach((h) => windowIn(lower, 'x', bz, h, '+z', panes));
  leftHoles.forEach((h) => windowIn(lower, 'z', lx, h, '+x', panes));
  rightHoles.forEach((h) => windowIn(cutLower, 'z', rx, h, '-x', panes));
  frontHoles.forEach((h) => windowIn(cutLower, 'x', fz, h, '-z', panes, h.w === 2.0));
  // the door frame and mat stay visible in the cutaway, so you can find the way out
  for (const x of [-1.08, 1.08]) box(lower, 0.16, 2.6, 0.4, M.white, x, 1.3, fz);
  box(lower, 2.32, 0.16, 0.4, M.white, 0, 2.6, fz);
  box(lower, 1.8, 0.04, 1.0, M.dirt, 0, 0.02, D / 2 - 0.7);

  // upper floor: a slab with the stairwell left open
  const slab = (x0, x1, z0, z1) => box(upper, x1 - x0, 0.3, z1 - z0, M.floor, (x0 + x1) / 2, F - 0.15, (z0 + z1) / 2);
  slab(-W / 2, STAIR.x0, -D / 2, D / 2);
  slab(STAIR.x0, W / 2, -D / 2, STAIR.zTop);
  slab(STAIR.x0, W / 2, STAIR.zBottom, D / 2);
  // ceiling beams under the upper floor (hidden in third person so they don't block the view)
  for (const z of [-3.6, -1.2, 1.2, 3.6]) {
    const reach = z > STAIR.zTop && z < STAIR.zBottom ? STAIR.x0 : W / 2;
    box(ceilings, reach + W / 2, 0.26, 0.24, M.planks, (reach - W / 2) / 2, F - 0.43, z); // seen in first person
  }
  const upBack = [{ c: 5.1, y: F + 2.0, w: 1.1, h: 1.5 }];
  const upLeft = [{ c: 3.4, y: F + 2.0, w: 1.3, h: 1.6 }];
  const upRight = [{ c: 0.5, y: F + 2.0, w: 1.3, h: 1.6 }];
  const upFront = [{ c: -3.4, y: F + 2.0, w: 1.3, h: 1.6 }, { c: 3.4, y: F + 2.0, w: 1.3, h: 1.6 }];
  wall(upper, 'x', bz, -W / 2 - T, W / 2 + T, F, TOP, upBack, M.bricks);
  wall(upper, 'z', lx, -D / 2, D / 2, F, TOP, upLeft, M.bricks);
  wall(cutUpper, 'z', rx, -D / 2, D / 2, F, TOP, upRight, M.bricks);
  wall(cutUpper, 'x', fz, -W / 2 - T, W / 2 + T, F, TOP, upFront, M.bricks);
  upBack.forEach((h) => windowIn(upper, 'x', bz, h, '+z', panes));
  upLeft.forEach((h) => windowIn(upper, 'z', lx, h, '+x', panes));
  upRight.forEach((h) => windowIn(cutUpper, 'z', rx, h, '-x', panes));
  upFront.forEach((h) => windowIn(cutUpper, 'x', fz, h, '-z', panes));
  // the railing around the stairwell upstairs
  box(upper, 0.08, 0.08, STAIR.zBottom - STAIR.zTop, M.planks, STAIR.x0 - 0.05, F + 1.0, (STAIR.zBottom + STAIR.zTop) / 2);
  box(upper, W / 2 - STAIR.x0, 0.08, 0.08, M.planks, (STAIR.x0 + W / 2) / 2, F + 1.0, STAIR.zBottom + 0.05);
  for (let z = STAIR.zTop + 0.4; z < STAIR.zBottom; z += 0.5) box(upper, 0.04, 1.0, 0.04, M.white, STAIR.x0 - 0.05, F + 0.5, z);
  for (let x = STAIR.x0 + 0.4; x < W / 2; x += 0.5) box(upper, 0.04, 1.0, 0.04, M.white, x, F + 0.5, STAIR.zBottom + 0.05);
  // roof: beams and a skylight (hidden in third person)
  box(ceilings, W + T * 2, 0.2, D + T * 2, M.white, 0, TOP + 0.1, 0);
  for (const x of [-4, 0, 4]) box(ceilings, 0.24, 0.3, D, M.planks, x, TOP - 0.15, 0);

  stairs(lower);

  // ---------- ground floor: Today ----------
  const board = taskBoard(lower, -0.5, 2.25, -D / 2 + 0.1, 5.0, 2.3, 5, 2, stamp.todo);
  signBoard(lower, -0.5, 3.75, -D / 2 + 0.14, 1.6, 0.36, 'Today');
  // wastebasket by the board
  const binPos = new THREE.Vector3(2.75, 0, -4.35);
  cyl(lower, 0.28, 0.22, 0.55, M.planks, binPos.x, 0.275, binPos.z, 14);
  mesh(new THREE.TorusGeometry(0.28, 0.025, 4, 20), M.white, binPos.x, 0.55, binPos.z, lower).rotation.x = Math.PI / 2;
  const binBalls = new THREE.Group();
  lower.add(binBalls);

  // the clerk's desk, facing the door
  desk(lower, 2.2, 0.6, Math.PI);
  chair(lower, 2.2, -0.35, 0);
  const clerk = folk(lower, 2.2, -0.35, 0, { pose: 'type', seat: 0.48, look: { hat: 'bowler', glasses: true, scarf: true } });
  typewriter(lower, 2.2, 0.85, 0.45, Math.PI);
  cyl(lower, 0.06, 0.05, 0.12, M.white, 1.3, 0.91, 0.75, 10);
  steam(lower, 1.3, 0.99, 0.75);
  for (let i = 0; i < 4; i++) box(lower, 0.32, 0.015, 0.42, M.white, 3.0, 0.86 + i * 0.016, 0.7).rotation.y = i * 0.12;
  cyl(lower, 0.03, 0.03, 0.4, dark, 3.05, 1.0, 0.25, 6).rotation.z = 1.3; // a pen
  box(lower, 0.5, 0.2, 0.36, M.planks, 1.35, 0.95, 0.35);                  // in-tray
  signBoard(lower, 2.2, 0.5, 1.1, 1.0, 0.24, 'Clerk');

  // fireplace on the left wall, with armchairs around it
  const fire = fireplace(lower, -W / 2 + 0.32, 0.1);
  const progressJar = jar(lower, -W / 2 + 0.45, 1.42, -0.7);
  let plaque = null;
  const setPlaque = (n) => {
    if (plaque) lower.remove(plaque);
    plaque = signBoard(lower, -W / 2 + 0.36, 1.66, 0.8, 0.9, 0.28, n === 1 ? 'Streak: 1 day' : `Streak: ${n} days`, Math.PI / 2);
  };
  for (const zz of [-0.15, 1.3]) cyl(lower, 0.04, 0.05, 0.22, M.white, -W / 2 + 0.45, 1.53, zz, 8); // candles
  picture(lower, -W / 2 + 0.6, 2.9, 0.1, 1.0, 1.1, Math.PI / 2, 'portrait');
  for (const [z, r] of [[-1.4, -Math.PI / 2 - 0.4], [1.6, -Math.PI / 2 + 0.4]]) armchair(lower, -3.6, z, r); // facing the fire
  box(lower, 0.6, 0.55, 0.6, M.planks, -3.3, 0.28, 0.1);
  cyl(lower, 0.12, 0.15, 0.25, M.white, -3.3, 0.68, 0.1, 10);
  rug(lower, -3.9, 0.1, 2.6, 3.8, Math.PI / 2);

  // filing cabinets under the landing, coat rack and bench by the door
  for (const x of [4.75, 5.45]) {
    box(lower, 0.65, 1.4, 0.65, M.white, x, 0.7, -4.5);
    for (const y of [0.35, 0.8, 1.2]) box(lower, 0.25, 0.05, 0.04, dark, x, y, -4.15);
  }
  coatRack(lower, -1.9, 4.35);
  cyl(lower, 0.16, 0.14, 0.55, M.planks, -2.5, 0.27, 4.5, 10);
  cyl(lower, 0.012, 0.012, 0.9, dark, -2.45, 0.6, 4.5, 4).rotation.z = 0.15;
  box(lower, 1.4, 0.08, 0.45, M.planks, -4.4, 0.45, 4.55);
  for (const x of [-4.95, -3.85]) box(lower, 0.08, 0.45, 0.4, M.white, x, 0.22, 4.55);
  folk(lower, -4.6, 4.55, Math.PI, { pose: 'sit', seat: 0.5, look: { hat: 'top', scarf: true } });
  rug(lower, -0.6, 1.6, 4.6, 3.0);
  plant(lower, -5.4, -4.4);
  plant(lower, 1.4, 4.45);
  wallShelf(lower, -W / 2 + 0.05, 3.0, -1.95, 1.1, Math.PI / 2, rand);
  picture(lower, 3.6, 2.6, -D / 2 + 0.06, 0.8, 0.8, 0, 'map');

  // the tall clock by the stairs, with a pendulum
  box(lower, 0.6, 2.3, 0.45, M.planks, 3.75, 1.15, 2.6);
  const face = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 20), [M.white, M.clock, M.white], 3.75, 1.9, 2.84, lower);
  face.rotation.x = Math.PI / 2;
  clockHands(lower, 3.75, 1.9, 2.87, 0.21);
  const pendulum = new THREE.Group();
  pendulum.position.set(3.75, 1.6, 2.86);
  box(pendulum, 0.02, 0.55, 0.02, M.white, 0, -0.28, 0);
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 14), M.white, 0, -0.58, 0, pendulum).rotation.x = Math.PI / 2;
  lower.add(pendulum);
  swingSign(pendulum);

  const lamps = [pendant(lower, 2.2, 2.6, 0.6, F - 0.3), pendant(lower, -0.5, 3.15, -3.6, F - 0.3)];
  const chand = chandelier(lower, -0.8, 3.1, 1.6, F - 0.3);

  // ---------- upstairs: Upcoming and Done ----------
  // everything up here is built in `up`, a group raised to the upper floor
  const U = F;
  const up = new THREE.Group();
  up.position.y = U;
  upper.add(up);
  const later = taskBoard(up, 1.8, 2.15, -D / 2 + 0.1, 4.2, 2.2, 4, 2, stamp.todo);
  signBoard(up, 1.8, 3.6, -D / 2 + 0.14, 1.6, 0.36, 'Coming up');
  const calTex = calendarTexture();
  box(up, 2.9, 2.5, 0.08, M.planks, -2.6, 2.2, -D / 2 + 0.06);
  mesh(new THREE.PlaneGeometry(2.7, 2.3), toon('#ffffff', calTex), -2.6, 2.2, -D / 2 + 0.11, up);
  // a drafting table and stool in front of the planning wall
  const draft = box(up, 1.6, 0.06, 1.0, M.planks, -2.4, 1.0, -3.3);
  draft.rotation.x = 0.2;
  for (const [x, z] of [[-3.1, -3.7], [-1.7, -3.7], [-3.1, -2.9], [-1.7, -2.9]]) box(up, 0.06, 1.0, 0.06, M.white, x, 0.5, z);
  for (let i = 0; i < 3; i++) box(up, 0.5, 0.01, 0.35, M.white, -2.6 + i * 0.3, 1.05 + i * 0.01, -3.3).rotation.set(0.2, i * 0.2, 0);
  cyl(up, 0.22, 0.22, 0.05, M.planks, -2.4, 0.65, -2.2, 12);
  cyl(up, 0.04, 0.04, 0.62, M.white, -2.4, 0.31, -2.2, 6);
  const upBin = new THREE.Vector3(4.0, U, -4.4);
  cyl(up, 0.24, 0.2, 0.5, M.planks, upBin.x, 0.25, upBin.z, 14);
  // the archive: shelves of binders, cabinets, the out-tray of finished tasks
  bookshelf(up, -W / 2 + 0.35, 1.2, Math.PI / 2, rand);
  bookshelf(up, -W / 2 + 0.35, -1.2, Math.PI / 2, rand);
  for (const z of [-2.9, -3.6]) {
    box(up, 0.7, 1.4, 0.65, M.white, -5.5, 0.7, z);
    for (const y of [0.35, 0.8, 1.2]) box(up, 0.04, 0.05, 0.25, dark, -5.13, y, z);
  }
  box(up, 1.4, 0.06, 0.8, M.planks, -3.6, 0.78, 0.6);
  for (const [x, z] of [[-4.2, 0.3], [-3.0, 0.3], [-4.2, 0.9], [-3.0, 0.9]]) box(up, 0.06, 0.78, 0.06, M.white, x, 0.39, z);
  box(up, 0.55, 0.12, 0.42, M.planks, -3.6, 0.87, 0.6);
  const stack = new THREE.Group();
  up.add(stack);
  signBoard(up, -3.6, 1.2, 0.95, 0.8, 0.22, 'Done');
  // a window seat with cushions and a cat asleep in the sun, a plant, a globe
  box(up, 1.8, 0.45, 0.6, M.planks, -3.4, 0.22, 4.55);
  box(up, 1.7, 0.1, 0.55, M.white, -3.4, 0.5, 4.55);
  for (const x of [-3.9, -2.9]) box(up, 0.4, 0.35, 0.12, M.white, x, 0.7, 4.75).rotation.x = -0.3;
  const cat = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.2, 10, 8).scale(1.3, 0.6, 1), M.white, 0, 0.12, 0, cat);
  mesh(new THREE.SphereGeometry(0.11, 8, 6), M.white, 0.2, 0.15, 0.05, cat);
  cat.position.set(-3.2, 0.55, 4.5);
  up.add(cat);
  plant(up, 1.0, 4.4);
  cyl(up, 0.05, 0.12, 0.9, M.white, 3.0, 0.45, 3.6, 8);
  mesh(new THREE.IcosahedronGeometry(0.45, 1), M.white, 3.0, 1.3, 3.6, up);
  picture(up, -W / 2 + 0.06, 2.3, -3.25, 1.0, 0.8, Math.PI / 2, 'mountains');
  rug(up, 0, 1.0, 4.8, 3.2);
  const upLamps = [pendant(up, -2.4, 2.7, -3.0, TOP - U - 0.3), pendant(up, -3.6, 2.6, 0.6, TOP - U - 0.3)];

  // ---------- layers ----------
  onLayer(upper, LAYER_UPPER);
  onLayer(cutUpper, LAYER_UPPER);
  onLayer(ceilings, LAYER_CEILING);
  lights.sun.shadow.camera.layers.enableAll();

  // ---------- live data ----------
  const api = todos();
  const refresh = () => {
    const g = api.groups();
    const today = [...g.overdue.map((t) => ({ ...t, late: true })), ...g.today];
    board.set(today, (t) => api.dueLabel(t.due));
    later.set([...g.upcoming, ...g.anytime], (t) => api.dueLabel(t.due));
    const due = new Map();
    const now = new Date();
    for (const t of [...g.today, ...g.upcoming, ...g.overdue]) {
      const [y, m, d] = t.due.split('-').map(Number);
      if (y === now.getFullYear() && m === now.getMonth() + 1) due.set(d, (due.get(d) || 0) + 1);
    }
    calTex.userData.draw(due);
    document.fonts?.load('52px "Patrick Hand SC"').then(() => calTex.userData.draw(due)).catch(() => {});
    const done = api.doneCount();
    progressJar.set(done);
    setPlaque(api.streak());
    stack.clear();
    for (let i = 0; i < Math.min(done, 30); i++) box(stack, 0.48, 0.012, 0.36, M.white, -3.6 + Math.sin(i) * 0.02, 0.95 + i * 0.013, 0.6).rotation.y = Math.sin(i * 3) * 0.08;
  };
  DISTRICTS.todo.subscribe(refresh);
  refresh();

  // ---------- tearing a note off ----------
  const flying = [];
  const ballMat = M.white;
  function tearOff(note, onDone) {
    const task = note.userData.task;
    const world = new THREE.Vector3();
    note.getWorldPosition(world);
    const upstairs = world.y > F;
    scene.attach(note);
    flying.push({ note, task, t0: performance.now(), from: world.clone(), bin: (upstairs ? upBin : binPos).clone().setY((upstairs ? U : 0) + 0.5), ball: null, onDone, layer: upstairs ? LAYER_UPPER : 0 });
  }

  // ---------- light and life ----------
  const t0 = performance.now();
  function update(time, ctx) {
    // notes popping onto the board
    for (const b of [board, later]) {
      for (let i = b.pops.length - 1; i >= 0; i--) {
        const p = b.pops[i], k = Math.min(1, (performance.now() - p.t0) / 350);
        p.n.scale.setScalar(0.2 + 0.8 * (1 - Math.pow(1 - k, 3)) * (1 + Math.sin(k * Math.PI) * 0.15));
        if (k === 1) { p.n.scale.setScalar(1); b.pops.splice(i, 1); }
      }
    }
    // torn notes: pull, crumple, toss
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], s = (performance.now() - f.t0) / 1000;
      if (s < 0.25) {
        f.note.position.copy(f.from).add(new THREE.Vector3(0, -s * 0.4, s * 1.6));
        f.note.rotation.z += 0.05;
      } else if (s < 0.45) {
        const k = (s - 0.25) / 0.2;
        f.note.scale.setScalar(1 - k * 0.85);
        if (!f.ball) {
          f.ball = mesh(new THREE.IcosahedronGeometry(0.12, 0), ballMat, 0, 0, 0, scene);
          f.ball.layers.set(f.layer);
          f.start = f.note.position.clone();
        }
        f.ball.position.copy(f.note.position);
        f.ball.scale.setScalar(k);
      } else if (s < 1.15) {
        if (f.note.parent) scene.remove(f.note);
        const k = (s - 0.45) / 0.7;
        f.ball.position.lerpVectors(f.start, f.bin, k);
        f.ball.position.y += Math.sin(k * Math.PI) * 1.3;
        f.ball.rotation.x += 0.2;
      } else {
        scene.remove(f.ball);
        if (f.bin.y < F) mesh(ballGeo, M.white, binPos.x + (Math.random() - 0.5) * 0.2, 0.5, binPos.z + (Math.random() - 0.5) * 0.2, binBalls).scale.setScalar(1.8);
        flying.splice(i, 1);
        f.onDone();
      }
    }

    // the sun crosses the sky with the real time; lamps come on in the evening
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const day = THREE.MathUtils.clamp((hour - 6) / 13, 0, 1);
    const az = day * Math.PI;
    const dark = isNight() || hour < 6.5 || hour > 19.5;
    const evening = dark || hour >= 18 || hour < 7;
    lights.sun.position.set(Math.cos(az) * 16, 3 + Math.sin(az) * 13, 10);
    lights.sun.target.position.set(0, F / 2, 0);
    lights.sun.intensity = dark ? Math.PI * 0.15 : Math.PI;
    for (const l of [...lamps, ...upLamps]) {
      l.light.intensity = evening ? 6 : 0;
      l.bulb.material = evening ? lampOn : M.white;
    }
    chand.light.intensity = evening ? 9 : 0;
    for (const b of chand.bulbs) b.material = evening ? lampOn : M.white;

    // the fire: brighter the more of today you've cleared
    const g = api.groups();
    const left = g.overdue.length + g.today.length, cleared = api.doneToday();
    const glow = 0.45 + 0.55 * (cleared / Math.max(1, cleared + left));
    const frame = Math.floor((performance.now() - t0) / 140) % 2;
    for (const [i, f] of fire.flames.entries()) {
      const h = f.userData.h * glow * (1 + ((i + frame) % 2 ? 0.12 : -0.08));
      f.scale.set(glow, h, glow);
      f.position.y = 0.2 + h / 2;
    }
    fire.light.intensity = (dark ? 6 : 2.5) * glow * (frame ? 1 : 0.85);
  }

  // what the clerk says when you come close
  function clerkLine() {
    const g = api.groups();
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Morning!' : hour < 18 ? 'Afternoon!' : 'Evening!';
    const s = api.streak();
    if (g.overdue.length) return `${hello} Psst, “${g.overdue[0].title}” is late.`;
    if (g.today.length) return `${hello} ${g.today.length} ${g.today.length === 1 ? 'thing' : 'things'} on the board today.`;
    if (s > 1) return `${hello} All clear, ${s} days running. Lovely.`;
    return `${hello} Nothing due today. Want me to type something up?`;
  }

  // walking: stairs connect the floors; a step bigger than 0.6 m is a wall or railing
  function heightAt(x, z, level) {
    if (inStair(x, z)) {
      const y = stairHeight(z);
      return { y, level: y > F / 2 ? 1 : 0 };
    }
    return { y: level * F, level };
  }

  const colliders = [
    { x: 2.2, z: 0.4, r: 1.35 }, { x: -W / 2 + 0.7, z: 0.1, r: 1.0 }, { x: -3.6, z: -1.4, r: 0.6 }, { x: -3.6, z: 1.6, r: 0.6 },
    { x: -3.3, z: 0.1, r: 0.45 }, { x: 5.1, z: -4.5, r: 0.9 }, { x: -1.9, z: 4.35, r: 0.4 }, { x: -4.4, z: 4.55, r: 0.75 },
    { x: 3.75, z: 2.6, r: 0.45 }, { x: -5.4, z: -4.4, r: 0.5 }, { x: 1.4, z: 4.45, r: 0.5 }, { x: 2.75, z: -4.35, r: 0.4 },
    { x: -2.4, z: -3.3, r: 1.0, level: 1 }, { x: -2.4, z: -2.2, r: 0.35, level: 1 }, { x: -5.6, z: 0, r: 1.6, level: 1 },
    { x: -5.5, z: -3.25, r: 0.8, level: 1 }, { x: -3.6, z: 0.6, r: 0.9, level: 1 }, { x: -3.4, z: 4.55, r: 0.95, level: 1 },
    { x: 1.0, z: 4.4, r: 0.5, level: 1 }, { x: 3.0, z: 3.6, r: 0.6, level: 1 }, { x: 4.0, z: -4.4, r: 0.35, level: 1 },
  ];

  return {
    levels: { ground: 0, upper: 1, height: F },
    lower, upper, ceilings, cutLower, cutUpper, panes,
    boards: [board, later],
    colliders,
    heightAt,
    tearOff,
    update,
    speakers: [{ object: clerk, height: 1.9, range: 4.2, level: 0, text: clerkLine }],
    stations: [
      { point: new THREE.Vector3(-0.5, 0, -3.5), level: 0, label: 'Open the task board', app: 'todo', tab: 'today' },
      { point: new THREE.Vector3(2.2, 0, 1.95), level: 0, label: 'Ask the clerk to type a task', typewriter: true },
      { point: new THREE.Vector3(1.8, 0, -3.4), level: 1, label: 'Plan ahead', app: 'todo', tab: 'upcoming' },
      { point: new THREE.Vector3(-2.4, 0, 0.6), level: 1, label: 'Look through the archive', app: 'todo', tab: 'done' },
    ],
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.4),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.4 },
    cameraOffset: new THREE.Vector3(10, 15, 17),
    // where this room sits inside the town hall on the plaza (for the window views):
    // the front wall lines up with the building's front, the floor with its ground tile
    plazaOffset: new THREE.Vector3(0, 0.4, 1.82 - D / 2),
  };
}

function armchair(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 0.9, 0.4, 0.8, M.white, 0, 0.3, 0);
  box(g, 0.9, 0.7, 0.18, M.white, 0, 0.75, -0.32);
  for (const s of [-1, 1]) box(g, 0.16, 0.55, 0.8, M.white, s * 0.45, 0.48, 0);
  box(g, 0.72, 0.1, 0.6, M.planks, 0, 0.55, 0.05);
  for (const sx of [-0.38, 0.38]) for (const sz of [-0.32, 0.32]) box(g, 0.06, 0.12, 0.06, dark, sx, 0.06, sz);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
}
