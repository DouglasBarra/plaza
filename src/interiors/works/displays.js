// What the Works shows you: the job board by the door, a card on every bay,
// the work itself on the benches, and the finished pieces on the done shelf.
// All of it is drawn from the Projects card's rows, so the shop floor and
// the card always say the same thing.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, STAMPS, stamp, mesh, box, cyl } from '../../kit.js';
import { inkLine } from '../../textures.js';
import { steel, dark } from './materials.js';

const HAND = '"Patrick Hand", "Comic Neue", sans-serif';
const HAND_SC = '"Patrick Hand SC", "Comic Neue", sans-serif';

// A canvas texture redrawn by draw(g, w, h, ...args): ink on paper, or (with
// `lineArt` false) chalk on slate.
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
    g.fillStyle = lineArt ? '#ffffff' : '#23251f';
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

// Break a title into lines that fit, the way a sign writer would.
function wrap(c, text, max, lines = 2) {
  const words = String(text).split(' ');
  const out = [''];
  for (const word of words) {
    const line = out.at(-1) ? `${out.at(-1)} ${word}` : word;
    if (c.measureText(line).width <= max || !out.at(-1)) out[out.length - 1] = line;
    else out.push(word);
  }
  if (out.length > lines) { out.length = lines; out[lines - 1] = `${out[lines - 1].slice(0, -1)}…`; }
  return out;
}

// ---------- the job board ----------
// A slate on a joiner's stand just inside the door: every project, what
// stage it is at, and a pink tick against the ones that are finished.
export function jobBoard(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  const bw = 1.6, bh = 1.15, by = 1.35;
  // the stand: two front legs, a back leg, and a ledge for the chalk
  for (const s of [-1, 1]) {
    const leg = box(g, 0.08, 1.9, 0.08, M.planks, s * (bw / 2 - 0.1), 0.95, 0);
    leg.rotation.z = -s * 0.04;
  }
  const back = box(g, 0.07, 1.85, 0.07, M.planks, 0, 0.92, -0.4);
  back.rotation.x = 0.28;
  box(g, bw, 0.08, 0.18, M.planks, 0, by - bh / 2 - 0.08, 0.06);
  for (let i = 0; i < 3; i++) cyl(g, 0.014, 0.014, 0.08, M.white, -0.3 + i * 0.12, by - bh / 2 - 0.01, 0.1, 6).rotation.z = Math.PI / 2;
  box(g, bw + 0.12, bh + 0.12, 0.06, M.planks, 0, by, 0);                     // the slate's frame
  const t = canvasTex(1040, 760, (c, w, h, rows = [], note = '') => {
    c.font = `72px ${HAND_SC}`;
    c.fillText('On the workbench', 44, 92);
    c.lineWidth = 5;
    inkLine(c, 40, 120, w - 40, 120, 2);
    c.font = `44px ${HAND}`;
    if (!rows.length) { c.fillText('Nothing on the floor today.', 48, 210); return; }
    rows.slice(0, 6).forEach(([title, stage, state], i) => {
      const y = 196 + i * 86, done = state === 'done';
      const name = wrap(c, title, 480, 1)[0];
      const text = done ? name : `${i + 1}.  ${name}`;
      const at = done ? 108 : 48;
      c.fillStyle = '#f2f2ec';
      c.fillText(text, at, y);
      const label = done ? 'finished' : stage || '';
      const lw = c.measureText(label).width;
      c.fillText(label, w - 48 - lw, y);
      // a chalk leader between the two, the way a foreman rules a board
      c.lineWidth = 4;
      for (let dx = at + c.measureText(text).width + 16; dx < w - 62 - lw; dx += 20) inkLine(c, dx, y - 12, dx + 6, y - 12, 1);
      if (done) {                                                             // the tick, in the district's pink
        c.strokeStyle = STAMPS.projects;
        c.lineWidth = 9;
        c.beginPath(); c.moveTo(50, y - 26); c.lineTo(68, y - 6); c.lineTo(94, y - 54); c.stroke();
        c.strokeStyle = '#f2f2ec';
      }
    });
    c.lineWidth = 5;
    inkLine(c, 40, h - 92, w - 40, h - 92, 2);
    c.font = `46px ${HAND_SC}`;
    c.fillText(note, 48, h - 32);
  }, false);
  t.userData.draw();
  const face = mesh(new THREE.PlaneGeometry(bw, bh), toon('#ffffff', t), 0, by, 0.04, g);
  face.castShadow = false;
  box(g, 0.1, 0.1, 0.03, stamp.projects, bw / 2 - 0.12, by - bh / 2 + 0.12, 0.05).castShadow = false;
  return {
    group: g,
    set(rows) {
      const going = rows.filter((r) => r[2] !== 'done').length, done = rows.length - going;
      const note = `${going || 'nothing'} on the go${done ? ` · ${done} finished` : ''}`;
      t.userData.draw(rows, note);
    },
  };
}

// ---------- a bay's card ----------
// The little board at the back of a bench (or on the trestles' stake) that
// says whose work this is and what is being done to it.
export function bayCard(p, [x, y, z]) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const t = canvasTex(520, 320, (c, w, h, title = '', stage = '', done = false) => {
    c.lineWidth = 4;
    inkLine(c, 18, 18, w - 18, 18, 1.5); inkLine(c, w - 18, 18, w - 18, h - 18, 1.5);
    inkLine(c, w - 18, h - 18, 18, h - 18, 1.5); inkLine(c, 18, h - 18, 18, 18, 1.5);
    c.font = `58px ${HAND_SC}`;
    const lines = wrap(c, title || 'Free bench', w - 90, 2);
    lines.forEach((line, i) => c.fillText(line, 42, 104 + i * 62));
    if (title && done) {                                                      // struck through: off the bench
      c.lineWidth = 5;
      lines.forEach((line, i) => inkLine(c, 40, 86 + i * 62, 44 + c.measureText(line).width, 86 + i * 62, 2));
    }
    c.font = `44px ${HAND}`;
    c.fillText(title ? (done ? 'finished · on the shelf' : stage || 'on the bench') : 'waiting for work', 42, h - 56);
  });
  t.userData.draw();
  box(g, 0.62, 0.4, 0.04, M.planks, 0, 0, 0);
  const face = mesh(new THREE.PlaneGeometry(0.56, 0.34), toon('#ffffff', t), 0, 0, 0.025, g);
  face.castShadow = false;
  const dot = box(g, 0.055, 0.055, 0.02, stamp.projects, 0.24, -0.13, 0.035);
  dot.castShadow = false;
  return { group: g, set: (title, stage, done) => t.userData.draw(title, stage, done), dot };
}

// ---------- the work itself ----------
// What shape the work takes: the title says what the thing is, so furniture
// is a carcass, writing is a stack of pages, and anything you can't put a
// chisel to is a model of itself.
export function formFor(title = '') {
  const s = title.toLowerCase();
  if (/shelf|shelves|bookcase|bookshelf|cabinet|cupboard|chair|table|desk|bench|drawer|door|box/.test(s)) return 'carcass';
  if (/tcc|thesis|chapter|book|essay|article|paper|write|writing|draft|letter|report|diary/.test(s)) return 'pages';
  if (/app|site|game|code|plaza|learn|course|study|language|blender|draw|model|town/.test(s)) return 'model';
  return 'frame';
}

// A clamp holding two pieces together.
function clamp(p, x, y, z, span, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 0.03, 0.03, span, steel, 0, 0, 0);
  for (const s of [-1, 1]) box(g, 0.05, 0.14, 0.04, dark, 0, 0.05, s * (span / 2 - 0.03));
  cyl(g, 0.012, 0.012, 0.1, steel, 0, 0.05, span / 2 + 0.03, 5).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.035, 0.008, 4, 10), steel, 0, 0.05, span / 2 + 0.09, g).rotation.y = Math.PI / 2;
  return g;
}

// A cabinet carcass, half built: sides, a fixed shelf, one loose shelf
// leaning against it, and the clamps holding the glue up.
function carcass(g) {
  for (const s of [-1, 1]) box(g, 0.04, 0.52, 0.3, M.planks, s * 0.33, 0.26, 0);
  for (const y of [0.02, 0.5]) box(g, 0.7, 0.04, 0.3, M.planks, 0, y, 0);
  box(g, 0.62, 0.03, 0.28, M.planks, 0, 0.26, 0);
  const loose = box(g, 0.62, 0.03, 0.28, M.planks, 0.1, 0.16, 0.3);
  loose.rotation.set(-1.1, 0.1, 0);
  clamp(g, 0, 0.54, 0, 0.78, Math.PI / 2);
  clamp(g, 0, 0.06, -0.08, 0.78, Math.PI / 2);
}

// A stack of pages with the next one half written, a paperweight on top.
function pages(g) {
  box(g, 0.34, 0.07, 0.46, M.white, -0.1, 0.035, 0);
  for (let i = 0; i < 3; i++) {
    const sheet = box(g, 0.32, 0.006, 0.44, M.white, -0.1 + i * 0.01, 0.075 + i * 0.008, i * 0.01);
    sheet.rotation.y = (i - 1) * 0.04;
    sheet.castShadow = false;
  }
  const open = box(g, 0.33, 0.01, 0.45, M.white, 0.3, 0.012, 0.06);
  open.rotation.y = -0.22;
  for (let i = 0; i < 7; i++) {                                               // ruled lines of writing
    const line = box(g, 0.24, 0.004, 0.012, dark, 0.3, 0.02, -0.12 + i * 0.05);
    line.rotation.y = -0.22;
    line.castShadow = false;
  }
  mesh(new THREE.IcosahedronGeometry(0.06, 0), M.stone, -0.1, 0.11, -0.12, g);  // the paperweight
}

// A model of the thing being made: a baseboard with blocks on it and a
// little tower, the way you build something you can't hold.
function model(g) {
  box(g, 0.8, 0.04, 0.5, M.planks, 0, 0.02, 0);
  const blocks = [[-0.24, 0.14, 0.12, -0.1], [-0.02, 0.22, 0.14, 0.08], [0.2, 0.12, 0.1, -0.12], [0.3, 0.17, 0.12, 0.12]];
  for (const [bx, bh, bw, bz] of blocks) {
    box(g, bw, bh, bw, M.white, bx, 0.04 + bh / 2, bz);
    mesh(new THREE.ConeGeometry(bw * 0.85, bh * 0.5, 4), M.white, bx, 0.04 + bh + bh * 0.25, bz, g).rotation.y = Math.PI / 4;
  }
  cyl(g, 0.045, 0.055, 0.34, M.white, -0.12, 0.21, -0.02, 8);                 // the tower in the middle
  mesh(new THREE.ConeGeometry(0.07, 0.12, 8), M.white, -0.12, 0.44, -0.02, g);
  cyl(g, 0.07, 0.07, 0.02, M.white, 0.12, 0.05, -0.08, 12);                   // the fountain's pool
  box(g, 0.04, 0.03, 0.26, M.dirt, 0.04, 0.05, 0.14).castShadow = false;      // a path across it
}

// A frame, half jointed: stiles and rails with one joint still open.
function frame(g) {
  for (const s of [-1, 1]) box(g, 0.06, 0.07, 0.58, M.planks, s * 0.34, 0.035, 0);
  box(g, 0.74, 0.07, 0.06, M.planks, 0, 0.035, -0.26);
  const loose = box(g, 0.74, 0.07, 0.06, M.planks, 0.06, 0.04, 0.3);
  loose.rotation.y = 0.12;
  for (const s of [-1, 1]) box(g, 0.05, 0.05, 0.05, M.white, s * 0.34, 0.035, 0.26);  // the open tenons
  clamp(g, 0, 0.09, -0.26, 0.86);
}

const FORMS = { carcass, pages, model, frame };

// The stage says what is being done to it, so the tool beside the work
// changes: a sanding block, a brush, a pen, or the mallet and chisel.
function stageTool(g, stage = '') {
  const s = String(stage).toLowerCase();
  if (/sand|smooth/.test(s)) {
    box(g, 0.14, 0.07, 0.09, M.planks, 0.42, 0.04, -0.2);
    box(g, 0.15, 0.02, 0.1, M.dirt, 0.42, 0.005, -0.2).castShadow = false;
    for (let i = 0; i < 4; i++) {
      const curl = mesh(new THREE.TorusGeometry(0.035, 0.008, 4, 9, Math.PI * 1.4), M.white, 0.3 + i * 0.07, 0.012, -0.3 + (i % 2) * 0.06, g);
      curl.rotation.set(Math.PI / 2, i, 0);
      curl.castShadow = false;
    }
  } else if (/paint|varnish|oil|wax|finish/.test(s)) {
    cyl(g, 0.07, 0.07, 0.1, M.white, 0.44, 0.05, -0.18, 12);
    cyl(g, 0.012, 0.012, 0.16, M.planks, 0.3, 0.03, -0.22, 5).rotation.set(0, 0.5, 1.4);
    box(g, 0.05, 0.02, 0.07, dark, 0.22, 0.02, -0.24);
  } else if (/ch\.|chapter|draft|writ|page|edit|read/.test(s)) {
    cyl(g, 0.045, 0.05, 0.06, dark, 0.46, 0.03, -0.2, 10);
    const pen = cyl(g, 0.006, 0.01, 0.2, M.white, 0.38, 0.06, -0.14, 5);
    pen.rotation.set(0.3, 0.4, 1.1);
  } else {
    cyl(g, 0.02, 0.02, 0.22, M.planks, 0.4, 0.03, -0.22, 6).rotation.set(0, 0.4, 1.45);
    box(g, 0.1, 0.09, 0.09, M.planks, 0.52, 0.045, -0.26);
    box(g, 0.03, 0.03, 0.18, steel, 0.3, 0.02, -0.12).rotation.y = 0.5;
  }
}

// The work on a bay, built fresh each time the card changes.
export function buildWork(g, item, scale) {
  const w = new THREE.Group();
  w.scale.setScalar(scale);
  g.add(w);
  FORMS[formFor(item[0])](w);
  stageTool(w, item[1]);
  return w;
}

// ---------- the done shelf's pieces ----------
// A finished project: the same shape, smaller, with a stripe of the shop's
// pink paint across it and a tag in its name.
export function finishedPiece(p, [x, y, z], item) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = -0.2 + Math.random() * 0.4;
  p.add(g);
  const inner = new THREE.Group();
  inner.scale.setScalar(0.42);
  g.add(inner);
  FORMS[formFor(item[0])](inner);
  box(g, 0.22, 0.012, 0.02, stamp.projects, -0.05, 0.035, 0.08).castShadow = false;
  // the tag on its wire, standing beside the piece
  const t = canvasTex(340, 150, (c, w, h, title = '') => {
    c.lineWidth = 4;
    inkLine(c, 10, 10, w - 10, 10, 1.5); inkLine(c, w - 10, 10, w - 10, h - 10, 1.5);
    inkLine(c, w - 10, h - 10, 10, h - 10, 1.5); inkLine(c, 10, h - 10, 10, 10, 1.5);
    c.font = `44px ${HAND}`;
    wrap(c, title, w - 54, 2).forEach((line, i) => c.fillText(line, 26, 62 + i * 48));
  });
  t.userData.draw(item[0]);
  box(g, 0.33, 0.16, 0.02, M.planks, 0.28, 0.1, 0.1);
  const face = mesh(new THREE.PlaneGeometry(0.3, 0.135), toon('#ffffff', t), 0.28, 0.1, 0.112, g);
  face.castShadow = false;
  cyl(g, 0.008, 0.008, 0.1, steel, 0.28, 0.03, 0.1, 5);
  return g;
}

// ---------- the tally by the shelf ----------
// How many are finished, cut into a board with a knife, a stroke each.
export function tally(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  box(g, 0.44, 0.3, 0.04, M.planks, 0, 0, 0);
  const marks = new THREE.Group();
  g.add(marks);
  return {
    group: g,
    set(n) {
      marks.clear();
      for (let i = 0; i < Math.min(n, 15); i++) {
        const row = Math.floor(i / 5), k = i % 5;
        const m = box(marks, 0.012, 0.09, 0.02, dark, -0.16 + k * 0.07, 0.09 - row * 0.1, 0.03);
        m.rotation.z = k === 4 ? 0.9 : 0.05;                                   // the fifth stroke crosses the four
        if (k === 4) { m.scale.y = 1.5; m.position.x -= 0.14; }
        m.castShadow = false;
      }
    },
  };
}
