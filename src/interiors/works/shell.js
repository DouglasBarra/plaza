// The Works' structure: a brick shed with real openings, tall factory
// lights down the sides, the sliding door on its rail, and over it all the
// sawtooth roof — three teeth glazed toward the plaza, which is the first
// thing you see when you walk in and look up.
//
// In third person the camera side of the shed (the right wall, the front
// wall, the whole roof) is cut away, like every other room; the brick teeth
// in the left end wall stay, so the saw's profile still reads in the
// diorama. The patches of north light on the floor stay too: index.js slides
// them along as the sun crosses the sky.
import * as THREE from 'three';
import { M, mesh, box, cyl } from '../../kit.js';
import { skipND } from '../../life.js';
import { wall } from '../townhall/shell.js';
import { W, D, T, EAVES, RISE, RIDGE, TEETH, TOOTH, toothFront, DOOR, HATCH, HOLES } from './dims.js';
import { concrete, steel, dark, glazing } from './materials.js';

// ---------- a factory light, from the inside ----------
// A steel frame of small panes in a deep brick reveal, with a stone sill and
// the top light propped open on its stay.
function lightIn(p, axis, at, hole, inward) {
  const g = new THREE.Group();
  const rotY = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[inward];
  if (axis === 'x') g.position.set(hole.c, hole.y, at); else g.position.set(at, hole.y, hole.c);
  g.rotation.y = rotY;
  p.add(g);
  const f = T / 2 + 0.02;
  const pane = mesh(new THREE.PlaneGeometry(hole.w, hole.h), M.deep, 0, 0, f - 0.07, g);
  pane.castShadow = false;
  // the frame: a border, a middle mullion and four glazing bars
  for (const y of [hole.h / 2 + 0.035, -hole.h / 2 - 0.035]) box(g, hole.w + 0.1, 0.07, 0.09, steel, 0, y, f);
  for (const s of [-1, 1]) box(g, 0.07, hole.h + 0.1, 0.09, steel, s * (hole.w / 2 + 0.035), 0, f);
  box(g, 0.05, hole.h, 0.06, steel, 0, 0, f - 0.03);
  for (let i = 1; i < 5; i++) box(g, hole.w, 0.04, 0.05, steel, 0, -hole.h / 2 + (i * hole.h) / 5, f - 0.03).castShadow = false;
  // the top light, open on its stay, and the sill
  const hopper = box(g, hole.w - 0.06, 0.05, hole.h * 0.22, steel, 0, hole.h / 2 - 0.08, f + 0.1);
  hopper.rotation.x = -1.15;
  cyl(g, 0.012, 0.012, 0.3, dark, hole.w / 2 - 0.2, hole.h / 2 - 0.26, f + 0.08, 4).rotation.x = 0.7;
  box(g, hole.w + 0.3, 0.07, 0.3, M.stone, 0, -hole.h / 2 - 0.1, f + 0.1);
  return g;
}

// A dark fill in a small opening (the vents, the loading hatch).
function openingIn(p, axis, at, hole, inward) {
  const g = new THREE.Group();
  g.rotation.y = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[inward];
  if (axis === 'x') g.position.set(hole.c, hole.y, at); else g.position.set(at, hole.y, hole.c);
  p.add(g);
  const f = T / 2 + 0.02;
  mesh(new THREE.PlaneGeometry(hole.w, hole.h), M.deep, 0, 0, f - 0.08, g).castShadow = false;
  for (const y of [hole.h / 2 + 0.04, -hole.h / 2 - 0.04]) box(g, hole.w + 0.12, 0.08, 0.12, M.white, 0, y, f);
  for (const s of [-1, 1]) box(g, 0.08, hole.h, 0.12, M.white, s * (hole.w / 2 + 0.04), 0, f);
  return g;
}

// ---------- the sawtooth ----------
// The roof is cut away in third person, but the light it lets in is the
// whole point of the building. So nothing up there casts a shadow except
// one invisible copy of each slope, which stays whatever the view: the
// teeth drop the same three bands of north light on the floor either way.
const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

// One tooth: the glazed riser facing the plaza, the roof sloping away
// behind it, rafters under the slope, and the tie beam across the shop.
function tooth(p, i, cut) {
  const zf = toothFront(i), zb = zf - TOOTH, len = Math.hypot(TOOTH, RISE);
  const pitch = -Math.atan2(RISE, TOOTH);              // high at the glazing, low behind
  const caster = mesh(new THREE.BoxGeometry(W + T * 2, 0.14, len + 0.05), shadowOnly, 0, (RIDGE + EAVES) / 2 + 0.06, (zf + zb) / 2, p);
  caster.rotation.x = pitch;
  caster.receiveShadow = false;
  skipND.push(caster);
  const slope = cut(box(p, W + T * 2, 0.14, len + 0.05, M.shingles, 0, (RIDGE + EAVES) / 2 + 0.06, (zf + zb) / 2));
  slope.rotation.x = pitch;
  slope.castShadow = false;
  slope.userData.inkId = 8e5 + i;
  // rafters and a purlin under the slope
  for (let x = -W / 2 + 0.8; x < W / 2; x += 2.2) {
    const r = cut(box(p, 0.11, 0.2, len, M.white, x, (RIDGE + EAVES) / 2 - 0.1, (zf + zb) / 2));
    r.rotation.x = pitch;
    r.castShadow = false;
  }
  const purlin = cut(box(p, W, 0.12, 0.14, M.white, 0, (RIDGE + EAVES) / 2 - 0.02, (zf + zb) / 2));
  purlin.castShadow = false;
  // the glazing: a steel head, the glass, its bars, and the tie beam below
  cut(box(p, W + T * 2, 0.22, 0.26, steel, 0, RIDGE + 0.11, zf - 0.08)).castShadow = false;
  const glass = mesh(new THREE.PlaneGeometry(W, RISE - 0.08), glazing, 0, EAVES + RISE / 2, zf - 0.05, p);
  glass.castShadow = glass.receiveShadow = false;
  cut(glass);
  skipND.push(glass);                                   // you see through it: no ink line
  for (let x = -W / 2 + 1; x < W / 2; x += 1) cut(box(p, 0.07, RISE - 0.08, 0.08, steel, x, EAVES + RISE / 2, zf - 0.07)).castShadow = false;
  for (const y of [EAVES + RISE / 3, EAVES + (RISE * 2) / 3]) cut(box(p, W, 0.05, 0.06, steel, 0, y, zf - 0.07)).castShadow = false;
  const tie = cut(box(p, W + T * 2, 0.3, 0.18, M.white, 0, EAVES + 0.15, zf - 0.09));
  tie.castShadow = false;
  tie.userData.inkId = 8e5 + 40 + i;
  for (const x of [-3.4, 0, 3.4]) {                     // tie rods up to the head beam
    const rod = cut(cyl(p, 0.025, 0.025, RISE, dark, x, EAVES + RISE / 2, zf - 0.12, 5));
    rod.castShadow = false;
    rod.rotation.z = 0.05;
  }
}

// The saw's profile in an end wall: a brick triangle per tooth, from the
// eaves up to the glazing and back down the slope. Drawn in (-z, y) and
// extruded along +x, so the same shape serves both ends.
function toothEnd(p, x, i) {
  const zf = toothFront(i), zb = zf - TOOTH;
  const s = new THREE.Shape();
  s.moveTo(-zf, EAVES); s.lineTo(-zf, RIDGE); s.lineTo(-zb, EAVES); s.closePath();
  const m = mesh(new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false }), M.bricks, x, 0, 0, p);
  m.rotation.y = Math.PI / 2;
  m.userData.inkId = 81e4 + i;
  return m;
}

// ---------- the whole shed ----------
export function buildShell(scene) {
  const cutaway = [];
  const cut = (m) => { cutaway.push(m); return m; };
  const cutAll = (parts) => { for (const m of parts) cutaway.push(m); };

  // the concrete slab, and brick walls with real openings
  box(scene, W + T * 2, 0.3, D + T * 2, concrete, 0, -0.15, 0);
  const bz = -D / 2 - T / 2, fz = D / 2 + T / 2, lx = -W / 2 - T / 2, rx = W / 2 + T / 2;
  wall(scene, 'x', bz, -W / 2 - T, W / 2 + T, 0, EAVES, HOLES.back, M.bricks);
  wall(scene, 'z', lx, -D / 2, D / 2, 0, EAVES, HOLES.left, M.bricks);
  cutAll(wall(scene, 'z', rx, -D / 2, D / 2, 0, EAVES, HOLES.right, M.bricks));
  cutAll(wall(scene, 'x', fz, -W / 2 - T, W / 2 + T, 0, EAVES, HOLES.front, M.bricks));
  // the teeth in both end walls
  for (let i = 0; i < TEETH; i++) {
    toothEnd(scene, lx - T / 2, i);
    cut(toothEnd(scene, rx - T / 2, i));
  }
  // stone corner piers, as outside
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pier = box(scene, 0.42, EAVES, 0.42, M.stone, sx * (W / 2 - 0.21), EAVES / 2, sz * (D / 2 - 0.21));
    pier.castShadow = false;
    if (sx > 0) cut(pier);
  }

  // the openings
  HOLES.left.forEach((h) => lightIn(scene, 'z', lx, h, '+x'));
  HOLES.right.forEach((h) => cut(lightIn(scene, 'z', rx, h, '-x')));
  HOLES.back.forEach((h) => openingIn(scene, 'x', bz, h, '+z'));
  cut(openingIn(scene, 'x', fz, HATCH, '-z'));

  // the way out: a steel frame round the doorway and a mat, both left in the
  // cutaway so you can find the door from above
  for (const s of [-1, 1]) box(scene, 0.16, DOOR.h + 0.12, 0.44, M.white, s * (DOOR.w / 2 + 0.08), (DOOR.h + 0.12) / 2, fz);
  box(scene, DOOR.w + 0.32, 0.16, 0.44, M.white, 0, DOOR.h + 0.12, fz);
  box(scene, 2.0, 0.04, 1.0, M.dirt, 0, 0.02, D / 2 - 0.75);
  // the sliding door itself, pushed wide open along its rail to the left
  const rail = cut(box(scene, 6.4, 0.1, 0.12, dark, -1.5, DOOR.h + 0.2, D / 2 - 0.1));
  rail.castShadow = false;
  const leaf = new THREE.Group();
  leaf.position.set(-2.9, 0, D / 2 - 0.2);
  scene.add(leaf);
  cut(leaf);
  box(leaf, 2.9, 3.1, 0.08, M.planks, 0, 1.55, 0);
  for (const y of [0.3, 2.8]) box(leaf, 2.9, 0.14, 0.05, M.white, 0, y, 0.07);
  const brace = box(leaf, 0.14, 3.0, 0.05, M.white, 0, 1.55, 0.07);
  brace.rotation.z = Math.atan2(2.4, 2.9);
  for (const x of [-1.1, 1.1]) {                        // the rollers on the rail
    cyl(leaf, 0.09, 0.09, 0.05, dark, x, DOOR.h + 0.2, 0.02, 10).rotation.z = Math.PI / 2;
    box(leaf, 0.06, 0.42, 0.05, dark, x, 3.21, 0.02);
  }
  cyl(leaf, 0.035, 0.035, 0.34, dark, 1.2, 1.2, 0.08, 6).rotation.z = Math.PI / 2;   // the handle

  // the roof
  for (let i = 0; i < TEETH; i++) tooth(scene, i, cut);

  return { cutaway };
}
