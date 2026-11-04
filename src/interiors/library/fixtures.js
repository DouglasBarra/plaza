// The library's furniture: the stacks and the ladder that runs along them,
// the card catalogue, the issue counter with its bell and date stamp, the
// returns shelf and the trolley, the reading table, the stove in the corner,
// the window seat, the globe, the hourglass and the lamps.
import * as THREE from 'three';
import { M, stamp, mesh, box, cyl, slab } from '../../kit.js';
import { clockHands, signBoard } from '../../details.js';
import { steam } from '../../life.js';
import { bookshelf } from '../../decor.js';
import { H, W, D, BAYS, SHELF, RAIL } from './dims.js';
import { brass, iron, hide, cloth, dark, shadeMat, clearGlass, sand, flameA, flameB } from './materials.js';

// ---------- the stacks ----------
// Bays of shelving against the back and left walls, each with a cornice, a
// hand-lettered shelf mark standing on top and a few books left up there.
export function stacks(p, rand) {
  const marks = ['A–F', 'G–L', 'M–R', 'S–Z'];
  BAYS.back.forEach((x, i) => {
    bookshelf(p, x, SHELF.z, 0, rand);
    box(p, 2.34, 0.12, 0.6, M.planks, x, 3.11, SHELF.z + 0.02);          // cornice
    signBoard(p, x - 0.55, 3.32, SHELF.z + 0.08, 0.72, 0.26, marks[i]).rotation.x = 0.16;
    for (let k = 0; k < 3; k++) {
      const b = box(p, 0.3, 0.07, 0.22, M.white, x + 0.55 + (k % 2) * 0.08, 3.21 + k * 0.07, SHELF.z + 0.05);
      b.rotation.y = (k % 2 ? 0.2 : -0.14);
    }
  });
  BAYS.left.forEach((z) => {
    bookshelf(p, SHELF.x, z, Math.PI / 2, rand);
    box(p, 0.6, 0.12, 2.34, M.planks, SHELF.x + 0.02, 3.11, z);
    signBoard(p, SHELF.x + 0.08, 3.32, z, 0.72, 0.26, 'Reference', Math.PI / 2);
  });
}

// ---------- the rolling ladder ----------
// A ladder hooked onto a brass rail across the right-hand bays, leaning in.
// index.js walks it slowly along the rail while nobody is on it.
export function rollingLadder(p) {
  box(p, RAIL.x1 - RAIL.x0 + 0.4, 0.05, 0.05, brass, (RAIL.x0 + RAIL.x1) / 2, RAIL.y, RAIL.z);
  for (const x of [RAIL.x0 - 0.15, RAIL.x1 + 0.15]) {
    cyl(p, 0.035, 0.035, 0.06, brass, x, RAIL.y, RAIL.z, 10).rotation.z = Math.PI / 2;
    box(p, 0.06, 0.26, 0.06, brass, x, RAIL.y - 0.16, RAIL.z - 0.1);
  }
  // it hangs from the rail and its feet stand out in the room
  const g = new THREE.Group();
  g.position.set((RAIL.x0 + RAIL.x1) / 2, RAIL.y, RAIL.z);
  p.add(g);
  const lean = 0.26, h = RAIL.y / Math.cos(lean);
  const frame = new THREE.Group();
  frame.rotation.x = -lean;
  g.add(frame);
  for (const sx of [-0.23, 0.23]) {
    box(frame, 0.07, h, 0.07, M.planks, sx, -h / 2, 0);
    cyl(frame, 0.05, 0.05, 0.05, brass, sx, -0.05, 0.08, 10).rotation.x = Math.PI / 2;        // the rollers on the rail
    cyl(frame, 0.055, 0.055, 0.05, dark, sx, -h + 0.06, 0.05, 10).rotation.x = Math.PI / 2;   // the casters on the floor
  }
  for (let y = -h + 0.3; y < -0.25; y += 0.33) {
    box(frame, 0.46, 0.045, 0.09, M.planks, 0, y, 0);
    box(frame, 0.46, 0.02, 0.02, M.white, 0, y + 0.03, 0.05).castShadow = false;
  }
  // a book left on a low rung, waiting to go back up
  box(frame, 0.24, 0.05, 0.17, M.white, 0.06, -h + 1.02, 0.07).rotation.y = 0.2;
  return { group: g, set: (x) => { g.position.x = x; } };
}

// ---------- the card catalogue ----------
// A cabinet of little drawers with brass pulls and a card holder on each, one
// drawer pulled out, a sloped top with the blank slips and a pencil on a
// string. Returns the open drawer, for the cards to be filed in.
export function catalogue(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  const CW = 2.0, CH = 1.2, CD = 0.62;
  box(g, CW, 0.12, CD, M.planks, 0, 0.06, 0);                               // the plinth
  box(g, CW, CH, CD, M.planks, 0, 0.12 + CH / 2, 0);
  box(g, CW + 0.1, 0.07, CD + 0.08, M.planks, 0, CH + 0.19, 0);             // the top
  const cols = 5, rows = 4, dw = (CW - 0.14) / cols, dh = (CH - 0.12) / rows;
  const open = { col: 2, row: 3 };          // the one pulled out: the middle of the top row
  let drawer = null;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const dx = -CW / 2 + 0.07 + (c + 0.5) * dw, dy = 0.18 + (r + 0.5) * dh;
    const isOpen = c === open.col && r === open.row;
    const d = new THREE.Group();
    d.position.set(dx, dy, CD / 2 + (isOpen ? 0.34 : 0.01));
    g.add(d);
    box(d, dw - 0.02, dh - 0.02, 0.03, M.planks, 0, 0, 0);                  // the front
    box(d, 0.1, 0.04, 0.012, brass, 0, -dh * 0.22, 0.02);                   // the pull
    box(d, 0.14, 0.055, 0.012, M.white, 0, dh * 0.2, 0.02).castShadow = false;   // the card holder
    if (isOpen) {
      // the drawer's box, pulled out, with its cards standing in it
      for (const sx of [-1, 1]) box(d, 0.015, dh - 0.04, 0.46, M.planks, sx * (dw / 2 - 0.02), 0, -0.25);
      box(d, dw - 0.04, 0.015, 0.46, M.planks, 0, -dh / 2 + 0.03, -0.25);
      drawer = d;
    }
  }
  // the sloped top: a tray of blank slips and a pencil on a string
  const top = new THREE.Group();
  top.position.set(0, CH + 0.23, 0);
  top.rotation.x = -0.12;
  g.add(top);
  for (let i = 0; i < 4; i++) box(top, 0.2, 0.004, 0.14, M.white, -0.72 + (i % 2) * 0.02, 0.01 + i * 0.005, 0.06).rotation.y = i * 0.14;
  const pencil = cyl(top, 0.009, 0.009, 0.17, dark, -0.45, 0.02, 0.02, 5);
  pencil.rotation.set(Math.PI / 2, 0, 0.5);
  const string = cyl(top, 0.004, 0.004, 0.3, dark, -0.3, 0.005, -0.08, 3);
  string.rotation.set(0.2, 0, 1.2);
  string.castShadow = false;
  signBoard(g, 0, CH + 0.5, 0.2, 1.3, 0.3, 'Catalogue');
  for (const sx of [-0.6, 0.6]) box(g, 0.05, 0.3, 0.05, M.planks, sx, CH + 0.38, 0.2);
  return { group: g, drawer };
}

// ---------- the issue counter ----------
// Along the front-right of the room, facing in: the returns slot at one end,
// the day book in the middle, and at the far end the bell, the ink pad and
// the date stamp you can press.
export function issueCounter(p, { x0, x1, z }) {
  const g = new THREE.Group();
  p.add(g);
  const len = x1 - x0, cx = (x0 + x1) / 2, front = z - 0.34, back = z + 0.34;
  box(g, len, 1.0, 0.68, M.planks, cx, 0.5, z);
  for (let i = 0; i < 5; i++) box(g, len / 5 - 0.12, 0.56, 0.02, M.planks, x0 + (i + 0.5) * (len / 5), 0.52, front - 0.015);
  box(g, len + 0.16, 0.5, 0.1, M.white, cx, 0.1, front - 0.02);                  // the kick plate
  slab(g, len + 0.2, 0.08, 0.86, hide, M.planks, cx, 1.04, z);                    // the top, leather inlaid
  box(g, len + 0.2, 0.04, 0.9, M.planks, cx, 0.99, z);
  box(g, len, 0.26, 0.2, M.planks, cx, 1.21, back + 0.04);                        // a shelf on her side
  // the returns slot, with a sign over it
  box(g, 0.46, 0.03, 0.12, M.deep, x0 + 0.42, 1.085, z - 0.1).castShadow = false;
  box(g, 0.54, 0.05, 0.2, M.planks, x0 + 0.42, 1.06, z - 0.1);
  signBoard(g, x0 + 0.42, 0.82, front - 0.02, 0.62, 0.2, 'Returns', Math.PI);
  // the day book, open, with a pen beside it
  for (const s of [-1, 1]) box(g, 0.21, 0.035, 0.3, M.white, cx - 0.5 + s * 0.11, 1.1, z).rotation.z = -s * 0.05;
  box(g, 0.46, 0.015, 0.32, dark, cx - 0.5, 1.085, z);
  cyl(g, 0.008, 0.008, 0.16, dark, cx - 0.25, 1.09, z - 0.18, 5).rotation.set(Math.PI / 2, 0, 0.4);
  // the bell: press it and the librarian looks up
  const bell = new THREE.Group();
  bell.position.set(x1 - 0.45, 1.08, z - 0.16);
  g.add(bell);
  cyl(bell, 0.09, 0.1, 0.02, brass, 0, 0.01, 0, 14);
  mesh(new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass, 0, 0.02, 0, bell);
  cyl(bell, 0.012, 0.012, 0.04, brass, 0, 0.11, 0, 8);
  // the date stamp and its pad: the one touch of the district's blue up here
  box(g, 0.12, 0.025, 0.1, M.planks, x1 - 0.25, 1.085, z + 0.16);
  box(g, 0.095, 0.012, 0.075, stamp.study, x1 - 0.25, 1.1, z + 0.16).castShadow = false;
  const press = new THREE.Group();
  press.position.set(x1 - 0.25, 1.08, z - 0.08);
  g.add(press);
  box(press, 0.11, 0.025, 0.09, dark, 0, 0.012, 0);
  cyl(press, 0.014, 0.014, 0.1, M.planks, 0, 0.08, 0, 8);
  mesh(new THREE.SphereGeometry(0.035, 10, 8), M.planks, 0, 0.14, 0, press);
  // the tray the stamped slips land in
  const tray = new THREE.Group();
  tray.position.set(x1 - 0.95, 1.09, z - 0.18);
  g.add(tray);
  box(tray, 0.26, 0.012, 0.2, M.planks, 0, 0, 0);
  for (const sz of [-0.1, 0.1]) box(tray, 0.26, 0.03, 0.012, M.planks, 0, 0.02, sz);
  // her stool, and the sign hanging over the whole thing
  cyl(g, 0.19, 0.19, 0.06, M.planks, cx, 0.62, back + 0.5, 14);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const l = cyl(g, 0.022, 0.028, 0.6, M.planks, cx + Math.cos(a) * 0.13, 0.3, back + 0.5 + Math.sin(a) * 0.13, 6);
    l.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1);
  }
  for (const sx of [-0.85, 0.85]) cyl(g, 0.012, 0.012, 1.6, dark, cx + sx, 3.3, z - 0.1, 4).castShadow = false;
  signBoard(g, cx, 2.52, z - 0.1, 2.0, 0.44, 'Issues & Returns', Math.PI);
  return { group: g, bell, press, tray };
}

// ---------- the returns shelf ----------
// Against the right wall: three tiers of books waiting to be put back.
export function returnsShelf(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = -Math.PI / 2;
  p.add(g);
  const len = 1.7;
  for (const sx of [-len / 2, len / 2]) box(g, 0.06, 1.15, 0.42, M.planks, sx, 0.575, 0);
  for (const y of [0.06, 0.45, 0.84, 1.15]) box(g, len, 0.05, 0.42, M.planks, 0, y, 0);
  // books: a lying pile, a leaning run, a stack on its side
  for (let t = 0; t < 3; t++) {
    const y = [0.085, 0.475, 0.865][t];
    let bx = -len / 2 + 0.1;
    for (let i = 0; bx < len / 2 - 0.2 && i < 9; i++) {
      if ((i + t) % 4 === 3) {
        for (let k = 0; k < 3; k++) box(g, 0.24, 0.045, 0.19, M.white, bx + 0.14, y + 0.022 + k * 0.045, 0.02).rotation.y = ((k + i) % 3 - 1) * 0.12;
        bx += 0.3;
      } else {
        const bw = 0.055 + ((i * 7) % 4) * 0.015, bh = 0.26 + ((i * 3) % 3) * 0.04;
        const b = box(g, bw, bh, 0.2, M.white, bx + bw / 2, y + bh / 2, 0.02);
        b.rotation.z = (i + t) % 5 === 4 ? 0.2 : 0;
        bx += bw + 0.014;
      }
    }
  }
  signBoard(g, 0, 1.4, 0.18, 1.0, 0.26, 'To be shelved');
  return g;
}

// ---------- the trolley ----------
// Parked on the floor: two tiers of books on castors, with a push handle.
export function trolley(p, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  for (const sx of [-0.4, 0.4]) box(g, 0.05, 0.84, 0.05, M.planks, sx, 0.46, -0.22);
  for (const sx of [-0.4, 0.4]) box(g, 0.05, 0.56, 0.05, M.planks, sx, 0.32, 0.22);
  for (const y of [0.16, 0.58]) box(g, 0.9, 0.05, 0.5, M.planks, 0, y, 0);
  box(g, 0.9, 0.05, 0.05, M.planks, 0, 0.88, -0.22);                 // the handle
  for (const sx of [-0.36, 0.36]) for (const sz of [-0.2, 0.2]) {
    cyl(g, 0.045, 0.045, 0.03, dark, sx, 0.055, sz, 10).rotation.z = Math.PI / 2;
    box(g, 0.03, 0.08, 0.03, M.white, sx, 0.11, sz);
  }
  for (const [y, lean] of [[0.185, 1], [0.605, -1]]) {
    let bx = -0.4;
    for (let i = 0; bx < 0.3; i++) {
      const bw = 0.06 + ((i * 5) % 4) * 0.016, bh = 0.26 + ((i * 7) % 3) * 0.05;
      const b = box(g, bw, bh, 0.21, M.white, bx + bw / 2, y + bh / 2, -0.04);
      b.rotation.z = i > 4 ? lean * 0.3 : 0;
      bx += bw + 0.012;
    }
    for (let k = 0; k < 2; k++) box(g, 0.26, 0.05, 0.2, M.white, 0.26, y + 0.025 + k * 0.05, 0.1).rotation.y = 0.15 - k * 0.3;
  }
  return g;
}

// ---------- the reading table ----------
// Long, with a leather top, turned legs and a stretcher, and the chairs
// pulled in along three sides (the near one is left for you).
export function readingTable(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  slab(g, 3.4, 0.08, 1.6, M.planks, M.planks, 0, 0.8, 0);
  box(g, 3.1, 0.008, 1.3, hide, 0, 0.844, 0).castShadow = false;       // the leather inlay
  box(g, 3.44, 0.05, 1.64, M.planks, 0, 0.74, 0);
  for (const sx of [-1.45, 1.45]) for (const sz of [-0.6, 0.6]) {
    cyl(g, 0.07, 0.09, 0.72, M.planks, sx, 0.36, sz, 10);
    cyl(g, 0.1, 0.1, 0.1, M.planks, sx, 0.62, sz, 10);
  }
  for (const sx of [-1.45, 1.45]) box(g, 0.08, 0.08, 1.2, M.planks, sx, 0.2, 0);
  box(g, 2.9, 0.08, 0.08, M.planks, 0, 0.2, 0);
  return g;
}

// ---------- the stove ----------
// A pot-bellied iron stove against the right wall, its flue up to the
// ceiling and a kettle muttering on top. Its door glows when the fire is in.
export function stove(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = -Math.PI / 2;        // its front faces into the room
  p.add(g);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    box(g, 0.08, 0.1, 0.08, iron, Math.cos(a) * 0.18, 0.05, Math.sin(a) * 0.18);
  }
  cyl(g, 0.26, 0.24, 0.12, iron, 0, 0.16, 0, 16);
  mesh(new THREE.SphereGeometry(0.31, 18, 12).scale(1, 0.85, 1), iron, 0, 0.45, 0, g);
  cyl(g, 0.22, 0.26, 0.26, iron, 0, 0.78, 0, 16);
  cyl(g, 0.3, 0.3, 0.05, iron, 0, 0.93, 0, 18);
  cyl(g, 0.07, 0.07, H - 0.95, iron, 0, 0.95 + (H - 0.95) / 2, 0, 10);         // the flue
  for (const y of [1.3, 2.1, 2.9]) cyl(g, 0.082, 0.082, 0.05, iron, 0, y, 0, 10);
  // the door: a dark mouth with a grate and a brass handle, the fire inside
  const door = mesh(new THREE.CircleGeometry(0.15, 18), M.deep, 0, 0.45, 0.3, g);
  door.castShadow = false;
  for (let i = -1; i < 2; i++) box(g, 0.26, 0.02, 0.02, iron, 0, 0.45 + i * 0.07, 0.305).castShadow = false;
  mesh(new THREE.TorusGeometry(0.17, 0.022, 6, 20), iron, 0, 0.45, 0.295, g);
  cyl(g, 0.014, 0.014, 0.1, brass, 0.19, 0.45, 0.28, 6).rotation.z = Math.PI / 2;
  const flames = [];
  for (const [fx, fh, mat] of [[-0.055, 0.16, flameA], [0.0, 0.22, flameA], [0.06, 0.13, flameB], [-0.02, 0.1, flameB]]) {
    const f = mesh(new THREE.ConeGeometry(0.045, 1, 6), mat, fx, 0.44, 0.31, g);
    f.castShadow = false;
    f.userData = { h: fh };
    flames.push(f);
  }
  const light = new THREE.PointLight('#ffb070', 0, 6, 1.6);
  light.position.set(0, 0.5, 0.55);
  g.add(light);
  // the kettle on top, and a coal hod beside
  mesh(new THREE.SphereGeometry(0.11, 12, 9).scale(1, 0.8, 1), iron, -0.05, 1.03, 0.02, g);
  cyl(g, 0.035, 0.05, 0.07, iron, -0.05, 1.12, 0.02, 10);
  cyl(g, 0.016, 0.016, 0.1, iron, 0.06, 1.04, 0.07, 6).rotation.set(0.4, 0, -0.9);
  mesh(new THREE.TorusGeometry(0.1, 0.012, 4, 14), iron, -0.05, 1.12, 0.02, g).rotation.y = Math.PI / 2;
  steam(g, -0.03, 1.2, 0.06);
  cyl(g, 0.17, 0.12, 0.26, iron, 0.44, 0.13, 0.22, 12);
  mesh(new THREE.TorusGeometry(0.12, 0.012, 4, 12), iron, 0.44, 0.27, 0.22, g).rotation.x = 1.3;
  for (let i = 0; i < 5; i++) mesh(new THREE.IcosahedronGeometry(0.05, 0), dark, 0.44 + Math.sin(i * 2) * 0.07, 0.25, 0.22 + Math.cos(i * 3) * 0.06, g);
  return { group: g, flames, light, door };
}

// ---------- the window seat ----------
// Built into the reveal under the left window: a cushioned bench, two
// pillows, and a book left open face down where someone got up.
export function windowSeat(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  box(g, 0.66, 0.42, 1.9, M.planks, 0, 0.21, 0);
  box(g, 0.7, 0.05, 1.96, M.planks, 0, 0.44, 0);
  for (const sz of [-0.48, 0.48]) box(g, 0.5, 0.26, 0.02, M.planks, 0.04, 0.24, sz);    // drawer fronts
  for (const sz of [-0.48, 0.48]) box(g, 0.08, 0.03, 0.01, brass, 0.34, 0.24, sz);
  box(g, 0.62, 0.1, 1.84, cloth, 0, 0.51, 0);                                            // the cushion
  for (const sz of [-0.58, 0.56]) {
    const pil = box(g, 0.16, 0.38, 0.42, cloth, -0.22, 0.74, sz);
    pil.rotation.z = -0.22;
  }
  const bk = box(g, 0.26, 0.05, 0.18, M.white, 0.08, 0.58, 0.14);
  bk.rotation.set(0, 0.3, 0.04);
  box(g, 0.28, 0.012, 0.2, dark, 0.08, 0.61, 0.14).rotation.y = 0.3;
  return g;
}

// ---------- the globe ----------
// On a stand by the window, in a brass meridian, tilted as the earth is.
export function globeStand(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  cyl(g, 0.12, 0.26, 0.08, M.planks, 0, 0.04, 0, 14);
  cyl(g, 0.05, 0.07, 0.72, M.planks, 0, 0.44, 0, 10);
  cyl(g, 0.11, 0.11, 0.05, M.planks, 0, 0.82, 0, 14);
  const tilt = new THREE.Group();
  tilt.position.set(0, 1.26, 0);
  tilt.rotation.z = 0.41;
  g.add(tilt);
  mesh(new THREE.TorusGeometry(0.44, 0.022, 6, 32), brass, 0, 0, 0, tilt);
  cyl(tilt, 0.012, 0.012, 0.94, brass, 0, 0, 0, 6);
  const ball = new THREE.Group();
  tilt.add(ball);
  mesh(new THREE.IcosahedronGeometry(0.4, 2), M.white, 0, 0, 0, ball);
  mesh(new THREE.TorusGeometry(0.4, 0.008, 4, 28), dark, 0, 0, 0, ball).rotation.x = Math.PI / 2;  // the equator
  for (let i = 0; i < 4; i++) {
    const t = mesh(new THREE.TorusGeometry(0.4, 0.006, 4, 28), dark, 0, 0, 0, ball);
    t.rotation.y = (i / 4) * Math.PI;
    t.castShadow = false;
  }
  // a few blots of land, so it reads as a globe and not a ball
  for (const [a, b, r] of [[0.5, 0.8, 0.14], [2.1, -0.3, 0.17], [3.6, 0.4, 0.11], [4.8, -0.9, 0.09], [5.6, 0.2, 0.13]]) {
    const land = mesh(new THREE.SphereGeometry(r, 8, 6).scale(1, 1, 0.12), dark, Math.cos(a) * Math.cos(b) * 0.4, Math.sin(b) * 0.4, Math.sin(a) * Math.cos(b) * 0.4, ball);
    land.lookAt(0, 0, 0);
    land.castShadow = false;
  }
  return { group: g, ball };
}

// ---------- the hourglass ----------
// A minute glass in a three-post frame: the sand runs through with the real
// minute, and somebody turns it over at the top of each one.
export function hourglass(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const turn = new THREE.Group();
  turn.position.y = 0.13;
  g.add(turn);
  for (const sy of [-0.122, 0.122]) cyl(turn, 0.075, 0.075, 0.016, M.planks, 0, sy, 0, 14);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    cyl(turn, 0.007, 0.007, 0.25, M.planks, Math.cos(a) * 0.065, 0, Math.sin(a) * 0.065, 6);
  }
  const bulb = new THREE.ConeGeometry(0.055, 0.11, 16, 1, true);
  for (const s of [-1, 1]) {
    const b = mesh(bulb, clearGlass, 0, s * 0.058, 0, turn);
    b.rotation.x = s > 0 ? Math.PI : 0;
    b.castShadow = b.receiveShadow = false;
  }
  const grain = new THREE.ConeGeometry(0.05, 0.1, 12);
  const lower = mesh(grain, sand, 0, 0, 0, turn);           // the heap, growing
  const upper = mesh(grain, sand, 0, 0, 0, turn);           // the funnel, draining
  upper.rotation.x = Math.PI;
  for (const m of [lower, upper]) m.castShadow = false;
  const stream = cyl(turn, 0.004, 0.004, 0.03, sand, 0, 0, 0, 4);
  stream.castShadow = false;
  return { group: g, turn, lower, upper, stream };
}

// ---------- lamps ----------
// A reading lamp: a brass stand with a tin shade turned over the page.
export function readingLamp(p, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  cyl(g, 0.08, 0.1, 0.025, brass, 0, 0.012, 0, 14);
  cyl(g, 0.014, 0.014, 0.34, brass, 0, 0.18, 0, 6);
  const shade = mesh(new THREE.ConeGeometry(0.11, 0.13, 14, 1, true), shadeMat, 0, 0.32, 0.03, g);
  shade.rotation.x = 0.35;
  shade.castShadow = false;
  const bulb = mesh(new THREE.SphereGeometry(0.03, 8, 6), M.white, 0, 0.3, 0.04, g);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe9b5', 0, 3.4, 1.6);
  light.position.set(0, 0.24, 0.06);
  g.add(light);
  return { bulb, light };
}

// A pendant over the reading table: a rod from the ceiling and a wide shade.
export function pendant(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, H, z);
  p.add(g);
  const len = H - y;
  cyl(g, 0.014, 0.014, len, dark, 0, -len / 2, 0, 4).castShadow = false;
  const shade = mesh(new THREE.ConeGeometry(0.34, 0.24, 20, 1, true), shadeMat, 0, -len, 0, g);
  shade.castShadow = false;
  mesh(new THREE.TorusGeometry(0.34, 0.015, 5, 24), dark, 0, -len - 0.12, 0, g).castShadow = false;
  const bulb = mesh(new THREE.SphereGeometry(0.06, 10, 8), M.white, 0, -len - 0.08, 0, g);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe6b0', 0, 8, 1.4);
  light.position.set(0, -len - 0.2, 0);
  g.add(light);
  return { bulb, light };
}

// A wall sconce: a bracket, a half shade and a bulb. No light of its own; it
// just warms up with the rest of them in the evening.
export function sconce(p, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 0.1, 0.22, 0.04, M.planks, 0, 0, 0.02);
  cyl(g, 0.012, 0.012, 0.18, brass, 0, 0.04, 0.11, 6).rotation.x = Math.PI / 2;
  const shade = mesh(new THREE.ConeGeometry(0.1, 0.11, 12, 1, true), shadeMat, 0, 0.1, 0.2, g);
  shade.castShadow = false;
  const bulb = mesh(new THREE.SphereGeometry(0.035, 8, 6), M.white, 0, 0.07, 0.2, g);
  bulb.castShadow = false;
  return { bulb };
}

// ---------- the clock ----------
// A round clock on the back wall over the catalogue, telling the real time.
export function wallClock(p, x, y, z, r = 0.34) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const face = mesh(new THREE.CylinderGeometry(r, r, 0.06, 28), [M.white, M.clock, M.white], 0, 0, 0.03, g);
  face.rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(r + 0.03, 0.04, 6, 28), M.planks, 0, 0, 0.05, g);
  box(g, 0.2, 0.1, 0.06, M.planks, 0, -r - 0.06, 0.03);
  const hands = new THREE.Group();
  hands.position.set(0, 0, 0.07);
  g.add(hands);
  clockHands(hands, 0, 0, 0, r * 0.88);
  return g;
}

// Where the sound of a page turning should come from, around the room.
export const readingSpots = () => [
  new THREE.Vector3(-1.0, 1.0, 0.1),
  new THREE.Vector3(3.9, 0.9, -1.2),
  new THREE.Vector3(-5.5, 0.9, 2.2),
  new THREE.Vector3(-4.9, 1.4, -D / 2 + 0.6),
  new THREE.Vector3(W / 2 - 0.6, 1.0, 2.4),
];
