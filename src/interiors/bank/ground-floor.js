// The bank's ground floor: the banking hall, for everyday money.
//
// The vault against the back wall, open, its gold growing with your cash,
// the split-flap board over it with your cards, and a limit dial for each
// card. The tellers' counter under the left gallery. The ticker printing
// your latest transactions, the easel with the month's spending, a round
// writing table under the skylight, and in the front corner the courier's
// desk, whose pneumatic tube fetches news from your banks (Sync).
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { folk } from '../../folks.js';
import { signBoard } from '../../details.js';
import { steam } from '../../life.js';
import { plant, chair, rug } from '../../decor.js';
import { piece } from '../../layout.js';
import { wallClock } from '../common.js';
import { W, D, F } from './dims.js';
import { polished, brass, steel, dark, lampShade, shadowMat } from './materials.js';
import { flapBoard, spendingChart, ticker, limitDial, goldStacks } from './displays.js';

// A banker's lamp: a brass stand with a green glass shade. Glows at night.
export function bankersLamp(p, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  cyl(g, 0.09, 0.1, 0.03, brass, 0, 0.015, 0, 12);
  cyl(g, 0.012, 0.012, 0.3, brass, 0, 0.16, 0, 6);
  const shade = mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.09, 12, 1, true, 0, Math.PI), lampShade, 0, 0.32, 0, g);
  shade.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  shade.material = lampShade.clone();
  shade.material.side = THREE.DoubleSide;
  const bulb = mesh(new THREE.SphereGeometry(0.035, 8, 6), M.white, 0, 0.3, 0, g);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe9b5', 0, 3.2, 1.6);
  light.position.set(0, 0.22, 0);
  g.add(light);
  return { bulb, light };
}

// A brass stanchion with a rope to the next one.
function stanchion(p, x, z) {
  cyl(p, 0.14, 0.16, 0.05, brass, x, 0.025, z, 12);
  cyl(p, 0.03, 0.03, 0.95, brass, x, 0.5, z, 8);
  mesh(new THREE.SphereGeometry(0.05, 8, 6), brass, x, 1.0, z, p);
}
function rope(p, [x0, z0], [x1, z1]) {
  const mid = new THREE.Vector3((x0 + x1) / 2, 0.7, (z0 + z1) / 2);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0, 0.92, z0), mid, new THREE.Vector3(x1, 0.92, z1));
  mesh(new THREE.TubeGeometry(curve, 12, 0.025, 5), dark, 0, 0, 0, p).castShadow = false;
}

export function furnishGroundFloor(lower) {
  const colliders = [];
  const col = (x, z, r) => { const c = { x, z, r }; colliders.push(c); return c; };
  const boxCol = (x, z, hw, hd, rot = 0) => { const c = { x, z, hw, hd, rot }; colliders.push(c); return c; };
  const spots = {
    vault: new THREE.Vector3(0.6, 0, -2.4),     // look into the vault, read the board
    teller: new THREE.Vector3(-2.3, 0, 1.4),    // talk to the teller
    ticker: new THREE.Vector3(2.9, 0, 0.6),     // read the tape
    chart: new THREE.Vector3(-0.9, 0, 0.9),     // the month's spending
    courier: new THREE.Vector3(4.4, 0, 3.75),   // send for news (Sync)
  };
  const lamps = [];

  // ---------- the vault ----------
  // A steel strongroom built out from the back wall, its round door swung
  // open; inside, shelves of gold and the safe-deposit boxes.
  const VX = 0.6, VZ = -D / 2, VD = 1.3, VW = 6.4, VH = F - 0.45;
  const front = VZ + VD;
  const vault = new THREE.Group();
  lower.add(vault);
  const vaultMat = toon('#e9e9e4', M.stone.map);
  // the front, in pieces around the round doorway (its outline as one)
  const R = 1.15, CY = 1.35;
  const fid = 7e5;
  for (const [x0, x1] of [[VX - VW / 2, VX - R], [VX + R, VX + VW / 2]]) box(vault, x1 - x0, VH, 0.3, vaultMat, (x0 + x1) / 2, VH / 2, front).userData.inkId = fid;
  box(vault, R * 2, VH - CY - R, 0.3, vaultMat, VX, (VH + CY + R) / 2, front).userData.inkId = fid;
  box(vault, R * 2, CY - R, 0.3, vaultMat, VX, (CY - R) / 2, front).userData.inkId = fid;
  // fill the square doorway's corners to make it round
  const ring = new THREE.Shape();
  ring.moveTo(-R, -R); ring.lineTo(R, -R); ring.lineTo(R, R); ring.lineTo(-R, R); ring.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.97, 0, Math.PI * 2, true);
  ring.holes.push(hole);
  mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.3, bevelEnabled: false, curveSegments: 32 }), vaultMat, VX, CY, front - 0.15, vault).userData.inkId = fid;
  // a thick steel collar around the doorway, with bolts
  mesh(new THREE.TorusGeometry(R + 0.02, 0.1, 8, 40), steel, VX, CY, front + 0.16, vault);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    mesh(new THREE.SphereGeometry(0.035, 6, 5), dark, VX + Math.cos(a) * (R + 0.02), CY + Math.sin(a) * (R + 0.02), front + 0.26, vault).castShadow = false;
  }
  // the door itself, swung all the way open on its hinge to the right, so it
  // lies flat against the vault's front showing its bolt work
  const door = new THREE.Group();
  door.position.set(VX + R + 0.05, CY, front + 0.42);
  door.rotation.y = Math.PI;
  vault.add(door);
  const dd = new THREE.Group();
  dd.position.x = -R;
  door.add(dd);
  cyl(dd, R, R, 0.42, steel, 0, 0, 0, 40).rotation.x = Math.PI / 2;
  cyl(dd, R * 0.8, R * 0.8, 0.46, M.white, 0, 0, 0, 40).rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) {                          // the locking bolts round the edge
    const a = (i / 12) * Math.PI * 2;
    cyl(dd, 0.06, 0.06, 0.3, polished, Math.cos(a) * R, Math.sin(a) * R, -0.05, 8).rotation.z = a + Math.PI / 2;
  }
  // the wheel, in the district's green, three spokes and a hub
  mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24), stamp.finance, 0, 0, 0.3, dd);
  for (let i = 0; i < 3; i++) box(dd, 0.9, 0.05, 0.05, brass, 0, 0, 0.3).rotation.z = (i * Math.PI) / 3;
  cyl(dd, 0.1, 0.1, 0.1, brass, 0, 0, 0.3, 12).rotation.x = Math.PI / 2;
  mesh(new THREE.CircleGeometry(0.16, 16), M.clock, 0.5, -0.5, 0.24, dd).castShadow = false;   // the time lock's dial
  // hinges
  for (const y of [-0.6, 0.6]) cyl(vault, 0.08, 0.08, 0.36, steel, VX + R + 0.08, CY + y, front + 0.3, 10);
  // inside: a dark room with shelves of gold and deposit boxes
  box(vault, R * 2 - 0.1, R * 2, 0.04, shadowMat, VX, CY, VZ + 0.3).castShadow = false;
  for (const s of [-1, 1]) box(vault, 0.04, R * 2, VD - 0.3, shadowMat, VX + s * (R - 0.05), CY, VZ + 0.3 + (VD - 0.3) / 2 - 0.15).castShadow = false;
  const shelves = [];
  for (const y of [0.55, 1.15, 1.75]) {
    box(vault, R * 1.8, 0.04, 0.6, M.planks, VX, y, VZ + 0.65);
    for (let k = 0; k < 6; k++) shelves.push([VX - 0.65 + k * 0.26, y + 0.02, VZ + 0.65 + ((k % 2) - 0.5) * 0.18]);
  }
  const gold = goldStacks(vault, shelves);
  // safe-deposit boxes on the vault's front, left of the door (the open door covers the right)
  for (const [x0, x1] of [[VX - VW / 2 + 0.25, VX - R - 0.25]]) {
    const n = Math.floor((x1 - x0) / 0.32);
    for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) {
      const x = x0 + 0.16 + i * 0.32, y = 0.45 + j * 0.34;
      box(vault, 0.28, 0.28, 0.03, polished, x, y, front + 0.165).castShadow = false;
      cyl(vault, 0.025, 0.025, 0.02, brass, x + 0.08, y, front + 0.185, 6).rotation.x = Math.PI / 2;
    }
  }
  // a brass rail in front, so you look in but don't walk in
  for (const x of [VX - 2.6, VX - 1.3, VX + 1.3, VX + 2.6]) stanchion(vault, x, front + 0.95);
  for (const [a, b] of [[VX - 2.6, VX - 1.3], [VX - 1.3, VX + 1.3], [VX + 1.3, VX + 2.6]]) rope(vault, [a, front + 0.95], [b, front + 0.95]);
  boxCol(VX, VZ + VD / 2 + 0.45, VW / 2, VD / 2 + 0.45);

  // the guard, by the vault
  folk(lower, VX - 2.9, front + 0.8, 0.5, { pose: 'idle', look: { hat: 'cap', glasses: false } });
  col(VX - 2.9, front + 0.8, 0.35);

  // the split-flap board over the vault, and a dial for each card: one on
  // the vault's front, a second (if you have two cards) on the column
  const board = flapBoard(lower, VX, CY + R + 0.85, front + 0.2, 0, 26, 6);   // clear of the collar below, the gallery's edge above
  const dials = [limitDial(lower, VX - 2.2, 2.0, front + 0.18, 0), limitDial(lower, 2.2, 2.0, -1.85 + 0.32, 0)];

  // ---------- the tellers' counter ----------
  // Under the left gallery: a marble counter with brass grilles, a window per
  // teller, a lamp at each, and the tellers behind it.
  const TX = -4.35, TZ0 = -1.4, TZ1 = 3.6;
  const tellers = [];
  piece(lower, 'bank.counter', [TX, (TZ0 + TZ1) / 2], (g) => {
    const len = TZ1 - TZ0, cz = (TZ0 + TZ1) / 2;
    box(g, 0.75, 1.05, len, toon('#ffffff', M.stone.map), TX, 0.525, cz);
    box(g, 0.95, 0.07, len + 0.1, polished, TX + 0.05, 1.085, cz);                 // the top
    box(g, 0.08, 0.16, len, M.white, TX + 0.4, 0.08, cz);                           // kick plate
    for (let i = 0; i < Math.floor(len / 0.6); i++) box(g, 0.02, 0.6, 0.45, polished, TX + 0.385, 0.5, TZ0 + 0.35 + i * 0.6).castShadow = false; // panels
    // the grilles: a brass frame with thin bars, open at each window
    box(g, 0.06, 0.06, len, brass, TX + 0.1, 2.35, cz);
    const windows = [-0.1, 1.9];
    for (let z = TZ0 + 0.1; z < TZ1; z += 0.12) {
      if (windows.some((w) => Math.abs(z - (TZ0 + 0.9 + w)) < 0.32)) continue;
      box(g, 0.015, 1.22, 0.015, brass, TX + 0.1, 1.73, z).castShadow = false;
    }
    for (const w of windows) {
      const z = TZ0 + 0.9 + w;
      box(g, 0.08, 0.06, 0.7, brass, TX + 0.1, 1.55, z);                          // the window's arch
      signBoard(g, TX + 0.13, 2.1, z, 0.6, 0.18, w < 0 ? 'Teller 1' : 'Teller 2', Math.PI / 2);
      const lamp = bankersLamp(g, TX - 0.12, 1.12, z + 0.32, Math.PI / 2);
      lamps.push(lamp);
      for (let i = 0; i < 3; i++) box(g, 0.2, 0.01, 0.28, M.white, TX + 0.12, 1.13 + i * 0.012, z - 0.15).rotation.y = i * 0.2;   // slips
      cyl(g, 0.012, 0.012, 0.16, dark, TX + 0.25, 1.14, z - 0.3, 5).rotation.z = Math.PI / 2;     // a pen on its chain
    }
    tellers.push(folk(g, TX - 0.75, TZ0 + 0.8, Math.PI / 2, { pose: 'vendor', look: { hair: 'bun', glasses: true, scarf: false } }));
    tellers.push(folk(g, TX - 0.75, TZ0 + 2.8, Math.PI / 2, { pose: 'type', look: { hat: 'bowler', glasses: false } }));
    // a stool behind each, and a rubber-stamp rack
    for (const z of [TZ0 + 1.4, TZ0 + 3.4]) cyl(g, 0.18, 0.18, 0.06, M.planks, TX - 0.85, 0.7, z, 12);
    box(g, 0.2, 0.18, 0.3, M.planks, TX - 0.2, 1.21, TZ0 + 1.6);
    cyl(g, 0.05, 0.04, 0.09, M.white, TX - 0.25, 1.165, TZ1 - 0.4, 10);         // a teller's coffee
    steam(g, TX - 0.25, 1.23, TZ1 - 0.4);
  }, [spots.teller, boxCol(TX, (TZ0 + TZ1) / 2, 0.55, (TZ1 - TZ0) / 2 + 0.05)]);
  // the queue: stanchions guiding to the windows, and two customers in it
  piece(lower, 'bank.queue', [-2.6, 2.6], (g) => {
    for (const [x, z] of [[-3.3, 2.0], [-2.3, 2.0], [-2.3, 3.6]]) stanchion(g, x, z);
    rope(g, [-3.3, 2.0], [-2.3, 2.0]);
    rope(g, [-2.3, 2.0], [-2.3, 3.6]);
    folk(g, -1.75, 2.6, -Math.PI / 2, { pose: 'idle', look: { hat: 'top', scarf: true } });
    folk(g, -1.6, 3.5, -Math.PI / 2 - 0.3, { pose: 'look', look: { hair: 'long', dress: true } });
  }, [col(-2.3, 2.0, 0.2), col(-2.3, 3.6, 0.2), col(-3.3, 2.0, 0.2), col(-1.75, 2.6, 0.3), col(-1.6, 3.5, 0.3)]);

  // ---------- the ticker and the spending chart ----------
  let tick, chart;
  piece(lower, 'bank.ticker', [2.9, -0.35], (g) => { tick = ticker(g, 2.9, -0.35, -0.5); }, [spots.ticker, col(2.9, -0.35, 0.45), col(3.45, -0.2, 0.3)]);
  piece(lower, 'bank.chart', [-1.4, -0.4], (g) => { chart = spendingChart(g, -1.4, -0.4, 0.45); }, [spots.chart, col(-1.4, -0.45, 0.65)]);

  // ---------- the writing table under the skylight ----------
  piece(lower, 'bank.writing-table', [0.6, 1.3], (g) => {
    cyl(g, 0.3, 0.45, 0.12, polished, 0.6, 0.06, 1.3, 20);
    cyl(g, 0.16, 0.22, 0.95, M.white, 0.6, 0.55, 1.3, 16);
    cyl(g, 0.85, 0.85, 0.07, polished, 0.6, 1.07, 1.3, 32);
    mesh(new THREE.TorusGeometry(0.85, 0.03, 5, 40), brass, 0.6, 1.07, 1.3, g).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {                       // slips, pens on chains, an inkwell
      const a = (i / 4) * Math.PI * 2 + 0.4;
      box(g, 0.22, 0.01, 0.3, M.white, 0.6 + Math.cos(a) * 0.55, 1.11, 1.3 + Math.sin(a) * 0.55).rotation.y = -a;
      cyl(g, 0.01, 0.01, 0.15, dark, 0.6 + Math.cos(a) * 0.4, 1.12, 1.3 + Math.sin(a) * 0.4, 4).rotation.set(Math.PI / 2, 0, a);
    }
    cyl(g, 0.06, 0.07, 0.08, dark, 0.6, 1.15, 1.3, 10);
    folk(g, 0.6, 2.35, Math.PI, { pose: 'read', look: { hair: 'short', glasses: true } });
  }, [col(0.6, 1.3, 0.95), col(0.6, 2.35, 0.3)]);
  piece(lower, 'bank.rug', [0.6, 1.3], (g) => rug(g, 0.6, 1.3, 3.6, 3.6, 0, 2));

  // ---------- the courier's desk ----------
  // In the front corner: a desk with a telegraph key and a bell, and the
  // pneumatic tube up the wall that brings news from your banks.
  const tube = { capsule: null, t0: -1 };
  piece(lower, 'bank.courier', [4.6, 4.45], (g) => {
    box(g, 2.0, 0.08, 0.7, M.planks, 4.6, 0.8, 4.45);
    for (const x of [3.7, 5.5]) for (const z of [4.15, 4.75]) box(g, 0.07, 0.8, 0.07, M.planks, x, 0.4, z);
    box(g, 1.9, 0.5, 0.05, M.planks, 4.6, 0.55, 4.78);
    box(g, 0.24, 0.05, 0.14, brass, 4.0, 0.865, 4.4);                           // the telegraph key
    box(g, 0.14, 0.02, 0.03, dark, 4.02, 0.91, 4.4).rotation.z = 0.15;
    mesh(new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass, 4.4, 0.84, 4.25, g);  // the bell
    for (let i = 0; i < 5; i++) box(g, 0.24, 0.012, 0.16, M.white, 4.9 + (i % 2) * 0.03, 0.85 + i * 0.013, 4.5).rotation.y = i * 0.25;  // telegrams
    lamps.push(bankersLamp(g, 5.25, 0.84, 4.55, -0.3));
    chair(g, 4.6, 3.95, Math.PI);
    folk(g, 4.6, 3.95, 0, { pose: 'type', seat: 0.48, look: { hat: 'cap', backpack: true } });
    // the tube: from the desk's receiver up the right wall and into the ceiling
    const TX2 = W / 2 - 0.2;
    box(g, 0.3, 0.36, 0.3, brass, TX2, 1.05, 4.5);                               // the receiver
    cyl(g, 0.06, 0.06, F - 1.4, polished, TX2, 1.2 + (F - 1.4) / 2, 4.5, 10);
    for (let y = 1.5; y < F - 0.3; y += 0.8) cyl(g, 0.075, 0.075, 0.05, brass, TX2, y, 4.5, 10);
    const glass = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false }), TX2, 1.5, 4.5, g);
    glass.castShadow = false;
    tube.capsule = cyl(g, 0.05, 0.05, 0.18, brass, TX2, 1.3, 4.5, 8);
    tube.base = new THREE.Vector3(TX2, 1.3, 4.5);
    signBoard(g, 4.6, 1.25, 4.77, 1.2, 0.26, 'Courier', Math.PI);
  }, [spots.courier, boxCol(4.6, 4.45, 1.05, 0.42), col(4.6, 3.95, 0.35)]);

  // ---------- around the hall ----------
  // a bench by the door, clear of the open door leaf
  piece(lower, 'bank.bench', [-2.6, 4.55], (g) => {
    box(g, 1.6, 0.08, 0.45, M.planks, -2.6, 0.45, 4.55);
    box(g, 1.6, 0.5, 0.06, M.planks, -2.6, 0.75, 4.78);
    for (const x of [-3.3, -1.9]) box(g, 0.08, 0.45, 0.42, polished, x, 0.22, 4.55);
    folk(g, -3.0, 4.55, Math.PI, { pose: 'sit', seat: 0.5, look: { hat: 'bowler', scarf: true } });
  }, [col(-2.6, 4.55, 0.85)]);
  for (const [id, x, z, s] of [['plant-front-left', -5.3, 4.4, 1.2], ['plant-back-right', 5.2, -2.8, 1.1]]) {
    piece(lower, `bank.${id}`, [x, z], (g) => plant(g, x, z, s), [col(x, z, 0.5)]);
  }
  wallClock(lower, -0.85, 2.9, 0.4);

  // the chandelier hanging from the skylight's ring, and wall lamps on the columns
  const chand = { bulbs: [], light: new THREE.PointLight('#ffe6b0', 0, 16, 1.1) };
  const ch = new THREE.Group();
  ch.position.set(0.6, 5.8, 1.2);
  lower.add(ch);
  cyl(ch, 0.012, 0.012, 3.0, dark, 0, 1.5, 0, 4).castShadow = false;
  for (const [r, y, n] of [[0.95, 0, 10], [0.55, 0.45, 6]]) {
    mesh(new THREE.TorusGeometry(r, 0.03, 6, 32), brass, 0, y, 0, ch).rotation.x = Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      cyl(ch, 0.035, 0.03, 0.12, M.white, Math.cos(a) * r, y + 0.07, Math.sin(a) * r, 6);
      const b = mesh(new THREE.SphereGeometry(0.05, 6, 5), M.white, Math.cos(a) * r, y + 0.17, Math.sin(a) * r, ch);
      b.castShadow = false;
      chand.bulbs.push(b);
    }
  }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cyl(ch, 0.006, 0.006, 0.5, dark, Math.cos(a) * 0.75, 0.25, Math.sin(a) * 0.75, 3).rotation.z = 0.5; }
  mesh(new THREE.SphereGeometry(0.12, 10, 8), brass, 0, -0.15, 0, ch);
  chand.light.position.y = -0.3;
  ch.add(chand.light);

  return { colliders, spots, board, dials, gold, chart, ticker: tick, tube, tellers, lamps, chand };
}
