// Hand-drawn line-art textures, drawn on a canvas at load time.
// Every texture is one 1m x 1m tile; geometry UVs are in meters (see geo.js).
// Details are sparse on purpose: a few bricks, a few cracks, like an illustrator
// suggesting the material rather than drawing every unit.
import * as THREE from 'three';

const SIZE = 256;
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvas(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, SIZE, SIZE);
  g.strokeStyle = '#111111';
  g.fillStyle = '#111111';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 5;
  draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.userData.lineArt = true; // drawn in the current ink color, not multiplied (see ink.js)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// A line with a little hand tremor.
function line(g, x1, y1, x2, y2, wob = 1.6) {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 24));
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const jx = i === 0 || i === n ? 0 : (rand() - 0.5) * wob * 2;
    const jy = i === 0 || i === n ? 0 : (rand() - 0.5) * wob * 2;
    const x = x1 + (x2 - x1) * t + jx, y = y1 + (y2 - y1) * t + jy;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
}

const S = SIZE;

export const tex = {
  bricks: () => canvas((g) => {
    const rowH = S / 4, brickW = S / 2;
    for (let r = 0; r < 4; r++) {
      const off = r % 2 ? brickW / 2 : 0;
      for (let b = -1; b < 3; b++) {
        if (rand() > 0.38) continue;
        const x = b * brickW + off + 6, y = r * rowH + 6;
        const w = brickW - 12, h = rowH - 12;
        line(g, x, y, x + w, y); line(g, x + w, y, x + w, y + h);
        line(g, x + w, y + h, x, y + h); line(g, x, y + h, x, y);
      }
    }
  }),

  stone: () => canvas((g) => {
    const rowH = S / 2;
    for (let r = 0; r < 2; r++) {
      line(g, 0, r * rowH + 2, S, r * rowH + 2, 2.5);
      const off = r % 2 ? S / 3 : 0;
      for (let x = off; x < S + 1; x += S * 2 / 3) line(g, x % S, r * rowH, x % S + 2, r * rowH + rowH, 2.5);
    }
    for (let i = 0; i < 3; i++) { const x = rand() * S, y = rand() * S; line(g, x, y, x + 14, y + 6, 1); }
  }),

  // One 2m slab per tile (repeat 0.5), only some edges drawn.
  paving: () => {
    const t = canvas((g) => {
      g.lineWidth = 3;
      line(g, 0, 2, S, 2, 2);
      if (rand() > 0.3) line(g, 2, 0, 2, S * 0.6, 2);
      for (let i = 0; i < 3; i++) { const x = rand() * S, y = rand() * S; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
      const x = rand() * S, y = rand() * S; line(g, x, y, x + 18, y + 10, 1); line(g, x + 18, y + 10, x + 26, y + 4, 1);
    });
    t.repeat.set(0.5, 0.5);
    return t;
  },

  shingles: () => canvas((g) => {
    const rowH = S / 4;
    for (let r = 0; r < 4; r++) {
      const y = r * rowH + rowH - 4;
      line(g, 0, y, S, y, 2);
      const off = r % 2 ? S / 8 : 0;
      for (let x = off; x < S; x += S / 4) if (rand() > 0.35) line(g, x, y, x, y - rowH + 8, 1);
    }
  }),

  planks: () => canvas((g) => {
    for (let x = 0; x < S; x += S / 5) line(g, x + 2, 0, x + 2, S, 2);
    for (let i = 0; i < 3; i++) { const x = rand() * S, y = rand() * S; g.beginPath(); g.ellipse(x, y, 7, 4, 0, 0, 7); g.stroke(); }
  }),

  // Wide floorboards: three boards per meter, with a few end joints.
  floorboards: () => canvas((g) => {
    g.lineWidth = 4;
    for (let x = 0; x < S; x += S / 3) {
      line(g, x + 2, 0, x + 2, S, 1.5);
      if (rand() > 0.4) { const y = rand() * S; line(g, x + 2, y, x + S / 3, y, 0.8); }
    }
    for (let i = 0; i < 2; i++) { const x = rand() * S, y = rand() * S; g.beginPath(); g.ellipse(x, y, 6, 3, 0, 0, 7); g.stroke(); }
  }),

  dirt: () => canvas((g) => {
    for (let i = 0; i < 26; i++) { const x = rand() * S, y = rand() * S; g.beginPath(); g.arc(x, y, 1.5 + rand() * 2.5, 0, 7); g.fill(); }
    for (let i = 0; i < 4; i++) { const x = rand() * S, y = rand() * S; line(g, x, y, x + 10, y - 12, 1); line(g, x + 6, y, x + 4, y - 14, 1); }
  }),

  grass: () => canvas((g) => {
    g.lineWidth = 4;
    for (let i = 0; i < 14; i++) {
      const x = rand() * S, y = rand() * S;
      line(g, x, y, x - 4, y - 14, 0.5); line(g, x + 4, y, x + 6, y - 12, 0.5);
    }
  }),

  water: () => canvas((g) => {
    g.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const x = rand() * S, y = rand() * S, w = 26 + rand() * 30;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + w / 4, y - 6, x + w / 2, y);
      g.quadraticCurveTo(x + w * 3 / 4, y + 6, x + w, y); g.stroke();
    }
  }),

  // Rock for the mountains: a few strata and patches of hatching.
  rock: () => canvas((g) => {
    g.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const y = rand() * S; line(g, 0, y, S, y + (rand() - 0.5) * 30, 3); }
    for (let k = 0; k < 3; k++) {
      const x0 = rand() * S, y0 = rand() * S;
      for (let i = 0; i < 5; i++) line(g, x0 + i * 9, y0, x0 + i * 9 + 18, y0 + 26, 1);
    }
  }),

  stripes: () => canvas((g) => {
    g.lineWidth = 4;
    for (let x = -S; x < S * 2; x += 18) line(g, x, S / 2, x + S / 2, S, 0.8);
    line(g, 0, S / 2, S, S / 2, 1); line(g, 0, S - 2, S, S - 2, 1);
  }),

  roofTiles: () => canvas((g) => {
    for (let x = 0; x < S; x += S / 6) line(g, x + 2, 0, x + 2, S, 1.5);
    for (let y = 0; y < S; y += S / 3) if (rand() > 0.3) line(g, 0, y, S, y, 1.5);
  }),

  // 2m x 2m of wall with one window (repeat 0.5).
  facade: () => {
    const t = canvas((g) => {
      const x = S * 0.3, y = S * 0.28, w = S * 0.4, h = S * 0.36;
      line(g, x, y, x + w, y); line(g, x + w, y, x + w, y + h);
      line(g, x + w, y + h, x, y + h); line(g, x, y + h, x, y);
      line(g, x + w / 2, y, x + w / 2, y + h, 0.8);
      line(g, x - 6, y + h + 6, x + w + 6, y + h + 6, 0.8);
    });
    t.repeat.set(0.5, 0.5);
    return t;
  },

  // Roads: a dashed center line along the road's length.
  roadZ: () => canvas((g) => { g.lineWidth = 6; line(g, S / 2, S * 0.1, S / 2, S * 0.55, 0.5); }),
  roadX: () => canvas((g) => { g.lineWidth = 6; line(g, S * 0.1, S / 2, S * 0.55, S / 2, 0.5); }),

  clock: () => {
    const c = canvas((g) => {
      const r = S / 2 - 12;
      g.lineWidth = 8;
      g.beginPath(); g.arc(S / 2, S / 2, r, 0, 7); g.stroke();
      g.lineWidth = 6;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        line(g, S / 2 + Math.cos(a) * r * 0.78, S / 2 + Math.sin(a) * r * 0.78, S / 2 + Math.cos(a) * r * 0.9, S / 2 + Math.sin(a) * r * 0.9, 0);
      }
      // the hands are real objects that tell the time (details.js)
    });
    c.wrapS = c.wrapT = THREE.ClampToEdgeWrapping;
    return c;
  },
};

// For textures drawn elsewhere (a menu board, a house front): the same canvas
// setup and wobbly ink line, so they look and behave like these.
export { canvas as lineArtCanvas, line as inkLine, SIZE as LINE_ART_SIZE };
