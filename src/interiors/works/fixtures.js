// The Works' fixtures: the benches and trestles the projects sit on, the
// machine shop that runs off the line shaft, the forge that feeds the
// smokestack, the tool wall, the timber rack, the done shelf, the hoist and
// the pendants over it all.
//
// The bay furniture (bench, trestles, dustSheet) is built in a bay's own
// coordinates: it runs along x with its front facing +z, and dims.js turns
// it to face the room.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, mesh, box, cyl } from '../../kit.js';
import { sway, smoke, steam } from '../../life.js';
import { signBoard } from '../../details.js';
import { SHAFT, roofAt, roofOver } from './dims.js';
import { iron, steel, dark, belt as beltMat, canvasCloth, flameA, flameB } from './materials.js';

// ---------- a bay's furniture ----------
// A joiner's bench: a thick top on braced legs, a tool well along the back,
// a back board with a rail of chisels and a vise at one end.
export function bench(g, len) {
  const d = 0.9;
  box(g, len, 0.1, d, M.planks, 0, 0.9, 0);                                   // the top
  box(g, len - 0.2, 0.05, 0.22, M.planks, 0, 0.87, -d / 2 + 0.13);            // the tool well
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) box(g, 0.12, 0.8, 0.12, M.planks, sx * (len / 2 - 0.22), 0.4, sz * (d / 2 - 0.18));
    box(g, 0.1, 0.1, d - 0.36, M.planks, sx * (len / 2 - 0.22), 0.26, 0);
  }
  box(g, len - 0.6, 0.08, 0.12, M.planks, 0, 0.26, 0);                        // the stretcher
  box(g, len - 0.7, 0.04, 0.46, M.planks, 0, 0.36, -0.04);                    // a shelf of offcuts
  for (let i = 0; i < 3; i++) box(g, 0.5 - i * 0.08, 0.05, 0.14, M.planks, -0.5 + i * 0.5, 0.41, -0.06).rotation.y = i * 0.1;
  // the back board, its shelf and a rack of chisels
  box(g, len, 0.85, 0.06, M.planks, 0, 1.37, -d / 2 - 0.03);
  box(g, len - 0.3, 0.05, 0.16, M.planks, 0, 1.12, -d / 2 + 0.04);
  for (let i = 0; i < 5; i++) {
    const cx = -len / 2 + 0.3 + i * 0.13;
    box(g, 0.035, 0.2, 0.025, M.white, cx, 1.5, -d / 2 + 0.02);
    box(g, 0.05, 0.12, 0.05, dark, cx, 1.66, -d / 2 + 0.02);
  }
  // the vise, bolted under the left end of the top
  box(g, 0.34, 0.26, 0.1, iron, -len / 2 + 0.32, 0.72, d / 2 - 0.02);
  cyl(g, 0.025, 0.025, 0.3, steel, -len / 2 + 0.32, 0.72, d / 2 + 0.14, 8).rotation.x = Math.PI / 2;
  cyl(g, 0.02, 0.02, 0.22, steel, -len / 2 + 0.32, 0.72, d / 2 + 0.3, 6).rotation.z = Math.PI / 2;
  return { work: [0.05, 0.95, 0.03], card: [len / 2 - 0.55, 1.5, -d / 2 + 0.05], sheet: { w: len + 0.1, d: d + 0.08, y: 1.02 } };
}

// Two trestles and a cross beam: where the big work of the shop stands, out
// in the middle of the floor under the teeth.
export function trestles(g, len) {
  for (const sx of [-1, 1]) {
    const tx = sx * (len / 2 - 0.35);
    box(g, 0.16, 0.08, 0.78, M.planks, tx, 0.76, 0);                          // the head
    for (const sz of [-1, 1]) for (const s of [-1, 1]) {
      const leg = box(g, 0.08, 0.78, 0.08, M.planks, tx + s * 0.06, 0.39, sz * 0.26);
      leg.rotation.x = sz * 0.17;
      leg.rotation.z = -s * 0.06;
    }
    box(g, 0.1, 0.06, 0.6, M.planks, tx, 0.3, 0);                             // a rail between the legs
  }
  for (const sz of [-0.24, 0.24]) box(g, len, 0.07, 0.2, M.planks, 0, 0.8, sz);  // the bearers
  // a stake at the right end for the bay's card, and shavings under it all
  cyl(g, 0.03, 0.03, 1.0, M.planks, len / 2 + 0.12, 0.5, -0.18, 5);
  return { work: [0, 0.84, 0], card: [len / 2 + 0.12, 1.05, -0.18], sheet: { w: len + 0.2, d: 0.9, y: 0.9 } };
}

// A dust sheet thrown over a bay: a cloth with skirts down the sides, a
// hump where something stands under it and a fold or two. All one outline,
// so it reads as a single sheet.
export function dustSheet(p, w, d, y) {
  const g = new THREE.Group();
  g.position.y = y;
  g.userData.inkId = 83e4 + Math.random() * 1e4;
  p.add(g);
  box(g, w, 0.1, d, canvasCloth, 0, 0, 0);
  for (const s of [-1, 1]) {
    const side = box(g, w + 0.05, 0.46, 0.05, canvasCloth, 0, -0.23, s * (d / 2 - 0.02));
    side.rotation.x = -s * 0.07;
    const end = box(g, 0.05, 0.4, d, canvasCloth, s * (w / 2 - 0.02), -0.2, 0);
    end.rotation.z = s * 0.06;
  }
  const hump = mesh(new THREE.SphereGeometry(0.5, 12, 8), canvasCloth, -w * 0.12, 0.02, 0, g);
  hump.scale.set(0.9, 0.5, 0.75);
  const corner = mesh(new THREE.SphereGeometry(0.3, 10, 7), canvasCloth, w * 0.3, 0.0, 0.08, g);
  corner.scale.set(1.1, 0.4, 0.7);
  for (const [fx, fz] of [[-w * 0.3, 0.2], [w * 0.1, -0.2]]) {               // folds
    const fold = box(g, 0.06, 0.07, d * 0.8, canvasCloth, fx, 0.06, fz);
    fold.castShadow = false;
  }
  return g;
}

// ---------- the pendants ----------
// A factory pendant: conduit down from the roof over it, a deep enamel
// shade, and a bulb that comes on in the evening.
export function pendant(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const drop = roofOver(z) - 0.08 - y;
  cyl(g, 0.02, 0.02, drop, dark, 0, drop / 2, 0, 5).castShadow = false;
  const shadeMat = toon();
  shadeMat.side = THREE.DoubleSide;
  const shade = mesh(new THREE.ConeGeometry(0.3, 0.3, 18, 1, true), shadeMat, 0, 0.04, 0, g);
  shade.castShadow = false;
  cyl(g, 0.05, 0.05, 0.08, dark, 0, 0.18, 0, 8);
  const bulb = mesh(new THREE.SphereGeometry(0.075, 10, 8), M.white, 0, -0.08, 0, g);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe6b0', 0, 9, 1.4);
  light.position.y = -0.22;
  g.add(light);
  return { shade, bulb, light };
}

// ---------- the line shaft ----------
// The shaft runs the length of the machine bay under the roof, hung from the
// tie beam, with a pulley over each machine and the shop's flywheel at the
// far end. Everything on it is a child of one group, so index.js turns the
// lot with a single rotation.
export function lineShaft(p) {
  const { x0, x1, y, z } = SHAFT;
  const shaft = new THREE.Group();
  shaft.position.set((x0 + x1) / 2, y, z);
  p.add(shaft);
  const rod = cyl(shaft, 0.055, 0.055, x1 - x0, iron, 0, 0, 0, 10);
  rod.rotation.z = Math.PI / 2;
  // a pulley: a drum with a rim at each end, keyed to the shaft
  const pulley = (x, r, w) => {
    const g = new THREE.Group();
    g.position.x = x - (x0 + x1) / 2;
    shaft.add(g);
    cyl(g, r, r, w, M.white, 0, 0, 0, 20).rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) cyl(g, r + 0.03, r + 0.03, 0.03, iron, s * (w / 2 + 0.01), 0, 0, 20).rotation.z = Math.PI / 2;
    box(g, w * 0.4, 0.04, r * 2.1, iron, 0, 0, 0);                            // a spoke, so you see it turn
    return g;
  };
  // the flywheel: a rim on six spokes, the shop's weight in motion
  const fly = new THREE.Group();
  fly.position.x = 5.35 - (x0 + x1) / 2;
  shaft.add(fly);
  mesh(new THREE.TorusGeometry(0.62, 0.07, 7, 28), iron, 0, 0, 0, fly).rotation.y = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 28), M.white, 0, 0, 0, fly).rotation.y = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const spoke = box(fly, 0.06, 1.2, 0.06, M.white, 0, 0, 0);
    spoke.rotation.x = (i * Math.PI) / 6;
    spoke.castShadow = false;
  }
  cyl(fly, 0.12, 0.12, 0.22, iron, 0, 0, 0, 12).rotation.z = Math.PI / 2;
  // hangers up to the tie beam, with their bearing boxes
  for (const hx of [0.9, 2.5, 4.7]) {
    const top = roofAt(1, z) - 0.2;
    cyl(p, 0.025, 0.025, top - y - 0.1, dark, hx, y + 0.1 + (top - y - 0.1) / 2, z - 0.1, 5).castShadow = false;
    cyl(p, 0.025, 0.025, top - y - 0.1, dark, hx, y + 0.1 + (top - y - 0.1) / 2, z + 0.1, 5).castShadow = false;
    box(p, 0.16, 0.2, 0.3, iron, hx, y + 0.02, z);
  }
  return { shaft, pulleys: { grinder: pulley(1.6, 0.19, 0.14), lathe: pulley(3.1, 0.22, 0.14) }, fly };
}

// A flat belt from a pulley above to one below: its two runs, with stitches
// across the leather that run when the shop is in gear.
export function flatBelt(p, x, top, bottom) {
  const g = new THREE.Group();
  p.add(g);
  for (const s of [-1, 1]) {
    const az = top.z + s * top.r, bz = bottom.z + s * bottom.r;
    const dy = top.y - bottom.y, dz = az - bz, len = Math.hypot(dy, dz);
    const run = box(g, 0.13, len, 0.02, beltMat, x, (top.y + bottom.y) / 2, (az + bz) / 2);
    run.rotation.x = Math.atan2(dz, dy);
    run.castShadow = false;
  }
  return g;
}

// ---------- the machines ----------
// A treadle lathe driven off the shaft: a cast bed on two legs, the
// headstock with its cone pulley, a tailstock, the tool rest, and a leg
// turning between centres.
const legProfile = [[0, 0], [0.09, 0], [0.085, 0.12], [0.055, 0.2], [0.075, 0.34], [0.07, 0.6], [0.045, 0.72], [0.08, 0.86], [0.05, 1.0], [0, 1.0]];
export function lathe(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  box(g, 2.4, 0.16, 0.5, iron, 0, 0.95, 0);                                   // the bed
  box(g, 2.4, 0.06, 0.1, M.white, 0, 1.06, 0.2);                              // its ways
  for (const sx of [-1, 1]) {
    box(g, 0.34, 0.9, 0.42, iron, sx * 0.95, 0.45, 0);
    box(g, 0.5, 0.08, 0.56, iron, sx * 0.95, 0.04, 0);
  }
  box(g, 0.44, 0.52, 0.46, iron, -0.95, 1.29, 0);                             // the headstock
  box(g, 0.34, 0.44, 0.4, iron, 0.95, 1.25, 0);                               // the tailstock
  cyl(g, 0.04, 0.04, 0.3, steel, 0.72, 1.3, 0, 8).rotation.z = Math.PI / 2;
  box(g, 0.5, 0.1, 0.14, iron, -0.1, 1.14, 0.26);                             // the tool rest
  box(g, 0.3, 0.03, 0.1, steel, -0.1, 1.2, 0.26).rotation.z = 0.1;
  cyl(g, 0.11, 0.11, 0.06, iron, 1.18, 1.25, 0, 12).rotation.z = Math.PI / 2; // the tailstock wheel
  // everything that turns: the cone pulley, the chuck and the work itself
  const spindle = new THREE.Group();
  spindle.position.set(0, 1.3, 0);
  g.add(spindle);
  const cone = cyl(spindle, 0.1, 0.22, 0.3, M.white, -0.74, 0, 0, 16);
  cone.rotation.z = Math.PI / 2;
  cyl(spindle, 0.11, 0.11, 0.1, iron, -0.52, 0, 0, 12).rotation.z = Math.PI / 2;
  const work = mesh(new THREE.LatheGeometry(legProfile.map(([r, y]) => new THREE.Vector2(r, y)), 14), M.planks, -0.45, 0, 0, spindle);
  work.rotation.z = -Math.PI / 2;
  work.scale.y = 1.15;
  work.receiveShadow = false;
  return { group: g, spindle, drive: { y: 1.3, z, r: 0.22 } };
}

// A grindstone in a timber frame over its water trough, belted to the shaft.
export function grindstone(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  for (const sz of [-1, 1]) {
    box(g, 0.1, 1.0, 0.1, M.planks, -0.3, 0.5, sz * 0.3);
    box(g, 0.1, 1.0, 0.1, M.planks, 0.3, 0.5, sz * 0.3);
  }
  box(g, 0.76, 0.08, 0.1, M.planks, 0, 0.95, -0.32);                          // a brace behind the belt
  box(g, 0.9, 0.3, 0.76, M.planks, 0, 0.2, 0);                                // the trough
  box(g, 0.74, 0.04, 0.6, M.deep, 0, 0.33, 0).castShadow = false;             // water in it
  box(g, 0.5, 0.06, 0.14, M.planks, 0, 0.98, 0.34);                           // the rest
  const wheel = new THREE.Group();
  wheel.position.set(0, 0.68, 0);
  g.add(wheel);
  const stone = cyl(wheel, 0.4, 0.4, 0.14, M.stone, 0, 0, 0, 24);
  stone.rotation.z = Math.PI / 2;
  cyl(wheel, 0.18, 0.18, 0.16, M.white, 0, 0, 0, 14).rotation.z = Math.PI / 2;
  cyl(wheel, 0.035, 0.035, 0.8, steel, 0, 0, 0, 8).rotation.z = Math.PI / 2;
  box(wheel, 0.1, 0.03, 0.74, iron, 0, 0, 0);                                  // a key, so you see it turn
  return { group: g, wheel, drive: { y: 0.68, z, r: 0.19 } };
}

// The clutch lever on its post between the machines: a long handle that
// throws the shop's belts in and out of gear.
export function clutchLever(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  box(g, 0.12, 1.5, 0.12, M.planks, 0, 0.75, 0);
  box(g, 0.2, 0.26, 0.2, iron, 0, 1.44, 0);
  const quadrant = box(g, 0.04, 0.34, 0.5, iron, 0.1, 1.3, 0);
  quadrant.castShadow = false;
  for (const z0 of [-0.2, 0.2]) box(g, 0.08, 0.06, 0.06, iron, 0.1, 1.46, z0);   // the two notches
  const lever = new THREE.Group();
  lever.position.set(0, 1.42, 0);
  g.add(lever);
  cyl(lever, 0.022, 0.028, 0.85, M.planks, 0, -0.42, 0, 6);
  mesh(new THREE.SphereGeometry(0.05, 8, 6), dark, 0, -0.84, 0, lever);
  return { group: g, lever };
}

// ---------- the forge ----------
// The brick hearth in the back corner, its hood and the flue that goes up
// through the roof into the smokestack you see from the plaza. The bellows
// breathe beside it; the fire is banked when the shop is shut.
export function forge(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  box(g, 2.2, 0.85, 1.1, M.bricks, 0, 0.43, 0);
  box(g, 2.34, 0.1, 1.22, M.stone, 0, 0.9, 0);
  box(g, 0.9, 0.1, 0.66, dark, 0, 0.95, 0.04).castShadow = false;             // the firepot's ash
  for (let i = 0; i < 7; i++) {                                               // coals
    const c = mesh(new THREE.IcosahedronGeometry(0.07, 0), dark, -0.3 + (i % 4) * 0.2, 1.0, -0.1 + (i % 3) * 0.12, g);
    c.castShadow = false;
  }
  const flames = [];
  for (const [fx, fh, mat] of [[-0.18, 0.34, flameA], [0.02, 0.46, flameA], [0.22, 0.3, flameA], [-0.04, 0.22, flameB], [0.14, 0.18, flameB]]) {
    const f = mesh(new THREE.ConeGeometry(0.1, 1, 6), mat, fx, 1.0, 0.02, g);
    f.castShadow = false;
    f.userData.h = fh;
    flames.push(f);
  }
  const light = new THREE.PointLight('#ffb070', 0, 8, 1.5);
  light.position.set(0, 1.3, 0.3);
  g.add(light);
  // the hood and the flue up into the roof
  const hoodMat = toon();
  hoodMat.side = THREE.DoubleSide;                                            // open underneath
  const hood = mesh(new THREE.CylinderGeometry(0.34, 1.0, 0.95, 4, 1, true), hoodMat, 0, 2.08, 0.06, g);
  hood.rotation.y = Math.PI / 4;
  hood.castShadow = false;
  cyl(g, 0.28, 0.28, 1.9, M.white, 0, 3.5, 0.06, 14);
  for (const y of [2.9, 3.9]) cyl(g, 0.33, 0.33, 0.1, M.white, 0, y, 0.06, 14);
  smoke(g, 0, 2.2, 0.06, { n: 3, rise: 1.1, size: 0.14, speed: 0.3, drift: 0.05 });
  // the bellows on the wall beside the hearth, and its lever
  const bellows = new THREE.Group();
  bellows.position.set(-1.35, 1.25, -0.2);
  g.add(bellows);
  for (const [s, h] of [[-1, 0.26], [1, 0.26]]) {
    const board = box(bellows, 0.7, 0.06, 0.5, M.planks, 0, s * h * 0.5, 0);
    board.rotation.z = s * 0.08;
  }
  box(bellows, 0.66, 0.2, 0.42, canvasCloth, 0, 0, 0);
  cyl(bellows, 0.05, 0.05, 0.4, steel, 0.42, 0, 0, 8).rotation.z = Math.PI / 2;
  const handle = new THREE.Group();
  handle.position.set(-0.3, 0.2, 0.0);
  bellows.add(handle);
  cyl(handle, 0.035, 0.035, 1.0, M.planks, -0.4, 0, 0.3, 6).rotation.z = Math.PI / 2;
  // a shelf of tongs and hammers over the hearth
  box(g, 1.0, 0.05, 0.2, M.planks, 0.8, 1.5, -0.42);
  for (let i = 0; i < 3; i++) {
    const t = box(g, 0.05, 0.5, 0.03, steel, 0.5 + i * 0.26, 1.3, -0.4);
    t.rotation.z = 0.1 * (i - 1);
  }
  return { group: g, flames, light, handle };
}

// ---------- the tool wall ----------
// Saws, chisels, mallets, a plane and the clamps, all on their hooks: the
// shop's tools where a hand can reach them. Faces +z.
export function toolWall(p, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 2.8, 1.7, 0.06, M.planks, 0, 0, 0);
  for (const sy of [-0.86, 0.86]) box(g, 2.9, 0.1, 0.12, M.planks, 0, sy, 0.03);
  // two handsaws by their handles
  for (const [sx, len] of [[-1.1, 0.66], [-0.76, 0.52]]) {
    const blade = box(g, 0.12, len, 0.02, M.white, sx, 0.42 - len / 2, 0.06);
    blade.rotation.z = 0.04;
    box(g, 0.14, 0.17, 0.05, M.planks, sx, 0.52, 0.06);
  }
  // a rack of chisels, points down
  box(g, 0.78, 0.05, 0.14, M.planks, -0.05, 0.3, 0.08);
  for (let i = 0; i < 6; i++) {
    const cx = -0.35 + i * 0.13;
    box(g, 0.03, 0.22, 0.02, steel, cx, 0.17, 0.08);
    cyl(g, 0.022, 0.03, 0.14, M.planks, cx, 0.36, 0.08, 6);
  }
  // mallets and a hammer on pegs
  for (let i = 0; i < 3; i++) {
    const mx = 0.6 + i * 0.26;
    cyl(g, 0.018, 0.018, 0.3, M.planks, mx, 0.28, 0.07, 6);
    box(g, 0.1 + i * 0.01, 0.1, 0.1, i ? dark : M.planks, mx, 0.46, 0.07);
  }
  // a plane and a try square on the lower shelf
  box(g, 0.28, 0.09, 0.08, M.planks, -0.9, -0.72, 0.12);
  box(g, 0.05, 0.14, 0.03, dark, -0.9, -0.62, 0.12).rotation.z = -0.3;
  box(g, 0.04, 0.4, 0.02, steel, -0.3, -0.58, 0.08);
  box(g, 0.26, 0.04, 0.03, M.planks, -0.19, -0.76, 0.08);
  // the clamps, hanging in a row
  for (let i = 0; i < 4; i++) {
    const kx = 0.3 + i * 0.3;
    box(g, 0.035, 0.52, 0.03, steel, kx, -0.5, 0.09);
    box(g, 0.12, 0.05, 0.05, dark, kx + 0.03, -0.26, 0.09);
    box(g, 0.12, 0.05, 0.05, dark, kx + 0.03, -0.66, 0.09);
    cyl(g, 0.012, 0.012, 0.12, steel, kx + 0.09, -0.66, 0.09, 5).rotation.z = Math.PI / 2;
  }
  for (const hx of [-1.25, 1.25]) cyl(g, 0.015, 0.015, 0.1, dark, hx, 0.7, 0.08, 5).rotation.x = Math.PI / 2;
  return g;
}

// ---------- the timber rack ----------
// Uprights with arms: boards lying flat, sheets leaning, offcuts in the bin
// underneath. Stands against a wall, open toward +z.
export function timberRack(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  const w = 2.4;
  for (const sx of [-1, 1]) {
    box(g, 0.12, 2.3, 0.12, M.planks, sx * (w / 2 - 0.08), 1.15, -0.3);
    for (const y of [0.55, 1.05, 1.55, 2.05]) {
      const arm = box(g, 0.1, 0.1, 0.62, M.planks, sx * (w / 2 - 0.08), y, 0.02);
      arm.rotation.x = -0.06;
    }
  }
  // boards on the arms, a few per shelf, and two sheets leaning on the end
  for (const [y, n, th] of [[0.62, 4, 0.05], [1.12, 3, 0.07], [1.62, 5, 0.04], [2.12, 2, 0.09]]) {
    for (let i = 0; i < n; i++) {
      const b = box(g, w - 0.2 - (i % 3) * 0.3, th, 0.16, M.planks, (i % 2) * 0.1, y + th / 2, -0.18 + i * 0.17);
      b.receiveShadow = false;
    }
  }
  const sheet = box(g, 1.1, 1.8, 0.05, M.planks, w / 2 - 0.5, 0.9, 0.42);
  sheet.rotation.x = -0.12;
  const sheet2 = box(g, 0.9, 1.6, 0.04, M.planks, w / 2 - 0.75, 0.8, 0.52);
  sheet2.rotation.x = -0.16;
  // the offcut bin
  box(g, 1.0, 0.44, 0.5, M.planks, -w / 2 + 0.6, 0.22, 0.34);
  for (let i = 0; i < 5; i++) {
    const o = box(g, 0.1, 0.1, 0.4 + (i % 3) * 0.1, M.planks, -w / 2 + 0.3 + i * 0.14, 0.46 + (i % 2) * 0.08, 0.34);
    o.rotation.set(0.2 * (i % 3), 0.3 * i, 0.1 * i);
    o.castShadow = false;
  }
  return g;
}

// ---------- the done shelf ----------
// A steel rack where finished work is set aside, with its board over it.
// Returns the slots (in the rack's own coordinates) for displays.js to fill.
export function doneShelf(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  const w = 2.5, d = 0.55;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(g, 0.08, 2.15, 0.08, iron, sx * (w / 2 - 0.06), 1.07, sz * (d / 2 - 0.06));
  }
  // the middle shelf fills first, at eye height, then the top one
  const rows = new Map([[1.35, []], [1.95, []]]);
  for (const y of [0.75, 1.35, 1.95]) {
    box(g, w, 0.07, d, M.planks, 0, y, 0);
    box(g, w, 0.06, 0.06, iron, 0, y + 0.06, d / 2 - 0.02).castShadow = false;   // a lip, so nothing rolls off
    for (const sx of [-1, 0, 1]) rows.get(y)?.push([sx * 0.8, y + 0.035, 0]);
  }
  const slots = [...rows.get(1.35), ...rows.get(1.95)];
  for (const sx of [-1, 1]) {                                                 // diagonal braces at the back
    const brace = box(g, 0.05, 2.0, 0.05, iron, sx * 0.62, 1.1, -d / 2 + 0.04);
    brace.rotation.z = sx * 0.55;
    brace.castShadow = false;
  }
  signBoard(g, 0, 2.38, d / 2 - 0.04, 1.3, 0.3, 'Finished');
  return { group: g, slots };
}

// ---------- the hoist ----------
// The beam in from the loading hatch, the chain block on it and the hook
// hanging over the loading bay, swinging a little.
export function hoist(p, x) {
  const g = new THREE.Group();
  p.add(g);
  const y = 3.95, z0 = 1.6, z1 = 4.85;
  box(g, 0.18, 0.24, z1 - z0, M.planks, x, y, (z0 + z1) / 2);
  for (const z of [2.2, 4.4]) {
    const top = roofAt(0, z) - 0.15;
    cyl(g, 0.03, 0.03, top - y - 0.12, dark, x, y + 0.12 + (top - y - 0.12) / 2, z, 5).castShadow = false;
    box(g, 0.24, 0.1, 0.16, iron, x, y + 0.17, z);
  }
  box(g, 0.3, 0.28, 0.3, iron, x, 3.72, 3.2);                                 // the chain block
  cyl(g, 0.11, 0.11, 0.07, iron, x, 3.72, 3.4, 12).rotation.z = Math.PI / 2;
  const pivot = new THREE.Group();
  pivot.position.set(x, 3.6, 3.2);
  g.add(pivot);
  cyl(pivot, 0.02, 0.02, 1.5, dark, 0, -0.75, 0, 5).castShadow = false;
  box(pivot, 0.14, 0.12, 0.14, iron, 0, -1.56, 0);
  const hook = mesh(new THREE.TorusGeometry(0.09, 0.025, 5, 12, Math.PI * 1.4), steel, 0, -1.72, 0, pivot);
  hook.rotation.y = Math.PI / 2;
  sway(pivot, 0.03);
  return g;
}

// ---------- small things ----------
// An anvil on its stump, the smith's second workbench.
export function anvil(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  const stump = cyl(g, 0.3, 0.34, 0.55, M.planks, 0, 0.27, 0, 14);
  stump.receiveShadow = false;
  box(g, 0.66, 0.12, 0.26, iron, 0, 0.61, 0);                                 // the face
  box(g, 0.3, 0.14, 0.22, iron, 0, 0.5, 0);                                   // the waist
  box(g, 0.5, 0.08, 0.3, iron, 0, 0.42, 0);                                   // the base
  const horn = cyl(g, 0.03, 0.11, 0.26, iron, 0.44, 0.61, 0, 10);
  horn.rotation.z = Math.PI / 2;
  cyl(g, 0.02, 0.02, 0.36, M.planks, -0.1, 0.72, 0.16, 6).rotation.set(0, 0.4, 1.4);  // a hammer left on it
  box(g, 0.1, 0.07, 0.07, dark, 0.06, 0.72, 0.2);
  return g;
}

// The quenching barrel: hot iron goes in, steam comes off it.
export function quenchBarrel(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  cyl(g, 0.34, 0.3, 0.8, M.planks, 0, 0.4, 0, 14);
  for (const y of [0.14, 0.66]) cyl(g, 0.35, 0.35, 0.05, dark, 0, y, 0, 14);
  cyl(g, 0.3, 0.3, 0.03, M.deep, 0, 0.78, 0, 14).castShadow = false;
  steam(g, 0.05, 0.86, 0.02);
  return g;
}

// A heap of sawdust and shavings, swept together but not yet taken out.
export function sawdust(p, x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  p.add(g);
  const heap = mesh(new THREE.SphereGeometry(0.34, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), M.white, 0, 0, 0, g);
  heap.scale.set(1, 0.72, 0.82);
  heap.receiveShadow = false;
  const second = mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.white, 0.22, 0, 0.14, g);
  second.scale.set(1, 0.7, 0.9);
  second.receiveShadow = false;
  for (let i = 0; i < 5; i++) {                                               // curls of shaving around it
    const curl = mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI * 1.3), M.white, Math.cos(i * 2.2) * 0.36, 0.02, Math.sin(i * 2.2) * 0.28, g);
    curl.rotation.set(Math.PI / 2 + i * 0.2, i, 0);
    curl.castShadow = false;
  }
  return g;
}

// A broom leaning where the sweeper left it.
export function broom(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.set(0, rotY, 0.22);
  p.add(g);
  cyl(g, 0.022, 0.022, 1.5, M.planks, 0, 0.75, 0, 6);
  box(g, 0.34, 0.1, 0.12, dark, 0, 0.05, 0);
  for (let i = 0; i < 6; i++) box(g, 0.03, 0.1, 0.1, M.white, -0.14 + i * 0.056, 0.0, 0).castShadow = false;
  return g;
}

// A chest of small drawers: the shop's screws, nails and hinges.
export function partsChest(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  p.add(g);
  box(g, 0.7, 1.2, 0.5, M.planks, 0, 0.6, 0);
  box(g, 0.78, 0.06, 0.56, M.planks, 0, 1.23, 0);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
    const dz = r === 2 && c === 1 ? 0.08 : 0;                                  // one drawer left open
    box(g, 0.2, 0.18, 0.04 + dz, M.white, -0.22 + c * 0.22, 0.2 + r * 0.22, 0.25 + dz / 2).castShadow = false;
    cyl(g, 0.015, 0.015, 0.03, dark, -0.22 + c * 0.22, 0.2 + r * 0.22, 0.28 + dz, 6).rotation.x = Math.PI / 2;
  }
  // a tin of nails and a mug of pencils on top
  cyl(g, 0.07, 0.06, 0.1, M.white, -0.18, 1.31, 0.06, 10);
  cyl(g, 0.055, 0.05, 0.11, M.white, 0.12, 1.32, 0.0, 10);
  for (const [px, pr] of [[0.1, 0.3], [0.14, -0.2]]) cyl(g, 0.008, 0.008, 0.2, dark, px, 1.44, 0.0, 4).rotation.z = pr;
  return g;
}

// A stool, and an upturned crate with the foreman's tea on it.
export function stool(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  cyl(g, 0.19, 0.19, 0.05, M.planks, 0, 0.62, 0, 14);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(g, 0.022, 0.03, 0.62, M.planks, Math.cos(a) * 0.14, 0.31, Math.sin(a) * 0.14, 6);
    leg.rotation.set(Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14);
  }
  return g;
}

export function teaCrate(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = 0.3;
  p.add(g);
  box(g, 0.5, 0.42, 0.42, M.planks, 0, 0.21, 0);
  for (const sy of [0.08, 0.34]) box(g, 0.52, 0.05, 0.44, M.white, 0, sy, 0).castShadow = false;
  cyl(g, 0.05, 0.045, 0.09, M.white, 0.06, 0.47, 0.02, 10);
  mesh(new THREE.TorusGeometry(0.03, 0.008, 4, 10), M.white, 0.11, 0.46, 0.02, g).rotation.y = Math.PI / 2;
  steam(g, 0.06, 0.54, 0.02);
  return g;
}
