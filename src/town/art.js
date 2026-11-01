// Line-art for the town: house fronts (one window bay per tile), the ground
// floor's stonework, doors, crossings, railings, hedges, awnings, shop signs,
// and the atlas of rooms seen through the windows (windows.js).
import * as THREE from 'three';
import { lineArtCanvas, inkLine, LINE_ART_SIZE as S } from '../textures.js';

// Where the window sits in a facade tile (fractions of a bay and a story).
// Real windows (windows.js) are cut at exactly this spot.
export const WIN = { u0: 0.3, u1: 0.7, v0: 0.29, v1: 0.82 };

let seed = 97;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const rect = (g, x0, y0, x1, y1, wob = 1.2) => {
  inkLine(g, x0, y0, x1, y0, wob); inkLine(g, x1, y0, x1, y1, wob);
  inkLine(g, x1, y1, x0, y1, wob); inkLine(g, x0, y1, x0, y0, wob);
};

// ---------- facades: one bay wide, one story tall ----------
function bay(g, style) {
  const x0 = WIN.u0 * S, x1 = WIN.u1 * S, y0 = (1 - WIN.v1) * S, y1 = (1 - WIN.v0) * S, xm = (x0 + x1) / 2;
  g.lineWidth = 4;
  if (style === 'shutters') {
    for (const [a, b] of [[x0 - 56, x0 - 5], [x1 + 5, x1 + 56]]) {
      rect(g, a, y0 - 2, b, y1 - 2);
      g.lineWidth = 2.5;
      for (let y = y0 + 8; y < y1 - 6; y += 10) inkLine(g, a + 5, y, b - 5, y + 2, 0.4);
      g.lineWidth = 4;
    }
  }
  if (style === 'bricks') {
    // a flat arch of bricks over the window, and a few bricks showing
    for (let x = x0 - 6; x <= x1 + 6; x += 13) inkLine(g, x, y0 - 4, x + (x - xm) * 0.12, y0 - 20, 0.6);
    inkLine(g, x0 - 10, y0 - 21, x1 + 10, y0 - 21, 1);
    for (let k = 0; k < 4; k++) {
      const bx = rand() * (S - 40), by = 20 + rand() * (S - 60);
      if (bx > x0 - 40 && bx < x1 + 10 && by > y0 - 30 && by < y1 + 10) continue;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2 - r; c++) rect(g, bx + c * 28 + r * 14, by + r * 11, bx + c * 28 + r * 14 + 24, by + r * 11 + 8, 0.4);
    }
  } else {
    // a plain surround with a keystone
    rect(g, x0 - 9, y0 - 9, x1 + 9, y1);
    inkLine(g, xm - 9, y0 - 9, xm - 6, y0 - 22); inkLine(g, xm - 6, y0 - 22, xm + 6, y0 - 22); inkLine(g, xm + 6, y0 - 22, xm + 9, y0 - 9);
    for (let i = 0; i < 2; i++) { const x = rand() * S, y = rand() * S; inkLine(g, x, y, x + 10, y + 5, 0.8); }
  }
  // the window itself (real windows cover it up close; far away it's the window)
  rect(g, x0, y0, x1, y1);
  inkLine(g, xm, y0, xm, y1, 0.8);
  inkLine(g, x0, y0 + (y1 - y0) * 0.28, x1, y0 + (y1 - y0) * 0.28, 0.8);
  // the sill and the floor line
  g.lineWidth = 6; inkLine(g, x0 - 14, y1 + 5, x1 + 14, y1 + 5, 0.6);
  g.lineWidth = 3; inkLine(g, 0, S - 3, S, S - 3, 1);
}

// Rusticated stone for the ground floor (1 m tile).
function plinth(g) {
  g.lineWidth = 4;
  inkLine(g, 0, 3, S, 3, 1.5); inkLine(g, 0, S / 2 + 3, S, S / 2 + 3, 1.5);
  for (const y of [3, S / 2 + 3]) { const x = 30 + rand() * (S - 60); inkLine(g, x, y, x, y + S / 2, 1); }
  for (let i = 0; i < 2; i++) { const x = rand() * S, y = rand() * S; inkLine(g, x, y, x + 12, y + 6, 0.6); }
}

// A front door: two tall panels, a glazed top, a knob. One tile per door.
function doorArt(g) {
  g.lineWidth = 6;
  rect(g, 10, 6, S - 10, S - 4);
  g.lineWidth = 4;
  rect(g, 40, 24, S - 40, 86);
  inkLine(g, S / 2, 24, S / 2, 86, 0.6);
  rect(g, 40, 112, S / 2 - 12, S - 30); rect(g, S / 2 + 12, 112, S - 40, S - 30);
  g.beginPath(); g.arc(S - 54, 150, 7, 0, 7); g.fill();
}

const tile = (draw, repeat = 1) => { const t = lineArtCanvas(draw); t.repeat.set(repeat, repeat); return t; };

export const art = {
  stucco: () => tile((g) => bay(g, 'stucco')),
  bricks: () => tile((g) => bay(g, 'bricks')),
  shutters: () => tile((g) => bay(g, 'shutters')),
  plinth: () => tile(plinth),
  door: () => { const t = lineArtCanvas(doorArt); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; },
  // zebra bars along the road, hatched (1 m tile)
  zebra: () => tile((g) => {
    g.lineWidth = 5;
    rect(g, 20, -4, 140, S + 4, 0.6);
    g.lineWidth = 3;
    for (let y = -40; y < S + 40; y += 16) inkLine(g, 22, y, 138, y + 40, 0.3);
  }),
  // balcony railings: bars between two rails (1 m tile)
  railing: () => tile((g) => {
    g.lineWidth = 7; inkLine(g, 0, 6, S, 6, 0.5);
    g.lineWidth = 4; inkLine(g, 0, S - 20, S, S - 20, 0.5);
    for (let x = 12; x < S; x += 32) inkLine(g, x, 6, x, S - 20, 0.3);
  }),
  // clipped hedges and bushes: little scribbled loops (1 m tile)
  hedge: () => tile((g) => {
    g.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const x = rand() * S, y = rand() * S;
      g.beginPath(); g.arc(x, y, 8 + rand() * 6, Math.PI * (0.9 + rand() * 0.3), Math.PI * 2.1); g.stroke();
    }
  }),
  // awning cloth: wide stripes, every other one hatched (1 m tile)
  awning: () => tile((g) => {
    g.lineWidth = 3;
    for (let x = 0; x < S; x += S / 4) {
      inkLine(g, x + 2, 0, x + 2, S, 0.5);
      if ((x / (S / 4)) % 2 === 0) for (let y = -30; y < S; y += 14) inkLine(g, x + 4, y, x + S / 4 - 2, y + 22, 0.2);
    }
  }),
  // tram tracks: two rails with sleepers between (1 m along the track)
  rails: () => tile((g) => {
    g.lineWidth = 5;
    inkLine(g, S * 0.2, 0, S * 0.2, S, 0.3); inkLine(g, S * 0.8, 0, S * 0.8, S, 0.3);
    g.lineWidth = 3;
    for (let y = 20; y < S; y += S / 2) inkLine(g, S * 0.12, y, S * 0.88, y, 0.5);
  }),
};

// ---------- shop signs: a 2 x 8 atlas of boards ----------
export const SHOPS = ['Bakery', 'Books', 'Café', 'Flowers', 'Grocer', 'Pharmacy', 'Butcher', 'Wine',
  'Hats', 'Toys', 'Tailor', 'Cheese', 'Bistro', 'Barber', 'Shoes', 'Tea Room'];
// which kind of room each shop has behind its window (atlas tiles 8..11)
export const SHOP_ROOM = [0, 1, 0, 2, 2, 2, 0, 2, 3, 1, 3, 0, 0, 3, 3, 0];

export function signAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.lineArt = true;
  const draw = () => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = g.fillStyle = '#111111';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    SHOPS.forEach((name, i) => {
      const x = (i % 2) * 512, y = Math.floor(i / 2) * 128;
      g.lineWidth = 6; g.strokeRect(x + 12, y + 12, 488, 104);
      g.lineWidth = 3; g.strokeRect(x + 22, y + 22, 468, 84);
      g.font = '64px "Patrick Hand SC", "Comic Neue", sans-serif';
      g.fillText(name, x + 256, y + 68);
    });
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.load('64px "Patrick Hand SC"').then(draw).catch(() => {});
  return t;
}
// The UV rectangle of shop sign i in the atlas.
export function signUV(i) {
  const u0 = (i % 2) / 2, v1 = 1 - Math.floor(i / 2) / 8;
  return [u0 + 0.01, v1 - 0.125 + 0.01, u0 + 0.49, v1 - 0.01];
}

// ---------- rooms behind the windows: a 4 x 4 atlas ----------
// Two channels: red is ink (0 where there's a line), green is fill (0 where
// something solid stands). The window shader colors them for day and night.
//   row 0  back walls of rooms      row 1  cut-outs standing in the room
//   row 2  back walls of shops      row 3  curtains and blinds on the glass
const FILL = 'rgb(255,0,255)', INK = 'rgb(0,255,255)', CLEAR = 'rgb(255,255,255)';
function poly(g, pts, fill = true) {
  if (fill) {
    g.fillStyle = FILL; g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath(); g.fill();
  }
  g.strokeStyle = INK;
  pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; inkLine(g, p[0], p[1], q[0], q[1], 0.8); });
}
const box2 = (g, x, y, w, h, fill = true) => poly(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill);
function disc(g, x, y, r, fill = true) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = FILL; g.fill(); }
  g.strokeStyle = INK; g.stroke();
}
const ink = (g, x0, y0, x1, y1) => { g.strokeStyle = INK; inkLine(g, x0, y0, x1, y1, 0.8); };
function clear(g, pts) {
  g.fillStyle = CLEAR; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath(); g.fill();
}

function person(g, x, floorY, h = 150, sitting = false) {
  const head = h * 0.13;
  if (sitting) {
    poly(g, [[x - 22, floorY - 62], [x + 18, floorY - 62], [x + 16, floorY - h * 0.62], [x - 20, floorY - h * 0.62]]);
    disc(g, x - 2, floorY - h * 0.62 - head, head);
  } else {
    poly(g, [[x - 14, floorY], [x - 4, floorY], [x - 2, floorY - h * 0.45], [x + 2, floorY - h * 0.45], [x + 4, floorY], [x + 14, floorY],
      [x + 22, floorY - h * 0.78], [x - 22, floorY - h * 0.78]]);
    disc(g, x, floorY - h * 0.78 - head, head);
  }
}
function picture(g, x, y, w, h) {
  box2(g, x, y, w, h, false); box2(g, x + 7, y + 7, w - 14, h - 14, false);
  ink(g, x + 12, y + h - 14, x + w * 0.45, y + h * 0.4); ink(g, x + w * 0.45, y + h * 0.4, x + w - 12, y + h - 14);
}
function shelfOfBooks(g, x, y, w) {
  ink(g, x, y, x + w, y);
  let bx = x + 4;
  while (bx < x + w - 10) {
    const bw = 6 + rand() * 7, bh = 22 + rand() * 12;
    if (rand() < 0.15) { bx += bw + 4; continue; }
    box2(g, bx, y - bh, bw, bh, rand() < 0.5);
    bx += bw + 1;
  }
}
function plant(g, x, floorY, s = 1) {
  poly(g, [[x - 16 * s, floorY - 34 * s], [x + 16 * s, floorY - 34 * s], [x + 11 * s, floorY], [x - 11 * s, floorY]]);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.45;
    const lx = x + Math.cos(a) * 46 * s, ly = floorY - 34 * s + Math.sin(a) * 60 * s;
    poly(g, [[x, floorY - 34 * s], [lx - 8 * s, ly + 10 * s], [lx, ly], [lx + 8 * s, ly + 12 * s]]);
  }
}

const ROOMS = [
  // 0: a wall of books, a picture over the reading chair
  (g) => {
    box2(g, 6, 40, 120, 216, false);
    for (let y = 80; y < 250; y += 44) shelfOfBooks(g, 8, y, 116);
    picture(g, 150, 70, 70, 54);
    poly(g, [[150, 256], [150, 196], [168, 186], [214, 186], [230, 196], [230, 256]]);
  },
  // 1: a kitchen: cupboards, a shelf of jars, a pendant over the table
  (g) => {
    for (let x = 4; x < 250; x += 62) box2(g, x, 46, 58, 64, false);
    for (let x = 4; x < 250; x += 62) ink(g, x + 44, 92, x + 44, 104);
    box2(g, 0, 176, 256, 80, false);
    ink(g, 0, 190, 256, 190);
    for (let x = 20; x < 240; x += 34) disc(g, x, 160, 9, rand() < 0.5);
    ink(g, 0, 170, 256, 170);
  },
  // 2: a sofa under a big picture, a table lamp
  (g) => {
    picture(g, 60, 52, 120, 84);
    poly(g, [[30, 256], [30, 196], [48, 184], [200, 184], [218, 196], [218, 256]]);
    ink(g, 48, 214, 200, 214);
    box2(g, 222, 210, 30, 46);
    poly(g, [[226, 170], [248, 170], [256, 200], [218, 200]]);
  },
  // 3: a bedroom: headboard, two small pictures, a wardrobe
  (g) => {
    box2(g, 60, 168, 120, 88, false);
    poly(g, [[60, 168], [180, 168], [180, 150], [60, 150]]);
    picture(g, 74, 76, 40, 50); picture(g, 128, 76, 40, 50);
    box2(g, 196, 40, 58, 216); ink(g, 225, 40, 225, 256);
    disc(g, 30, 190, 14); ink(g, 30, 204, 30, 256);
  },
  // 4: somebody standing by a shelf
  (g) => { person(g, 110, 256, 160); shelfOfBooks(g, 170, 120, 70); },
  // 5: somebody in an armchair by a floor lamp
  (g) => {
    poly(g, [[70, 256], [70, 186], [80, 176], [150, 176], [160, 186], [160, 256]]);
    person(g, 114, 256, 150, true);
    ink(g, 190, 256, 190, 110); poly(g, [[172, 110], [208, 110], [200, 82], [180, 82]]);
  },
  // 6: a big plant on a side table
  (g) => { box2(g, 90, 200, 80, 10); ink(g, 98, 210, 98, 256); ink(g, 162, 210, 162, 256); plant(g, 130, 200, 1.2); },
  // 7: somebody at a table under a lamp
  (g) => {
    person(g, 90, 256, 150, true);
    box2(g, 70, 196, 140, 10); ink(g, 80, 206, 80, 256); ink(g, 200, 206, 200, 256);
    disc(g, 170, 186, 10);
  },
  // 8: a food shop: shelves of loaves and jars over a counter
  (g) => {
    for (const y of [70, 110, 150]) {
      ink(g, 0, y, 256, y);
      for (let x = 10; x < 246; x += 30) rand() < 0.5 ? poly(g, [[x, y], [x + 24, y], [x + 20, y - 16], [x + 4, y - 16]]) : disc(g, x + 12, y - 11, 10);
    }
    box2(g, 20, 190, 216, 66); ink(g, 20, 206, 236, 206);
  },
  // 9: a bookshop: shelves wall to wall
  (g) => { for (let y = 60; y < 250; y += 40) shelfOfBooks(g, 0, y, 256); },
  // 10: bottles and jars on shelves
  (g) => {
    for (const y of [60, 110, 160, 210]) {
      ink(g, 0, y, 256, y);
      for (let x = 8; x < 248; x += 18) {
        if (rand() < 0.2) continue;
        if (rand() < 0.5) poly(g, [[x, y], [x + 12, y], [x + 12, y - 22], [x + 8, y - 30], [x + 4, y - 30], [x, y - 22]], rand() < 0.6);
        else box2(g, x, y - 18, 13, 18, rand() < 0.5);
      }
    }
  },
  // 11: clothes on a rail, hats on a shelf
  (g) => {
    ink(g, 10, 90, 246, 90);
    for (let x = 20; x < 236; x += 22) poly(g, [[x, 92], [x + 18, 92], [x + 22, 200], [x - 4, 200]], rand() < 0.6);
    ink(g, 0, 50, 256, 50);
    for (let x = 20; x < 240; x += 50) poly(g, [[x, 50], [x + 34, 50], [x + 28, 30], [x + 6, 30]]);
  },
  // 12: drapes at both sides
  (g) => {
    for (const [a, b] of [[0, 70], [186, 256]]) {
      poly(g, [[a, 0], [b, 0], [b - (a ? 0 : 20), 256], [a + (a ? 20 : 0), 256]]);
      for (let x = a + 14; x < b - 6; x += 16) ink(g, x, 4, x + (a ? 6 : -6), 250);
    }
  },
  // 13: a net curtain over the lower half
  (g) => {
    poly(g, [[0, 140], [256, 140], [256, 256], [0, 256]]);
    ink(g, 0, 148, 256, 148);
    for (let x = 10; x < 256; x += 18) ink(g, x, 150, x, 252);
    clear(g, [[0, 0], [256, 0], [256, 136], [0, 136]]);
  },
  // 14: a blind pulled half down
  (g) => {
    poly(g, [[0, 0], [256, 0], [256, 110], [0, 110]]);
    for (let y = 20; y < 108; y += 18) ink(g, 0, y, 256, y);
    disc(g, 128, 122, 6, false); ink(g, 128, 110, 128, 116);
  },
  // 15: one drape tied back, a pot plant on the sill
  (g) => {
    poly(g, [[0, 0], [90, 0], [40, 130], [60, 256], [0, 256]]);
    for (let x = 14; x < 70; x += 16) ink(g, x, 6, x * 0.5 + 6, 250);
    plant(g, 190, 256, 0.7);
  },
];

export function roomAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = 4 * S;
  const g = c.getContext('2d');
  g.fillStyle = CLEAR; g.fillRect(0, 0, c.width, c.height);
  g.lineCap = g.lineJoin = 'round';
  ROOMS.forEach((draw, i) => {
    g.save();
    g.translate((i % 4) * S, Math.floor(i / 4) * S);
    g.beginPath(); g.rect(0, 0, S, S); g.clip();
    g.lineWidth = 4;
    draw(g);
    g.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}
