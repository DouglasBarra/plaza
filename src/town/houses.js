// The houses: every block between the streets is built up like an old
// European town. Near the plaza, terraces of narrow town houses line all four
// sides of a block, taller toward the middle, with corner houses, shops on
// the ground floor of the busy streets, balconies, dormers and chimneys, and
// gardens behind them in the courtyard. Further out the houses get lower and
// stand apart in their gardens. One block is a park, one a church square.
//
// Nothing here is a mesh of its own: every wall, roof and window is poured
// into the bags of its material (bag.js), and each bag becomes one mesh.
import * as THREE from 'three';
import { Bag, facadeFrame, wallQuad, reveal, holeyWall, frameBox, gableRoof, hipRoof, mansardRoof, flatRoof } from './bag.js';
import { WIN, SHOPS, SHOP_ROOM, signUV } from './art.js';
import { addWindow, KIND } from './windows.js';
import { STAMPS } from '../kit.js';
import { ROAD_PITCH, ROAD_W, EXTENT, GROUND_Y, rand } from './common.js';

export const SIDEWALK = 2.5;
export const LINE = ROAD_W / 2 + SIDEWALK;   // the building line, from a road's middle
export const NEAR_R = 72;                    // houses this close cast shadows
const DETAIL_R = 104;                        // ...and this close have real windows, doors and shops
const Y0 = GROUND_Y;
const PLAZA_BLOCKS = new Set(['-1,-1', '-1,0', '0,-1', '0,0']);
export const PARK = [-2, 0];                 // the block that is a park
export const CHURCH = [1, -3];               // ...and the one that is a church square

const chance = (p) => rand() < p;
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (a, b) => a + rand() * (b - a);
const STAMP_RGB = Object.values(STAMPS).map((c) => new THREE.Color(c).toArray());
const WHITE = [1, 1, 1];

export const BAGS = ['stucco', 'bricks', 'shutters', 'plinth', 'plain', 'tiles', 'slate', 'flat', 'door', 'win',
  'awning', 'sign', 'railing', 'fence', 'paving', 'hedge', 'gravel', 'stone', 'water'];
function bagSet() {
  const s = {};
  for (const n of BAGS) s[n] = new Bag({ colors: n === 'door' || n === 'awning', win: n === 'win' });
  return s;
}

// The four sides of a footprint as facade frames: s faces +z, n -z, e +x, w -x.
function sideFrame(b, key) {
  const { x0, x1, z0, z1 } = b;
  if (key === 's') return [facadeFrame(x0, z1, 1, 0), x1 - x0];
  if (key === 'n') return [facadeFrame(x1, z0, -1, 0), x1 - x0];
  if (key === 'e') return [facadeFrame(x1, z1, 0, -1), z1 - z0];
  return [facadeFrame(x0, z0, 0, 1), z1 - z0];
}

// ---------- one house ----------
// b: footprint (x0..x1, z0..z1), sides { s, n, e, w: 'street' | 'back' | 'blank' },
// main (the side on the main street), floors above the ground floor, gH and
// sH (ground floor and story heights), bay (window spacing), wall (facade
// texture), roof ('gable' | 'front' | 'hip' | 'mansard' | 'flat'), pitch,
// slate, shops ({ side: sign index }), awning, balconies, panes (lit backs).
function house(T, b) {
  const dist = Math.hypot((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
  const B = dist < NEAR_R ? T.near : T.far;
  const detail = dist < DETAIL_R;
  const H = b.gH + b.floors * b.sH, top = Y0 + H;
  for (const key of ['s', 'n', 'e', 'w']) {
    const kind = b.sides[key];
    const [F, L] = sideFrame(b, key);
    if (kind === 'blank') { wallQuad(B.plain, F, 0, L, Y0, top); continue; }
    const nb = Math.max(1, Math.round(L / b.bay)), bw = L / nb;
    const uv = (s, y) => [s / bw, (y - Y0 - b.gH) / b.sH];
    const shop = b.shops[key];
    if (kind === 'street' && detail) streetFront(T, B, b, F, L, nb, bw, uv, shop);
    else plainFront(B, b, F, L, nb, bw, uv, kind === 'street', shop);
    if (kind === 'street' && b.roof !== 'mansard' && b.roof !== 'flat') frameBox(B.plain, F, 0, L, top - 0.3, top, 0, 0.26);
  }
  roof(T, B, b, top, detail);
}

// A facade drawn on: windows painted on the wall, with flat panes over them
// so they still light up at night.
function plainFront(B, b, F, L, nb, bw, uv, street, shop) {
  const gTop = Y0 + b.gH;
  wallQuad(B[b.wall], F, 0, L, street ? gTop : Y0, Y0 + b.gH + b.floors * b.sH, 0, uv);
  if (street) {
    wallQuad(B.plinth, F, 0, L, Y0, gTop, 0, (s, y) => [s, y - Y0]);
    frameBox(B.plain, F, 0, L, gTop - 0.1, gTop + 0.06, 0, 0.09);
  }
  if (!b.panes && !street) return;
  for (let f = 0; f < b.floors; f++) {
    const yb = gTop + f * b.sH;
    for (let k = 0; k < nb; k++) addWindow(B.win, F, (k + WIN.u0) * bw, (k + WIN.u1) * bw, yb + WIN.v0 * b.sH, yb + WIN.v1 * b.sH, 0.03, rand(), KIND.room);
  }
  if (street && shop !== undefined) {
    for (let k = 0; k < nb; k++) addWindow(B.win, F, k * bw + 0.35, (k + 1) * bw - 0.35, Y0 + 0.6, gTop - 1.0, 0.03, (SHOP_ROOM[shop] + rand() * 0.9) / 4, KIND.shop);
  }
}

// A street front up close: real openings with reveals, sills, panes you can
// see into, a door, perhaps a shop with its sign and awning, and balconies.
function streetFront(T, B, b, F, L, nb, bw, uv, shop) {
  const gTop = Y0 + b.gH, wall = B[b.wall];
  for (let f = 0; f < b.floors; f++) {
    const yb = gTop + f * b.sH;
    const balconyRow = b.balconies && f === 0;
    for (let k = 0; k < nb; k++) {
      const os0 = (k + WIN.u0) * bw, os1 = (k + WIN.u1) * bw;
      const balcony = balconyRow && (nb < 3 || k === Math.floor(nb / 2));
      const oy0 = balcony ? yb + 0.05 : yb + WIN.v0 * b.sH, oy1 = yb + WIN.v1 * b.sH;
      holeyWall(wall, F, k * bw, (k + 1) * bw, yb, yb + b.sH, os0, os1, oy0, oy1, uv);
      reveal(B.plain, F, os0, os1, oy0, oy1, 0.14);
      addWindow(B.win, F, os0, os1, oy0, oy1, -0.12, rand(), KIND.room);
      if (balcony) balconyAt(B, F, os0 - 0.45, os1 + 0.45, yb);
      else frameBox(B.plain, F, os0 - 0.08, os1 + 0.08, oy0 - 0.08, oy0, -0.12, 0.09);
    }
  }
  frameBox(B.plain, F, 0, L, gTop - 0.1, gTop + 0.06, 0, 0.1);
  const puv = (s, y) => [s, y - Y0];
  if (shop === undefined) {
    // a house: a front door in one bay, windows in the others
    const kd = Math.floor(rand() * nb);
    for (let k = 0; k < nb; k++) {
      const c0 = k * bw, c1 = c0 + bw;
      if (k === kd) { doorway(B, F, c0, c1, gTop, puv, Y0 + 2.6); continue; }
      const os0 = (k + WIN.u0) * bw, os1 = (k + WIN.u1) * bw, oy0 = Y0 + 1.15, oy1 = gTop - 0.75;
      holeyWall(B.plinth, F, c0, c1, Y0, gTop, os0, os1, oy0, oy1, puv);
      reveal(B.plain, F, os0, os1, oy0, oy1, 0.18);
      addWindow(B.win, F, os0, os1, oy0, oy1, -0.16, rand(), KIND.ground);
      frameBox(B.plain, F, os0 - 0.08, os1 + 0.08, oy0 - 0.1, oy0, -0.16, 0.1);
    }
    return;
  }
  // a shop: big windows, a door at one end, a signboard and maybe an awning
  const kd = nb > 1 ? (chance(0.5) ? 0 : nb - 1) : -1;
  const wBot = Y0 + 0.6, wTop = gTop - 1.05;
  for (let k = 0; k < nb; k++) {
    const c0 = k * bw, c1 = c0 + bw;
    if (k === kd) { doorway(B, F, c0, c1, gTop, puv, wTop); continue; }
    const os0 = c0 + (k === 0 ? 0.5 : 0.18), os1 = c1 - (k === nb - 1 ? 0.5 : 0.18);
    holeyWall(B.plinth, F, c0, c1, Y0, gTop, os0, os1, wBot, wTop, puv);
    reveal(B.plain, F, os0, os1, wBot, wTop, 0.2);
    addWindow(B.win, F, os0, os1, wBot, wTop, -0.18, (SHOP_ROOM[shop] + rand() * 0.9) / 4, KIND.shop);
    frameBox(B.plain, F, os0 - 0.05, os1 + 0.05, wBot - 0.12, wBot, -0.18, 0.1);
  }
  frameBox(B.plain, F, 0, 0.34, Y0, gTop - 0.9, 0, 0.12);
  frameBox(B.plain, F, L - 0.34, L, Y0, gTop - 0.9, 0, 0.12);
  frameBox(B.plain, F, 0.1, L - 0.1, gTop - 0.95, gTop - 0.15, 0, 0.14);
  const sw = Math.min(L - 0.8, 4.2), sm = L / 2, [u0, v0, u1, v1] = signUV(shop);
  wallQuad(B.sign, F, sm - sw / 2, sm + sw / 2, gTop - 0.9, gTop - 0.2, 0.145,
    (s, y) => [u0 + (u1 - u0) * (s - sm + sw / 2) / sw, v0 + (v1 - v0) * (y - gTop + 0.9) / 0.7]);
  if (b.awning) awning(B, F, 0.4, L - 0.4, wTop + 0.25, chance(0.15) ? pick(STAMP_RGB) : WHITE);
}

// A front door set into the wall, with a stone surround and a step.
function doorway(B, F, c0, c1, gTop, uv, dTop) {
  const m = (c0 + c1) / 2, ds0 = m - 0.6, ds1 = m + 0.6, dy0 = Y0 + 0.15;
  holeyWall(B.plinth, F, c0, c1, Y0, gTop, ds0, ds1, dy0, dTop, uv);
  reveal(B.plain, F, ds0, ds1, dy0, dTop, 0.26);
  B.door.color = chance(0.12) ? pick(STAMP_RGB) : WHITE;
  wallQuad(B.door, F, ds0, ds1, dy0, dTop, -0.25, (s, y) => [(s - ds0) / 1.2, (y - dy0) / (dTop - dy0)]);
  frameBox(B.plain, F, ds0 - 0.22, ds0, Y0, dTop + 0.05, 0, 0.08);
  frameBox(B.plain, F, ds1, ds1 + 0.22, Y0, dTop + 0.05, 0, 0.08);
  frameBox(B.plain, F, ds0 - 0.3, ds1 + 0.3, dTop + 0.05, dTop + 0.32, 0, 0.13);
  frameBox(B.plain, F, ds0 - 0.1, ds1 + 0.1, Y0, Y0 + 0.3, -0.25, 0.32);
}

function balconyAt(B, F, s0, s1, yb) {
  frameBox(B.plain, F, s0, s1, yb - 0.12, yb + 0.05, 0, 0.9, '');
  const r0 = yb + 0.05, r1 = yb + 1.0, t = F.t;
  B.railing.quad(F.p(s0, r0, 0.86), F.p(s1, r0, 0.86), F.p(s1, r1, 0.86), F.p(s0, r1, 0.86), [s0, 0], [s1, 0], [s1, 1], [s0, 1], F.n);
  B.railing.quad(F.p(s0, r0, 0), F.p(s0, r0, 0.86), F.p(s0, r1, 0.86), F.p(s0, r1, 0), [0, 0], [0.86, 0], [0.86, 1], [0, 1], [-t[0], 0, -t[2]]);
  B.railing.quad(F.p(s1, r0, 0), F.p(s1, r0, 0.86), F.p(s1, r1, 0.86), F.p(s1, r1, 0), [0, 0], [0.86, 0], [0.86, 1], [0, 1], t);
}

// A cloth awning over a shop window, sloping out over the sidewalk.
function awning(B, F, s0, s1, y, color) {
  const out = 1.3, drop = 0.55, val = 0.25, sl = Math.hypot(out, drop), n = F.n, t = F.t;
  B.awning.color = color;
  const a = F.p(s0, y, 0), b = F.p(s1, y, 0), c = F.p(s1, y - drop, out), d = F.p(s0, y - drop, out);
  B.awning.quad(a, b, c, d, [s0, sl], [s1, sl], [s1, 0], [s0, 0], [n[0], 2, n[2]]);
  B.plain.quad(a, b, c, d, [s0, 0], [s1, 0], [s1, 1], [s0, 1], [-n[0], -2, -n[2]]);
  B.awning.quad(d, c, F.p(s1, y - drop - val, out), F.p(s0, y - drop - val, out), [s0, 0.3], [s1, 0.3], [s1, 0], [s0, 0], n);
  B.awning.tri(a, d, F.p(s0, y - drop - val, out), [0, 1], [1, 0.3], [1, 0], [-t[0], 0, -t[2]]);
  B.awning.tri(b, c, F.p(s1, y - drop - val, out), [0, 1], [1, 0.3], [1, 0], t);
}

// A dormer window standing out of a roof slope on facade F.
function dormer(B, F, sc, w, dd, yb, h, pitch, roofBag) {
  const s0 = sc - w / 2, s1 = sc + w / 2, yt = yb + h, t = F.t;
  const back = dd + (h + 0.6) / Math.tan(pitch);
  const ws0 = s0 + 0.17, ws1 = s1 - 0.17, wy0 = yb + 0.22, wy1 = yt - 0.2;
  holeyWall(B.plain, F, s0, s1, yb, yt, ws0, ws1, wy0, wy1, (s, y) => [s, y], -dd);
  reveal(B.plain, F, ws0, ws1, wy0, wy1, 0.1, -dd);
  addWindow(B.win, F, ws0, ws1, wy0, wy1, -dd - 0.09, rand(), KIND.attic);
  B.plain.quad(F.p(s0, yb, -dd), F.p(s0, yb, -back), F.p(s0, yt, -back), F.p(s0, yt, -dd), [0, 0], [1, 0], [1, 1], [0, 1], [-t[0], 0, -t[2]]);
  B.plain.quad(F.p(s1, yb, -dd), F.p(s1, yb, -back), F.p(s1, yt, -back), F.p(s1, yt, -dd), [0, 0], [1, 0], [1, 1], [0, 1], t);
  const o = 0.14, yr = yt + w / 2 + o, L = back - dd + o;
  roofBag.quad(F.p(s0 - o, yt - o, -dd + o), F.p(sc, yr, -dd + o), F.p(sc, yr, -back), F.p(s0 - o, yt - o, -back), [0, 0], [1, 0], [1, L], [0, L], [-t[0], 1, -t[2]]);
  roofBag.quad(F.p(s1 + o, yt - o, -dd + o), F.p(sc, yr, -dd + o), F.p(sc, yr, -back), F.p(s1 + o, yt - o, -back), [0, 0], [1, 0], [1, L], [0, L], [t[0], 1, t[2]]);
  B.plain.tri(F.p(s0, yt, -dd), F.p(s1, yt, -dd), F.p(sc, yr - o, -dd), [s0, yt], [s1, yt], [sc, yr], F.n);
}

function chimney(T, B, x, z, y0, y1, smoke) {
  B.plain.box(x - 0.35, x + 0.35, y0, y1, z - 0.25, z + 0.25);
  B.plain.box(x - 0.45, x + 0.45, y1, y1 + 0.12, z - 0.35, z + 0.35);
  if (smoke) T.chimneys.push([x, y1 + 0.2, z]);
}

function roof(T, B, b, top, detail) {
  const { x0, x1, z0, z1, main } = b;
  const alongX = main === 's' || main === 'n';
  const roofBag = b.slate ? B.slate : B.tiles;
  const [F, L] = sideFrame(b, main);
  const depth = alongX ? z1 - z0 : x1 - x0;
  const nb = Math.max(1, Math.round(L / b.bay)), bw = L / nb;
  const smoke = chance(0.3);
  // the chimney stands on the ridge at one end of the house
  const end = chance(0.5) ? 0.55 : L - 0.55;
  const ridgeAt = (s, dIn) => F.p(s, 0, -dIn);
  let ridge;
  if (b.roof === 'gable') {
    const terrace = b.sides.e === 'blank' || b.sides.w === 'blank' || b.sides.s === 'blank' || b.sides.n === 'blank';
    ridge = gableRoof(roofBag, B.plain, x0, x1, z0, z1, top, alongX, b.pitch, 0.4, terrace ? 0 : 0.25);
    if (detail && depth >= 7) {
      for (let k = 0; k < nb; k++) {
        if ((k + nb) % 2 === 0 && nb > 1) continue;
        dormer(B, F, (k + 0.5) * bw, 1.3, 0.75, top + 0.75 * Math.tan(b.pitch) - 0.25, 1.55, b.pitch, roofBag);
      }
    }
    const c = ridgeAt(end, depth / 2);
    chimney(T, B, c[0], c[2], ridge - 1, ridge + 0.9, smoke);
  } else if (b.roof === 'front') {
    ridge = gableRoof(roofBag, B.plain, x0, x1, z0, z1, top, !alongX, b.pitch, 0.3, 0.3);
    if (ridge - top > 2.6) {
      addWindow(B.win, F, L / 2 - 0.45, L / 2 + 0.45, top + 0.5, top + 1.75, 0.03, rand(), KIND.attic);
      frameBox(B.plain, F, L / 2 - 0.55, L / 2 + 0.55, top + 0.4, top + 0.5, 0, 0.1);
    }
    const c = ridgeAt(L / 2, depth - 1.2);
    chimney(T, B, c[0], c[2], ridge - 1.2, ridge + 0.7, smoke);
  } else if (b.roof === 'hip') {
    ridge = hipRoof(roofBag, B.plain, x0, x1, z0, z1, top, b.pitch, 0.45);
    const c = ridgeAt(L / 2 + (chance(0.5) ? 1 : -1), depth / 2);
    chimney(T, B, c[0], c[2], ridge - 1.2, ridge + 0.6, smoke);
  } else if (b.roof === 'mansard') {
    const m = mansardRoof(B.slate, B.slate, B.plain, x0, x1, z0, z1, top);
    if (detail) {
      for (const key of ['s', 'n', 'e', 'w']) {
        if (b.sides[key] !== 'street') continue;
        const [Fk, Lk] = sideFrame(b, key);
        const nk = Math.max(1, Math.round(Lk / b.bay)), bk = Lk / nk;
        for (let k = 0; k < nk; k++) dormer(B, Fk, (k + 0.5) * bk, 1.15, 0.02, top + 0.3, 1.9, 1.2, B.slate);
      }
    }
    const c = ridgeAt(end, depth / 2);
    chimney(T, B, c[0], c[2], m.top - 0.2, m.ridge + 1.0, smoke);
  } else {
    const p = flatRoof(B.flat, B.plain, x0, x1, z0, z1, top);
    const c = ridgeAt(end, depth / 2);
    chimney(T, B, c[0], c[2], top, p + 1.0, smoke);
  }
}

// ---------- blocks ----------
// Which street a side of a block faces, and whether it's a busy one (the
// ring round the plaza and the three streets out of it).
function busy(axisCoord) { return axisCoord === 0 || Math.abs(axisCoord) === ROAD_PITCH; }

function plotSpec(T, b, dist, opts = {}) {
  const base = dist < 70 ? 3 : dist < 100 ? 2 : dist < 135 ? 1 + (chance(0.5) ? 1 : 0) : 1;
  b.floors = Math.min(4, base + (opts.corner && dist < 110 ? 1 : 0) + (dist < 70 && chance(0.2) ? 1 : 0) - (chance(0.15) ? 1 : 0));
  b.floors = Math.max(1, b.floors);
  b.sH = between(2.95, 3.3);
  b.gH = Object.keys(b.shops).length ? 3.9 : between(3.3, 3.6);
  b.bay = between(2.7, 3.4);
  b.wall = pick(['stucco', 'stucco', 'shutters', 'bricks']);
  const r = rand();
  if (opts.corner) b.roof = dist < 90 && r < 0.5 ? 'mansard' : r < 0.85 ? 'hip' : 'flat';
  else if (dist < 85) b.roof = r < 0.3 ? 'mansard' : r < 0.75 ? 'gable' : r < 0.88 ? 'front' : 'flat';
  else b.roof = r < 0.6 ? 'gable' : r < 0.82 ? 'front' : r < 0.92 ? 'hip' : 'flat';
  // a front gable only suits a narrow house
  if (b.roof === 'front' && (b.main === 's' || b.main === 'n' ? b.x1 - b.x0 : b.z1 - b.z0) > 7.5) b.roof = 'gable';
  b.pitch = between(0.6, 0.85);
  b.slate = b.roof === 'mansard' || chance(0.35);
  b.balconies = dist < 95 && chance(0.3);
  b.awning = chance(0.5);
  b.panes = dist < 150;
  return b;
}

// A block built up round its edges, with gardens in the middle.
function perimeterBlock(T, bi, bj, x0, x1, z0, z1, dist) {
  const C = 10;
  const roads = { s: (bj + 1) * ROAD_PITCH, n: bj * ROAD_PITCH, e: (bi + 1) * ROAD_PITCH, w: bi * ROAD_PITCH };
  const shopChance = (key) => (busy(roads[key]) ? (dist < 100 ? 0.85 : 0.3) : dist < 75 ? 0.3 : 0.05);
  const shopsFor = (keys) => {
    const s = {};
    for (const k of keys) if (chance(shopChance(k))) s[k] = Math.floor(rand() * SHOPS.length);
    return s;
  };
  const plots = [];
  // corner houses, a street on two sides
  const corners = [
    [x0, x0 + C, z0, z0 + C, ['n', 'w'], { s: 'blank', e: 'blank' }],
    [x1 - C, x1, z0, z0 + C, ['n', 'e'], { s: 'blank', w: 'blank' }],
    [x0, x0 + C, z1 - C, z1, ['s', 'w'], { n: 'blank', e: 'blank' }],
    [x1 - C, x1, z1 - C, z1, ['s', 'e'], { n: 'blank', w: 'blank' }],
  ];
  for (const [cx0, cx1, cz0, cz1, streets, rest] of corners) {
    const sides = { ...rest };
    for (const k of streets) sides[k] = 'street';
    const main = busy(roads[streets[0]]) || !busy(roads[streets[1]]) ? streets[0] : streets[1];
    plots.push({ x0: cx0, x1: cx1, z0: cz0, z1: cz1, sides, main, shops: shopsFor(streets), corner: true });
  }
  // terraces along each side; now and then a gateway into the courtyard
  const gateSide = chance(0.3) ? pick(['s', 'n', 'e', 'w']) : null;
  for (const key of ['s', 'n', 'e', 'w']) {
    const alongX = key === 's' || key === 'n';
    const a0 = (alongX ? x0 : z0) + C, a1 = (alongX ? x1 : z1) - C;
    const widths = [];
    let rem = a1 - a0;
    while (rem > 9) { const w = between(4.6, 7.5); if (rem - w < 4.6) break; widths.push(w); rem -= w; }
    widths.push(rem);
    const gate = key === gateSide && widths.length > 1 ? Math.floor(rand() * widths.length) : -1;
    let a = a0;
    widths.forEach((w, i) => {
      const D = between(8.2, C);
      const back = { s: 'n', n: 's', e: 'w', w: 'e' }[key];
      const fp = alongX
        ? { x0: a, x1: a + w, z0: key === 's' ? z1 - D : z0, z1: key === 's' ? z1 : z0 + D }
        : { z0: a, z1: a + w, x0: key === 'e' ? x1 - D : x0, x1: key === 'e' ? x1 : x0 + D };
      a += w;
      if (i === gate) { gateway(T, fp, key); return; }
      const sides = { s: 'blank', n: 'blank', e: 'blank', w: 'blank', [key]: 'street', [back]: 'back' };
      plots.push({ ...fp, sides, main: key, shops: shopsFor([key]) });
    });
  }
  for (const p of plots) {
    const d = Math.hypot((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2);
    house(T, plotSpec(T, p, d, { corner: p.corner }));
  }
  courtyard(T, x0 + C, x1 - C, z0 + C, z1 - C, dist);
}

// A gap in a terrace: a wall along the street with a gate into the yard.
function gateway(T, fp, key) {
  const B = Math.hypot(fp.x0, fp.z0) < NEAR_R ? T.near : T.far;
  const [F, L] = sideFrame(fp, key);
  const m = L / 2;
  wallQuad(B.plain, F, 0, m - 1.4, Y0, Y0 + 2.4, -0.15);
  wallQuad(B.plain, F, m + 1.4, L, Y0, Y0 + 2.4, -0.15);
  frameBox(B.plain, F, 0, m - 1.4, Y0 + 2.4, Y0 + 2.6, -0.3, 0.05);
  frameBox(B.plain, F, m + 1.4, L, Y0 + 2.4, Y0 + 2.6, -0.3, 0.05);
  frameBox(B.plain, F, m - 1.6, m - 1.3, Y0, Y0 + 3.0, -0.35, 0.1);
  frameBox(B.plain, F, m + 1.3, m + 1.6, Y0, Y0 + 3.0, -0.35, 0.1);
  // the gate stands open: two leaves swung in
  frameBox(B.fence, F, m - 1.3, m - 1.25, Y0, Y0 + 1.9, -1.4, -0.2);
  frameBox(B.fence, F, m + 1.25, m + 1.3, Y0, Y0 + 1.9, -1.4, -0.2);
  T.trees.round.push({ x: (fp.x0 + fp.x1) / 2 - F.n[0] * 5, z: (fp.z0 + fp.z1) / 2 - F.n[2] * 5, s: between(0.8, 1.05), rot: rand() * 6 });
}

// The gardens in the middle of a block: fences, trees, sheds, washing lines.
function courtyard(T, ix0, ix1, iz0, iz1, dist) {
  const B = dist < NEAR_R ? T.near : T.far;
  const cx = (ix0 + ix1) / 2, cz = (iz0 + iz1) / 2, fh = Y0 + 1.3;
  B.fence.box(cx - 0.03, cx + 0.03, Y0, fh, iz0 - 2, iz1 + 2);
  B.fence.box(ix0 - 2, ix1 + 2, Y0, fh, cz - 0.03, cz + 0.03);
  const quads = [[ix0, cx, iz0, cz], [cx, ix1, iz0, cz], [ix0, cx, cz, iz1], [cx, ix1, cz, iz1]];
  for (const [qx0, qx1, qz0, qz1] of quads) {
    const r = rand();
    if (r < 0.45) T.trees[chance(0.75) ? 'round' : 'poplar'].push({ x: between(qx0 + 1.6, qx1 - 1.6), z: between(qz0 + 1.6, qz1 - 1.6), s: between(0.7, 1.05), rot: rand() * 6 });
    else if (r < 0.65) {
      // a shed against the middle fence
      const sx = qx0 < cx ? cx - 2.6 : cx + 0.2, sz = qz0 < cz ? cz - 2.3 : cz + 0.2;
      B.fence.box(sx, sx + 2.4, Y0, Y0 + 2.1, sz, sz + 2.1);
      B.tiles.quad([sx - 0.15, Y0 + 2.4, sz - 0.2], [sx + 2.55, Y0 + 2.4, sz - 0.2], [sx + 2.55, Y0 + 2.0, sz + 2.3], [sx - 0.15, Y0 + 2.0, sz + 2.3], [0, 0], [2.7, 0], [2.7, 2.5], [0, 2.5], [0, 1, 0.2]);
    } else if (r < 0.85 && dist < 140) {
      // a washing line between two posts
      const alongX = chance(0.5);
      const a = alongX ? [qx0 + 0.8, (qz0 + qz1) / 2] : [(qx0 + qx1) / 2, qz0 + 0.8];
      const b = alongX ? [qx1 - 0.8, a[1]] : [a[0], qz1 - 0.8];
      for (const [px, pz] of [a, b]) B.fence.box(px - 0.05, px + 0.05, Y0, Y0 + 2.1, pz - 0.05, pz + 0.05);
      B.plain.box(Math.min(a[0], b[0]), Math.max(a[0], b[0]) + 0.02, Y0 + 2.0, Y0 + 2.03, Math.min(a[1], b[1]), Math.max(a[1], b[1]) + 0.02);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(len / 0.9);
      for (let i = 1; i < n; i++) {
        const u = i / n;
        T.laundry.push({ x: a[0] + (b[0] - a[0]) * u, y: Y0 + 2.0, z: a[1] + (b[1] - a[1]) * u, rot: alongX ? 0 : Math.PI / 2, w: between(0.45, 0.75), h: between(0.5, 0.9) });
      }
    } else if (chance(0.5)) {
      B.paving.floor(qx0, qx1, qz0, qz1, Y0 + 0.02, 1);
    }
  }
}

// Further out: houses standing apart in their gardens, behind front fences.
function suburbBlock(T, x0, x1, z0, z1) {
  const B = T.far;
  for (const key of ['s', 'n', 'e', 'w']) {
    const alongX = key === 's' || key === 'n';
    const a0 = alongX ? x0 + 1 : z0 + 11, a1 = alongX ? x1 - 1 : z1 - 11;
    let a = a0 + rand() * 3;
    while (true) {
      const w = between(7.5, 10), D = between(7, 9), set = between(2.5, 4);
      if (a + w > a1) break;
      const fp = alongX
        ? { x0: a, x1: a + w, z0: key === 's' ? z1 - set - D : z0 + set, z1: key === 's' ? z1 - set : z0 + set + D }
        : { z0: a, z1: a + w, x0: key === 'e' ? x1 - set - D : x0 + set, x1: key === 'e' ? x1 - set : x0 + set + D };
      if (Math.hypot((fp.x0 + fp.x1) / 2, (fp.z0 + fp.z1) / 2) < EXTENT) {
        const sides = { s: 'back', n: 'back', e: 'back', w: 'back', [key]: 'street' };
        const b = plotSpec(T, { ...fp, sides, main: key, shops: {} }, 150);
        b.roof = chance(0.6) ? 'gable' : 'hip';
        b.panes = false;
        house(T, b);
        // a front fence or hedge along the garden
        const [F] = sideFrame(fp, key);
        if (chance(0.5)) frameBox(B.hedge, F, -1.5, w + 1.5, Y0, Y0 + 1.0, set - 0.6, set - 0.1);
        else frameBox(B.fence, F, -1.5, w + 1.5, Y0, Y0 + 0.9, set - 0.35, set - 0.3);
        for (let i = 0; i < 2; i++) T.trees[chance(0.5) ? 'pine' : 'round'].push({ x: (fp.x0 + fp.x1) / 2 - F.n[0] * (D + 3 + rand() * 3) + F.t[0] * between(-4, 4), z: (fp.z0 + fp.z1) / 2 - F.n[2] * (D + 3 + rand() * 3) + F.t[2] * between(-4, 4), s: between(0.7, 1.1), rot: rand() * 6 });
      }
      a += w + between(4, 9);
    }
  }
}

// The park: hedges round it, gravel paths to a bandstand, trees, benches, a pond.
function park(T, x0, x1, z0, z1) {
  const B = T.near;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = 2.2;
  // hedges with gaps in the middle of each side and at the corners
  for (const [a0, a1] of [[x0 + 3, cx - hw], [cx + hw, x1 - 3]]) {
    B.hedge.box(a0, a1, Y0, Y0 + 1.0, z0 + 0.3, z0 + 1.1);
    B.hedge.box(a0, a1, Y0, Y0 + 1.0, z1 - 1.1, z1 - 0.3);
  }
  for (const [a0, a1] of [[z0 + 3, cz - hw], [cz + hw, z1 - 3]]) {
    B.hedge.box(x0 + 0.3, x0 + 1.1, Y0, Y0 + 1.0, a0, a1);
    B.hedge.box(x1 - 1.1, x1 - 0.3, Y0, Y0 + 1.0, a0, a1);
  }
  // gravel paths: a cross, the diagonals and a ring round the bandstand
  const path = (ax, az, bx, bz, w) => {
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), nx = -dz / l * w / 2, nz = dx / l * w / 2;
    B.gravel.quad([ax + nx, Y0 + 0.03, az + nz], [bx + nx, Y0 + 0.03, bz + nz], [bx - nx, Y0 + 0.03, bz - nz], [ax - nx, Y0 + 0.03, az - nz],
      [ax, az], [bx, bz], [bx + 1, bz + 1], [ax + 1, az + 1], [0, 1, 0]);
  };
  path(cx, z0, cx, z1, 2.6); path(x0, cz, x1, cz, 2.6);
  path(x0 + 1, z0 + 1, x1 - 1, z1 - 1, 2.2); path(x0 + 1, z1 - 1, x1 - 1, z0 + 1, 2.2);
  const ring = new THREE.RingGeometry(4.2, 6.2, 24).rotateX(-Math.PI / 2).translate(cx, Y0 + 0.035, cz);
  B.gravel.geometry(ring, new THREE.Matrix4());
  // the bandstand: an eight-sided platform, posts and a pointed roof
  const m = new THREE.Matrix4();
  B.stone.geometry(new THREE.CylinderGeometry(3.6, 3.8, 0.7, 8).translate(cx, Y0 + 0.35, cz), m);
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * Math.PI * 2;
    B.plain.box(cx + Math.cos(a) * 3.2 - 0.09, cx + Math.cos(a) * 3.2 + 0.09, Y0 + 0.7, Y0 + 3.4, cz + Math.sin(a) * 3.2 - 0.09, cz + Math.sin(a) * 3.2 + 0.09);
    B.railing.quad([cx + Math.cos(a) * 3.2, Y0 + 0.7, cz + Math.sin(a) * 3.2], [cx + Math.cos(a + Math.PI / 4) * 3.2, Y0 + 0.7, cz + Math.sin(a + Math.PI / 4) * 3.2],
      [cx + Math.cos(a + Math.PI / 4) * 3.2, Y0 + 1.5, cz + Math.sin(a + Math.PI / 4) * 3.2], [cx + Math.cos(a) * 3.2, Y0 + 1.5, cz + Math.sin(a) * 3.2], [0, 0], [2.4, 0], [2.4, 1], [0, 1], [Math.cos(a + Math.PI / 8), 0, Math.sin(a + Math.PI / 8)]);
  }
  B.slate.geometry(new THREE.ConeGeometry(4.4, 2.6, 8, 1, true).translate(cx, Y0 + 4.7, cz), m);
  B.plain.geometry(new THREE.CylinderGeometry(4.4, 4.4, 0.25, 8, 1, true).translate(cx, Y0 + 3.35, cz), m);
  B.plain.geometry(new THREE.SphereGeometry(0.25, 8, 6).translate(cx, Y0 + 6.1, cz), m);
  // a pond in one quarter
  const px = cx + 7.5, pz = cz + 7.5;
  B.water.geometry(new THREE.CircleGeometry(3.4, 24).rotateX(-Math.PI / 2).translate(px, Y0 + 0.06, pz), m);
  B.stone.geometry(new THREE.TorusGeometry(3.5, 0.18, 4, 24).rotateX(-Math.PI / 2).translate(px, Y0 + 0.08, pz), m);
  // trees round the lawns, clear of the paths
  const spots = [[-9, -4], [-4, -9], [-11, -11], [9, -4], [4, -9], [11, -11], [-9, 4], [-4, 9], [-11, 11], [11, 4], [3.5, 12], [12.5, 2]];
  spots.forEach(([dx, dz], i) => T.trees[i % 4 === 3 ? 'poplar' : 'round'].push({ x: cx + dx + between(-0.6, 0.6), z: cz + dz + between(-0.6, 0.6), s: between(0.9, 1.25), rot: rand() * 6 }));
  // benches facing the paths
  for (const [bx, bz, rot] of [[cx - 1.9, cz - 9, 0], [cx + 1.9, cz + 9, Math.PI], [cx - 9, cz + 1.9, Math.PI / 2], [cx + 9, cz - 1.9, -Math.PI / 2]]) {
    const g = new THREE.BoxGeometry(1.6, 0.08, 0.45).translate(0, 0.45, 0);
    const back = new THREE.BoxGeometry(1.6, 0.4, 0.06).translate(0, 0.75, -0.22);
    const mm = new THREE.Matrix4().makeRotationY(rot + Math.PI / 2).setPosition(bx, Y0, bz);
    B.fence.geometry(g, mm); B.fence.geometry(back, mm);
    for (const lx of [-0.65, 0.65]) B.plain.geometry(new THREE.BoxGeometry(0.08, 0.45, 0.4).translate(lx, 0.22, 0), mm);
  }
  T.parkLamps.push([cx - 1.9, cz - 5], [cx + 1.9, cz + 5], [cx - 5, cz + 1.9], [cx + 5, cz - 1.9]);
}

// A church on a paved square: nave, tower and spire, tall windows.
function churchSquare(T, x0, x1, z0, z1) {
  const B = T.far;
  B.paving.floor(x0 - LINE + ROAD_W / 2 + 0.01, x1 + SIDEWALK - 0.01, z0 - SIDEWALK + 0.01, z1 + SIDEWALK - 0.01, Y0 + 0.15, 1);
  const cx = (x0 + x1) / 2;
  const nx0 = cx - 6, nx1 = cx + 6, nz0 = z0 + 4, nz1 = z1 - 9, wallH = 10;
  const top = Y0 + wallH;
  const sides = { e: [facadeFrame(nx1, nz1, 0, -1), nz1 - nz0], w: [facadeFrame(nx0, nz0, 0, 1), nz1 - nz0] };
  for (const [F, L] of Object.values(sides)) {
    wallQuad(B.stone, F, 0, L, Y0, top);
    for (let s = 3; s < L - 2; s += 4.2) {
      addWindow(B.win, F, s, s + 1.5, Y0 + 3, Y0 + 8.2, 0.03, rand(), KIND.church);
      frameBox(B.stone, F, s - 0.15, s + 1.65, Y0 + 2.8, Y0 + 3.0, 0, 0.15);
      frameBox(B.stone, F, s + 1.8, s + 2.4, Y0, top - 0.5, 0, 0.5); // buttress
    }
  }
  const back = facadeFrame(nx1, nz0, -1, 0);
  wallQuad(B.stone, back, 0, 12, Y0, top);
  addWindow(B.win, back, 4.8, 7.2, Y0 + 3, Y0 + 8.5, 0.03, rand(), KIND.church);
  gableRoof(B.slate, B.stone, nx0, nx1, nz0, nz1, top, false, 0.95, 0.4, 0.3);
  // the tower at the front, with the door, a belfry and a spire
  const tx0 = cx - 3.2, tx1 = cx + 3.2, tz0 = nz1 - 1, tz1 = nz1 + 5.4, tTop = Y0 + 24;
  const front = facadeFrame(nx0, nz1, 1, 0);
  wallQuad(B.stone, front, 0, tx0 - nx0, Y0, top); wallQuad(B.stone, front, tx1 - nx0, 12, Y0, top);
  const tw = [facadeFrame(tx0, tz1, 1, 0), facadeFrame(tx1, tz1, 0, -1), facadeFrame(tx0, tz0, 0, 1), facadeFrame(tx1, tz0, -1, 0)];
  tw.forEach((F, i) => {
    const L = 6.4;
    if (i === 0) {
      holeyWall(B.stone, F, 0, L, Y0, tTop, 2.1, 4.3, Y0 + 0.15, Y0 + 4.2, (s, y) => [s, y]);
      reveal(B.stone, F, 2.1, 4.3, Y0 + 0.15, Y0 + 4.2, 0.5);
      B.door.color = WHITE;
      wallQuad(B.door, F, 2.1, 4.3, Y0 + 0.15, Y0 + 4.2, -0.48, (s, y) => [(s - 2.1) / 2.2, (y - Y0 - 0.15) / 4.05]);
      addWindow(B.win, F, 2.4, 4.0, Y0 + 6, Y0 + 9.5, 0.03, rand(), KIND.church);
    } else wallQuad(B.stone, F, 0, L, Y0, tTop);
    addWindow(B.win, F, 2.2, 4.2, tTop - 5.5, tTop - 1.5, 0.05, rand(), KIND.church);
    frameBox(B.stone, F, -0.2, L + 0.2, tTop - 0.4, tTop, 0, 0.3);
    frameBox(B.stone, F, 1.9, 4.5, tTop - 5.8, tTop - 5.5, 0, 0.2);
  });
  hipRoof(B.slate, B.stone, tx0, tx1, tz0, tz1, tTop, 1.35, 0.25);
  B.plain.box(cx - 0.05, cx + 0.05, tTop + 10.5, tTop + 13, tz0 + 3.15, tz0 + 3.25);
  B.plain.box(cx - 0.6, cx + 0.6, tTop + 12, tTop + 12.1, tz0 + 3.15, tz0 + 3.25);
  // trees on the square
  for (const [dx, dz] of [[-11, -10], [11, -10], [-11, 4], [11, 4], [-11, 12], [11, 12]]) T.trees.round.push({ x: cx + dx, z: (z0 + z1) / 2 + dz, s: 1.0, rot: rand() * 6 });
}

// ---------- the whole town ----------
export function buildHouses() {
  const T = { near: bagSet(), far: bagSet(), chimneys: [], laundry: [], parkLamps: [], trees: { round: [], pine: [], poplar: [] }, blocks: [] };
  const n = Math.ceil(EXTENT / ROAD_PITCH);
  for (let bi = -n; bi < n; bi++) {
    for (let bj = -n; bj < n; bj++) {
      const key = `${bi},${bj}`;
      if (PLAZA_BLOCKS.has(key)) continue;
      const x0 = bi * ROAD_PITCH + LINE, x1 = (bi + 1) * ROAD_PITCH - LINE;
      const z0 = bj * ROAD_PITCH + LINE, z1 = (bj + 1) * ROAD_PITCH - LINE;
      const dist = Math.hypot((x0 + x1) / 2, (z0 + z1) / 2);
      if (dist > EXTENT + 8) continue;
      T.blocks.push({ bi, bj, x0, x1, z0, z1, dist });
      if (bi === PARK[0] && bj === PARK[1]) park(T, x0, x1, z0, z1);
      else if (bi === CHURCH[0] && bj === CHURCH[1]) churchSquare(T, x0, x1, z0, z1);
      else if (dist < 128) perimeterBlock(T, bi, bj, x0, x1, z0, z1, dist);
      else suburbBlock(T, x0, x1, z0, z1);
    }
  }
  return T;
}
