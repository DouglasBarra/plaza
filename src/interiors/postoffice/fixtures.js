// What stands on the sorting office floor: the counter with its brass grille
// and the postmaster behind it, the gate swung open at its end, the sorting
// table with the franking press and the date stamps, the mail sacks and the
// barrow, the bicycle, the posters and the clock.
//
// The live things (the pigeonhole rack, the scale, the trays, the unclaimed
// shelf, the chalk board) are built in displays.js and placed from here.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { folk } from '../../folks.js';
import { signBoard, clockHands } from '../../details.js';
import { smoke } from '../../life.js';
import { piece } from '../../layout.js';
import { bike } from '../../plaza/props.js';
import { BACK, LEFT, COUNTER, FRONT_FACE, RACK, RACK_W, RACK_H, QUIET, TABLE } from './dims.js';
import { brass, dark, deal, enamel } from './materials.js';
import { pigeonholes, parcelScale, sortTray, quietShelf, chalkBoard } from './displays.js';

// ---------- small props ----------

// A canvas poster, pinned flat to a wall, facing +z.
function posterArt(kind) {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = g.fillStyle = '#111111';
  g.lineCap = g.lineJoin = 'round';
  g.lineWidth = 7;
  g.textAlign = 'center';
  const path = (pts, close = false) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (close) g.closePath();
    g.stroke();
  };
  const hand = (size) => { g.font = `${size}px "Patrick Hand SC", "Comic Neue", sans-serif`; };
  const draw = {
    // an envelope with wings, and a plane over it
    airmail: () => {
      hand(62);
      g.fillText('BY AIR', S / 2, 86);
      path([[96, 180], [416, 180], [416, 352], [96, 352]], true);
      path([[96, 180], [256, 288], [416, 180]]);
      for (const sx of [-1, 1]) path([[256 + sx * 170, 200], [256 + sx * 236, 170], [256 + sx * 210, 240]]);
      path([[140, 436], [372, 436]]);
      path([[256, 396], [300, 436], [256, 468], [220, 436], [256, 396]]);
      hand(40);
      g.fillText('letters fly fastest', S / 2, 498);
    },
    // a big stamp with a perforated edge and a face on it
    stamp: () => {
      g.lineWidth = 5;
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        for (let k = 0; k <= 12; k++) {
          const t = k / 12;
          const [x, y] = [[88 + t * 336, 96], [424, 96 + t * 320], [424 - t * 336, 416], [88, 416 - t * 320]][i];
          g.moveTo(x, y);
          g.arc(x, y, 9, 0, 7);
        }
      }
      g.stroke();
      g.lineWidth = 7;
      path([[112, 120], [400, 120], [400, 392], [112, 392]], true);
      g.beginPath(); g.ellipse(256, 232, 56, 68, 0, 0, 7); g.stroke();
      path([[180, 340], [206, 282], [306, 282], [332, 340]]);
      g.beginPath(); g.arc(238, 226, 6, 0, 7); g.stroke();
      g.beginPath(); g.arc(276, 226, 6, 0, 7); g.stroke();
      hand(44);
      g.fillText('PLAZA', 256, 376);
      hand(52);
      g.fillText('stamps sold here', S / 2, 470);
    },
    // a clock and a hurrying letter
    early: () => {
      hand(58);
      g.fillText('POST EARLY', S / 2, 80);
      g.beginPath(); g.arc(256, 250, 118, 0, 7); g.stroke();
      path([[256, 250], [256, 160]]);
      path([[256, 250], [320, 290]]);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        path([[256 + Math.cos(a) * 100, 250 + Math.sin(a) * 100], [256 + Math.cos(a) * 110, 250 + Math.sin(a) * 110]]);
      }
      path([[120, 420], [240, 420], [240, 478], [120, 478]], true);
      path([[120, 420], [180, 458], [240, 420]]);
      for (let i = 0; i < 3; i++) path([[280 + i * 20, 436 + i * 14], [400, 436 + i * 14]]);
      hand(40);
      g.fillText('in the day', 400, 400);
    },
    // the rates, ruled up by hand
    rates: () => {
      hand(54);
      g.fillText('RATES', S / 2, 78);
      g.lineWidth = 5;
      for (let i = 0; i < 6; i++) path([[80, 130 + i * 62], [432, 130 + i * 62]]);
      path([[300, 112], [300, 440]]);
      g.lineWidth = 7;
      hand(38);
      g.textAlign = 'left';
      ['Letter', 'Card', 'Parcel', 'Air', 'Express'].forEach((t, i) => g.fillText(t, 98, 172 + i * 62));
      g.textAlign = 'right';
      ['1', '1', '4', '6', '9'].forEach((t, i) => g.fillText(t, 416, 172 + i * 62));
      g.textAlign = 'center';
      hand(36);
      g.fillText('pinned up since forever', S / 2, 490);
    },
  };
  (draw[kind] || draw.airmail)();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.lineArt = true;
  t.anisotropy = 8;
  return t;
}

function poster(p, x, y, z, w, h, rotY, kind) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, w, h, 0.015, M.white, 0, 0, 0).castShadow = false;
  mesh(new THREE.PlaneGeometry(w - 0.03, h - 0.03), toon('#ffffff', posterArt(kind)), 0, 0, 0.011, g).castShadow = false;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.016, 6, 5), dark, sx * (w / 2 - 0.05), sy * (h / 2 - 0.05), 0.016, g).castShadow = false;
  }
  return g;
}

// A mail sack: a stuffed bag with a drawn neck and a purple label. `tipped`
// lays it on its side with letters spilling out.
function mailSack(p, x, z, s = 1, tipped = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = (x * 3.1 + z) % 2;
  p.add(g);
  const body = new THREE.Group();
  g.add(body);
  mesh(new THREE.SphereGeometry(0.3 * s, 14, 10).scale(1, 1.1, 1), M.white, 0, 0.3 * s, 0, body);
  cyl(body, 0.09 * s, 0.15 * s, 0.18 * s, M.white, 0, 0.62 * s, 0, 12);
  mesh(new THREE.TorusGeometry(0.1 * s, 0.015 * s, 5, 14), dark, 0, 0.56 * s, 0, body).rotation.x = Math.PI / 2;
  box(body, 0.14 * s, 0.015, 0.1 * s, stamp.people, 0.12 * s, 0.5 * s, 0.1 * s).castShadow = false;
  if (tipped) {
    body.rotation.z = Math.PI / 2 - 0.25;
    body.position.set(0.1 * s, 0.3 * s, 0);
    for (let i = 0; i < 5; i++) {
      const l = box(g, 0.22, 0.012, 0.16, M.white, 0.5 * s + i * 0.07, 0.01 + (i % 2) * 0.013, (i % 3) * 0.08 - 0.08);
      l.rotation.y = ((i * 31) % 9 - 4) * 0.16;
    }
  }
  return g;
}

// A sack barrow with a parcel strapped to it, parked against the wall.
function barrow(p, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  const frame = new THREE.Group();
  frame.rotation.x = -0.18;
  g.add(frame);
  for (const sx of [-0.21, 0.21]) cyl(frame, 0.025, 0.025, 1.2, M.white, sx, 0.62, 0, 8);
  for (const y of [0.3, 0.75, 1.18]) box(frame, 0.46, 0.03, 0.03, M.white, 0, y, 0);
  box(frame, 0.5, 0.025, 0.24, M.white, 0, 0.1, 0.11);                        // the toe plate
  for (const sx of [-1, 1]) {
    mesh(new THREE.TorusGeometry(0.14, 0.03, 5, 18), M.white, sx * 0.26, 0.14, -0.04, frame);
    cyl(frame, 0.03, 0.03, 0.08, M.white, sx * 0.26, 0.14, -0.04, 8).rotation.z = Math.PI / 2;
  }
  box(frame, 0.4, 0.34, 0.3, M.planks, 0, 0.3, 0.26);                          // a parcel on it
  for (const sy of [0.22, 0.38]) box(frame, 0.44, 0.02, 0.34, dark, 0, sy, 0.26).castShadow = false;
  return g;
}

// A sloped writing shelf on the wall for the public, with an inkwell, pens on
// chains and a few blank cards. Faces +z; `rotY` turns it to another wall.
function writingShelf(p, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  const top = box(g, 1.6, 0.06, 0.54, deal, 0, 1.02, 0.26);
  top.rotation.x = 0.12;
  box(g, 1.6, 0.07, 0.1, deal, 0, 0.96, 0.49);                                 // the lip at the low edge
  for (const sx of [-1, 1]) {
    box(g, 0.07, 1.0, 0.07, deal, sx * 0.72, 0.5, 0.42);
    box(g, 0.07, 0.07, 0.5, deal, sx * 0.72, 0.9, 0.22);
  }
  box(g, 1.6, 0.4, 0.05, deal, 0, 1.3, 0.04);                                  // a back board with a rack of forms
  for (let i = 0; i < 4; i++) box(g, 0.3, 0.26, 0.012, M.white, -0.5 + i * 0.34, 1.26, 0.08).castShadow = false;
  cyl(g, 0.045, 0.055, 0.07, dark, -0.56, 1.05, 0.2, 10);                      // the inkwell
  for (const sx of [-0.2, 0.3]) {
    cyl(g, 0.008, 0.008, 0.16, dark, sx, 1.03, 0.26, 5).rotation.set(Math.PI / 2, 0, 0.5);
    cyl(g, 0.004, 0.004, 0.22, M.white, sx - 0.06, 1.0, 0.16, 3).rotation.set(1.3, 0, 0.3);
  }
  for (let i = 0; i < 3; i++) box(g, 0.24, 0.008, 0.17, M.white, 0.5, 1.02 + i * 0.01, 0.3).rotation.y = i * 0.12;
  return g;
}

// A bench for those waiting their turn.
function bench(p, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 2.0, 0.08, 0.46, deal, 0, 0.45, 0);
  box(g, 2.0, 0.44, 0.06, deal, 0, 0.74, -0.22).rotation.x = -0.1;
  for (const sx of [-1, 1]) {
    box(g, 0.09, 0.45, 0.42, deal, sx * 0.86, 0.22, 0);
    box(g, 0.09, 0.3, 0.06, deal, sx * 0.86, 0.6, -0.2);
  }
  box(g, 0.08, 0.08, 0.3, deal, 0, 0.2, 0);
  return g;
}

// A pile of parcels tied with string.
function parcels(p, x, z, sizes) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  let y = 0;
  sizes.forEach(([w, h, d], i) => {
    const b = box(g, w, h, d, M.planks, ((i * 17) % 5 - 2) * 0.02, y + h / 2, ((i * 23) % 5 - 2) * 0.02);
    b.rotation.y = ((i * 29) % 7 - 3) * 0.08;
    box(b, w + 0.01, h + 0.01, 0.015, dark, 0, 0, 0).castShadow = false;       // the string, both ways
    box(b, 0.015, h + 0.01, d + 0.01, dark, 0, 0, 0).castShadow = false;
    box(b, w * 0.4, 0.008, d * 0.3, M.white, w * 0.1, h / 2 + 0.005, 0).castShadow = false;  // its label
    y += h;
  });
  return g;
}

// The franking press: a lever with a round die that comes down on a letter.
// `arm` is what update() thumps.
function frankingPress(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  box(g, 0.4, 0.06, 0.3, brass, 0, 0.03, 0);
  box(g, 0.26, 0.015, 0.2, M.white, 0.1, 0.0675, 0);                           // the letter under the die
  box(g, 0.08, 0.3, 0.08, brass, -0.16, 0.21, 0);                              // the standard
  const arm = new THREE.Group();
  arm.position.set(-0.16, 0.33, 0);
  arm.rotation.z = 0.45;
  g.add(arm);
  box(arm, 0.42, 0.05, 0.07, brass, 0.21, 0, 0);
  cyl(arm, 0.02, 0.02, 0.2, brass, 0.3, -0.1, 0, 8);
  cyl(arm, 0.065, 0.065, 0.05, dark, 0.3, -0.225, 0, 14);                      // the die
  mesh(new THREE.SphereGeometry(0.05, 10, 8), M.planks, 0.44, 0.03, 0, arm);   // the knob
  cyl(g, 0.03, 0.03, 0.11, brass, -0.16, 0.33, 0, 10).rotation.x = Math.PI / 2; // the pivot
  return { group: g, arm };
}

// A carousel of round date stamps, hanging from a wheel on a stand.
function stampRack(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  cyl(g, 0.11, 0.13, 0.03, M.planks, 0, 0.015, 0, 14);
  cyl(g, 0.016, 0.016, 0.34, brass, 0, 0.19, 0, 8);
  mesh(new THREE.TorusGeometry(0.11, 0.012, 5, 16), brass, 0, 0.36, 0, g).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const hx = Math.cos(a) * 0.11, hz = Math.sin(a) * 0.11;
    cyl(g, 0.014, 0.014, 0.1, M.planks, hx, 0.3, hz, 8);                       // the handle
    cyl(g, 0.038, 0.038, 0.035, dark, hx, 0.23, hz, 12);                       // the rubber
  }
  return g;
}

// ---------- the room ----------
export function furnish(scene) {
  const colliders = [];
  const col = (x, z, r) => { const c = { x, z, r }; colliders.push(c); return c; };
  const boxCol = (x, z, hw, hd, rot = 0) => { const c = { x, z, hw, hd, rot }; colliders.push(c); return c; };
  const lamps = [];
  const spots = {
    counter: new THREE.Vector3(-3.4, 0, 2.7),   // at the postmaster's window
    bell: new THREE.Vector3(-5.4, 0, 2.7),      // the bell at the open parcels end
    holes: new THREE.Vector3(-2.4, 0, -3.5),    // in front of the pigeonholes
    quiet: new THREE.Vector3(3.4, 0, -3.5),     // the unclaimed shelf
  };

  // ---------- the counter ----------
  const { x0, x1, z: CZ, d: CD, h: CH, top: CTOP, windows } = COUNTER;
  const len = x1 - x0, cx = (x0 + x1) / 2;
  const WIN_W = 0.8, WIN_TOP = 1.66, BZ = CZ - 0.14;
  let postmaster = null, scale = null;
  piece(scene, 'postoffice.counter', [cx, CZ], (g) => {
    box(g, len, CH, CD, deal, cx, CH / 2, CZ);
    box(g, len + 0.16, 0.08, CD + 0.14, deal, cx, CH + 0.04, CZ);                  // the top, overhanging
    box(g, len, 0.2, 0.12, M.white, cx, 0.1, FRONT_FACE + 0.05);                   // a plinth at the foot
    for (let px = x0 + 0.52; px < x1 - 0.2; px += 0.72) {
      box(g, 0.56, 0.6, 0.025, M.white, px, 0.62, FRONT_FACE + 0.012).castShadow = false;
    }
    // the grille over the letters end, with thin bars and an opening at each
    // window. The parcels end, on the left, is left open to hand things over.
    const gx0 = x0 + 1.2;
    box(g, x1 - gx0, 0.08, 0.12, brass, (gx0 + x1) / 2, CTOP, BZ);
    for (const bx of [gx0 + 0.05, x1 - 0.05]) box(g, 0.08, CTOP - CH, 0.12, brass, bx, (CTOP + CH) / 2, BZ);
    const atWindow = (bx) => windows.some((wx) => Math.abs(bx - wx) < WIN_W / 2 + 0.1);
    for (let bx = gx0 + 0.18; bx < x1 - 0.1; bx += 0.115) {
      const y0 = atWindow(bx) ? WIN_TOP : CH + 0.08;
      box(g, 0.018, CTOP - y0, 0.018, brass, bx, (CTOP + y0) / 2, BZ).castShadow = false;
    }
    for (const [i, wx] of windows.entries()) {
      box(g, WIN_W + 0.2, 0.08, 0.14, brass, wx, WIN_TOP, BZ);                     // the opening's lintel
      for (const s of [-1, 1]) box(g, 0.1, WIN_TOP - CH - 0.08, 0.14, brass, wx + s * (WIN_W / 2 + 0.1), (WIN_TOP + CH + 0.08) / 2, BZ);
      signBoard(g, wx, 2.04, BZ + 0.09, WIN_W + 0.16, 0.2, i ? 'Poste Restante' : 'Stamps & Parcels');
      box(g, 0.44, 0.01, 0.3, M.white, wx, CH + 0.085, CZ + 0.06).rotation.y = i ? -0.06 : 0.05;  // the blotter
    }
    // the bell you ring for service, the scale, sheets of stamps, the till:
    // all at the open parcels end, where nothing is between you and him
    cyl(g, 0.09, 0.1, 0.02, brass, -5.15, CH + 0.09, CZ + 0.14, 16);
    mesh(new THREE.SphereGeometry(0.075, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), brass, -5.15, CH + 0.1, CZ + 0.14, g);
    cyl(g, 0.012, 0.012, 0.05, brass, -5.15, CH + 0.19, CZ + 0.14, 6);
    scale = parcelScale(g, -1.9, CH + 0.08, CZ + 0.16, 0.1);
    for (let i = 0; i < 3; i++) {
      const s = box(g, 0.28, 0.008, 0.36, M.white, -4.4 + i * 0.03, CH + 0.09 + i * 0.01, CZ + 0.12);
      s.rotation.y = i * 0.13;
      s.castShadow = false;
      box(g, 0.05, 0.004, 0.05, stamp.people, -4.5 + i * 0.03, CH + 0.095 + i * 0.01, CZ - 0.02).castShadow = false;
    }
    box(g, 0.44, 0.22, 0.34, M.planks, -5.75, CH + 0.19, CZ);                      // the till
    box(g, 0.4, 0.04, 0.06, brass, -5.75, CH + 0.14, CZ + 0.18).castShadow = false;
    cyl(g, 0.014, 0.014, 0.18, dark, -0.1, CH + 0.1, CZ + 0.2, 5).rotation.z = Math.PI / 2;   // a pen on its chain
    // the gate at the counter's end, swung open back into the sorting floor
    const gate = new THREE.Group();
    gate.position.set(x1 + 0.04, 0, CZ - CD / 2);
    gate.rotation.y = Math.PI / 2;
    g.add(gate);
    box(gate, 1.0, 0.1, 0.07, deal, 0.5, 0.92, 0);
    box(gate, 1.0, 0.08, 0.06, deal, 0.5, 0.5, 0);
    for (const bx of [0.08, 0.5, 0.92]) box(gate, 0.06, 0.9, 0.05, deal, bx, 0.5, 0);
    cyl(gate, 0.03, 0.03, 0.96, brass, 0.03, 0.5, 0, 8);
    // the postmaster, at the first window, and a stool at the second
    // a touch taller than most, so his face clears the counter
    postmaster = folk(g, windows[0], CZ - CD / 2 - 0.3, 0, { pose: 'vendor', look: { hat: 'cap', glasses: true, height: 1.08 } });
    cyl(g, 0.17, 0.17, 0.06, M.planks, windows[1], 0.66, CZ - CD / 2 - 0.42, 12);
    for (let i = 0; i < 3; i++) cyl(g, 0.025, 0.03, 0.64, M.planks, windows[1] + Math.cos(i * 2.1) * 0.12, 0.32, CZ - CD / 2 - 0.42 + Math.sin(i * 2.1) * 0.12, 6);
  }, [
    spots.counter, spots.bell,
    boxCol(cx, CZ, len / 2, CD / 2 + 0.06),
    boxCol(x1 + 0.04, CZ - CD / 2 - 0.5, 0.07, 0.5),
    col(windows[0], CZ - CD / 2 - 0.3, 0.3),
  ]);

  // ---------- the pigeonhole rack and the unclaimed shelf ----------
  const rack = pigeonholes(scene);
  boxCol(RACK.x, BACK + 0.33, RACK_W / 2 + 0.2, 0.35);
  const shelf = quietShelf(scene);
  boxCol(QUIET.x, BACK + 0.03 + QUIET.d / 2, QUIET.w / 2 + 0.1, QUIET.d / 2 + 0.03);
  // a tin reflector over the rack, and dust in the air by the quiet shelf
  lamps.push(troughLamp(scene, RACK.x, RACK.y0 + RACK_H + 0.44, BACK + 0.52));
  smoke(scene, QUIET.x + QUIET.w / 2 - 0.4, 0.8, BACK + 0.9, { n: 7, rise: 1.3, size: 0.016, speed: 0.045, drift: 0.18 });

  // ---------- the sorting table ----------
  const { x: TX, z: TZ, w: TW, d: TD, h: TH } = TABLE;
  const folks = [];        // everyone in the office: they keep the postman's hours
  let trayIn = null, trayDone = null, press = null;
  piece(scene, 'postoffice.sorting-table', [TX, TZ], (g) => {
    box(g, TW, 0.08, TD, deal, TX, TH - 0.04, TZ);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(g, 0.1, TH - 0.08, 0.1, deal, TX + sx * (TW / 2 - 0.14), (TH - 0.08) / 2, TZ + sz * (TD / 2 - 0.14));
    }
    box(g, TW - 0.36, 0.05, TD - 0.36, deal, TX, 0.28, TZ);                        // a shelf underneath
    for (let i = 0; i < 4; i++) {                                                  // bundles on it
      box(g, 0.4, 0.1, 0.3, M.white, TX - 1.0 + i * 0.6, 0.36, TZ).rotation.y = ((i * 19) % 5 - 2) * 0.1;
    }
    trayIn = sortTray(g, TX - 1.0, TH, TZ + 0.08, 'To sort');
    trayDone = sortTray(g, TX - 0.2, TH, TZ + 0.08, 'Sorted');
    press = frankingPress(g, TX + 1.18, TH, TZ - 0.12);
    stampRack(g, TX - 1.2, TH, TZ - 0.42);
    // a heap mid-sort, a ball of string and the scissors
    for (let i = 0; i < 7; i++) {
      const l = box(g, 0.3, 0.012, 0.21, M.white, TX + 0.5 + ((i * 13) % 5 - 2) * 0.05, TH + 0.012 + i * 0.013, TZ - 0.44 + ((i * 7) % 5 - 2) * 0.04);
      l.rotation.y = ((i * 23) % 9 - 4) * 0.12;
      l.castShadow = false;
    }
    mesh(new THREE.SphereGeometry(0.07, 12, 9), M.white, TX + 0.3, TH + 0.07, TZ + 0.38, g);
    for (const s of [-1, 1]) box(g, 0.14, 0.012, 0.025, dark, TX - 0.6 + s * 0.02, TH + 0.015, TZ + 0.42).rotation.y = s * 0.2;
    // a sorter on a stool at the table
    cyl(g, 0.18, 0.18, 0.06, M.planks, TX - 0.6, 0.58, TZ - 1.05, 12);
    for (let i = 0; i < 3; i++) cyl(g, 0.025, 0.03, 0.56, M.planks, TX - 0.6 + Math.cos(i * 2.1) * 0.13, 0.28, TZ - 1.05 + Math.sin(i * 2.1) * 0.13, 6);
    folks.push(folk(g, TX - 0.6, TZ - 1.05, 0, { pose: 'type', seat: 0.6, look: { hair: 'bun', glasses: true } }));
  }, [boxCol(TX, TZ, TW / 2, TD / 2 + 0.1), col(TX - 0.6, TZ - 1.05, 0.35)]);
  // and one up at the rack, putting the sorted post into the holes
  folks.push(folk(scene, RACK.x - 1.6, BACK + 1.0, Math.PI, { pose: 'vendor', look: { hat: 'beanie' } }));
  col(RACK.x - 1.6, BACK + 1.0, 0.32);

  // ---------- sacks, the barrow and the parcels ----------
  piece(scene, 'postoffice.sacks', [4.5, -1.4], (g) => {
    mailSack(g, 4.3, -0.7, 1.0);
    mailSack(g, 5.2, -1.5, 0.85);
    mailSack(g, 4.1, -2.1, 0.95, true);
  }, [col(4.3, -0.7, 0.35), col(5.2, -1.5, 0.3), col(4.1, -2.1, 0.35)]);
  piece(scene, 'postoffice.barrow', [5.3, 0.7], (g) => barrow(g, 5.3, 0.7, -Math.PI / 2 + 0.2), [col(5.3, 0.7, 0.4)]);
  piece(scene, 'postoffice.parcels-gate', [2.4, -0.4], (g) => parcels(g, 2.4, -0.4, [[0.6, 0.34, 0.46], [0.46, 0.3, 0.38], [0.3, 0.22, 0.26]]), [col(2.4, -0.4, 0.4)]);
  piece(scene, 'postoffice.parcels-back', [0.6, -4.4], (g) => parcels(g, 0.6, -4.4, [[0.68, 0.4, 0.5], [0.56, 0.36, 0.42], [0.42, 0.3, 0.34]]), [col(0.6, -4.4, 0.45)]);

  // ---------- the lobby ----------
  // A bench for whoever is waiting, and a shelf to write your card on.
  piece(scene, 'postoffice.bench', [4.4, 4.4], (g) => bench(g, 4.4, 4.4, Math.PI), [boxCol(4.4, 4.4, 1.0, 0.28)]);
  piece(scene, 'postoffice.writing-shelf', [5.6, 2.2], (g) => writingShelf(g, 5.6, 2.2, -Math.PI / 2), [boxCol(5.6, 2.2, 0.42, 0.85)]);
  // somebody waiting their turn, while the counter is open
  folks.push(folk(scene, -1.6, 3.0, Math.PI, { pose: 'idle', look: { hair: 'long', scarf: true } }));
  col(-1.6, 3.0, 0.3);

  // ---------- the bicycle, the chalk board, the posters, the clock ----------
  piece(scene, 'postoffice.bike', [-5.25, 4.1], (g) => bike(g, -5.25, 4.1, -Math.PI / 2), [col(-5.25, 4.1, 0.45)]);
  let board = null;
  piece(scene, 'postoffice.chalk-board', [2.4, 3.9], (g) => { board = chalkBoard(g, 2.4, 3.9, 0.28); }, [col(2.4, 3.9, 0.5)]);
  poster(scene, LEFT + 0.05, 2.18, -0.52, 0.9, 1.2, Math.PI / 2, 'rates');
  poster(scene, LEFT + 0.05, 2.18, -1.5, 0.9, 1.2, Math.PI / 2, 'airmail');
  poster(scene, LEFT + 0.05, 2.2, -4.1, 0.86, 1.1, Math.PI / 2, 'early');
  poster(scene, LEFT + 0.05, 2.2, 4.2, 0.86, 1.1, Math.PI / 2, 'airmail');
  poster(scene, 0.6, 2.0, BACK + 0.07, 0.95, 1.15, 0, 'stamp');
  const clockAt = new THREE.Vector3(0.6, 3.26, BACK + 0.2);
  const face = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 28), [M.white, M.clock, M.white], clockAt.x, clockAt.y, clockAt.z, scene);
  face.rotation.x = Math.PI / 2;
  const hands = new THREE.Group();
  hands.position.copy(clockAt).setZ(clockAt.z + 0.05);
  scene.add(hands);
  clockHands(hands, 0, 0, 0, 0.38);

  return { colliders, spots, lamps, rack, shelf, scale, trayIn, trayDone, press, board, postmaster, folks, clockAt };
}

// A tin reflector lamp on a bracket, pointing down at the pigeonholes.
function troughLamp(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  box(g, 0.05, 0.05, 0.5, brass, 0, 0.14, -0.22);
  const shade = mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.3, 16, 1, true, Math.PI * 0.1, Math.PI * 0.8), enamel, 0, 0.08, 0, g);
  shade.rotation.z = Math.PI / 2;
  shade.receiveShadow = false;
  for (const sx of [-1, 1]) mesh(new THREE.CircleGeometry(0.17, 16), enamel, sx * 0.65, 0.08, 0, g).rotation.y = sx * Math.PI / 2;
  const bulb = mesh(new THREE.SphereGeometry(0.055, 10, 8), M.white, 0, 0.03, 0, g);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe9b5', 0, 5, 1.6);
  light.position.set(0, -0.1, 0.1);
  g.add(light);
  return { bulb, light };
}
