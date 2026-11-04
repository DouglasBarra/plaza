// The things in the sorting office that your chats actually move: the
// pigeonhole rack (a hole per person, letters standing in the ones who are
// waiting), the brass scale that weighs the day's post, the wire trays on
// the sorting table, the shelf of what nobody has claimed, and the
// postmaster's chalk board by the door.
//
// Each one is redrawn or restacked when the People data changes; nothing here
// knows about the server, only about lists of chats.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl, boxGeo } from '../../kit.js';
import { inkLine } from '../../textures.js';
import { signBoard } from '../../details.js';
import { BACK, RACK, RACK_W, RACK_H, HOLES, QUIET, QUIET_SLOTS } from './dims.js';
import { brass, deal, dark, hollow, sheet } from './materials.js';

const HAND = '"Patrick Hand", "Comic Neue", sans-serif';
const HAND_SC = '"Patrick Hand SC", "Comic Neue", sans-serif';
const PX = 460;        // pixels per metre on the little lettered things

// A canvas texture redrawn by draw(g, w, h, ...args). `lineArt` ones are ink
// on paper and follow the day/night theme; the chalk board is not.
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
  t.userData.draw();
  // draw again once the hand-lettered fonts have loaded
  document.fonts?.load(`40px ${HAND}`).then(() => t.userData.draw(...last)).catch(() => {});
  return t;
}

// ---------- name cards ----------
// A strip of little written-on cards along a shelf's front edge: one cell per
// hole or slot, each with whoever's post goes there. Faces +z; `rotY` turns it.
function labelStrip(p, cells, w, h, x, y, z, rotY = 0) {
  const cw = Math.round((w * PX) / cells), ch = Math.round(h * PX);
  const t = canvasTex(cw * cells, ch, (c, _w, _h, names = []) => {
    c.lineWidth = 2;
    for (let i = 1; i < cells; i++) inkLine(c, i * cw, 3, i * cw, ch - 3, 0.5);
    c.textAlign = 'center';
    for (let i = 0; i < cells; i++) {
      const name = names[i];
      if (!name) continue;
      c.save();
      c.beginPath();
      c.rect(i * cw + 4, 0, cw - 8, ch);
      c.clip();
      let size = Math.round(ch * 0.68);
      c.font = `${size}px ${HAND}`;
      while (size > 10 && c.measureText(name).width > cw - 14) { size -= 2; c.font = `${size}px ${HAND}`; }
      c.fillText(name, i * cw + cw / 2, ch * 0.8);
      c.restore();
    }
  });
  const m = mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', t), x, y, z, p);
  m.rotation.y = rotY;
  m.castShadow = false;
  return { set: (names) => t.userData.draw(names) };
}

// One name, short enough to fit a card: the first word of a person's name,
// or the start of a group's.
const cardName = (c) => {
  const first = String(c.title || '').trim().split(/\s+/)[0] || '?';
  return first.length > 11 ? `${first.slice(0, 10)}…` : first;
};

// ---------- letters ----------
// A letter is a sheet with a small stamp in its corner: the one place the
// district's purple shows up in this room.
const paperGeo = boxGeo(0.4, 0.28, 0.009);
const stampGeo = boxGeo(0.07, 0.07, 0.012);
const STAMP_AT = new THREE.Matrix4().makeTranslation(0.145, 0.095, 0.008);

// A pile of `max` letters standing or lying somewhere, of which `set(n)` are
// there. Two instanced meshes: the paper and the stamps on it.
function letterPile(p, max, place) {
  const paper = new THREE.InstancedMesh(paperGeo, M.white, max);
  const stamps = new THREE.InstancedMesh(stampGeo, stamp.people, max);
  paper.count = stamps.count = 0;
  paper.castShadow = true;
  stamps.castShadow = false;
  p.add(paper, stamps);
  const o = new THREE.Object3D(), m = new THREE.Matrix4();
  return {
    paper,
    set(n) {
      const count = Math.max(0, Math.min(max, Math.round(n)));
      for (let i = 0; i < count; i++) {
        place(o, i);
        o.updateMatrix();
        paper.setMatrixAt(i, o.matrix);
        stamps.setMatrixAt(i, m.multiplyMatrices(o.matrix, STAMP_AT));
      }
      paper.count = stamps.count = count;
      paper.instanceMatrix.needsUpdate = true;
      stamps.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---------- the pigeonhole rack ----------
// Against the back wall: a hole per person with their name on the shelf under
// it, and a letter standing in every hole somebody is waiting in. Empty
// holes, and blank cards, where there is nothing.
export function pigeonholes(p) {
  const { x, y0, depth, cols, rows, hole, high, rib, shelf } = RACK;
  const g = new THREE.Group();
  p.add(g);
  const left = x - RACK_W / 2;
  const zBack = BACK + 0.03, zFront = zBack + depth;
  const inner = depth - 0.05, zc = zBack + 0.05 + inner / 2;
  const shelfY = (i) => y0 + i * (high + shelf);
  const holeX = (k) => left + rib + k * (hole + rib) + hole / 2;

  // the dark back of every hole, then the carcase over it
  box(g, RACK_W, RACK_H, 0.05, hollow, x, y0 + RACK_H / 2, zBack + 0.025).castShadow = false;
  for (let i = 0; i <= rows; i++) box(g, RACK_W, shelf, inner, deal, x, shelfY(i) + shelf / 2, zc);
  for (let k = 0; k <= cols; k++) box(g, rib, RACK_H, inner, deal, holeX(k) - hole / 2 - rib / 2, y0 + RACK_H / 2, zc);
  // a frame round the whole rack, and a cornice on top
  for (const s of [-1, 1]) box(g, 0.07, RACK_H + 0.14, depth + 0.04, deal, x + s * (RACK_W / 2 + 0.035), y0 + RACK_H / 2, zBack + depth / 2);
  for (const y of [y0 - 0.035, y0 + RACK_H + 0.035]) box(g, RACK_W + 0.14, 0.07, depth + 0.04, deal, x, y, zBack + depth / 2);
  box(g, RACK_W + 0.3, 0.1, depth + 0.16, deal, x, y0 + RACK_H + 0.12, zBack + depth / 2 + 0.04);

  // the worktop under it, where the post is laid out before it goes up
  box(g, RACK_W + 0.3, 0.08, 0.6, deal, x, y0 - 0.12, zBack + 0.3);
  for (const sx of [-1, 1]) box(g, 0.1, y0 - 0.16, 0.5, deal, x + sx * (RACK_W / 2 + 0.05), (y0 - 0.16) / 2, zBack + 0.3);
  box(g, RACK_W, 0.5, 0.04, deal, x, 0.3, zBack + 0.56);

  // the name on the shelf under each row of holes, read top row first
  const strips = [];
  for (let i = 0; i < rows; i++) strips.push(labelStrip(g, cols, RACK_W - 0.02, shelf - 0.012, x, shelfY(i) + shelf / 2, zFront + 0.004));

  // up to three letters standing in each hole, leaning back against the dark
  const slots = [];
  for (let d = 0; d < HOLES; d++) {
    const row = rows - 1 - Math.floor(d / cols), k = d % cols;
    slots.push([holeX(k), shelfY(row) + shelf]);
  }
  // they fan back and sideways, so three letters read as three
  const standing = [];
  const letters = letterPile(g, HOLES * 3, (o, i) => {
    const [sx, sy, n] = standing[i];
    o.position.set(sx + n * 0.03 + ((i * 13) % 5 - 2) * 0.004, sy + 0.142 + n * 0.008, zFront - 0.075 - n * 0.03);
    o.rotation.set(-0.2 - n * 0.07, 0, n * 0.05 + ((i * 29) % 7 - 3) * 0.008);
    o.scale.set(0.84, 0.84, 1);
  });

  return {
    group: g,
    letters: letters.paper,     // the standing letters, as one instanced mesh
    // people: the chats, in the order they take the holes (waiting first)
    set(people) {
      standing.length = 0;
      for (let d = 0; d < HOLES; d++) {
        const c = people[d];
        if (!c?.unread || c.muted) continue;
        const [sx, sy] = slots[d];
        for (let n = 0; n < Math.min(3, c.unread); n++) standing.push([sx, sy, n]);
      }
      letters.set(standing.length);
      // the holes fill from the top left, so the top shelf carries the first names
      for (let i = 0; i < rows; i++) {
        const from = (rows - 1 - i) * cols;
        strips[i].set(people.slice(from, from + cols).map(cardName));
      }
    },
  };
}

// ---------- the parcel scale ----------
// On the counter: a brass scale with a dial reading how much post is waiting.
// The pan sinks and the needle swings round as the day fills up.
export function parcelScale(p, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  cyl(g, 0.16, 0.19, 0.05, brass, 0, 0.025, 0, 20);
  cyl(g, 0.035, 0.045, 0.3, brass, 0, 0.2, 0, 12);
  const t = canvasTex(512, 512, (c, w, h, n = 0) => {
    const cx = w / 2, cy = h / 2 + 24, R = 196;
    c.lineWidth = 6;
    c.beginPath(); c.arc(cx, cy, R, Math.PI * 0.78, Math.PI * 2.22); c.stroke();
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * 0.78 + (i / 12) * Math.PI * 1.44, k = i % 3 ? 0.9 : 0.8;
      c.lineWidth = i % 3 ? 3 : 6;
      inkLine(c, cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0);
    }
    c.textAlign = 'center';
    c.font = `38px ${HAND_SC}`;
    c.fillText('Waiting on you', cx, 86);
    c.font = `500 108px ${HAND_SC}`;
    c.fillText(String(n), cx, cy + 104);
    c.font = `30px ${HAND}`;
    c.fillText(n === 1 ? 'letter' : 'letters', cx, cy + 150);
  });
  cyl(g, 0.2, 0.2, 0.06, brass, 0, 0.5, 0, 28).rotation.x = Math.PI / 2;
  mesh(new THREE.CircleGeometry(0.175, 40), toon('#ffffff', t), 0, 0.5, 0.034, g).castShadow = false;
  // the needle, on a pivot a little below the middle of the face
  const pivotY = 0.5 - (24 / 512) * 2 * 0.175;
  const needle = new THREE.Group();
  needle.position.set(0, pivotY, 0.045);
  g.add(needle);
  box(needle, 0.016, 0.145, 0.01, dark, 0, 0.072, 0).castShadow = false;
  cyl(g, 0.022, 0.022, 0.03, brass, 0, pivotY, 0.05, 10).castShadow = false;
  // the pan, hung in front on three wires
  box(g, 0.04, 0.04, 0.34, brass, 0, 0.31, 0.17);
  const pan = new THREE.Group();
  pan.position.set(0, 0.2, 0.22);
  g.add(pan);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    cyl(pan, 0.004, 0.004, 0.11, M.white, Math.cos(a) * 0.14, 0.055, Math.sin(a) * 0.14, 3).castShadow = false;
  }
  cyl(pan, 0.17, 0.15, 0.02, brass, 0, 0, 0, 22);
  const load = letterPile(pan, 10, (o, i) => {
    o.position.set(((i * 17) % 5 - 2) * 0.008, 0.02 + i * 0.011, ((i * 23) % 5 - 2) * 0.008);
    o.rotation.set(-Math.PI / 2, 0, ((i * 31) % 9 - 4) * 0.06);
    o.scale.set(0.46, 0.46, 1);
  });
  const panY = pan.position.y;
  // the canvas measures angles clockwise (y down); the needle points up at 0
  const angle = (k) => -(Math.PI * 0.78 + k * Math.PI * 1.44) - Math.PI / 2;
  let to = 0, at = 0;
  return {
    group: g,
    set(n) { to = THREE.MathUtils.clamp((n || 0) / 12, 0, 1); load.set(n); t.userData.draw(n || 0); },
    update(dt) {
      at += (to - at) * Math.min(1, dt * 2.2);
      needle.rotation.z = angle(at);
      pan.position.y = panY - at * 0.055;
    },
  };
}

// ---------- the wire trays ----------
// Two on the sorting table: what has come in and what has been dealt with.
export function sortTray(p, x, y, z, label) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const w = 0.56, d = 0.42;
  for (const [bw, bd, bx, bz] of [[w, 0.02, 0, -d / 2], [w, 0.02, 0, d / 2], [0.02, d, -w / 2, 0], [0.02, d, w / 2, 0]]) {
    for (const by of [0.03, 0.12]) box(g, bw, 0.015, bd, M.white, bx, by, bz).castShadow = false;
  }
  for (let i = 0; i <= 8; i++) cyl(g, 0.006, 0.006, d, M.white, -w / 2 + (i * w) / 8, 0.075, 0, 4).rotation.x = Math.PI / 2;
  box(g, w, 0.015, d, M.white, 0, 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.012, 0.012, 0.04, M.white, sx * (w / 2 - 0.04), 0.01, sz * (d / 2 - 0.04), 4).castShadow = false;
  signBoard(g, 0, 0.09, d / 2 + 0.02, w - 0.06, 0.08, label);
  const stack = letterPile(g, 14, (o, i) => {
    o.position.set(((i * 19) % 7 - 3) * 0.006, 0.035 + i * 0.012, ((i * 11) % 5 - 2) * 0.008);
    o.rotation.set(-Math.PI / 2, 0, ((i * 37) % 9 - 4) * 0.035);
    o.scale.set(1.08, 1.08, 1);
  });
  return { group: g, set: (n) => stack.set(n) };
}

// ---------- the shelf of what nobody has claimed ----------
// The back corner, a little dusty: a tied bundle for every chat that has gone
// quiet, each on a slot with a name card. Swept and empty when nobody has.
export function quietShelf(p) {
  const { x, w, d, cols, shelves, top } = QUIET;
  const g = new THREE.Group();
  p.add(g);
  const zBack = BACK + 0.03, zc = zBack + d / 2, zFront = zBack + d;
  const slotX = (k) => x - w / 2 + (w / cols) * (k + 0.5);
  const base = shelves[0] - 0.045;                                             // the underside of the bottom shelf
  box(g, w, top - base, 0.05, hollow, x, (top + base) / 2, zBack + 0.025).castShadow = false;  // the dark backs
  for (const sx of [-1, 1]) box(g, 0.08, top + 0.1, d, deal, x + sx * (w / 2 + 0.04), (top + 0.1) / 2, zc);
  box(g, w + 0.24, 0.08, d + 0.1, deal, x, top + 0.14, zc);                    // the top board
  box(g, w, base, d - 0.04, deal, x, base / 2, zc);                            // a cupboard under the shelves
  for (let i = 0; i < cols; i++) box(g, w / cols - 0.1, base - 0.24, 0.03, M.white, slotX(i), base / 2, zFront - 0.01).castShadow = false;
  for (let k = 0; k <= cols; k++) box(g, 0.05, top - base, d - 0.06, deal, x - w / 2 + (w / cols) * k, (top + base) / 2, zc);
  signBoard(g, x - 1.0, top + 0.42, zFront - 0.04, 1.8, 0.3, 'Unclaimed');
  const strips = [];
  for (const y of shelves) {
    box(g, w, 0.09, d, deal, x, y, zc);
    strips.push(labelStrip(g, cols, w - 0.04, 0.075, x, y, zFront + 0.004));
  }
  // a bundle of letters for each slot, tied twice with string and tagged
  const bundles = [];
  for (const y of shelves) for (let k = 0; k < cols; k++) {
    const b = new THREE.Group();
    b.position.set(slotX(k), y + 0.045, zFront - 0.26);
    b.rotation.y = ((k * 17) % 7 - 3) * 0.04;
    b.visible = false;
    g.add(b);
    for (let i = 0; i < 5; i++) {
      const l = box(b, 0.42, 0.015, 0.3, M.white, 0, 0.012 + i * 0.016, 0);
      l.rotation.y = ((i * 23) % 5 - 2) * 0.02;
    }
    for (const sz of [-0.07, 0.07]) box(b, 0.46, 0.09, 0.012, dark, 0, 0.055, sz).castShadow = false;
    box(b, 0.012, 0.09, 0.34, dark, 0, 0.055, 0).castShadow = false;
    box(b, 0.1, 0.008, 0.07, M.white, 0.2, 0.105, 0.1).rotation.y = 0.3;      // its tag
    bundles.push(b);
  }
  // a dust sheet thrown over a heap on the top board, and a cobweb in the corner
  const dustSheet = new THREE.Group();
  dustSheet.position.set(x + w / 2 - 0.62, top + 0.18, zc);
  g.add(dustSheet);
  box(dustSheet, 0.9, 0.2, 0.42, sheet, 0, 0.1, 0);                            // the heap under it
  box(dustSheet, 1.06, 0.03, 0.5, sheet, 0, 0.21, 0);                          // the sheet over the top
  for (const [sx, rz] of [[-0.52, 0.55], [0.52, -0.55]]) {
    box(dustSheet, 0.26, 0.03, 0.46, sheet, sx, 0.11, 0).rotation.z = rz;      // its sides, falling away
  }
  for (const [sz, rx] of [[-0.25, -0.5], [0.25, 0.5]]) {
    box(dustSheet, 1.02, 0.03, 0.22, sheet, 0, 0.13, sz).rotation.x = rx;
  }
  cobweb(g, x + w / 2 + 0.02, top + 0.52, zBack + 0.1);

  return {
    group: g,
    bundles,                    // one per slot; only the used ones are visible
    slots: QUIET_SLOTS,
    set(people) {
      bundles.forEach((b, i) => { b.visible = i < people.length; });
      strips.forEach((s, i) => s.set(people.slice(i * cols, i * cols + cols).map(cardName)));
    },
  };
}

// A cobweb in a corner: a few threads out from it and two slack chords across.
function cobweb(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const thread = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const m = cyl(g, 0.004, 0.004, len, M.white, (x1 + x2) / 2, (y1 + y2) / 2, 0, 3);
    m.rotation.z = Math.atan2(x1 - x2, y2 - y1);
    m.castShadow = false;
  };
  const spokes = [[-0.5, -0.05], [-0.46, -0.3], [-0.26, -0.48], [-0.05, -0.52]];
  for (const [sx, sy] of spokes) thread(0, 0, sx, sy);
  for (const k of [0.45, 0.78]) {
    for (let i = 0; i < spokes.length - 1; i++) {
      thread(spokes[i][0] * k, spokes[i][1] * k, spokes[i + 1][0] * k, spokes[i + 1][1] * k);
    }
  }
  return g;
}

// ---------- the postmaster's chalk board ----------
// An A-board in the lobby, chalked up with how the post stands. The one
// surface in the room that says in words when the office is shut.
export function chalkBoard(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  const bw = 1.0, bh = 0.74;
  const t = canvasTex(760, 560, (c, w, h, state = {}) => {
    const { title = '', rows = [], note = '' } = state;
    c.font = `62px ${HAND_SC}`;
    c.fillText(title, 46, 92);
    c.lineWidth = 4;
    inkLine(c, 42, 118, w - 42, 118, 1.4);
    c.font = `46px ${HAND}`;
    rows.forEach(([label, value], i) => {
      const y = 190 + i * 70;
      c.fillText(label, 52, y);
      const v = String(value);
      c.fillText(v, w - 60 - c.measureText(v).width, y);
    });
    if (note) {
      c.font = `34px ${HAND}`;
      const words = note.split(' ');
      let line = '', y = rows.length ? 190 + rows.length * 70 + 36 : 200;
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (c.measureText(next).width > w - 110) { c.fillText(line, 52, y); y += 44; line = word; } else line = next;
      }
      if (line) c.fillText(line, 52, y);
    }
  }, false);
  // two pairs of legs with a strut between them, and the board on the front
  const front = new THREE.Group();
  front.position.set(0, 0, 0.1);
  front.rotation.x = -0.12;
  g.add(front);
  for (const sx of [-1, 1]) box(front, 0.07, 1.4, 0.05, M.planks, sx * (bw / 2 - 0.03), 0.7, 0);
  box(front, bw + 0.1, 0.07, 0.05, M.planks, 0, 1.4, 0);
  box(front, bw + 0.08, bh + 0.08, 0.05, M.planks, 0, 1.0, 0.01);
  mesh(new THREE.PlaneGeometry(bw, bh), toon('#ffffff', t), 0, 1.0, 0.04, front).castShadow = false;
  const back = new THREE.Group();
  back.position.set(0, 0, -0.1);
  back.rotation.x = 0.12;
  g.add(back);
  for (const sx of [-1, 1]) box(back, 0.07, 1.4, 0.05, M.planks, sx * (bw / 2 - 0.03), 0.7, 0);
  box(back, bw - 0.1, 0.05, 0.04, M.planks, 0, 0.9, 0);
  for (const sx of [-1, 1]) box(g, 0.04, 0.04, 0.3, M.planks, sx * (bw / 2 - 0.06), 0.52, 0);
  // a stub of chalk on the ledge
  box(g, bw + 0.12, 0.05, 0.1, M.planks, 0, 0.56, 0.12).rotation.x = -0.12;
  cyl(g, 0.012, 0.012, 0.07, M.white, 0.3, 0.6, 0.14, 6).rotation.z = Math.PI / 2;
  return { group: g, set: (state) => t.userData.draw(state) };
}
