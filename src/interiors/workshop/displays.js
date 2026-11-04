// The things in the workshop that show your ideas, drawn on canvases and
// redrawn when the ideas change: the idea wall, where every note is one of
// your ideas with the day it came; the keeper's log, where the same ideas
// are written up in order; the chalkboard, rubbed out and drawn again; and
// the tide table by the lamp.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { inkLine } from '../../textures.js';
import { signBoard } from '../../details.js';
import { brass, dark } from './materials.js';

const HAND = '"Patrick Hand", "Comic Neue", sans-serif';
const HAND_SC = '"Patrick Hand SC", "Comic Neue", sans-serif';

// A canvas texture redrawn by draw(g, w, h, ...args). `lineArt` ones are
// drawn in ink on paper and follow the day/night theme, like every texture;
// the chalkboard is the other way round, chalk on slate.
function canvasTex(w, h, draw, lineArt = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (lineArt) t.userData.lineArt = true;
  let last = [];
  t.userData.draw = (...args) => {
    last = args;
    g.save();
    g.fillStyle = lineArt ? '#ffffff' : '#2b2e2a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = lineArt ? '#111111' : '#f2f2ec';
    g.lineCap = g.lineJoin = 'round';
    draw(g, w, h, ...args);
    g.restore();
    t.needsUpdate = true;
  };
  document.fonts?.load(`40px ${HAND}`).then(() => t.userData.draw(...last)).catch(() => {});
  return t;
}

// Wrap text to `width`, at most `max` lines, the last one elided.
function wrap(g, text, width, max) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > max) { lines.length = max; lines[max - 1] = `${lines[max - 1].slice(0, -1)}…`; }
  return lines;
}

// ---------- the idea wall ----------
const noteGeo = new THREE.BoxGeometry(0.8, 0.9, 0.02);
const pinGeo = new THREE.SphereGeometry(0.055, 10, 8);
const cork = toon('#bdbdb7', M.dirt.map);   // darker than the notes, so they stand out

// One note: the idea, the day it came, and a little burst on the newest one.
function noteTexture(title, when, fresh) {
  const t = canvasTex(320, 360, (g, w, h) => {
    g.font = `44px ${HAND}`;
    const lines = wrap(g, title, w - 48, 5);
    lines.forEach((l, i) => g.fillText(l, 24, 74 + i * 46));
    g.lineWidth = 4;
    inkLine(g, 24, h - 62, w - 24, h - 62, 1);
    g.font = `30px ${HAND_SC}`;
    g.fillText(String(when || ''), 24, h - 22);
    if (fresh) {                               // a spark, for the one just thought of
      g.lineWidth = 5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        inkLine(g, w - 48 + Math.cos(a) * 12, 34 + Math.sin(a) * 12, w - 48 + Math.cos(a) * 24, 34 + Math.sin(a) * 24, 0.4);
      }
    }
  });
  t.userData.draw();
  return t;
}

// A string hung between two pins, sagging in the middle.
function stringBetween(p, a, b) {
  const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.12 - a.distanceTo(b) * 0.06, 0));
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const m = mesh(new THREE.TubeGeometry(curve, 10, 0.009, 4), M.white, 0, 0, 0, p);
  m.castShadow = false;
  m.userData.tube = true;
  return m;
}

// The idea wall: a board of cork whose notes are your ideas. `set` lays them
// out again from scratch, so the wall is whatever the Ideas district holds.
export function ideaWall(p, x, y, z, w, h) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  box(g, w + 0.28, h + 0.28, 0.1, M.planks, 0, 0, 0);
  box(g, w, h, 0.12, cork, 0, 0, 0.02);
  for (const s of [-1, 1]) box(g, 0.1, h + 0.5, 0.14, M.planks, s * (w / 2 + 0.14), 0, -0.02);   // uprights
  const layer = new THREE.Group();
  g.add(layer);
  const cols = 4, rows = 2, fits = cols * rows;
  // Notes go in rows, newest first, and the rows it takes sit in the middle
  // of the board: a wall with three ideas on it looks pinned, not half empty.
  const slotsFor = (n) => {
    const used = Math.max(1, Math.ceil(n / cols));
    const cell = h / rows, top = (used * cell) / 2;
    return Array.from({ length: used * cols }, (_, i) => [
      -w / 2 + ((i % cols) + 0.5) * (w / cols),
      top - (Math.floor(i / cols) + 0.5) * cell,
    ]);
  };
  return {
    group: g,
    notes: layer,
    set(items) {
      for (const n of [...layer.children]) {
        n.traverse((o) => {
          o.material?.[4]?.map?.dispose?.();
          if (o.userData.tube) o.geometry.dispose();
        });
        layer.remove(n);
      }
      const list = items.length > fits ? items.slice(0, fits - 1) : items;
      const slots = slotsFor(Math.max(1, Math.min(items.length, fits)));
      const pins = [];
      list.forEach(([title, when], i) => {
        const [nx, ny] = slots[i];
        const n = new THREE.Group();
        n.position.set(nx + Math.sin(i * 7.3) * 0.04, ny - 0.04 + Math.cos(i * 3.1) * 0.03, 0.1);
        n.rotation.z = 0.07 * Math.sin(i * 12.9 + 1);
        const front = toon('#ffffff', noteTexture(title, when, i === 0));
        mesh(noteGeo, [M.white, M.white, M.white, M.white, front, M.white], 0, 0, 0, n);
        mesh(pinGeo, stamp.ideas, 0, 0.38, 0.035, n);
        if (i === 0) {
          // the newest one is still curling off the board
          const curl = box(n, 0.2, 0.2, 0.02, M.white, 0.3, -0.36, 0.035);
          curl.rotation.set(-0.7, 0.4, 0.78);
        }
        n.userData.idea = { title, when };
        layer.add(n);
        pins.push(new THREE.Vector3(n.position.x, n.position.y + 0.38, 0.12));
      });
      // string from pin to pin along each row: the thread between one idea
      // and the next
      for (let i = 1; i < pins.length; i++) if (i % cols) stringBetween(layer, pins[i - 1], pins[i]);
      if (items.length > list.length) {
        const [nx, ny] = slots[fits - 1];
        signBoard(layer, nx, ny, 0.1, 0.7, 0.4, `+${items.length - list.length} more`);
      }
    },
  };
}

// ---------- the keeper's log ----------
// A big book open on a lectern by the lamp: every idea written up in order,
// newest first, the way a keeper writes up a night's weather.
export function keepersLog(p, x, y, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 0.44, 0.06, 0.36, M.planks, 0, 0.03, 0);
  cyl(g, 0.06, 0.08, 0.92, M.planks, 0, 0.5, 0, 10);
  const top = new THREE.Group();
  top.position.set(0, 1.0, 0);
  top.rotation.x = 0.42;
  g.add(top);
  box(top, 0.86, 0.05, 0.58, M.planks, 0, 0, 0);
  box(top, 0.82, 0.04, 0.05, M.planks, 0, 0.04, 0.28);
  const t = canvasTex(1024, 640, (c, w, h, items = []) => {
    c.lineWidth = 3;
    inkLine(c, w / 2, 24, w / 2, h - 24, 0.6);
    c.font = `54px ${HAND_SC}`;
    c.fillText("Keeper's log", 54, 86);
    c.font = `30px ${HAND}`;
    c.fillText('What the wall holds', 54, 132);
    c.lineWidth = 4;
    inkLine(c, 54, 150, w / 2 - 40, 150, 1);
    if (!items.length) { c.font = `38px ${HAND}`; c.fillText('Nothing logged yet.', 54, 220); return; }
    c.font = `34px ${HAND}`;
    const [first, firstWhen] = items[0];
    wrap(c, `“${first}”`, w / 2 - 110, 4).forEach((l, i) => c.fillText(l, 54, 206 + i * 44));
    c.font = `28px ${HAND_SC}`;
    c.fillText(`came ${String(firstWhen).toLowerCase()}`, 54, h - 48);
    // the right page: the rest, ruled and dated
    for (let y = 120; y < h - 30; y += 46) inkLine(c, w / 2 + 40, y, w - 44, y, 0.4);
    c.font = `30px ${HAND_SC}`;
    c.fillText('Earlier', w / 2 + 40, 86);
    c.font = `30px ${HAND}`;
    items.slice(1, 11).forEach(([title, when], i) => {
      const y = 112 + i * 46;
      const label = String(when || '');
      const room = w - 84 - c.measureText(label).width - (w / 2 + 40);
      c.fillText(wrap(c, title, room, 1)[0], w / 2 + 44, y);
      c.fillText(label, w - 44 - c.measureText(label).width, y);
    });
  });
  for (const s of [-1, 1]) box(top, 0.38, 0.05, 0.48, M.white, s * 0.2, 0.06, 0).rotation.z = -s * 0.06;
  const page = mesh(new THREE.PlaneGeometry(0.78, 0.49), toon('#ffffff', t), 0, 0.095, 0, top);
  page.rotation.x = -Math.PI / 2;
  page.castShadow = false;
  box(top, 0.03, 0.012, 0.56, stamp.ideas, 0, 0.1, 0.04).castShadow = false;   // the ribbon
  cyl(g, 0.008, 0.008, 0.18, dark, 0.3, 1.1, 0.12, 4).rotation.set(0.42, 0, 1.3);  // a pencil on the lip
  return { group: g, set: (items) => t.userData.draw(items) };
}

// ---------- the chalkboard ----------
// A slate on the wall with the idea being worked out on it. Rubbing it out
// and drawing it again (the station) leaves the last one as chalk dust.
const SKETCHES = {
  tower: (c, w, h) => {
    const bx = w * 0.3;
    c.beginPath(); c.moveTo(bx - 70, h - 60); c.lineTo(bx - 34, 120); c.lineTo(bx + 34, 120); c.lineTo(bx + 70, h - 60); c.stroke();
    for (let y = 190; y < h - 90; y += 92) { c.beginPath(); c.moveTo(bx - 40 - (y / h) * 30, y); c.lineTo(bx + 40 + (y / h) * 30, y); c.stroke(); }
    c.strokeRect(bx - 44, 56, 88, 60);
    c.beginPath(); c.moveTo(bx - 60, 56); c.lineTo(bx, 10); c.lineTo(bx + 60, 56); c.stroke();
    for (const s of [-1, 1]) for (const dy of [-34, 0, 34]) {
      c.beginPath(); c.moveTo(bx + s * 56, 86); c.lineTo(bx + s * 260, 86 + dy); c.stroke();
    }
  },
  boat: (c, w, h) => {
    const y = h * 0.62;
    c.beginPath(); c.moveTo(w * 0.18, y); c.lineTo(w * 0.72, y); c.lineTo(w * 0.62, y + 70); c.lineTo(w * 0.28, y + 70); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(w * 0.45, y); c.lineTo(w * 0.45, 60); c.stroke();
    c.beginPath(); c.moveTo(w * 0.45, 74); c.lineTo(w * 0.66, y - 14); c.lineTo(w * 0.45, y - 14); c.closePath(); c.stroke();
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      for (let x = 30; x < w - 20; x += 40) c.quadraticCurveTo(x + 20, y + 108 + k * 34 - 16, x + 40, y + 108 + k * 34);
      c.stroke();
    }
  },
  gears: (c, w, h) => {
    const wheel = (cx, cy, r, teeth) => {
      c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx, cy, r * 0.22, 0, 7); c.stroke();
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        c.beginPath(); c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.lineTo(cx + Math.cos(a) * (r + 14), cy + Math.sin(a) * (r + 14)); c.stroke();
      }
    };
    wheel(w * 0.34, h * 0.46, 110, 14);
    wheel(w * 0.68, h * 0.62, 66, 10);
    c.beginPath(); c.moveTo(w * 0.34, h * 0.46); c.lineTo(w * 0.68, h * 0.62); c.stroke();
    c.font = `34px ${HAND}`;
    c.fillText('1 turn = 20 s', w * 0.1, 60);
  },
  plan: (c, w, h) => {
    c.strokeRect(w * 0.18, 70, w * 0.64, h * 0.56);
    c.beginPath(); c.arc(w * 0.5, 70 + h * 0.28, 44, 0, 7); c.stroke();
    for (const [x, z] of [[0.26, 0.18], [0.66, 0.18], [0.26, 0.66], [0.66, 0.66], [0.46, 0.8]]) {
      c.strokeRect(w * 0.18 + w * 0.64 * x, 70 + h * 0.56 * z, 70, 54);
    }
    c.font = `34px ${HAND}`;
    c.fillText('the square', w * 0.18, h - 40);
  },
};
const KINDS = Object.keys(SKETCHES);

export function chalkboard(p, x, y, z, rotY, w = 2.1, h = 1.35) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, w + 0.16, h + 0.16, 0.08, M.planks, 0, 0, 0);
  const t = canvasTex(1024, 660, (c, cw, ch, kind = 'tower', ghost = null, caption = '') => {
    if (ghost) {                        // what was rubbed out, still showing
      c.save();
      c.globalAlpha = 0.16;
      c.lineWidth = 16;
      SKETCHES[ghost](c, cw, ch);
      c.restore();
    }
    c.lineWidth = 7;
    SKETCHES[kind](c, cw, ch);
    if (caption) {
      c.font = `40px ${HAND}`;
      const line = caption.length > 42 ? `${caption.slice(0, 41)}…` : caption;
      c.fillText(line, 40, ch - 26);
    }
  }, false);
  const face = mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', t), 0, 0, 0.045, g);
  face.castShadow = false;
  box(g, w + 0.2, 0.1, 0.2, M.planks, 0, -h / 2 - 0.12, 0.08);              // the chalk tray
  for (const cx of [-0.5, -0.36, 0.42]) cyl(g, 0.016, 0.016, 0.1, M.white, cx, -h / 2 - 0.06, 0.14, 6).rotation.z = Math.PI / 2;
  box(g, 0.18, 0.12, 0.05, M.white, 0.68, -h / 2 - 0.05, 0.14).rotation.z = 0.2;   // the rag
  let i = 0, caption = '';
  const show = () => t.userData.draw(KINDS[i], KINDS[(i + KINDS.length - 1) % KINDS.length], caption);
  show();
  return {
    group: g,
    board: face,
    setCaption(text) { caption = text; show(); },
    kind: () => KINDS[i],
    // rub it out and draw the next one
    next() { i = (i + 1) % KINDS.length; show(); return KINDS[i]; },
  };
}

// ---------- the tide table ----------
// A chart in a frame: the day's tide drawn as a hand-ruled curve, with the
// high water times written under it.
export function tideTable(p, x, y, z, rotY, w = 0.9, h = 0.68) {
  const t = canvasTex(640, 480, (c, cw, ch) => {
    c.font = `46px ${HAND_SC}`;
    c.fillText('Tide table', 30, 56);
    c.lineWidth = 4;
    inkLine(c, 30, 74, cw - 30, 74, 1);
    const y0 = 110, hh = 200;
    inkLine(c, 60, y0, 60, y0 + hh, 0.6);
    inkLine(c, 60, y0 + hh, cw - 30, y0 + hh, 0.6);
    c.lineWidth = 5;
    c.beginPath();
    for (let k = 0; k <= 48; k++) {
      const px = 60 + (k / 48) * (cw - 100);
      const py = y0 + hh / 2 - Math.sin((k / 48) * Math.PI * 4) * (hh / 2 - 12);
      k ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
    c.font = `26px ${HAND_SC}`;
    for (const [k, label] of [[0, '00'], [12, '06'], [24, '12'], [36, '18'], [48, '24']]) {
      c.fillText(label, 48 + (k / 48) * (cw - 100), y0 + hh + 34);
    }
    c.font = `30px ${HAND}`;
    c.fillText('High water  03:10   15:25', 60, ch - 76);
    c.fillText('Low water   09:18   21:40', 60, ch - 34);
  });
  t.userData.draw();
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, w + 0.08, h + 0.08, 0.04, M.planks, 0, 0, 0);
  mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', t), 0, 0, 0.026, g).castShadow = false;
  mesh(new THREE.SphereGeometry(0.03, 8, 6), brass, 0, h / 2 + 0.06, 0.02, g);
  return g;
}
