// The food-truck corner: a little vintage van selling grilled things from a
// hatch in its side, its menu, a chalk sign, string lights over a few tables,
// and the odds and ends around it (gas bottles, crates, a bin, planters).
// Static parts are merged per material (see bake) so the whole corner costs
// a few dozen meshes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../ink.js';
import { M, stamp, mesh, box, cyl } from '../kit.js';
import { tex, lineArtCanvas, inkLine, LINE_ART_SIZE as S } from '../textures.js';
import { swapModel } from '../models.js';
import { smoke, steam, swingSign, lampLight } from '../life.js';
import { signBoard } from '../details.js';

let seed = 4711;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const dark = toon('#3a3a3a');
const inside = toon('#ecece8');                 // the truck's kitchen walls
const canopy = toon('#ffffff', tex.stripes());  // umbrellas, seen from below too
canopy.side = THREE.DoubleSide;

// ---------- helpers ----------
// Merge every mesh under `g` into one mesh per material, in g's own space.
// The merged parts become one object for the ink pass, so things that should
// keep a line between them (a door on a wall) go in different groups.
function bake(g) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert();
  const byMat = new Map();
  g.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.clearGroups();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(geo);
  });
  g.clear();
  for (const [mat, geos] of byMat) mesh(mergeGeometries(geos), mat, 0, 0, 0, g);
  return g;
}
const layer = (p) => { const g = new THREE.Group(); p.add(g); return g; };

// A thin rod from a to b ([x, y, z] each).
function rod(p, a, b, r, mat, seg = 5) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = cyl(p, r, r, A.distanceTo(B), mat, 0, 0, 0, seg);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  return m;
}
// A cylinder lying along x or z.
function axle(p, r, len, mat, x, y, z, along = 'z', seg = 16) {
  const m = cyl(p, r, r, len, mat, x, y, z, seg);
  if (along === 'z') m.rotation.x = Math.PI / 2; else m.rotation.z = Math.PI / 2;
  return m;
}
// A flat shape in x/y, extruded `depth` along z (centered on z).
function extrude(shape, depth, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 10,
  });
  g.translate(0, 0, -depth / 2 + bevel);
  return g;
}
// A texture face: a plane showing `map` once, facing +z.
function face(p, w, h, map, x, y, z, rotY = 0) {
  const m = mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', map), x, y, z, p);
  m.rotation.y = rotY;
  m.castShadow = false;
  return m;
}

// ---------- hand-lettered textures ----------
const HAND = '"Patrick Hand", "Comic Neue", sans-serif';
// A line-art canvas that is drawn again once the hand-lettering font is in.
function lettered(draw, prep) {
  const t = lineArtCanvas((g) => { prep?.(g); draw(g); });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const redraw = () => {
    const g = t.image.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
    g.strokeStyle = g.fillStyle = '#111111'; g.lineWidth = 5;
    prep?.(g); draw(g);
    t.needsUpdate = true;
  };
  document.fonts?.load(`40px ${HAND}`).then(redraw).catch(() => {});
  return t;
}
// A row of menu text: the dish on the left, dots, the price on the right.
function menuRow(g, y, dish, price) {
  g.textAlign = 'left'; g.fillText(dish, 22, y);
  g.textAlign = 'right'; g.fillText(price, S - 20, y);
  const from = 26 + g.measureText(dish).width + 6, to = S - 26 - g.measureText(price).width;
  for (let x = from; x < to; x += 9) g.fillRect(x, y - 2, 2.5, 2.5);
}

// The menu board on the truck's side.
const menuTex = () => lettered((g) => {
  g.lineWidth = 4;
  inkLine(g, 8, 8, S - 8, 8); inkLine(g, S - 8, 8, S - 8, S - 8); inkLine(g, S - 8, S - 8, 8, S - 8); inkLine(g, 8, S - 8, 8, 8);
  g.textBaseline = 'alphabetic';
  g.font = `46px ${HAND}`; g.textAlign = 'center';
  g.fillText('Menu', S / 2, 52);
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(70, 62); g.quadraticCurveTo(S / 2, 54, S - 70, 62); g.stroke();
  g.font = `25px ${HAND}`;
  const rows = [['Grilled cheese', '4'], ['Hot dog', '3'], ['Fries', '2'], ['Soup of the day', '3'], ['Lemonade', '2'], ['Coffee', '1.5']];
  rows.forEach(([d, p], i) => menuRow(g, 96 + i * 26, d, p));
  // a little hot dog drawn at the bottom
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(S / 2, 240, 34, 7, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(S / 2 - 30, 236); g.quadraticCurveTo(S / 2, 222, S / 2 + 30, 236); g.stroke();
  g.beginPath(); g.moveTo(S / 2 - 22, 239);
  for (let i = 0; i < 6; i++) g.lineTo(S / 2 - 18 + i * 8, i % 2 ? 236 : 242);
  g.stroke();
});

// The chalk sign: white chalk on a dark board. Not line art (it is not
// re-inked at night), just a plain painted board.
const chalkTex = () => {
  const t = lettered((g) => {
    g.strokeStyle = g.fillStyle = '#f4f4ef';
    g.lineWidth = 3;
    g.font = `44px ${HAND}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText('Today', S / 2, 50);
    inkLine(g, 64, 60, S - 64, 58, 2);
    g.font = `30px ${HAND}`;
    g.fillText('tomato soup', S / 2, 100);
    g.fillText('& toast  3', S / 2, 134);
    // a steaming bowl
    g.beginPath(); g.moveTo(88, 168); g.quadraticCurveTo(S / 2, 222, S - 88, 168); g.closePath(); g.stroke();
    for (const x of [112, 128, 144]) { g.beginPath(); g.moveTo(x, 160); g.bezierCurveTo(x - 8, 150, x + 8, 142, x, 132 + 24); g.stroke(); }
    g.font = `24px ${HAND}`;
    g.fillText('come in, we\'re open!', S / 2, 238);
  }, (g) => { g.fillStyle = '#4a4a47'; g.fillRect(0, 0, S, S); });
  t.userData.lineArt = false;
  return t;
};

// ---------- the truck ----------
// A little vintage van, 5.1 m long, 2.1 m wide and 2.7 m tall, in its own
// frame: the cab at -x, the serving hatch on the +z side. `truckFrame` turns
// a spot in that frame into plaza coordinates.
export const TRUCK = {
  len: 5.1, wid: 2.1, roof: 2.6, belt: 1.05,
  hatch: { x0: -0.95, x1: 1.45, y0: 1.15, y1: 2.2 },
  // where the string lights are tied on, in the truck's frame
  lightsRear: [2.3, 2.68, 1.0], lightsFront: [-1.15, 2.68, 1.0],
};
export function truckFrame(x, z, rotY) {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  return (lx, lz, y = 0) => ({ x: x + lx * c + lz * s, y, z: z - lx * s + lz * c });
}

export function foodTruck(p, x, z, rotY) {
  const { roof: ROOF, belt: BELT, hatch: H } = TRUCK;
  const HW = TRUCK.wid / 2;
  const g = new THREE.Group();
  const body = layer(g), trim = layer(g), darks = layer(g), kitchen = layer(g), wood = layer(g);

  // --- the body: the cab and the lower body are one rounded piece; the box
  // behind the cab is hollow, so you can see into the kitchen
  const WX = [-1.62, 1.55], WR = 0.36, AR = 0.47;   // wheels: where, how big, the arches
  const lower = new THREE.Shape();
  lower.moveTo(-2.4, 0.4);
  lower.lineTo(WX[0] - AR, 0.4); lower.absarc(WX[0], 0.4, AR, Math.PI, 0, true);
  lower.lineTo(WX[1] - AR, 0.4); lower.absarc(WX[1], 0.4, AR, Math.PI, 0, true);
  lower.lineTo(2.42, 0.4); lower.quadraticCurveTo(2.5, 0.4, 2.5, 0.5);
  lower.lineTo(2.5, BELT); lower.lineTo(-1.2, BELT); lower.lineTo(-1.2, ROOF);
  lower.lineTo(-1.72, ROOF);
  lower.quadraticCurveTo(-2.12, ROOF, -2.18, 2.22);   // the rounded top of the cab
  lower.lineTo(-2.34, 1.42);                          // the windscreen, leaning back
  lower.quadraticCurveTo(-2.52, 1.36, -2.52, 1.02);   // the round nose
  lower.lineTo(-2.52, 0.6); lower.quadraticCurveTo(-2.52, 0.4, -2.4, 0.4);
  mesh(extrude(lower, TRUCK.wid, 0.06), M.white, 0, 0, 0, body);
  // the box: two side walls (the near one with the hatch), the back, the roof
  const side = new THREE.Shape();
  side.moveTo(-1.2, BELT); side.lineTo(2.5, BELT); side.lineTo(2.5, ROOF - 0.22);
  side.quadraticCurveTo(2.5, ROOF, 2.28, ROOF); side.lineTo(-1.2, ROOF); side.closePath();
  const holed = side.clone();
  const hole = new THREE.Path();
  hole.moveTo(H.x0, H.y0); hole.lineTo(H.x1, H.y0); hole.lineTo(H.x1, H.y1); hole.lineTo(H.x0, H.y1); hole.closePath();
  holed.holes.push(hole);
  mesh(extrude(holed, 0.06), M.white, 0, 0, HW - 0.03, body);
  mesh(extrude(side, 0.06), M.white, 0, 0, -HW + 0.03, body);
  box(body, 0.05, ROOF - 0.22 - BELT, TRUCK.wid, M.white, 2.52, (ROOF - 0.22 + BELT) / 2, 0);
  box(body, 3.5, 0.06, TRUCK.wid - 0.1, M.white, 0.55, ROOF - 0.03, 0);
  axle(body, 0.22, TRUCK.wid - 0.1, M.white, 2.28, ROOF - 0.22, 0, 'z', 12);
  // the kitchen's walls, a shade grayer (the back wall lights up at night)
  const back = box(g, 3.6, ROOF - BELT - 0.08, 0.02, inside, 0.6, (ROOF + BELT) / 2 - 0.02, -HW + 0.07);
  back.castShadow = false;
  box(kitchen, 0.02, ROOF - BELT - 0.1, TRUCK.wid - 0.14, inside, -1.18, (ROOF + BELT) / 2, 0);
  box(kitchen, 3.6, 0.02, TRUCK.wid - 0.14, inside, 0.6, ROOF - 0.07, 0);

  // --- wheels with hubcaps, dark wheel wells, bumpers, lights
  for (const wx of WX) {
    for (const sz of [-1, 1]) {
      axle(darks, WR, 0.24, dark, wx, WR, sz * (HW - 0.15), 'z', 18);
      axle(trim, 0.2, 0.03, M.white, wx, WR, sz * (HW - 0.02), 'z', 14);
      mesh(new THREE.SphereGeometry(0.07, 8, 6), M.white, wx, WR, sz * (HW - 0.01), trim);
      // the arch's lip
      const lip = mesh(new THREE.TorusGeometry(AR + 0.03, 0.035, 5, 14, Math.PI), M.white, wx, 0.4, sz * (HW + 0.03), trim);
      lip.scale.z = 0.6;
    }
    box(darks, AR * 2 - 0.1, 0.45, TRUCK.wid - 0.6, M.deep, wx, 0.62, 0);
  }
  // bumpers with number plates (the body's nose is at x -2.57, its back at 2.55)
  for (const [bx, face] of [[-2.62, -2.585], [2.6, 2.565]]) {
    axle(trim, 0.07, TRUCK.wid + 0.06, M.white, bx, 0.5, 0, 'z', 10);
    box(trim, 0.03, 0.13, 0.36, M.white, face, 0.65, 0);
  }
  for (const sz of [-1, 1]) {
    axle(trim, 0.14, 0.06, M.white, -2.575, 1.0, sz * 0.66, 'x', 14);               // headlights
    axle(trim, 0.1, 0.03, M.white, -2.61, 1.0, sz * 0.66, 'x', 14);
    box(trim, 0.04, 0.14, 0.12, M.white, 2.57, 0.88, sz * 0.82);                    // tail lights
  }
  // the grille: a dark panel with bars, and a little badge above it
  box(darks, 0.03, 0.26, 0.62, M.deep, -2.575, 0.88, 0);
  for (let i = 0; i < 4; i++) box(trim, 0.03, 0.025, 0.66, M.white, -2.595, 0.79 + i * 0.06, 0);
  axle(trim, 0.05, 0.03, M.white, -2.59, 1.11, 0, 'x', 10);

  // --- the cab: windscreen in two panes, side windows, doors, mirrors
  const lean = Math.atan2(0.16, 0.8);
  for (const sz of [-1, 1]) {
    const pane = box(darks, 0.03, 0.66, 0.8, M.deep, -2.315, 1.83, sz * 0.43);
    pane.rotation.z = -lean;
    const wiper = box(trim, 0.02, 0.45, 0.02, dark, -2.345, 1.66, sz * 0.43 - 0.12);
    wiper.rotation.set(0.6 * sz, 0, -lean, 'ZYX');
    box(darks, 0.6, 0.52, 0.03, M.deep, -1.66, 1.88, sz * (HW + 0.005));             // side window
    // the door: its outline and handle
    for (const [w, h, dx, dy] of [[0.8, 0.035, 0, 2.3], [0.8, 0.035, 0, 0.5], [0.035, 1.8, -0.4, 1.4], [0.035, 1.8, 0.4, 1.4]]) {
      box(trim, w, h, 0.02, M.white, -1.65 + dx, dy, sz * (HW + 0.01));
    }
    box(trim, 0.14, 0.04, 0.05, dark, -1.38, 1.45, sz * (HW + 0.03));
    // a mirror on a little arm
    rod(trim, [-2.12, 1.55, sz * HW], [-2.2, 1.7, sz * (HW + 0.2)], 0.015, dark);
    box(trim, 0.04, 0.2, 0.14, M.white, -2.2, 1.78, sz * (HW + 0.22));
  }
  // drip rails along the roof, and the waistline stripe (the one dash of color)
  for (const sz of [-1, 1]) box(trim, 3.55, 0.05, 0.05, M.white, 0.55, ROOF - 0.02, sz * (HW + 0.01));
  const stripe = layer(g);
  for (const sz of [-1, 1]) box(stripe, 4.85, 0.09, 0.02, stamp.people, 0.05, 1.0, sz * (HW + 0.012));
  box(stripe, 0.02, 0.09, TRUCK.wid - 0.1, stamp.people, 2.52, 1.0, 0);

  // --- the serving hatch: a frame, a counter with brackets, a propped flap
  const fz = HW + 0.012;
  box(trim, H.x1 - H.x0 + 0.12, 0.06, 0.03, M.white, (H.x0 + H.x1) / 2, H.y1 + 0.03, fz);
  for (const hx of [H.x0 - 0.03, H.x1 + 0.03]) box(trim, 0.06, H.y1 - H.y0 + 0.06, 0.03, M.white, hx, (H.y0 + H.y1) / 2, fz);
  const shelf = H.y0 - 0.04;
  box(wood, H.x1 - H.x0 + 0.2, 0.06, 0.4, M.planks, (H.x0 + H.x1) / 2, shelf, HW + 0.18);
  box(wood, H.x1 - H.x0, 0.05, 0.5, M.planks, (H.x0 + H.x1) / 2, shelf, HW - 0.2);   // and inside
  for (const bx of [H.x0 + 0.15, (H.x0 + H.x1) / 2, H.x1 - 0.15]) {
    const br = box(trim, 0.04, 0.42, 0.04, M.white, bx, shelf - 0.19, HW + 0.15);
    br.rotation.x = 0.75;
  }
  // the flap, hinged at the top and propped up as an awning; striped underneath
  const hinge = new THREE.Group();
  hinge.position.set((H.x0 + H.x1) / 2, H.y1 + 0.05, HW + 0.04);
  g.add(hinge);
  const FL = 1.2, open = -1.84;   // its length, and how far it is swung up (radians)
  const flapW = H.x1 - H.x0 + 0.16;
  mesh(new THREE.BoxGeometry(flapW, FL, 0.05), [M.white, M.white, M.white, M.white, M.white, M.stripes], 0, -FL / 2, 0.025, hinge);
  // a scalloped valance along its edge
  const sc = new THREE.Shape(), n = 11, sw = flapW / n;
  sc.moveTo(-flapW / 2, 0); sc.lineTo(flapW / 2, 0); sc.lineTo(flapW / 2, -0.08);
  for (let i = n - 1; i >= 0; i--) sc.absarc(-flapW / 2 + (i + 0.5) * sw, -0.08, sw / 2, 0, Math.PI, true);
  sc.closePath();
  const val = mesh(extrude(sc, 0.02), M.white, 0, -FL, 0.05, hinge);
  val.rotation.x = -open;   // hangs straight down
  hinge.rotation.x = open;
  hinge.updateMatrix();
  // two struts from the hatch's sides up to the flap
  const tip = new THREE.Vector3(0, -FL * 0.85, 0.05).applyMatrix4(hinge.matrix);
  for (const sx of [H.x0 + 0.04, H.x1 - 0.04]) rod(trim, [sx, H.y0 + 0.25, HW + 0.03], [sx, tip.y, tip.z], 0.016, dark);
  // an "Open" sign swinging under the flap's edge
  const tipEdge = new THREE.Vector3(0, -FL, 0.05).applyMatrix4(hinge.matrix);
  const pivot = new THREE.Group();
  pivot.position.set(hinge.position.x + 0.85, tipEdge.y - 0.04, tipEdge.z - 0.12);
  for (const s of [-0.2, 0.2]) cyl(pivot, 0.008, 0.008, 0.16, dark, s, -0.08, 0, 3);
  signBoard(pivot, 0, -0.27, 0, 0.62, 0.24, 'Open');
  pivot.userData.keep = true;
  g.add(pivot);
  swingSign(pivot, 'x', 0.1, 1.3);

  // --- things on the counter: sauces, napkins, a tip jar, a bell, cups
  const cz = HW + 0.2;
  const ketchup = layer(g);
  cyl(ketchup, 0.035, 0.04, 0.16, stamp.todo, H.x0 + 0.3, shelf + 0.11, cz);
  mesh(new THREE.ConeGeometry(0.035, 0.07, 8), stamp.todo, H.x0 + 0.3, shelf + 0.22, cz, ketchup);
  cyl(trim, 0.035, 0.04, 0.16, M.white, H.x0 + 0.4, shelf + 0.11, cz + 0.04);         // mustard
  mesh(new THREE.ConeGeometry(0.035, 0.07, 8), M.white, H.x0 + 0.4, shelf + 0.22, cz + 0.04, trim);
  box(trim, 0.16, 0.13, 0.1, M.white, H.x0 + 0.62, shelf + 0.095, cz);                // napkin box
  box(trim, 0.1, 0.06, 0.005, M.white, H.x0 + 0.62, shelf + 0.18, cz).rotation.x = 0.1;
  cyl(kitchen, 0.06, 0.055, 0.15, M.white, H.x1 - 0.32, shelf + 0.105, cz - 0.02, 10);  // tip jar
  mesh(new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), dark, H.x1 - 0.12, shelf + 0.035, cz, trim); // bell
  for (let i = 0; i < 4; i++) cyl(trim, 0.04, 0.032, 0.1, M.white, H.x0 + 1.15 + (i % 2) * 0.02, shelf + 0.08 + i * 0.03, cz - 0.05, 8); // stacked cups
  cyl(trim, 0.04, 0.034, 0.1, M.white, H.x0 + 1.45, shelf + 0.08, cz + 0.05, 8);
  steam(g, H.x0 + 1.45, shelf + 0.15, cz + 0.05);
  box(trim, 0.26, 0.05, 0.16, M.white, H.x0 + 1.8, shelf + 0.055, cz);                // a paper tray of fries
  for (let i = 0; i < 6; i++) box(trim, 0.02, 0.1, 0.02, M.white, H.x0 + 1.7 + i * 0.035, shelf + 0.1, cz + (i % 2 ? 0.03 : -0.03)).rotation.z = (i - 2.5) * 0.12;

  // --- the kitchen: a back counter with the grill and a hood, shelves, a fridge
  box(kitchen, 2.9, 0.42, 0.55, M.white, 0.75, BELT + 0.25, -HW + 0.36);
  box(darks, 1.0, 0.04, 0.5, dark, 0.8, BELT + 0.48, -HW + 0.38);                     // the hot plate
  for (let i = 0; i < 4; i++) axle(darks, 0.03, 0.18, dark, 0.45 + i * 0.22, BELT + 0.53, -HW + 0.36 + (i % 2) * 0.06, 'z', 6); // sausages
  box(kitchen, 1.1, 0.22, 0.55, M.white, 0.8, 2.2, -HW + 0.36);                       // the hood
  mesh(new THREE.CylinderGeometry(0.1, 0.1, ROOF - 2.3, 8), M.white, 0.85, (ROOF + 2.3) / 2, -0.6, kitchen);
  box(wood, 0.95, 0.04, 0.24, M.planks, -0.22, 1.95, -HW + 0.2);                       // a shelf, with jars and tins
  for (let i = 0; i < 5; i++) {
    const r = 0.04 + rand() * 0.03, h = 0.1 + rand() * 0.12;
    cyl(kitchen, r, r, h, i % 3 ? M.white : M.stone, -0.58 + i * 0.18, 1.97 + h / 2, -HW + 0.2, 8);
  }
  box(kitchen, 0.5, ROOF - BELT - 0.1, 0.7, M.white, -0.85, (ROOF + BELT) / 2 - 0.05, -HW + 0.42);   // the fridge
  box(kitchen, 0.03, 0.4, 0.03, dark, -0.67, 1.75, -HW + 0.79);
  for (let i = 0; i < 3; i++) {                                                        // ladles on hooks
    rod(kitchen, [1.45 + i * 0.12, 2.2, -HW + 0.12], [1.45 + i * 0.12, 1.93, -HW + 0.14], 0.01, dark, 3);
    mesh(new THREE.SphereGeometry(0.035, 6, 4), dark, 1.45 + i * 0.12, 1.91, -HW + 0.14, kitchen);
  }

  // --- the roof: a sign, the grill's chimney and a vent
  for (const sx of [-0.9, 1.3]) box(trim, 0.05, 0.4, 0.05, M.white, sx, ROOF + 0.2, 0.55);
  signBoard(g, 0.2, ROOF + 0.62, 0.55, 2.7, 0.5, 'The Little Grill');
  cyl(trim, 0.08, 0.08, 0.7, M.white, 0.85, ROOF + 0.35, -0.6, 10);
  mesh(new THREE.ConeGeometry(0.17, 0.12, 10), M.white, 0.85, ROOF + 0.82, -0.6, trim);
  for (const s of [-1, 1]) rod(trim, [0.85 + s * 0.06, ROOF + 0.68, -0.6], [0.85 + s * 0.12, ROOF + 0.77, -0.6], 0.01, M.white, 3);
  smoke(g, 0.85, ROOF + 0.9, -0.6, { n: 4, rise: 1.6, size: 0.14, speed: 0.24, drift: 0.5 });
  cyl(trim, 0.16, 0.16, 0.12, M.white, -0.4, ROOF + 0.06, -0.4, 12);
  cyl(trim, 0.22, 0.2, 0.06, M.white, -0.4, ROOF + 0.17, -0.4, 12);

  // --- the far side: a sliding window, a vent and the water filler
  box(darks, 1.0, 0.5, 0.03, M.deep, 0.5, 1.85, -HW - 0.005);
  for (const [w, h, dx, dy] of [[1.12, 0.05, 0, 0.28], [1.12, 0.05, 0, -0.28], [0.05, 0.6, -0.56, 0], [0.05, 0.6, 0.56, 0], [0.04, 0.52, 0, 0]]) {
    box(trim, w, h, 0.03, M.white, 0.5 + dx, 1.85 + dy, -HW - 0.012);
  }
  box(trim, 0.4, 0.3, 0.03, M.white, 1.95, 2.25, -HW - 0.012);
  for (let i = 0; i < 4; i++) box(darks, 0.32, 0.025, 0.03, dark, 1.95, 2.15 + i * 0.065, -HW - 0.02);
  axle(trim, 0.06, 0.04, M.white, -0.4, 0.8, -HW - 0.01, 'z', 10);

  // --- the back: a door with a window, a folding step, gas bottles, crates
  for (const dz of [-0.95, -0.05]) box(trim, 0.03, 1.9, 0.035, M.white, 2.565, 1.5, dz);
  box(trim, 0.03, 0.035, 0.9, M.white, 2.565, 2.45, -0.5);
  box(darks, 0.03, 0.4, 0.5, M.deep, 2.56, 2.05, -0.5);
  box(trim, 0.05, 0.04, 0.16, dark, 2.59, 1.5, -0.2);
  box(wood, 0.32, 0.05, 0.6, M.planks, 2.82, 0.32, -0.5);
  for (const sz of [-0.75, -0.25]) rod(trim, [2.97, 0.31, sz], [2.6, 0.62, sz], 0.015, dark, 3);
  for (const [gx, gz] of [[2.82, 0.32], [2.86, 0.72]]) {
    cyl(trim, 0.15, 0.15, 0.62, M.white, gx, 0.31, gz, 12);
    mesh(new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.white, gx, 0.62, gz, trim);
    cyl(trim, 0.035, 0.035, 0.09, dark, gx, 0.79, gz, 6);
  }
  rod(trim, [2.86, 0.82, 0.72], [2.52, 0.95, 0.85], 0.012, dark, 3);                    // the gas hose
  rod(trim, [2.52, 0.95, 0.85], [2.5, 1.0, 0.9], 0.012, dark, 3);
  for (const [cx, cy, cz2, r] of [[3.05, 0, -1.05, 0.1], [3.08, 0.42, -1.07, -0.15], [2.6, 0, -1.2, 0.3]]) {
    const cr = box(wood, 0.5, 0.4, 0.4, M.planks, cx, cy + 0.2, cz2);
    cr.rotation.y = r;
  }
  for (let i = 0; i < 7; i++) mesh(new THREE.SphereGeometry(0.06, 7, 5), M.white, 3.08 + (i % 3 - 1) * 0.12, 0.88 + (i > 2 ? 0.05 : 0), -1.07 + (Math.floor(i / 3) - 1) * 0.11, trim);

  // --- night: the kitchen's back wall glows and throws a pool on the queue
  const glowAt = new THREE.Group();
  glowAt.position.set(0.3, 0, HW + 1.3);
  glowAt.userData.keep = true;
  g.add(glowAt);
  lampLight(glowAt, back).day = inside;

  for (const l of [body, trim, darks, kitchen, wood, stripe, ketchup]) bake(l);
  menuBoard(g);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'food-truck'));
  return g;
}

// The menu board that stands at the truck's back corner, by the hatch.
function menuBoard(truck) {
  const { hatch: H, belt: BELT } = TRUCK, HW = TRUCK.wid / 2;
  const g = new THREE.Group();
  const w = 0.8, h = 1.04, x = (H.x1 + 2.5) / 2 + 0.02, y = BELT + 0.12 + h / 2;
  box(g, w + 0.08, h + 0.08, 0.04, M.planks, x, y, HW + 0.03);
  face(g, w, h, menuTex(), x, y, HW + 0.055);
  box(g, 0.1, 0.1, 0.02, stamp.people, x + w / 2 - 0.1, y + h / 2 - 0.1, HW + 0.06);
  truck.add(g);
  return g;
}

// ---------- signs, lights and street furniture ----------
// A chalk A-frame sign on the ground, both faces lettered.
export function chalkSign(p, x, z, rotY) {
  const g = new THREE.Group();
  const frame = layer(g), t = chalkTex();
  const W = 0.62, Hh = 0.9, lean = 0.2;
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set(0, Hh * Math.cos(lean), 0);
    leaf.rotation.x = s * lean;
    g.add(leaf);
    for (const fx of [-W / 2, W / 2]) box(leaf, 0.04, Hh, 0.03, M.planks, fx, -Hh / 2, 0);
    box(leaf, W + 0.04, 0.05, 0.03, M.planks, 0, -0.025, 0);
    box(leaf, W + 0.04, 0.05, 0.03, M.planks, 0, -Hh + 0.12, 0);
    // the lettered face looks outward: away from the other leaf
    face(leaf, W - 0.04, Hh - 0.2, t, 0, -Hh / 2 + 0.03, -s * 0.017, s > 0 ? Math.PI : 0);
    box(leaf, W - 0.04, Hh - 0.2, 0.012, M.planks, 0, -Hh / 2 + 0.03, 0);
  }
  for (const sx of [-1, 1]) rod(frame, [sx * (W / 2 - 0.05), 0.45, -0.09], [sx * (W / 2 - 0.05), 0.45, 0.09], 0.008, dark, 3);
  bake(frame);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'chalk-sign'));
  return g;
}

// Festoon lights strung through `points` ([x, y, z] each), each span sagging
// by `sag` of its length; the bulbs are plain white by day and light up at
// night. Returns the bulbs (one mesh).
export function stringLights(p, points, sag = 0.07) {
  const wire = [], bulbs = [];
  const bulb = new THREE.SphereGeometry(0.05, 7, 5).toNonIndexed();
  const cap = new THREE.CylinderGeometry(0.025, 0.025, 0.05, 5).toNonIndexed();
  for (let i = 0; i + 1 < points.length; i++) {
    const a = new THREE.Vector3(...points[i]), b = new THREE.Vector3(...points[i + 1]);
    const dip = sag * a.distanceTo(b);
    const at = (t) => a.clone().lerp(b, t).add(new THREE.Vector3(0, -dip * 4 * t * (1 - t), 0));
    const pts = [];
    for (let k = 0; k <= 16; k++) pts.push(at(k / 16));
    wire.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.008, 3).toNonIndexed());
    const n = Math.max(3, Math.round(a.distanceTo(b) / 0.6));
    for (let k = 1; k < n; k++) {
      const q = at(k / n);
      wire.push(cap.clone().translate(q.x, q.y - 0.04, q.z));
      bulbs.push(bulb.clone().translate(q.x, q.y - 0.1, q.z));
    }
  }
  const w = mesh(mergeGeometries(wire), dark, 0, 0, 0, p);
  w.castShadow = false;
  const lights = mesh(mergeGeometries(bulbs), M.white, 0, 0, 0, p);
  lights.castShadow = false;
  return lights;
}

// A pool of warm light on the ground at night (no real light).
export function lightPool(p, x, z, head = null) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  const l = lampLight(g, head);
  if (head) l.day = head.material;
  return l;
}

// A half barrel planted with a little bush; with `post`, a tall post for the
// string lights stands in it. Returns the top of the post.
export function barrelPlanter(p, x, z, post = false) {
  const g = new THREE.Group();
  const parts = layer(g);
  cyl(parts, 0.36, 0.3, 0.5, M.planks, 0, 0.25, 0, 14);
  for (const y of [0.1, 0.42]) cyl(parts, 0.365 - y * 0.1, 0.365 - y * 0.1, 0.04, dark, 0, y, 0, 14);
  cyl(parts, 0.33, 0.33, 0.02, M.dirt, 0, 0.48, 0, 14);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + 0.4, r = i ? 0.17 : 0.05;
    mesh(new THREE.IcosahedronGeometry(0.17 + rand() * 0.06, 0), M.white, Math.cos(a) * r, 0.62 + rand() * 0.08, Math.sin(a) * r, parts).rotation.set(rand() * 3, rand() * 3, 0);
  }
  const top = 3.0;
  if (post) {
    box(parts, 0.1, top - 0.3, 0.1, M.planks, 0.12, 0.3 + (top - 0.3) / 2, 0.12);
    box(parts, 0.16, 0.04, 0.16, M.white, 0.12, top, 0.12);
  }
  bake(parts);
  g.position.set(x, 0, z);
  p.add(swapModel(g, post ? 'light-post' : 'planter-barrel'));
  return [x + 0.12, top - 0.05, z + 0.12];
}

// A round bistro table with two chairs and a striped umbrella; plates and
// cups on it. `seats` are the chairs' angles around the table.
export function bistroTable(p, x, z, rotY = 0, { seats = [0, Math.PI], food = true, umbrella = true } = {}) {
  const g = new THREE.Group();
  const metal = layer(g), shade = layer(g), stuff = layer(g);
  cyl(metal, 0.38, 0.38, 0.03, M.white, 0, 0.745, 0, 18);
  cyl(metal, 0.025, 0.025, 0.72, M.white, 0, 0.37, 0, 6);
  for (const a of [0, Math.PI / 2]) box(metal, 0.5, 0.03, 0.05, M.white, 0, 0.02, 0).rotation.y = a;
  for (const a of seats) {
    const c = new THREE.Group();
    c.position.set(Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62);
    c.rotation.y = a + Math.PI;
    metal.add(c);
    cyl(c, 0.2, 0.2, 0.035, M.white, 0, 0.45, 0, 14);
    for (const [lx, lz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) {
      rod(c, [lx, 0.44, lz], [lx * 1.25, 0, lz * 1.25], 0.012, M.white, 4);
    }
    for (const lx of [-0.15, 0.15]) rod(c, [lx, 0.46, -0.15], [lx * 1.1, 0.86, -0.2], 0.012, M.white, 4);
    const backrest = mesh(new THREE.TorusGeometry(0.17, 0.018, 4, 12, Math.PI), M.white, 0, 0.8, -0.19, c);
    backrest.rotation.x = -0.15;
  }
  if (umbrella) {
    cyl(metal, 0.018, 0.018, 2.35, M.white, 0, 1.18, 0, 5);
    const cone = mesh(new THREE.ConeGeometry(1.15, 0.42, 8, 1, true), canopy, 0, 2.2, 0, shade);
    cone.castShadow = true;
    mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 8, 1, true), canopy, 0, 1.93, 0, shade);
    mesh(new THREE.SphereGeometry(0.05, 6, 4), M.white, 0, 2.45, 0, metal);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      rod(metal, [0, 1.75, 0], [Math.cos(a) * 0.95, 2.04, Math.sin(a) * 0.95], 0.008, M.white, 3);
    }
  }
  if (food) {
    for (const a of seats) {
      const px = Math.sin(a) * 0.2, pz = Math.cos(a) * 0.2;
      cyl(stuff, 0.11, 0.09, 0.015, M.white, px, 0.77, pz, 12);
      cyl(stuff, 0.06, 0.06, 0.05, M.white, px, 0.8, pz, 10);
      cyl(stuff, 0.035, 0.03, 0.09, M.white, px + 0.14, 0.805, pz - 0.08, 8);
    }
    cyl(stuff, 0.025, 0.03, 0.12, stamp.todo, 0.02, 0.82, -0.02, 6);
  }
  bake(metal); bake(shade); bake(stuff);
  if (food) steam(g, Math.sin(seats[0]) * 0.2 + 0.14, 0.86, Math.cos(seats[0]) * 0.2 - 0.08);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bistro-table'));
  return g;
}

// Where somebody sits on chair `a` of a bistro table at (x, z) turned rotY,
// facing the table (for addFolk).
export function chairSpot(x, z, rotY, a) {
  const lx = Math.sin(a) * 0.62, lz = Math.cos(a) * 0.62, c = Math.cos(rotY), s = Math.sin(rotY);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c, rot: rotY + a + Math.PI, seat: 0.45 };
}

// A wooden picnic table with its benches, boards running lengthwise (x).
export function picnicTable(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  const wood = layer(g), stuff = layer(g);
  const L = 1.9;
  box(wood, 0.76, 0.05, L, M.planks, 0, 0.75, 0).rotation.y = Math.PI / 2;
  for (const s of [-1, 1]) box(wood, 0.28, 0.045, L, M.planks, 0, 0.45, s * 0.62).rotation.y = Math.PI / 2;
  for (const lx of [-0.7, 0.7]) {
    for (const s of [-1, 1]) {
      const leg = box(wood, 0.07, 0.86, 0.1, M.planks, lx, 0.38, s * 0.3);
      leg.rotation.x = s * 0.5;
    }
    box(wood, 0.07, 0.07, 1.5, M.planks, lx, 0.39, 0);
    box(wood, 0.07, 0.06, 0.7, M.planks, lx, 0.7, 0);
  }
  for (const [px, pz] of [[-0.35, -0.2], [0.4, 0.18]]) {
    cyl(stuff, 0.12, 0.1, 0.015, M.white, px, 0.785, pz, 12);
    box(stuff, 0.16, 0.06, 0.1, M.white, px, 0.82, pz).rotation.y = 0.4;
  }
  cyl(stuff, 0.035, 0.03, 0.12, M.white, 0.05, 0.84, 0.0, 8);
  cyl(stuff, 0.035, 0.03, 0.12, M.white, 0.12, 0.84, -0.05, 8);
  bake(wood); bake(stuff);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'picnic-table'));
  return g;
}

// Where somebody sits on a picnic table's bench: `side` 1 or -1, `along`
// meters from the middle, facing the table.
export function benchSpot(x, z, rotY, side, along = 0) {
  const lz = side * 0.62, c = Math.cos(rotY), s = Math.sin(rotY);
  return { x: x + along * c + lz * s, z: z - along * s + lz * c, rot: rotY + (side > 0 ? Math.PI : 0), seat: 0.47 };
}

// A slatted wooden litter bin with a lid.
export function litterBin(p, x, z) {
  const g = new THREE.Group();
  const parts = layer(g);
  cyl(parts, 0.26, 0.24, 0.8, M.planks, 0, 0.42, 0, 12);
  for (const y of [0.15, 0.7]) cyl(parts, 0.265, 0.265, 0.04, dark, 0, y, 0, 12);
  cyl(parts, 0.29, 0.29, 0.06, M.white, 0, 0.85, 0, 12);
  mesh(new THREE.SphereGeometry(0.28, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2.6), M.white, 0, 0.86, 0, parts);
  box(parts, 0.22, 0.12, 0.05, M.deep, 0, 0.8, 0.27);
  for (const s of [-1, 1]) box(parts, 0.05, 0.08, 0.05, M.white, s * 0.12, 0.04, 0);
  bake(parts);
  g.position.set(x, 0, z);
  p.add(swapModel(g, 'bin'));
  return g;
}
