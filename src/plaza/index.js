// The plaza: lays out the buildings, props, folks and animals.
import * as THREE from 'three';
import { M, box, cyl, slab } from '../kit.js';
import { placeFinds, animateFinds } from '../finds.js';
import { leaves, animateLife } from '../life.js';
import { addFolk, animateFigures } from '../folks.js';
import { updateClocks, animateCranes } from '../details.js';
import { beams, HALL_SIZE, townHall, bank, library, lighthouse, emptyPlot } from './buildings.js';
import { roundTree, bench, lamp, fountain, bollard, planter, cafe, stall, bike, noticeboard, mailbox } from './props.js';
import { cat, pigeon, animateCritters } from './critters.js';

// ---------- the plaza ----------
// The plaza is a civic square, wider than it is deep, laid out around the
// town hall: the hall stands centered on the north side looking down the
// square to the fountain, the bank and the library face each other across
// it, and the lighthouse holds the south-east corner. The smaller buildings
// are drawn at 1.6x so they sit in proportion with the two-story hall.
export const PLAZA = { hx: 26, hz: 22 };
export const PLAZA_HALF = PLAZA.hx; // the larger half, for anything that needs one number
// The streets enter the plaza at the middle of the south, east and west sides
// (x = 0 / z = 0), 5 m wide; the north street ends at the town hall's back.
const ROAD_CLEAR = 3.4;
const BIG = 1.6;           // scale of the bank, library and lighthouse
const FZ = 3;              // the fountain's z: the square's center of gravity
const FS = 1.8, FSY = 1.25; // the fountain's scale (wide, not much taller)

export function buildPlaza(scene) {
  const world = new THREE.Group();
  scene.add(world);
  const { hx, hz } = PLAZA;

  // the plaza floor: a raised slab with a stone curb
  slab(world, hx * 2, 0.4, hz * 2, M.paving, M.stone, 0, -0.2, 0);
  // stone walks from the streets to the fountain, and a stepped ring around it
  box(world, 3.2, 0.04, hz - FZ - 9.4, M.stone, 0, 0.02, (hz + FZ + 9.4) / 2).userData.inkId = 5e5;           // from the south street
  box(world, hx - 9.4, 0.04, 3.2, M.stone, (hx + 9.4) / 2, 0.02, 0).userData.inkId = 5e5 + 1;               // from the east
  box(world, hx - 9.4, 0.04, 3.2, M.stone, -(hx + 9.4) / 2, 0.02, 0).userData.inkId = 5e5 + 2;              // from the west
  box(world, 3.2, 0.04, 4.0, M.stone, 0, 0.02, -8.4).userData.inkId = 5e5 + 3;                                 // up to the hall's steps
  cyl(world, 9.6, 9.6, 0.1, M.stone, 0, 0.05, FZ, 56);
  cyl(world, 9.0, 9.0, 0.16, M.paving, 0, 0.08, FZ, 56);

  const buildings = [];
  const colliders = [];
  const place = (b, x, z, rotY = Math.atan2(-x, -(z - FZ)), r = 4.4, scale = 1) => {
    b.position.set(x, 0, z);
    b.rotation.y = rotY; // front faces the fountain
    b.scale.setScalar(scale);
    world.add(b);
    buildings.push(b);
    const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    if (b.userData.hall) {
      // the town hall is as big as its inside: a box, not a circle
      colliders.push({ x, z, hw: HALL_SIZE.w / 2, hd: HALL_SIZE.d / 2 + 0.05, rot: rotY });
      b.userData.door = new THREE.Vector3(x, 0, z).addScaledVector(front, b.userData.doorDist);
    } else {
      colliders.push({ x, z, r: r * scale });
      b.userData.door = new THREE.Vector3(x, 0, z).addScaledVector(front, r * scale + 0.7); // just outside its collider
    }
  };

  // ---- the buildings
  const HALL = { x: 0, z: -hz + (HALL_SIZE.d + 1) / 2 };
  place(townHall(), HALL.x, HALL.z, 0);
  place(bank(), hx - 7, -9, -Math.PI / 2, 3.9, BIG);
  place(library(), -hx + 7, -9, Math.PI / 2, 3.9, BIG);
  place(lighthouse(), 19, 14, undefined, 3.9, BIG);
  // the construction lots in the north corners, either side of the hall,
  // where the crane is a backdrop rather than in the way of the view
  place(emptyPlot('projects', true), 13, -18.4, 0, 3.4);
  place(emptyPlot('people'), -13, -18.4, 0, 3.4);

  const fountainGroup = fountain(world);
  fountainGroup.position.z = FZ;
  fountainGroup.scale.set(FS, FSY, FS);
  colliders.push({ x: 0, z: FZ, r: 2.9 * FS });
  const BR = 8.3; // the bench ring around the fountain
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    bench(world, Math.sin(a) * BR, FZ + Math.cos(a) * BR, a + Math.PI);
  }
  const hallSteps = HALL.z + HALL_SIZE.d / 2 + 0.9;               // just in front of the town hall's steps
  const LAMPS = [[11.5, FZ], [-11.5, FZ], [2.6, FZ + 11.5], [-2.6, FZ + 11.5], [5.5, FZ - 11.5], [-5.5, FZ - 11.5], [-hx + 2.5, 8], [hx - 2.5, 8], [-hx + 2.5, -3.6], [hx - 2.5, -3.6]];
  for (const [x, z] of LAMPS) { lamp(world, x, z); colliders.push({ x, z, r: 0.35 }); }

  // bollards along the edge: the plaza ends here, the town goes on. Gaps at
  // the three street mouths, and none behind the town hall.
  const hallEdge = [HALL.x - HALL_SIZE.w / 2 - 1.2, HALL.x + HALL_SIZE.w / 2 + 1.2];
  for (let s = -hx + 0.6; s <= hx - 0.5; s += 2.1) {
    const atStreet = Math.abs(s) < ROAD_CLEAR - 0.2;
    if (!(s > hallEdge[0] && s < hallEdge[1])) bollard(world, s, -hz + 0.4);
    if (!atStreet) bollard(world, s, hz - 0.4);
  }
  for (let s = -hz + 0.6; s <= hz - 0.5; s += 2.1) {
    if (Math.abs(s) < ROAD_CLEAR - 0.2) continue;
    bollard(world, -hx + 0.4, s); bollard(world, hx - 0.4, s);
  }

  // ---- street furniture, kept clear of the streets and the walks
  const P = {
    cafe: { x: -19.5, z: 13.5 },
    stall: { x: -14.5, z: 4.6 },
    flowers: { x: 12.4, z: -3.0 },
    trees: [{ x: 22.6, z: 7.5 }, { x: 22.4, z: 10.2 }],
    bikes: [{ x: 20.8, z: 6.6 }, { x: 21.2, z: 6.1 }],
    board: { x: -4.6, z: 20.8 },
    bench: { x: -14.0, z: 20.6 },
    mailbox: { x: 4.6, z: 20.4 },
    owlLamp: { x: 11.5, z: FZ },
  };
  cafe(world, P.cafe.x, P.cafe.z); colliders.push({ x: P.cafe.x, z: P.cafe.z, r: 2.3 });
  stall(world, P.stall.x, P.stall.z, Math.PI / 2); colliders.push({ x: P.stall.x, z: P.stall.z, r: 2 });
  planter(world, P.flowers.x, P.flowers.z, 'ideas'); planter(world, P.flowers.x + 2.0, P.flowers.z);
  colliders.push({ x: P.flowers.x + 1.0, z: P.flowers.z, r: 1.8 });
  for (const t of P.trees) roundTree(world, t.x, t.z, 0.85);
  colliders.push({ x: 22.5, z: 8.9, r: 1.8 });
  for (const [i, b] of P.bikes.entries()) bike(world, b.x, b.z, 0.2 + i * 0.3);
  noticeboard(world, P.board.x, P.board.z, Math.PI); colliders.push({ x: P.board.x, z: P.board.z, r: 1.2 });
  bench(world, P.bench.x, P.bench.z, Math.PI);
  mailbox(world, P.mailbox.x, P.mailbox.z, Math.PI);
  planter(world, -12.4, -3.0, 'todo'); planter(world, -14.4, -3.0); colliders.push({ x: -13.4, z: -3.0, r: 1.8 });
  // a row of trees in planters along each side of the hall's forecourt
  for (const sx of [-1, 1]) for (const tz of [-12.5, -8.5]) {
    const tx = sx * 9.2;
    box(world, 1.6, 0.5, 1.6, M.stone, tx, 0.25, tz);
    roundTree(world, tx, tz, 0.95).position.y = 0.5;
    colliders.push({ x: tx, z: tz, r: 1.1 });
  }
  roundTree(world, -22.6, 8.4, 0.8); roundTree(world, -22.4, -6.8, 0.75); roundTree(world, 22.6, -6.8, 0.75);
  for (const [x, z] of [[1.8, 3.4], [2.3, 3.0], [-3.2, -1.6], [-3.4, -2.2], [3.1, -2.6], [2.2, -3.4]]) pigeon(world, x * 2.2, FZ + z * 2.2);

  // ---- folks, each busy with something
  const onBench = (i, side = 0) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, rot = a + Math.PI;
    return { x: Math.sin(a) * BR + Math.cos(rot) * side, z: FZ + Math.cos(a) * BR - Math.sin(rot) * side, rot, seat: 0.5 };
  };
  addFolk(world, { ...onBench(0, -0.4), pose: 'read', look: { hat: 'bowler', glasses: true, item: 'paper' } });
  addFolk(world, { ...onBench(0, 0.45), pose: 'sit', look: { hair: 'bun', dress: true, height: 0.95 } });
  addFolk(world, { ...onBench(1), pose: 'nap', look: { hat: 'cap' } });
  addFolk(world, { ...onBench(3, 0.3), pose: 'sit', look: { hat: 'top', glasses: true, height: 1.08 } });
  addFolk(world, { x: P.bench.x, z: P.bench.z, rot: Math.PI, seat: 0.5, pose: 'read', look: { hair: 'long', item: 'paper' } });
  addFolk(world, { x: 0, z: FZ + 2.35 * FS, rot: 0, seat: 0.6 * FSY, pose: 'music', look: { hat: 'cap', item: 'guitar' } });
  addFolk(world, { x: -7.8, z: FZ - 3.0, rot: 2.14, pose: 'feed', look: { hair: 'bun', dress: true, height: 0.95 } });
  addFolk(world, { x: 12.0, z: 11.0, rot: 0.93, pose: 'chat', look: { hair: 'long', scarf: true } });
  addFolk(world, { x: 12.8, z: 11.6, rot: 0.93 + Math.PI, pose: 'idle', look: { hat: 'cone', backpack: true } });
  // walkers keep to the open ground around the fountain and across the forecourt
  addFolk(world, { pose: 'walk', walk: { r: 12, cx: 0, cz: FZ, speed: 0.065 }, dog: true, look: { hat: 'cap', scarf: true } });
  addFolk(world, { pose: 'walk', walk: { path: [[-7, -7.6], [7, -7.6]], speed: 0.8 }, look: { glasses: true, backpack: true } });
  addFolk(world, { x: HALL.x + 4.0, z: hallSteps + 1.4, rot: 0.8, pose: 'sweep', look: { hat: 'bowler', item: 'broom' } });
  addFolk(world, { x: 6.5, z: 14.0, rot: 2.45, pose: 'kite', kite: true, look: { hat: 'cap', height: 0.72 } });
  addFolk(world, { x: P.stall.x - 1.1, z: P.stall.z, rot: Math.PI / 2, pose: 'vendor', look: { hat: 'cone' } });
  addFolk(world, { x: P.stall.x + 1.6, z: P.stall.z - 0.5, rot: -Math.PI / 2, pose: 'chat', look: { hair: 'long', dress: true } });
  addFolk(world, { x: P.cafe.x - 2.15, z: P.cafe.z - 0.8, rot: Math.PI / 2, seat: 0.45, pose: 'sit', look: { hair: 'bun' } });
  addFolk(world, { x: P.cafe.x + 2.15, z: P.cafe.z + 0.6, rot: -Math.PI / 2, seat: 0.45, pose: 'read', look: { glasses: true, item: 'paper' } });
  addFolk(world, { walk: { path: [[P.cafe.x - 1.2, P.cafe.z + 0.4], [P.cafe.x + 1.2, P.cafe.z - 0.5]], speed: 0.7 }, look: { item: 'tray', hair: 'bun' } });
  addFolk(world, { x: P.board.x, z: P.board.z - 1.0, rot: 0, pose: 'look', look: { hat: 'top' } });
  addFolk(world, { x: -15.0, z: 12.0, rot: 2.2, pose: 'wave', look: { item: 'balloon', balloon: 'people', height: 0.75 } });
  leaves(world, 26, hz - 2);
  cat(world, 3.6, FZ + 7.0, 0.7, true);
  cat(world, -20.5, 2.2, 2.4);

  placeFinds(world, buildings, P);

  return { world, buildings, colliders };
}

// Everything on the plaza that moves. `player` is your position on the plaza
// (null when you're indoors).
export function animatePlaza(time, player = null, dt = 1 / 60) {
  animateFigures(time);
  animateLife(time);
  animateFinds(time);
  updateClocks();
  animateCranes(time);
  for (const b of beams) b.rotation.y = time * 0.6;
  animateCritters(time, player, dt);
}
