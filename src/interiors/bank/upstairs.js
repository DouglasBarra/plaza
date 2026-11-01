// The bank's gallery upstairs: the records.
//
// Along the back, a ledger open on a lectern for each account, under the
// founder's portrait, and a board with the year at a glance. In the corner,
// the manager's desk. Down the left side, the statements: card-index
// cabinets with a drawer for every month, and a table to read them at.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { folk } from '../../folks.js';
import { signBoard } from '../../details.js';
import { picture, plant, chair, desk, rug } from '../../decor.js';
import { piece } from '../../layout.js';
import { inkLine } from '../../textures.js';
import { W, D, F, GALLERY } from './dims.js';
import { polished, brass, dark } from './materials.js';
import { ledger, money } from './displays.js';
import { bankersLamp } from './ground-floor.js';

const HAND = '"Patrick Hand", "Comic Neue", sans-serif';
const HAND_SC = '"Patrick Hand SC", "Comic Neue", sans-serif';
const MONO = '"DM Mono", ui-monospace, Menlo, monospace';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.lineArt = true;
  let last = [];
  t.userData.draw = (...args) => {
    last = args;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = '#111111';
    g.lineCap = g.lineJoin = 'round';
    draw(g, w, h, ...args);
    t.needsUpdate = true;
  };
  document.fonts?.load(`40px ${HAND}`).then(() => t.userData.draw(...last)).catch(() => {});
  return t;
}

export function furnishUpstairs(upper) {
  const U = F;
  const colliders = [];
  const col = (x, z, r) => { const c = { x, z, r, level: 1 }; colliders.push(c); return c; };
  const boxCol = (x, z, hw, hd) => { const c = { x, z, hw, hd, rot: 0, level: 1 }; colliders.push(c); return c; };
  const spots = {
    ledgers: new THREE.Vector3(0.6, 0, -2.75),
    archive: new THREE.Vector3(-4.3, 0, 1.4),
  };
  const lamps = [];
  const at = (g) => { g.position.y = U; return g; };     // pieces stand on the gallery floor

  // ---------- the ledgers ----------
  const ledgers = [];
  const LX = [-1.2, 0.6, 2.4];
  piece(upper, 'bank.ledgers', [0.6, -3.8], (g) => {
    const lift = at(new THREE.Group());
    g.add(lift);
    for (const x of LX) ledgers.push(ledger(lift, x, -3.8, 0));         // back toward the wall: the walkway along the balustrade stays wide
    rug(lift, 0.6, -3.3, 5.6, 1.6, 0, 3);
  }, [spots.ledgers, boxCol(0.6, -3.8, 2.4, 0.3)]);
  // the founder over them, between the pilasters
  picture(upper, 0, U + 2.3, -D / 2 + 0.06, 1.3, 1.6, 0, 'portrait');
  signBoard(upper, 0, U + 1.3, -D / 2 + 0.08, 1.4, 0.24, 'Our founder');

  // ---------- the year at a glance ----------
  // A presentation board: what came in and went out, month by month.
  const yearTex = canvasTex(900, 640, (c, w, h, months = []) => {
    c.font = `52px ${HAND_SC}`;
    c.fillText('The year at a glance', 34, 70);
    c.lineWidth = 4;
    inkLine(c, 34, 92, w - 34, 92, 1);
    if (!months.length) { c.font = `36px ${HAND}`; c.fillText('Your months appear after a sync', 34, 200); return; }
    const top = Math.max(1, ...months.flatMap((m) => [m.in, m.out]));
    const base = h - 90, span = base - 140, colW = (w - 80) / months.length;
    c.lineWidth = 3;
    inkLine(c, 34, base, w - 34, base, 0.6);
    months.forEach((m, i) => {
      const x = 44 + i * colW;
      const hi = (m.in / top) * span, ho = (m.out / top) * span;
      // in: an outlined bar; out: a hatched one beside it
      c.lineWidth = 3;
      c.strokeRect(x, base - hi, colW * 0.36, hi);
      c.strokeRect(x + colW * 0.4, base - ho, colW * 0.36, ho);
      for (let y = base - 8; y > base - ho; y -= 10) inkLine(c, x + colW * 0.4, y, x + colW * 0.76, y - 6, 0.2);
      c.font = `26px ${HAND}`;
      c.fillText(MONTHS[Number(m.month.slice(5)) - 1], x, base + 32);
    });
    c.font = `26px ${HAND}`;
    c.strokeRect(w - 300, 118, 22, 22); c.fillText('in', w - 270, 138);
    c.strokeRect(w - 200, 118, 22, 22);
    for (let k = 0; k < 22; k += 7) inkLine(c, w - 200 + k, 140, w - 200 + k + 6, 118, 0);
    c.fillText('out', w - 170, 138);
  });
  piece(upper, 'bank.year-board', [4.6, -4.2], (g) => {
    const lift = at(new THREE.Group());
    g.add(lift);
    for (const s of [-1, 1]) box(lift, 0.06, 2.0, 0.06, M.planks, 4.6 + s * 0.85, 1.0, -4.2);
    box(lift, 1.8, 1.3, 0.05, M.planks, 4.6, 1.35, -4.2);
    mesh(new THREE.PlaneGeometry(1.7, 1.2), toon('#ffffff', yearTex), 4.6, 1.35, -4.17, lift).castShadow = false;
    for (const s of [-1, 1]) box(lift, 0.4, 0.05, 0.4, M.planks, 4.6 + s * 0.85, 0.025, -4.2);
  }, [boxCol(4.6, -4.2, 0.95, 0.25)]);

  // ---------- the manager's corner ----------
  let manager;
  piece(upper, 'bank.manager', [-4.5, -3.7], (g) => {
    const lift = at(new THREE.Group());
    g.add(lift);
    desk(lift, -4.5, -3.5, Math.PI);                                             // its modesty panel toward visitors
    chair(lift, -4.5, -4.35, 0);
    manager = folk(lift, -4.5, -4.35, 0, { pose: 'read', seat: 0.48, look: { hat: 'top', glasses: true, scarf: false } });
    lamps.push(bankersLamp(lift, -5.2, 0.85, -3.4, 0.4));
    signBoard(lift, -4.5, 0.95, -3.05, 0.7, 0.16, 'Manager');
    for (let i = 0; i < 3; i++) box(lift, 0.3, 0.012, 0.4, M.white, -4.0 + i * 0.02, 0.86 + i * 0.013, -3.45).rotation.y = i * 0.2;
    cyl(lift, 0.05, 0.05, 0.12, dark, -3.75, 0.91, -3.2, 10);                     // an inkwell
    chair(lift, -4.5, -2.6, Math.PI);                                            // for the customer
    rug(lift, -4.5, -3.6, 2.4, 2.4, 0, 4);
  }, [boxCol(-4.5, -3.7, 1.25, 0.85), col(-4.5, -2.6, 0.3)]);
  // a tall safe behind the manager, on the back wall
  piece(upper, 'bank.safe', [-5.5, -4.6], (g) => {
    const lift = at(new THREE.Group());
    g.add(lift);
    box(lift, 0.8, 1.3, 0.6, toon('#cfd1d3'), -5.5, 0.65, -4.6);
    cyl(lift, 0.13, 0.13, 0.04, brass, -5.5, 0.8, -4.29, 16).rotation.x = Math.PI / 2;
    box(lift, 0.04, 0.2, 0.04, stamp.finance, -5.25, 0.6, -4.29);
  }, [col(-5.5, -4.6, 0.5)]);

  // ---------- the statements ----------
  // Card-index cabinets down the left wall, a drawer front for each month
  // with its label, the current month's drawer pulled out a little.
  const drawerTex = canvasTex(1536, 512, (c, w, h, months = []) => {
    const cols = 6, rows = 2, dw = w / cols, dh = h / rows;
    c.lineWidth = 6;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const x = k * dw, y = r * dh;
      c.strokeRect(x + 10, y + 10, dw - 20, dh - 20);
      c.strokeRect(x + dw / 2 - 60, y + 40, 120, 60);                              // the label holder
      c.lineWidth = 4;
      c.beginPath(); c.arc(x + dw / 2, y + dh - 70, 24, Math.PI, 0); c.stroke();  // the pull
      c.lineWidth = 6;
      const m = months[r * cols + k];
      if (!m) continue;
      c.font = `40px ${HAND_SC}`;
      c.textAlign = 'center';
      c.fillText(m.label, x + dw / 2, y + 86);
      c.font = `28px ${MONO}`;
      if (m.out) c.fillText(`−${money(m.out).replace('R$', '').trim()}`, x + dw / 2, y + 150);
      c.textAlign = 'left';
    }
  });
  const drawerMat = toon('#ffffff', drawerTex);
  piece(upper, 'bank.archive', [-5.55, 1.5], (g) => {
    const lift = at(new THREE.Group());
    g.add(lift);
    // two cabinets of six columns, either side of the window between them
    // low enough to sit under the window sills, and out from the pilasters
    for (const [z0, z1, from] of [[-1.7, 1.55, 0], [1.75, 4.8, 6]]) {
      const len = z1 - z0, cz = (z0 + z1) / 2;
      box(lift, 0.7, 0.9, len, M.planks, -5.45, 0.45, cz);
      box(lift, 0.76, 0.05, len + 0.06, polished, -5.43, 0.925, cz);
      const front = mesh(new THREE.PlaneGeometry(len - 0.08, 0.78), drawerMat, -5.09, 0.45, cz, lift);
      front.rotation.y = Math.PI / 2;
      front.castShadow = false;
      // each cabinet shows half the canvas
      const uv = front.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, from / 12 + uv.getX(i) / 2);
    }
    for (let i = 0; i < 4; i++) box(lift, 0.32, 0.012, 0.24, M.white, -5.4, 0.96 + i * 0.012, 3.3 + i * 0.03).rotation.y = i * 0.3;   // statements on top
    // the reading table
    box(lift, 1.1, 0.06, 0.8, M.planks, -4.0, 0.76, 3.9);
    for (const x of [-4.48, -3.52]) for (const z of [3.56, 4.24]) box(lift, 0.06, 0.76, 0.06, M.planks, x, 0.38, z);
    chair(lift, -3.25, 3.9, -Math.PI / 2);
    folk(lift, -3.25, 3.9, -Math.PI / 2, { pose: 'read', seat: 0.48, look: { hair: 'bun', glasses: true } });
    lamps.push(bankersLamp(lift, -4.35, 0.79, 4.15, Math.PI / 2));
    for (let i = 0; i < 3; i++) box(lift, 0.28, 0.01, 0.36, M.white, -3.9 + i * 0.08, 0.8 + i * 0.011, 3.85).rotation.y = 0.3 - i * 0.25;
    signBoard(lift, -5.08, 1.2, 0, 1.0, 0.22, 'Statements', Math.PI / 2);
  }, [spots.archive, boxCol(-5.45, 1.55, 0.4, 3.25), boxCol(-4.0, 3.9, 0.6, 0.45), col(-3.25, 3.9, 0.3)]);

  piece(upper, 'bank.plant-gallery', [-2.6, -4.6], (g) => { const lift = at(new THREE.Group()); g.add(lift); plant(lift, -2.6, -4.6, 1.0); }, [col(-2.6, -4.6, 0.45)]);
  // past directors on the left wall, between the pilaster and the windows
  picture(upper, -W / 2 + 0.06, U + 2.4, -1.0, 0.8, 1.0, Math.PI / 2, 'portrait');
  picture(upper, -W / 2 + 0.06, U + 2.4, 1.0, 0.7, 0.9, Math.PI / 2, 'mountains');

  return {
    colliders, spots, lamps, ledgers, manager,
    setYear: (months) => yearTex.userData.draw(months),
    setArchive: (months) => drawerTex.userData.draw(months),
    GALLERY,
  };
}
