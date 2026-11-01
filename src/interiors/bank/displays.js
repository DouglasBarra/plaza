// The bank's displays: things that show your money, drawn on canvases and
// redrawn when it changes. A split-flap board for the cards, a hand-ruled
// chart of the month's spending, the ticker's paper tape, open ledgers, a
// limit dial, and the gold in the vault.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { inkLine } from '../../textures.js';
import { brass, gold, dark, polished } from './materials.js';

export const money = (n, cur = 'BRL') => (n == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur }).format(n));
const HAND = '"Patrick Hand", "Comic Neue", sans-serif';
const HAND_SC = '"Patrick Hand SC", "Comic Neue", sans-serif';
const MONO = '"DM Mono", ui-monospace, Menlo, monospace';

// A canvas texture redrawn by draw(g, w, h, ...args). `lineArt` ones are
// drawn in ink on paper and follow the day/night theme like every texture.
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
    g.fillStyle = lineArt ? '#ffffff' : '#1d1f1e';
    g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = lineArt ? '#111111' : '#f2f2ec';
    g.lineCap = g.lineJoin = 'round';
    draw(g, w, h, ...args);
    g.restore();
    t.needsUpdate = true;
  };
  // draw again once the hand-lettered fonts have loaded
  document.fonts?.load(`40px ${HAND}`).then(() => t.userData.draw(...last)).catch(() => {});
  return t;
}

// ---------- the split-flap board ----------
// Rows of letter cells; when the text changes, each cell flips through
// letters for a moment before settling, like a station's departures board.
const FLAP = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:/-R$%';
export function flapBoard(p, x, y, z, rotY, cols = 26, rows = 6) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  const cw = 40, ch = 64, pad = 18;
  const W = cols * cw + pad * 2, H = rows * ch + pad * 2;
  let shown = Array.from({ length: rows }, () => ' '.repeat(cols));
  let target = shown.map((r) => r);
  let settle = shown.map((r) => [...r].map(() => 0));
  const t = canvasTex(W, H, (c) => {
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const cx = pad + k * cw, cy = pad + r * ch;
      c.fillStyle = '#2e312f';
      c.fillRect(cx + 2, cy + 3, cw - 4, ch - 6);
      c.fillStyle = '#1d1f1e';
      c.fillRect(cx + 2, cy + ch / 2 - 1, cw - 4, 2);          // the split
      c.fillStyle = r === 0 ? '#1fcf6a' : '#f2f2ec';           // the title row in the district's green
      c.font = `500 44px ${MONO}`;
      c.textAlign = 'center';
      c.fillText(shown[r][k], cx + cw / 2, cy + ch / 2 + 15);
    }
  }, false);
  t.userData.draw();
  const w = 3.6, h = w * H / W;
  box(g, w + 0.24, h + 0.24, 0.16, M.planks, 0, 0, -0.04);
  box(g, w + 0.36, 0.12, 0.26, polished, 0, h / 2 + 0.18, 0);        // a cornice on top
  mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', t), 0, 0, 0.05, g).castShadow = false;
  const pad1 = (s) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^ A-Z0-9.,:/$%-]/g, ' ').slice(0, cols).padEnd(cols);
  return {
    group: g,
    // lines: up to `rows` strings
    set(lines) {
      const next = Array.from({ length: rows }, (_, r) => pad1(lines[r] || ''));
      const now = performance.now();
      settle = next.map((row, r) => [...row].map((ch2, k) => (ch2 === shown[r][k] ? 0 : now + 200 + k * 35 + r * 90 + Math.random() * 250)));
      target = next;
    },
    update() {
      const now = performance.now();
      let changed = false;
      shown = shown.map((row, r) => [...row].map((ch2, k) => {
        const at = settle[r][k];
        if (!at) return ch2;
        changed = true;
        if (now >= at) { settle[r][k] = 0; return target[r][k]; }
        return FLAP[Math.floor(Math.random() * FLAP.length)];
      }).join(''));
      if (changed) t.userData.draw();
    },
  };
}

// ---------- the spending chart ----------
// On an easel: the month's spending by category as hand-ruled, hatched bars.
export function spendingChart(p, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  // the easel: two legs, a back leg, a ledge
  for (const s of [-1, 1]) { const l = box(g, 0.06, 2.4, 0.06, M.planks, s * 0.62, 1.15, 0); l.rotation.z = -s * 0.08; l.rotation.x = 0.1; }
  const back = box(g, 0.06, 2.3, 0.06, M.planks, 0, 1.1, -0.42); back.rotation.x = -0.3;
  box(g, 1.5, 0.06, 0.16, M.planks, 0, 0.82, 0.06);
  const t = canvasTex(640, 800, (c, w, h, rows = [], month = '') => {
    c.font = `56px ${HAND_SC}`;
    c.fillText('Where it went', 36, 76);
    c.font = `36px ${HAND}`;
    c.fillText(month, 36, 122);
    c.lineWidth = 4;
    inkLine(c, 36, 140, w - 36, 140, 1);
    if (!rows.length) { c.font = `40px ${HAND}`; c.fillText('Nothing spent yet', 36, 260); return; }
    const top = rows[0][1] || 1, bh = 64, gap = 22;
    rows.slice(0, 8).forEach(([name, v], i) => {
      const y = 180 + i * (bh + gap), len = Math.max(10, (v / top) * (w - 300));
      c.font = `30px ${HAND}`;
      c.fillText(name.length > 18 ? `${name.slice(0, 17)}…` : name, 36, y + 24);
      c.lineWidth = 3;
      inkLine(c, 36, y + 34, 36 + len, y + 34, 0.8); inkLine(c, 36 + len, y + 34, 36 + len, y + 34 + 24, 0.8);
      inkLine(c, 36 + len, y + 58, 36, y + 58, 0.8); inkLine(c, 36, y + 58, 36, y + 34, 0.8);
      for (let k = 46; k < len; k += 12) inkLine(c, k, y + 56, k + 10, y + 36, 0.3);
      c.font = `28px ${MONO}`;
      c.fillText(money(v).replace('R$', '').trim(), 52 + len, y + 56);
    });
  });
  const board = mesh(new THREE.PlaneGeometry(1.3, 1.62), toon('#ffffff', t), 0, 1.68, 0.06, g);
  board.rotation.x = -0.1;
  board.castShadow = false;
  box(g, 1.38, 1.7, 0.03, M.planks, 0, 1.68, 0.035).rotation.x = -0.1;
  return { group: g, set: (rows, month) => t.userData.draw(rows, month) };
}

// ---------- the ticker ----------
// A stock ticker under a glass dome on a pedestal, printing your latest
// transactions on paper tape that spills into a basket.
export function ticker(p, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  cyl(g, 0.22, 0.3, 1.0, polished, 0, 0.5, 0, 16);                      // pedestal
  cyl(g, 0.34, 0.34, 0.06, polished, 0, 1.03, 0, 20);
  box(g, 0.34, 0.18, 0.24, brass, 0, 1.15, 0);                            // the works
  cyl(g, 0.07, 0.07, 0.26, dark, 0, 1.28, 0, 12).rotation.z = Math.PI / 2; // the tape spool
  const dome = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false });
  mesh(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), dome, 0, 1.06, 0, g).castShadow = false;
  // the basket below, with tape heaped in it
  cyl(g, 0.26, 0.2, 0.36, M.planks, 0.55, 0.18, 0.15, 12);
  for (let i = 0; i < 5; i++) mesh(new THREE.TorusGeometry(0.1 + i * 0.012, 0.012, 3, 14), M.white, 0.55 + Math.sin(i) * 0.05, 0.36 + i * 0.012, 0.15 + Math.cos(i * 2) * 0.05, g).rotation.x = Math.PI / 2 + i * 0.3;
  // the tape: out of the works, over the pedestal's edge, down into the basket
  const t = canvasTex(4096, 64, (c, w, h, text = '') => {
    c.font = `40px ${MONO}`;
    c.fillText(text, 12, 46);
  });
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(0.18, 1);
  const curve = new THREE.CatmullRomCurve3([[0, 1.2, 0.12], [0.1, 1.12, 0.3], [0.32, 1.0, 0.36], [0.46, 0.7, 0.3], [0.53, 0.42, 0.18]].map((v) => new THREE.Vector3(...v)));
  const pts = curve.getPoints(30), pos = [], uv = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    for (const s of [-1, 1]) { pos.push(a.x + s * 0.03, a.y, a.z); uv.push(i / (pts.length - 1), s > 0 ? 1 : 0); }
  }
  const idx = [];
  for (let i = 0; i < pts.length - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const tapeMat = toon('#ffffff', t); tapeMat.side = THREE.DoubleSide;
  mesh(geo, tapeMat, 0, 0, 0, g).castShadow = false;
  let printing = 0;
  return {
    group: g,
    set(text) { t.userData.draw(text); printing = performance.now(); },
    // the tape creeps out while there's news, then rests
    update(time) {
      const fresh = performance.now() - printing < 6000;
      t.offset.x = (fresh ? -time * 0.05 : t.offset.x) % 1;
    },
  };
}

// ---------- ledgers ----------
// A big ledger open on a lectern: the account on the left page, the balance
// and its latest lines on the right, a green ribbon down the middle.
export function ledger(p, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 0.5, 0.06, 0.4, M.planks, 0, 0.03, 0);
  cyl(g, 0.07, 0.09, 1.0, M.planks, 0, 0.55, 0, 10);
  const top = new THREE.Group();
  top.position.set(0, 1.08, 0);
  top.rotation.x = 0.45;                              // tilted toward the reader, the lip at the low edge
  g.add(top);
  box(top, 0.9, 0.05, 0.62, M.planks, 0, 0, 0);
  box(top, 0.86, 0.04, 0.05, M.planks, 0, 0.04, 0.3);                      // the lip the book rests on
  const t = canvasTex(1024, 640, (c, w, h, a = null, lines = []) => {
    c.lineWidth = 3;
    inkLine(c, w / 2, 20, w / 2, h - 20, 0.6);
    for (let y = 150; y < h - 30; y += 44) { inkLine(c, 40, y, w / 2 - 30, y, 0.4); inkLine(c, w / 2 + 30, y, w - 40, y, 0.4); }
    if (!a) { c.font = `44px ${HAND}`; c.fillText('A fresh ledger', 60, 100); return; }
    c.font = `52px ${HAND_SC}`;
    c.fillText(a.name.length > 16 ? `${a.name.slice(0, 15)}…` : a.name, 50, 96);
    c.font = `32px ${HAND}`;
    c.fillText([a.bank, a.type === 'CREDIT' ? 'Credit card' : 'Account'].filter(Boolean).join(' · '), 50, 142);
    if (a.number) c.fillText(`No. ${a.number}`, 50, 186);
    if (a.type === 'CREDIT' && a.limit != null) { c.fillText(`Limit ${money(a.limit, a.currency)}`, 50, 230); c.fillText(`Free ${money(a.available, a.currency)}`, 50, 274); }
    c.font = `30px ${HAND}`;
    c.fillText(a.type === 'CREDIT' ? 'Used' : 'Balance', w / 2 + 50, 70);
    c.font = `500 58px ${MONO}`;
    c.fillText(money(a.type === 'CREDIT' ? a.used ?? a.balance : a.balance, a.currency), w / 2 + 50, 132);
    c.font = `26px ${MONO}`;
    lines.slice(0, 9).forEach((l, i) => {
      const y = 186 + i * 44;
      c.fillText(l.date ? l.date.slice(5).replace('-', '/') : '', w / 2 + 40, y);
      c.fillText(l.description.length > 14 ? `${l.description.slice(0, 13)}…` : l.description, w / 2 + 130, y);
      const v = money(l.amount, a.currency).replace('R$', '').trim();
      c.fillText(v, w - 40 - c.measureText(v).width, y);
    });
  });
  // the book: two page blocks, slightly raised in the middle, and the pages
  for (const s of [-1, 1]) {
    const b = box(top, 0.4, 0.05, 0.5, M.white, s * 0.21, 0.06, 0);
    b.rotation.z = -s * 0.06;
  }
  const page = mesh(new THREE.PlaneGeometry(0.82, 0.51), toon('#ffffff', t), 0, 0.095, 0, top);
  page.rotation.x = -Math.PI / 2;
  page.castShadow = false;
  box(top, 0.03, 0.012, 0.6, stamp.finance, 0, 0.1, 0.05).castShadow = false; // the ribbon
  return { group: g, set: (account, lines) => t.userData.draw(account, lines) };
}

// ---------- the limit dial ----------
// A big brass dial: how much of a card's limit is used. The needle eases.
export function limitDial(p, x, y, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  const r = 0.55;
  cyl(g, r + 0.08, r + 0.08, 0.1, brass, 0, 0, 0, 32).rotation.x = Math.PI / 2;
  const t = canvasTex(512, 512, (c, w, h, label = 'Card limit', used = 0) => {
    const cx = w / 2, cy = h / 2 + 30, R = 200;
    c.lineWidth = 6;
    c.beginPath(); c.arc(cx, cy, R, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.8 + (i / 10) * Math.PI * 1.4, k = i % 5 ? 0.9 : 0.82;
      c.lineWidth = i % 5 ? 3 : 6;
      inkLine(c, cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0);
    }
    for (let a = Math.PI * 0.8 + 1.4 * Math.PI * 0.8; a < Math.PI * 2.2; a += 0.06) {   // hatch the last fifth: the red zone
      inkLine(c, cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88, cx + Math.cos(a + 0.04) * R, cy + Math.sin(a + 0.04) * R, 0);
    }
    c.font = `40px ${HAND_SC}`;
    c.textAlign = 'center';
    c.fillText(label, cx, 92);
    c.font = `500 44px ${MONO}`;
    c.fillText(`${Math.round(used * 100)}%`, cx, cy + 120);
    c.font = `30px ${HAND}`;
    c.fillText('used', cx, cy + 160);
  });
  mesh(new THREE.CircleGeometry(r, 40), toon('#ffffff', t), 0, 0, 0.056, g).castShadow = false;
  // the arc's middle sits 30 px below the face's (of 512 px across 2r)
  const pivotY = -(30 / 512) * 2 * r;
  const needle = new THREE.Group();
  needle.position.set(0, pivotY, 0.07);
  g.add(needle);
  box(needle, 0.025, r * 0.78, 0.015, dark, 0, r * 0.39, 0).castShadow = false;
  cyl(g, 0.05, 0.05, 0.04, brass, 0, pivotY, 0.08, 12).rotation.x = Math.PI / 2;
  let to = 0, at = 0;
  // the canvas measures angles clockwise (y down); the needle points up at rotation 0
  const angle = (k) => -(Math.PI * 0.8 + k * Math.PI * 1.4) - Math.PI / 2;
  return {
    group: g,
    set(label, used) { to = THREE.MathUtils.clamp(used || 0, 0, 1.05); t.userData.draw(label, used || 0); },
    update(dt) { at += (to - at) * Math.min(1, dt * 2.5); needle.rotation.z = angle(at); },
  };
}

// ---------- the gold ----------
// Stacks of gold bars on the vault's shelves: more of them the more cash you
// have (by thousands, then by order of magnitude, so it never overflows).
const barGeo = new THREE.BoxGeometry(0.22, 0.07, 0.11);
barGeo.translate(0, 0.035, 0);
export function goldStacks(p, spots) {
  const inst = new THREE.InstancedMesh(barGeo, gold, spots.length * 10);
  inst.count = 0;
  inst.castShadow = true;
  p.add(inst);
  const o = new THREE.Object3D();
  return {
    set(cash) {
      // 1 bar per R$ 500 up to 20 bars, then slower: never more than all the slots
      const n = Math.min(spots.length * 10, Math.round(cash <= 0 ? 0 : cash < 10000 ? cash / 500 : 20 + Math.log10(cash / 10000) * 30));
      let k = 0;
      for (let i = 0; i < n; i++) {
        const [sx, sy, sz] = spots[i % spots.length], layer = Math.floor(i / spots.length);
        o.position.set(sx + (layer % 2) * 0.02, sy + layer * 0.07, sz);
        o.rotation.y = ((i * 37) % 7 - 3) * 0.015;             // stacked by hand, not quite square
        o.updateMatrix();
        inst.setMatrixAt(k++, o.matrix);
      }
      inst.count = k;
      inst.instanceMatrix.needsUpdate = true;
    },
  };
}
