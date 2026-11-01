// The town hall, inside: the ToDos district as a two-story building.
//
// Ground floor (Today): the task board, where each note is one of today's
// tasks; the clerk's desk with the typewriter for adding tasks; a fireplace
// that burns brighter as you clear the day; the paper-ball jar and streak
// plaque on the mantel.
// Upstairs (Upcoming and Done): the planning wall with a calendar and the
// notes for later, and the archive where finished tasks are filed.
//
// Walls have real openings, so sunlight falls through the windows onto the
// floor and moves with the real time of day. Panes show the real plaza in
// first person (app/window-view.js renders it); in third person the walls facing the
// camera, the upper floor (while you're downstairs) and the ceilings are cut
// away, using render layers so they still cast shadows.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { folk } from '../../folks.js';
import { clockHands, signBoard } from '../../details.js';
import { steam, swingSign, isNight } from '../../life.js';
import { picture, wallShelf, rug, coatRack, typewriter, chair, desk, plant, bookshelf, armchair, lowTable, logPile, toolStand } from '../../decor.js';
import { DISTRICTS } from '../../districts/index.js';
import { W, D, T, F, TOP, DOOR, DOOR_HOLE, HOLES } from './dims.js';
import { dark, lampOn } from './materials.js';
import { wall, windowIn, trim, stairs, STAIR, inStair, stairHeight } from './shell.js';
import { taskBoard, calendarTexture, jar, ballGeo } from './boards.js';
import { fireplace, pendant, chandelier } from './fixtures.js';
export { glassDay, glassNight } from './materials.js';

export const LAYER_CEILING = 1, LAYER_UPPER = 2;

const todos = () => DISTRICTS.todo.api;
const onLayer = (o, layer) => { o.traverse((c) => c.layers.set(layer)); return o; };
// ---------- building the house ----------
export function buildTownHall(scene, rand, lights) {
  const panes = [];
  const lower = new THREE.Group();   // the ground floor (layer 0)
  const upper = new THREE.Group();   // everything at or above the upper floor (layer 2)
  const ceilings = new THREE.Group(); // hidden in third person, still casts shadows (layer 1)
  const cutLower = new THREE.Group(), cutUpper = new THREE.Group(); // walls facing the third-person camera
  scene.add(lower, upper, ceilings, cutLower, cutUpper);

  // ---- shell: floor, walls with openings, upper floor, roof
  box(lower, W + T * 2, 0.3, D + T * 2, M.floor, 0, -0.15, 0);
  const backHoles = HOLES.back.lower, leftHoles = HOLES.left.lower, rightHoles = HOLES.right.lower;
  const frontHoles = [...HOLES.front.lower, DOOR_HOLE];
  const bz = -D / 2 - T / 2, fz = D / 2 + T / 2, lx = -W / 2 - T / 2, rx = W / 2 + T / 2;
  wall(lower, 'x', bz, -W / 2 - T, W / 2 + T, 0, F, backHoles, M.bricks);
  wall(lower, 'z', lx, -D / 2, D / 2, 0, F, leftHoles, M.bricks);
  wall(cutLower, 'z', rx, -D / 2, D / 2, 0, F, rightHoles, M.bricks);
  wall(cutLower, 'x', fz, -W / 2 - T, W / 2 + T, 0, F, frontHoles, M.bricks);
  backHoles.forEach((h) => windowIn(lower, 'x', bz, h, '+z', panes));
  leftHoles.forEach((h) => windowIn(lower, 'z', lx, h, '+x', panes));
  rightHoles.forEach((h) => windowIn(cutLower, 'z', rx, h, '-x', panes));
  frontHoles.forEach((h) => windowIn(cutLower, 'x', fz, h, '-z', panes, h === DOOR_HOLE));
  // the door frame and mat stay visible in the cutaway, so you can find the way out
  for (const x of [-1, 1]) box(lower, 0.16, DOOR.h + 0.1, 0.4, M.white, x * (DOOR.w / 2 + 0.08), (DOOR.h + 0.1) / 2, fz);
  box(lower, DOOR.w + 0.32, 0.16, 0.4, M.white, 0, DOOR.h + 0.08, fz);
  box(lower, DOOR.w + 0.1, 0.04, 1.0, M.dirt, 0, 0.02, D / 2 - 0.7);
  // the door itself, hinged on the right and standing open into the room, same size as the one outside
  const hinge = new THREE.Vector3(DOOR.w / 2, 0, D / 2 - 0.05);
  const swing = -1.87;                                     // a little past square: the opening stays clear
  const leaf = new THREE.Group();
  leaf.position.copy(hinge);
  leaf.rotation.y = swing;
  lower.add(leaf);
  box(leaf, DOOR.w, DOOR.h, 0.07, M.planks, -DOOR.w / 2, DOOR.h / 2, 0);
  for (const s2 of [-1, 1]) for (const side of [-1, 1]) {
    box(leaf, DOOR.w * 0.34, DOOR.h * 0.36, 0.03, M.planks, -DOOR.w / 2 + s2 * DOOR.w * 0.2, DOOR.h * 0.72, side * 0.05);
    box(leaf, DOOR.w * 0.34, DOOR.h * 0.3, 0.03, M.planks, -DOOR.w / 2 + s2 * DOOR.w * 0.2, DOOR.h * 0.27, side * 0.05);
  }
  box(leaf, DOOR.w + 0.1, 0.08, 0.1, M.white, -DOOR.w / 2, DOOR.h + 0.04, 0);
  for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(0.045, 8, 6), dark, -DOOR.w + 0.16, DOOR.h * 0.46, side * 0.09, leaf);
  for (const hy of [0.35, DOOR.h - 0.35]) box(leaf, 0.12, 0.2, 0.09, dark, -0.04, hy, 0);   // hinges
  const doorDir = new THREE.Vector3(Math.cos(swing + Math.PI), 0, -Math.sin(swing + Math.PI)); // along the leaf, from the hinge

  // upper floor: a slab with the stairwell left open
  const slab = (x0, x1, z0, z1) => { box(upper, x1 - x0, 0.3, z1 - z0, M.floor, (x0 + x1) / 2, F - 0.15, (z0 + z1) / 2).userData.inkId = 424242; };
  slab(-W / 2, STAIR.x0, -D / 2, D / 2);
  slab(STAIR.x0, W / 2, -D / 2, STAIR.zTop);
  slab(STAIR.x0, W / 2, STAIR.zBottom, D / 2);
  // ceiling beams under the upper floor (hidden in third person so they don't block the view)
  for (const z of [-3.6, -1.2, 1.2, 3.6]) {
    const reach = z > STAIR.zTop && z < STAIR.zBottom ? STAIR.x0 : W / 2;
    box(ceilings, reach + W / 2, 0.26, 0.24, M.planks, (reach - W / 2) / 2, F - 0.43, z); // seen in first person
  }
  const upBack = HOLES.back.upper, upLeft = HOLES.left.upper, upRight = HOLES.right.upper, upFront = HOLES.front.upper;
  wall(upper, 'x', bz, -W / 2 - T, W / 2 + T, F, TOP, upBack, M.bricks);
  wall(upper, 'z', lx, -D / 2, D / 2, F, TOP, upLeft, M.bricks);
  wall(cutUpper, 'z', rx, -D / 2, D / 2, F, TOP, upRight, M.bricks);
  wall(cutUpper, 'x', fz, -W / 2 - T, W / 2 + T, F, TOP, upFront, M.bricks);
  upBack.forEach((h) => windowIn(upper, 'x', bz, h, '+z', panes));
  upLeft.forEach((h) => windowIn(upper, 'z', lx, h, '+x', panes));
  upRight.forEach((h) => windowIn(cutUpper, 'z', rx, h, '-x', panes));
  upFront.forEach((h) => windowIn(cutUpper, 'x', fz, h, '-z', panes));
  // the railing around the stairwell upstairs
  box(upper, 0.08, 0.08, STAIR.zBottom - STAIR.zTop, M.planks, STAIR.x0 - 0.05, F + 1.0, (STAIR.zBottom + STAIR.zTop) / 2);
  box(upper, W / 2 - STAIR.x0, 0.08, 0.08, M.planks, (STAIR.x0 + W / 2) / 2, F + 1.0, STAIR.zBottom + 0.05);
  for (let z = STAIR.zTop + 0.4; z < STAIR.zBottom; z += 0.5) box(upper, 0.04, 1.0, 0.04, M.white, STAIR.x0 - 0.05, F + 0.5, z);
  for (let x = STAIR.x0 + 0.4; x < W / 2; x += 0.5) box(upper, 0.04, 1.0, 0.04, M.white, x, F + 0.5, STAIR.zBottom + 0.05);
  // roof: beams and a skylight (hidden in third person)
  box(ceilings, W + T * 2, 0.2, D + T * 2, M.white, 0, TOP + 0.1, 0);
  for (const x of [-4, 0, 4]) box(ceilings, 0.24, 0.3, D, M.planks, x, TOP - 0.15, 0);

  stairs(lower);

  // paneling, rails, baseboards and molding
  trim(lower, 'x', bz, -W / 2, W / 2, 0, F - 0.3, '+z');
  trim(lower, 'z', lx, -D / 2, D / 2, 0, F - 0.3, '+x', [[-1.3, 1.5]]); // not behind the fireplace
  trim(cutLower, 'z', rx, -D / 2, D / 2, 0, F - 0.3, '-x', [[STAIR.zTop - 0.2, STAIR.zBottom + 0.1]]);
  trim(cutLower, 'x', fz, -W / 2, W / 2, 0, F - 0.3, '-z', [[-(DOOR.w / 2 + 0.3), DOOR.w / 2 + 0.3]]); // around the door
  trim(upper, 'x', bz, -W / 2, W / 2, F, TOP, '+z');
  trim(upper, 'z', lx, -D / 2, D / 2, F, TOP, '+x');
  trim(cutUpper, 'x', fz, -W / 2, W / 2, F, TOP, '-z');

  // ---------- ground floor: Today ----------
  const board = taskBoard(lower, -0.5, 2.25, -D / 2 + 0.1, 5.0, 2.3, 5, 2, stamp.todo);
  signBoard(lower, -0.5, 3.75, -D / 2 + 0.14, 1.6, 0.36, 'Today');
  // wastebasket by the board
  const binPos = new THREE.Vector3(2.45, 0, -4.35);
  cyl(lower, 0.28, 0.22, 0.55, M.planks, binPos.x, 0.275, binPos.z, 14);
  mesh(new THREE.TorusGeometry(0.28, 0.025, 4, 20), M.white, binPos.x, 0.55, binPos.z, lower).rotation.x = Math.PI / 2;
  const binBalls = new THREE.Group();
  lower.add(binBalls);

  // the clerk's desk, facing the door
  desk(lower, 2.2, 0.6, Math.PI);
  chair(lower, 2.2, -0.35, 0);
  const clerk = folk(lower, 2.2, -0.35, 0, { pose: 'type', seat: 0.48, look: { hat: 'bowler', glasses: true, scarf: true } });
  typewriter(lower, 2.2, 0.85, 0.45, Math.PI);
  cyl(lower, 0.06, 0.05, 0.12, M.white, 1.3, 0.91, 0.75, 10);
  steam(lower, 1.3, 0.99, 0.75);
  for (let i = 0; i < 4; i++) box(lower, 0.32, 0.015, 0.42, M.white, 3.0, 0.86 + i * 0.016, 0.7).rotation.y = i * 0.12;
  cyl(lower, 0.03, 0.03, 0.4, dark, 3.05, 1.0, 0.25, 6).rotation.z = 1.3; // a pen
  box(lower, 0.5, 0.2, 0.36, M.planks, 1.35, 0.95, 0.35);                  // in-tray
  signBoard(lower, 2.2, 0.5, 1.1, 1.0, 0.24, 'Clerk');

  // fireplace on the left wall, with armchairs around it
  const fire = fireplace(lower, -W / 2 + 0.32, 0.1);
  // the mantel's front edge, clear of the chimney breast behind it
  const MX = -W / 2 + 0.68;
  const progressJar = jar(lower, MX, 1.42, -0.95);
  let plaque = null;
  const setPlaque = (n) => {
    if (plaque) lower.remove(plaque);
    plaque = signBoard(lower, MX, 1.6, 1.05, 0.72, 0.24, n === 1 ? 'Streak: 1 day' : `Streak: ${n} days`, Math.PI / 2);
    plaque.rotation.z = -0.12; // leaning back against the chimney
  };
  for (const zz of [-0.35, 0.5]) { cyl(lower, 0.06, 0.07, 0.05, dark, MX, 1.45, zz, 10); cyl(lower, 0.035, 0.035, 0.24, M.white, MX, 1.6, zz, 8); } // candles
  picture(lower, -W / 2 + 0.6, 2.9, 0.1, 1.0, 1.1, Math.PI / 2, 'portrait');
  // two armchairs angled in toward the fire, a low table between them and the hearth
  const fireSpot = new THREE.Vector3(-W / 2 + 0.6, 0, 0.1);
  armchair(lower, -3.3, -1.75, fireSpot);
  armchair(lower, -3.3, 1.95, fireSpot);
  lowTable(lower, -4.5, 0.1, Math.PI / 2);
  cyl(lower, 0.16, 0.2, 0.5, M.planks, -2.7, 0.25, 0.1, 10);                     // a side table behind them
  cyl(lower, 0.1, 0.07, 0.2, M.white, -2.7, 0.6, 0.1, 10);
  rug(lower, -4.0, 0.1, 3.4, 2.8, Math.PI / 2, 0);
  // firewood in a pyramid by the chimney, and the fire tools on their stand
  logPile(lower, -W / 2 + 0.45, -2.45, 4, 0);
  toolStand(lower, -W / 2 + 0.55, 1.75);

  // filing cabinets under the landing, coat rack and bench by the door
  for (const x of [4.75, 5.45]) {
    box(lower, 0.65, 1.4, 0.65, M.white, x, 0.7, -4.5);
    for (const y of [0.35, 0.8, 1.2]) box(lower, 0.25, 0.05, 0.04, dark, x, y, -4.15);
  }
  coatRack(lower, -2.5, 4.25);
  // an umbrella stand by the coat rack, with an umbrella in it
  cyl(lower, 0.15, 0.13, 0.55, M.planks, -3.15, 0.27, 4.45, 10);
  cyl(lower, 0.012, 0.012, 0.9, dark, -3.1, 0.65, 4.45, 4).rotation.z = 0.12;
  mesh(new THREE.ConeGeometry(0.17, 0.16, 8), dark, -3.1, 1.13, 4.45, lower).rotation.z = 0.12;
  box(lower, 1.4, 0.08, 0.45, M.planks, -4.4, 0.45, 4.55);
  for (const x of [-4.95, -3.85]) box(lower, 0.08, 0.45, 0.4, M.white, x, 0.22, 4.55);
  folk(lower, -4.6, 4.55, Math.PI, { pose: 'sit', seat: 0.5, look: { hat: 'top', scarf: true } });
  rug(lower, 0.1, 2.5, 3.6, 2.4, 0, 1);
  plant(lower, -5.3, -4.3, 1.1);
  plant(lower, 5.35, 4.3, 1.1); // in the corner, clear of the door and the stairs
  wallShelf(lower, -W / 2 + 0.05, 3.0, -1.7, 0.8, Math.PI / 2, rand);   // clear of the curtains at the window beside it

  // the tall clock against the back wall: a case, a face with slim hands, and a
  // pendulum swinging side to side behind a glass window
  const CZ = -D / 2 + 0.28, CX = 3.15; // clear of the back window at x 4.6
  box(lower, 0.7, 0.14, 0.52, M.planks, CX, 0.07, CZ);                    // plinth
  box(lower, 0.6, 2.2, 0.44, M.planks, CX, 1.24, CZ);                      // case
  box(lower, 0.72, 0.12, 0.54, M.planks, CX, 2.4, CZ);                     // hood
  box(lower, 0.5, 0.2, 0.4, M.white, CX, 2.52, CZ).rotation.z = 0;         // crown
  const face = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 24), [M.white, M.clock, M.white], CX, 1.98, CZ + 0.23, lower);
  face.rotation.x = Math.PI / 2;
  clockHands(lower, CX, 1.98, CZ + 0.26, 0.23);
  box(lower, 0.44, 1.0, 0.02, M.deep, CX, 1.0, CZ + 0.225).castShadow = false;   // the dark back of the window onto the pendulum
  for (const dx of [-0.25, 0.25]) box(lower, 0.05, 1.08, 0.05, M.white, CX + dx, 1.0, CZ + 0.235);
  box(lower, 0.55, 0.05, 0.05, M.white, CX, 1.52, CZ + 0.235);
  box(lower, 0.55, 0.05, 0.05, M.white, CX, 0.48, CZ + 0.235);
  const pendulum = new THREE.Group();                                      // pivots at the top of the window
  pendulum.position.set(CX, 1.48, CZ + 0.255);              // in front of the dark back, so you see it swing
  box(pendulum, 0.02, 0.78, 0.014, M.white, 0, -0.39, 0);
  cyl(pendulum, 0.08, 0.08, 0.03, M.white, 0, -0.8, 0, 16).rotation.x = Math.PI / 2;
  lower.add(pendulum);
  swingSign(pendulum, 'z', 0.15, 2.4);                                     // about the z axis: side to side

  const lamps = [pendant(lower, 2.2, 2.6, 0.6, F - 0.3), pendant(lower, -0.5, 3.15, -3.6, F - 0.3)];
  const chand = chandelier(lower, -0.8, 3.1, 1.6, F - 0.3);

  // ---------- upstairs: Upcoming and Done ----------
  // everything up here is built in `up`, a group raised to the upper floor
  const U = F;
  const up = new THREE.Group();
  up.position.y = U;
  upper.add(up);
  const later = taskBoard(up, 1.6, 2.15, -D / 2 + 0.1, 3.9, 2.2, 4, 2, stamp.todo);
  signBoard(up, 1.6, 3.6, -D / 2 + 0.14, 1.6, 0.36, 'Coming up');
  const calTex = calendarTexture();
  box(up, 2.9, 2.5, 0.08, M.planks, -2.4, 2.2, -D / 2 + 0.06);
  mesh(new THREE.PlaneGeometry(2.7, 2.3), toon('#ffffff', calTex), -2.4, 2.2, -D / 2 + 0.11, up);
  // a drafting table and stool in front of the planning wall
  const draft = box(up, 1.6, 0.06, 1.0, M.planks, -2.4, 1.0, -3.3);
  draft.rotation.x = 0.2;
  for (const [x, z] of [[-3.1, -3.7], [-1.7, -3.7], [-3.1, -2.9], [-1.7, -2.9]]) box(up, 0.06, 1.0, 0.06, M.white, x, 0.5, z);
  for (let i = 0; i < 3; i++) box(up, 0.5, 0.01, 0.35, M.white, -2.6 + i * 0.3, 1.05 + i * 0.01, -3.3).rotation.set(0.2, i * 0.2, 0);
  cyl(up, 0.22, 0.22, 0.05, M.planks, -2.4, 0.65, -2.2, 12);
  cyl(up, 0.04, 0.04, 0.62, M.white, -2.4, 0.31, -2.2, 6);
  const upBin = new THREE.Vector3(4.0, U, -4.4);
  cyl(up, 0.24, 0.2, 0.5, M.planks, upBin.x, 0.25, upBin.z, 14);
  // the archive: shelves of binders, cabinets, the out-tray of finished tasks
  bookshelf(up, -W / 2 + 0.35, 1.2, Math.PI / 2, rand);
  bookshelf(up, -W / 2 + 0.35, -1.2, Math.PI / 2, rand);
  for (const z of [-2.9, -3.6]) {
    box(up, 0.7, 1.15, 0.65, M.white, -5.5, 0.575, z); // below the window sill
    for (const y of [0.3, 0.65, 0.98]) box(up, 0.04, 0.05, 0.25, dark, -5.13, y, z);
  }
  box(up, 1.4, 0.06, 0.8, M.planks, -3.6, 0.78, 0.6);
  for (const [x, z] of [[-4.2, 0.3], [-3.0, 0.3], [-4.2, 0.9], [-3.0, 0.9]]) box(up, 0.06, 0.78, 0.06, M.white, x, 0.39, z);
  box(up, 0.55, 0.12, 0.42, M.planks, -3.6, 0.87, 0.6);
  const stack = new THREE.Group();
  up.add(stack);
  signBoard(up, -3.6, 1.2, 0.95, 0.8, 0.22, 'Done');
  // a window seat with cushions and a cat asleep in the sun, a plant, a globe
  box(up, 1.8, 0.45, 0.6, M.planks, -3.4, 0.22, 4.55);
  box(up, 1.7, 0.1, 0.55, M.white, -3.4, 0.5, 4.55);
  for (const x of [-3.9, -2.9]) box(up, 0.4, 0.35, 0.12, M.white, x, 0.7, 4.75).rotation.x = -0.3;
  const cat = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.2, 10, 8).scale(1.3, 0.6, 1), M.white, 0, 0.12, 0, cat);
  mesh(new THREE.SphereGeometry(0.11, 8, 6), M.white, 0.2, 0.15, 0.05, cat);
  cat.position.set(-3.2, 0.55, 4.5);
  up.add(cat);
  plant(up, 1.0, 4.3, 1.0);
  cyl(up, 0.05, 0.12, 0.9, M.white, 3.0, 0.45, 3.6, 8);
  mesh(new THREE.IcosahedronGeometry(0.45, 1), M.white, 3.0, 1.3, 3.6, up);
  rug(up, 0, 1.0, 4.2, 3.0, 0, 0);
  const upLamps = [pendant(up, -2.4, 2.7, -3.0, TOP - U - 0.3), pendant(up, -3.6, 2.6, 0.6, TOP - U - 0.3)];

  // ---------- layers ----------
  onLayer(upper, LAYER_UPPER);
  onLayer(cutUpper, LAYER_UPPER);
  onLayer(ceilings, LAYER_CEILING);
  lights.sun.shadow.camera.layers.enableAll();

  // ---------- live data ----------
  const api = todos();
  const refresh = () => {
    const g = api.groups();
    const today = [...g.overdue.map((t) => ({ ...t, late: true })), ...g.today];
    board.set(today, (t) => api.dueLabel(t.due));
    later.set([...g.upcoming, ...g.anytime], (t) => api.dueLabel(t.due));
    const due = new Map();
    const now = new Date();
    for (const t of [...g.today, ...g.upcoming, ...g.overdue]) {
      const [y, m, d] = t.due.split('-').map(Number);
      if (y === now.getFullYear() && m === now.getMonth() + 1) due.set(d, (due.get(d) || 0) + 1);
    }
    calTex.userData.draw(due);
    document.fonts?.load('52px "Patrick Hand SC"').then(() => calTex.userData.draw(due)).catch(() => {});
    const done = api.doneCount();
    progressJar.set(done);
    setPlaque(api.streak());
    stack.clear();
    for (let i = 0; i < Math.min(done, 30); i++) box(stack, 0.48, 0.012, 0.36, M.white, -3.6 + Math.sin(i) * 0.02, 0.95 + i * 0.013, 0.6).rotation.y = Math.sin(i * 3) * 0.08;
  };
  DISTRICTS.todo.subscribe(refresh);
  refresh();

  // ---------- tearing a note off ----------
  const flying = [];
  const ballMat = M.white;
  function tearOff(note, onDone) {
    const task = note.userData.task;
    const world = new THREE.Vector3();
    note.getWorldPosition(world);
    const upstairs = world.y > F;
    scene.attach(note);
    flying.push({ note, task, t0: performance.now(), from: world.clone(), bin: (upstairs ? upBin : binPos).clone().setY((upstairs ? U : 0) + 0.5), ball: null, onDone, layer: upstairs ? LAYER_UPPER : 0 });
  }

  // ---------- light and life ----------
  const t0 = performance.now();
  function update(time, ctx) {
    // notes popping onto the board
    for (const b of [board, later]) {
      for (let i = b.pops.length - 1; i >= 0; i--) {
        const p = b.pops[i], k = Math.min(1, (performance.now() - p.t0) / 350);
        p.n.scale.setScalar(0.2 + 0.8 * (1 - Math.pow(1 - k, 3)) * (1 + Math.sin(k * Math.PI) * 0.15));
        if (k === 1) { p.n.scale.setScalar(1); b.pops.splice(i, 1); }
      }
    }
    // torn notes: pull, crumple, toss
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], s = (performance.now() - f.t0) / 1000;
      if (s < 0.25) {
        f.note.position.copy(f.from).add(new THREE.Vector3(0, -s * 0.4, s * 1.6));
        f.note.rotation.z += 0.05;
      } else if (s < 0.45) {
        const k = (s - 0.25) / 0.2;
        f.note.scale.setScalar(1 - k * 0.85);
        if (!f.ball) {
          f.ball = mesh(new THREE.IcosahedronGeometry(0.12, 0), ballMat, 0, 0, 0, scene);
          f.ball.layers.set(f.layer);
          f.start = f.note.position.clone();
        }
        f.ball.position.copy(f.note.position);
        f.ball.scale.setScalar(k);
      } else if (s < 1.15) {
        if (f.note.parent) scene.remove(f.note);
        const k = (s - 0.45) / 0.7;
        f.ball.position.lerpVectors(f.start, f.bin, k);
        f.ball.position.y += Math.sin(k * Math.PI) * 1.3;
        f.ball.rotation.x += 0.2;
      } else {
        scene.remove(f.ball);
        if (f.bin.y < F) mesh(ballGeo, M.white, binPos.x + (Math.random() - 0.5) * 0.2, 0.5, binPos.z + (Math.random() - 0.5) * 0.2, binBalls).scale.setScalar(1.8);
        flying.splice(i, 1);
        f.onDone();
      }
    }

    // the sun crosses the sky with the real time; lamps come on in the evening
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const day = THREE.MathUtils.clamp((hour - 6) / 13, 0, 1);
    const az = day * Math.PI;
    const dark = isNight() || hour < 6.5 || hour > 19.5;
    const evening = dark || hour >= 18 || hour < 7;
    lights.sun.position.set(Math.cos(az) * 16, 3 + Math.sin(az) * 13, 10);
    lights.sun.target.position.set(0, F / 2, 0);
    lights.sun.intensity = dark ? Math.PI * 0.15 : Math.PI;
    for (const l of [...lamps, ...upLamps]) {
      l.light.intensity = evening ? 6 : 0;
      l.bulb.material = evening ? lampOn : M.white;
    }
    chand.light.intensity = evening ? 9 : 0;
    for (const b of chand.bulbs) b.material = evening ? lampOn : M.white;

    // the fire: brighter the more of today you've cleared
    const g = api.groups();
    const left = g.overdue.length + g.today.length, cleared = api.doneToday();
    const glow = 0.75 + 0.6 * (cleared / Math.max(1, cleared + left));
    const frame = Math.floor((performance.now() - t0) / 140) % 2;
    for (const [i, f] of fire.flames.entries()) {
      const h = f.userData.h * glow * (1 + ((i + frame) % 2 ? 0.12 : -0.08));
      f.scale.set(glow, h, glow);
      f.position.y = 0.2 + h / 2;
    }
    fire.light.intensity = (dark ? 6 : 2.5) * glow * (frame ? 1 : 0.85);
  }

  // what the clerk says when you come close
  function clerkLine() {
    const g = api.groups();
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Morning!' : hour < 18 ? 'Afternoon!' : 'Evening!';
    const s = api.streak();
    if (g.overdue.length) return `${hello} Psst, “${g.overdue[0].title}” is late.`;
    if (g.today.length) return `${hello} ${g.today.length} ${g.today.length === 1 ? 'thing' : 'things'} on the board today.`;
    if (s > 1) return `${hello} All clear, ${s} days running. Lovely.`;
    return `${hello} Nothing due today. Want me to type something up?`;
  }

  // walking: stairs connect the floors; a step bigger than 0.6 m is a wall or railing
  function heightAt(x, z, level) {
    if (inStair(x, z)) {
      const y = stairHeight(z);
      return { y, level: y > F / 2 ? 1 : 0 };
    }
    return { y: level * F, level };
  }

  const colliders = [
    { x: 2.2, z: 0.4, r: 1.35 }, { x: -W / 2 + 0.7, z: 0.1, r: 1.0 }, { x: -3.3, z: -1.75, r: 0.6 }, { x: -3.3, z: 1.95, r: 0.6 },
    { x: -4.5, z: 0.1, r: 0.55 }, { x: -2.7, z: 0.1, r: 0.3 }, { x: 5.1, z: -4.5, r: 0.9 }, { x: -2.5, z: 4.25, r: 0.35 },
    { x: -3.15, z: 4.45, r: 0.2 }, { x: -4.4, z: 4.55, r: 0.75 }, { x: -W / 2 + 0.85, z: -2.45, r: 0.5 }, { x: -W / 2 + 0.55, z: 1.75, r: 0.2 },
    { x: 3.15, z: -4.72, r: 0.45 }, { x: -5.3, z: -4.3, r: 0.5 }, { x: 5.35, z: 4.3, r: 0.5 }, { x: 2.45, z: -4.35, r: 0.4 },
    // the open door
    ...[0.35, 0.8, 1.25].map((t) => ({ x: hinge.x + doorDir.x * t, z: hinge.z + doorDir.z * t, r: 0.2 })),
    { x: -2.4, z: -3.3, r: 1.0, level: 1 }, { x: -2.4, z: -2.2, r: 0.35, level: 1 }, { x: -5.6, z: 0, r: 1.6, level: 1 },
    { x: -5.5, z: -3.25, r: 0.8, level: 1 }, { x: -3.6, z: 0.6, r: 0.9, level: 1 }, { x: -3.4, z: 4.55, r: 0.95, level: 1 },
    { x: 1.0, z: 4.4, r: 0.5, level: 1 }, { x: 3.0, z: 3.6, r: 0.6, level: 1 }, { x: 4.0, z: -4.4, r: 0.35, level: 1 },
  ];

  return {
    levels: { ground: 0, upper: 1, height: F },
    lower, upper, ceilings, cutLower, cutUpper, panes,
    boards: [board, later],
    colliders,
    heightAt,
    tearOff,
    update,
    speakers: [{ object: clerk, height: 1.9, range: 3.0, level: 0, text: clerkLine }],
    stations: [
      { point: new THREE.Vector3(-0.5, 0, -3.5), level: 0, label: 'Open the task board', app: 'todo', tab: 'today' },
      { point: new THREE.Vector3(2.2, 0, 1.95), level: 0, label: 'Ask the clerk to type a task', typewriter: true },
      { point: new THREE.Vector3(1.8, 0, -3.4), level: 1, label: 'Plan ahead', app: 'todo', tab: 'upcoming' },
      { point: new THREE.Vector3(-2.4, 0, 0.6), level: 1, label: 'Look through the archive', app: 'todo', tab: 'done' },
    ],
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.4),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.4 },
    cameraOffset: new THREE.Vector3(10, 15, 17),
    // the room is the building: the same walls, so the window views are exact;
    // only the plinth (0.4 m) lifts the ground floor off the plaza
    plazaOffset: new THREE.Vector3(0, 0.4, 0),
  };
}
