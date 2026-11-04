// Your reading list, as things you can stand in front of. One item of
// DISTRICTS.study.items becomes one object, and which object it becomes
// depends on what its progress looks like:
//
//   "40%"      an open book on a rest, the pages split where you are and a
//              blue ribbon lying on the page you got to
//   "20 left"  a tray with twenty cards still standing in it
//   "Fri"      a closed book with a due slip sticking out of the top
//
// Everything is lettered on canvases in the hand of the rest of the plaza.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box } from '../../kit.js';
import { inkLine } from '../../textures.js';
import { dark } from './materials.js';

const HAND = '"Patrick Hand", "Comic Neue", sans-serif';
const HAND_SC = '"Patrick Hand SC", "Comic Neue", sans-serif';

// A canvas texture drawn by draw(g, w, h), in ink on paper, so it follows the
// day/night theme like every other texture.
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.lineArt = true;
  t.userData.draw = () => {
    g.save();
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = '#111111';
    g.lineCap = g.lineJoin = 'round';
    draw(g, w, h);
    g.restore();
    t.needsUpdate = true;
  };
  t.userData.draw();
  // draw again once the hand-lettered fonts have loaded
  document.fonts?.load(`40px ${HAND}`).then(() => t.userData.draw()).catch(() => {});
  return t;
}

// A paper surface lying face up, lettered so you read it from the front (+z).
const faceUp = (m, roll = 0) => { m.rotation.set(-Math.PI / 2, 0, Math.PI + roll); m.castShadow = false; return m; };

// Hand lettering that shrinks until it fits, over up to `rows` lines.
function letter(g, text, x, y, max, size, rows = 1, font = HAND) {
  let s = size, lines = [text];
  for (;;) {
    g.font = `${s}px ${font}`;
    lines = [];
    const rest = text.split(' ');
    while (rest.length) {
      let line = rest.shift();
      while (rest.length && g.measureText(`${line} ${rest[0]}`).width <= max) line += ` ${rest.shift()}`;
      lines.push(line);
    }
    if ((lines.length <= rows && lines.every((l) => g.measureText(l).width <= max)) || s < 14) break;
    s -= 3;
  }
  lines.slice(0, rows).forEach((l, i) => g.fillText(l, x, y + i * s * 1.15));
  return s;
}

const ruled = (g, w, from, to, step = 46) => {
  g.lineWidth = 3;
  for (let y = from; y < to; y += step) inkLine(g, 54, y, w - 54, y, 0.5);
};

// A title across the top of a page, with a ruled line under it.
function pageHead(c, w, title) {
  letter(c, title, 54, 92, w - 108, 46, 2, HAND_SC);
  c.lineWidth = 4;
  inkLine(c, 54, 190, w - 54, 190, 1);
}

// ---------- what shape an item takes ----------
export function readingOf(item) {
  const [title, progress = ''] = item;
  const pct = /^\s*(\d{1,3})\s*%\s*$/.exec(progress);
  if (pct) return { kind: 'pct', title, progress, pct: THREE.MathUtils.clamp(Number(pct[1]) / 100, 0, 1) };
  const count = /^\s*(\d+)\b/.exec(progress);
  if (count) return { kind: 'count', title, progress, count: Number(count[1]) };
  return { kind: 'due', title, progress };
}

// How the librarian would say where you are with one.
export function sayWhere(r) {
  if (r.kind === 'pct') return `${r.title} is ${Math.round(r.pct * 100)}% read`;
  if (r.kind === 'count') return `${r.count} left in ${r.title}`;
  return `${r.title} is wanted ${r.progress}`;
}

// ---------- the open book ----------
// On a sloped rest: two blocks of pages, the left one as thick a share of the
// book as you have read, the ribbon lying on the page you stopped at.
function openBook(p, r) {
  // the rest: a board tilted toward the reader, with a lip along the bottom
  box(p, 0.56, 0.03, 0.38, M.planks, 0, 0.1, 0).rotation.x = -0.3;
  box(p, 0.56, 0.05, 0.04, M.planks, 0, 0.055, 0.185);
  for (const sx of [-0.21, 0.21]) box(p, 0.05, 0.11, 0.15, M.planks, sx, 0.055, -0.09);
  const book = new THREE.Group();
  book.position.set(0, 0.115, 0.01);
  book.rotation.x = -0.3;
  p.add(book);
  const TOTAL = 0.075;
  const tL = Math.max(0.006, TOTAL * r.pct), tR = Math.max(0.006, TOTAL * (1 - r.pct));
  const pageL = canvasTex(440, 600, (c, w, h) => {
    pageHead(c, w, r.title);
    ruled(c, w, 240, h - 60);
    c.font = `30px ${HAND}`;
    c.fillText(`${Math.round(r.pct * 100)}% in`, 54, h - 26);
  });
  const pageR = canvasTex(440, 600, (c, w, h) => {
    ruled(c, w, 90, h - 130);
    c.lineWidth = 5;
    inkLine(c, 70, 320, 300, 320, 1.4);                 // a line worth underscoring
    c.font = `30px ${HAND}`;
    c.fillText('…', 54, h - 70);
  });
  for (const [s, t, tex] of [[-1, tL, pageL], [1, tR, pageR]]) {
    box(book, 0.25, 0.014, 0.34, dark, s * 0.13, 0.007, 0);                 // the cover board
    box(book, 0.23, t, 0.32, M.white, s * 0.13, 0.014 + t / 2, 0);          // the block of pages
    faceUp(mesh(new THREE.PlaneGeometry(0.23, 0.32), toon('#ffffff', tex), s * 0.13, 0.0155 + t, 0, book));
  }
  // the ribbon: down the gutter, onto the page you got to, and over the edge
  box(book, 0.022, 0.004, 0.33, stamp.study, -0.035, 0.019 + tL, 0).castShadow = false;
  const tail = box(book, 0.022, 0.004, 0.15, stamp.study, -0.035, 0.014 + tL, 0.23);
  tail.rotation.x = 0.55;
  tail.castShadow = false;
}

// ---------- the closed book with a due slip ----------
function closedBook(p, r) {
  box(p, 0.3, 0.052, 0.4, dark, 0, 0.026, 0);                   // the boards
  box(p, 0.285, 0.044, 0.385, M.white, 0.005, 0.028, 0);        // the pages, a little proud of them
  const cover = canvasTex(440, 580, (c, w, h) => {
    c.lineWidth = 6;
    c.strokeRect(26, 26, w - 52, h - 52);
    letter(c, r.title, 56, 150, w - 112, 48, 3, HAND_SC);
    c.lineWidth = 4;
    inkLine(c, 56, h - 150, w - 56, h - 150, 1);
    c.font = `30px ${HAND}`;
    c.fillText('Plaza Library', 56, h - 100);
  });
  faceUp(mesh(new THREE.PlaneGeometry(0.29, 0.39), toon('#ffffff', cover), 0, 0.0535, 0, p));
  // the slip, half in the book: the day it is wanted
  const slipTex = canvasTex(260, 360, (c, w, h) => {
    c.lineWidth = 4;
    c.strokeRect(14, 14, w - 28, h - 28);
    c.font = `34px ${HAND_SC}`;
    c.fillText('WANTED', 34, 68);
    letter(c, r.progress, 34, 160, w - 68, 64, 1, HAND_SC);
    ruled(c, w, 220, h - 30, 50);
  });
  box(p, 0.15, 0.003, 0.22, M.white, 0.02, 0.0555, -0.2).rotation.y = -0.07;
  faceUp(mesh(new THREE.PlaneGeometry(0.15, 0.22), toon('#ffffff', slipTex), 0.02, 0.0575, -0.2, p), 0.07);
  box(p, 0.035, 0.004, 0.035, stamp.study, 0.055, 0.058, -0.275).castShadow = false;   // the stamp's mark
}

// ---------- the tray of cards ----------
// One card still standing in the tray for each one you have left.
function cardTray(p, r) {
  const n = Math.min(24, Math.max(1, r.count));
  box(p, 0.34, 0.02, 0.2, M.planks, 0, 0.01, 0);
  for (const sz of [-0.1, 0.1]) box(p, 0.34, 0.1, 0.02, M.planks, 0, 0.06, sz);
  for (const sx of [-0.17, 0.17]) box(p, 0.02, 0.1, 0.2, M.planks, sx, 0.06, 0);
  const label = canvasTex(320, 120, (c, w, h) => {
    letter(c, r.progress, 16, h / 2 + 18, w - 32, 56);
  });
  mesh(new THREE.PlaneGeometry(0.3, 0.08), toon('#ffffff', label), 0, 0.06, 0.102, p).castShadow = false;
  // the cards, leaning back against each other
  for (let i = 0; i < n; i++) {
    const c = box(p, 0.012, 0.13, 0.17, M.white, -0.14 + (i * 0.28) / Math.max(1, n - 0.5), 0.085, 0);
    c.rotation.z = -0.06;
    c.castShadow = false;
  }
  // the top one face up in front, with what you are learning on it
  const top = canvasTex(380, 260, (c, w, h) => {
    c.lineWidth = 5;
    c.strokeRect(18, 18, w - 36, h - 36);
    letter(c, r.title, 46, 108, w - 92, 42, 2, HAND_SC);
    c.lineWidth = 3;
    inkLine(c, 46, 152, w - 46, 152, 0.8);
    c.font = `30px ${HAND}`;
    c.fillText(r.progress, 46, h - 54);
  });
  box(p, 0.19, 0.002, 0.13, M.white, 0.02, 0.001, 0.22).rotation.y = -0.13;
  faceUp(mesh(new THREE.PlaneGeometry(0.19, 0.13), toon('#ffffff', top), 0.02, 0.003, 0.22, p), 0.13);
}

// One item of the reading list, standing at (x, z) on a top y metres up.
export function readingPiece(p, x, y, z, rotY, item) {
  const r = readingOf(item);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  if (r.kind === 'pct') openBook(g, r);
  else if (r.kind === 'count') cardTray(g, r);
  else closedBook(g, r);
  return { group: g, reading: r };
}

// ---------- the card catalogue's cards ----------
// The open drawer: a card for each thing on your list, with a blue tab, and
// ruled blanks filed behind them.
let blankCard = null;
export function catalogueCards(p, x, y, z, items) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const card = (cz, tex, tab) => {
    const c = box(g, 0.3, 0.19, 0.004, M.white, 0, 0, cz);
    c.rotation.x = -0.1;
    c.castShadow = false;
    const face = mesh(new THREE.PlaneGeometry(0.3, 0.19), toon('#ffffff', tex), 0, 0.0005, cz + 0.004, g);
    face.rotation.x = -0.1;
    face.castShadow = false;
    if (tab) box(g, 0.03, 0.014, 0.004, stamp.study, -0.1, 0.1, cz + 0.005).castShadow = false;
  };
  const rebuild = (list) => {
    g.clear();
    blankCard = blankCard || canvasTex(360, 230, (c, w, h) => ruled(c, w, 70, h - 30, 42));
    const shown = list.slice(0, 3).map(readingOf);
    for (let i = 0; i < 13; i++) {
      const r = shown[i];
      const cz = -0.2 + i * 0.027;
      if (!r) { card(cz, blankCard, false); continue; }
      card(cz, canvasTex(360, 230, (c, w, h) => {
        letter(c, r.title, 30, 44, w - 60, 36, 1, HAND_SC);
        c.lineWidth = 4;
        inkLine(c, 30, 58, w - 30, 58, 0.8);
        ruled(c, w, 112, h - 56, 44);
        c.font = `30px ${HAND}`;
        c.fillText(r.progress, 36, h - 22);
        c.font = `26px ${HAND}`;
        c.fillText(`82${i}.${i + 1}`, w - 110, h - 22);         // its shelf mark
      }), true);
    }
  };
  rebuild(items);
  return { group: g, set: rebuild };
}

// ---------- the date slips ----------
// What the stamp at the counter leaves behind: a slip with today on it.
export function dateSlip(p, x, y, z, rotY, when) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.userData.slip = true;
  p.add(g);
  const tex = canvasTex(300, 200, (c, w, h) => {
    c.lineWidth = 4;
    c.strokeRect(12, 12, w - 24, h - 24);
    c.font = `28px ${HAND_SC}`;
    c.fillText('DATE DUE', 28, 52);
    ruled(c, w, 92, h - 18, 42);
    letter(c, when, 70, 120, w - 140, 44, 1, HAND_SC);
  });
  box(g, 0.15, 0.002, 0.1, M.white, 0, 0, 0).castShadow = false;
  faceUp(mesh(new THREE.PlaneGeometry(0.15, 0.1), toon('#ffffff', tex), 0, 0.0015, 0, g));
  box(g, 0.022, 0.003, 0.022, stamp.study, -0.052, 0.003, -0.012).castShadow = false;   // the stamp's mark
  return g;
}
