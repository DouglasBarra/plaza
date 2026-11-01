// The plaza: lays out the buildings, props, folks and animals.
import * as THREE from 'three';
import { M, box, cyl, slab } from '../kit.js';
import { placeFinds, animateFinds } from '../finds.js';
import { leaves, animateLife } from '../life.js';
import { addFolk, animateFigures } from '../folks.js';
import { updateClocks, animateCranes } from '../details.js';
import { beams, HALL_SIZE, townHall, bank, library, lighthouse, works, postOffice } from './buildings.js';
import { roundTree, bench, lamp, bollards, planter, bike, noticeboard, mailbox } from './props.js';
import { TRUCK, truckFrame, foodTruck, chalkSign, stringLights, lightPool, barrelPlanter, bistroTable, picnicTable, chairSpot, benchSpot, litterBin } from './foodtruck.js';
import { cat, pigeon, animateCritters } from './critters.js';
import { fountain, animateFountain, FOUNTAIN } from './fountain.js';
import { LAMP_TOP, TREE_LOW_BRANCH, KIOSK, bin, drinkingFountain, bikeRack, kiosk, signpost, streetClock, phoneBox, mapBoard, bunting, treeGrate, chalkDrawing, pottedShrub, shrubPlanter } from './props.js';
import { DISTRICTS } from '../districts/index.js';
import { piece, placeable } from '../layout.js';

// ---------- the plaza ----------
// A civic square shaped like a U around the fountain, open to the south,
// where you arrive. The town hall heads it; down the west side stand the
// post office (People) and the library (Study), down the east side the Works
// (Projects) and the bank (Finance); the lighthouse (Ideas) marks the
// south-east corner, and a food truck with its tables fills the south-west. Every
// building faces the middle of the fountain, and every one is real size
// (see buildings.js).
//
// Streets enter at the middle of the south, east and west sides (x = 0 or
// z = 0), 5 m wide; the north street ends at the town hall's back. Stone
// walks run from the ring around the fountain to every door.
export const PLAZA = { hx: 36, hz: 37 };
export const PLAZA_HALF = PLAZA.hx; // the larger half, for anything that needs one number
const ROAD_CLEAR = 3.0;      // half the width kept clear where a street comes in
const FZ = 0;                // the fountain's z: the middle of the square
const RING = 9.6;            // the stone ring around the fountain
const deg = THREE.MathUtils.degToRad;
// Where each district's building stands. Every building faces the middle of
// the fountain.
const SPOTS = {
  people: [-27, -13.5], projects: [27, -13.5],
  study: [-27, 12.5], finance: [27, 12.5],
  ideas: [25.1, 28.9],                  // the lighthouse, in the south-east corner
};
const facingFountain = (x, z) => Math.atan2(-x, -(z - FZ));

export function buildPlaza(scene) {
  const world = new THREE.Group();
  scene.add(world);
  const { hx, hz } = PLAZA;

  // the plaza floor: a raised slab with a stone curb, and the fountain's ring
  slab(world, hx * 2, 0.4, hz * 2, M.paving, M.stone, 0, -0.2, 0);
  cyl(world, RING, RING, 0.1, M.stone, 0, 0.05, FZ, 64);
  cyl(world, RING - 0.6, RING - 0.6, 0.16, M.paving, 0, 0.08, FZ, 64);
  let walkId = 5e5;
  // a stone walk from (x1, z1) to (x2, z2), 2.6 m wide (3.2 from a street)
  const walk = (x1, z1, x2, z2, w = 2.6) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const b = box(world, w, 0.04, len, M.stone, (x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    b.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    b.userData.inkId = walkId++;
    return b;
  };

  const buildings = [];
  const colliders = [];
  const col = (x, z, r) => { const c = { x, z, r }; colliders.push(c); return c; };
  const place = (b, x, z, rotY) => {
    b.position.set(x, 0, z);
    b.rotation.y = rotY;
    world.add(b);
    buildings.push(b);
    const front = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
    let collider;
    if (b.userData.hall) {
      // the town hall is as big as its inside: a box around its walls
      collider = { x, z, hw: HALL_SIZE.w / 2, hd: HALL_SIZE.d / 2 + 0.05, rot: rotY };
      b.userData.door = new THREE.Vector3(x, 0, z).addScaledVector(front, b.userData.doorDist);
    } else if (b.userData.yard) {
      // a building as big as its inside, with a yard reaching out in front (the bank)
      const { cz, hw, hd, doorDist } = b.userData.yard;
      const c = new THREE.Vector3(x, 0, z).addScaledVector(front, cz);
      collider = { x: c.x, z: c.z, hw, hd, rot: rotY };
      b.userData.door = new THREE.Vector3(x, 0, z).addScaledVector(front, doorDist);
    } else {
      // a building standing in its yard: a box around the whole yard
      const { w, d } = b.userData.footprint;
      collider = { x, z, hw: w / 2, hd: d / 2, rot: rotY };
      b.userData.door = new THREE.Vector3(x, 0, z).addScaledVector(front, d / 2 + 0.8);
    }
    colliders.push(collider);
    placeable(b, `plaza.${b.userData.district}`, [collider, b.userData.door]);
    return b;
  };
  // is (x, z) on a building's yard (with a margin)?
  const onBuilding = (x, z, m = 0.5) => colliders.some((c) => {
    if (c.hw == null) return false;
    const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
    return Math.abs(lx) < c.hw + m && Math.abs(lz) < c.hd + m;
  });

  // ---- the buildings
  const HALL = { x: 0, z: -hz + (HALL_SIZE.d + 1) / 2 + 0.6 };
  place(townHall(), HALL.x, HALL.z, 0);
  const builders = { people: postOffice, projects: works, study: library, finance: bank, ideas: lighthouse };
  for (const [id, [x, z]] of Object.entries(SPOTS)) place(builders[id](), x, z, facingFountain(x, z));
  const hallSteps = HALL.z + HALL_SIZE.d / 2 + 1.6;              // the foot of the town hall's steps

  // ---- walks: the streets to the fountain, and the ring to every door
  walk(0, hz, 0, FZ + RING, 3.2);                                // from the south street
  walk(hx, 0, RING, 0, 3.2);                                     // from the east
  walk(-hx, 0, -RING, 0, 3.2);                                   // from the west
  walk(0, FZ - RING, 0, hallSteps - 0.2, 3.2);                   // up to the hall's steps
  const walkAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];   // as seen from the fountain: south, east, north, west
  for (const b of buildings) {
    if (b.userData.hall) continue;
    const d = b.userData.door;
    const a = Math.atan2(d.x, d.z - FZ);
    walk(Math.sin(a) * RING, FZ + Math.cos(a) * RING, d.x, d.z);
    walkAngles.push(a);
  }

  // ---- the fountain, and the bench ring around it; each bench brings the folks on it
  const fountainGroup = fountain(world);
  fountainGroup.position.z = FZ;
  placeable(fountainGroup, 'plaza.fountain', [col(0, FZ, FOUNTAIN.step)]);
  const BR = 8.3;
  const onBench = (i, side = 0) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, rot = a + Math.PI;
    return { x: Math.sin(a) * BR + Math.cos(rot) * side, z: FZ + Math.cos(a) * BR - Math.sin(rot) * side, rot, seat: 0.5 };
  };
  const sitters = [
    [{ ...onBench(0, -0.4), pose: 'read', look: { hat: 'bowler', glasses: true, item: 'paper' } },
      { ...onBench(0, 0.45), pose: 'sit', look: { hair: 'bun', dress: true, height: 0.95 } }],
    [{ ...onBench(1), pose: 'nap', look: { hat: 'cap' } }],
    [],
    [{ ...onBench(3, 0.3), pose: 'sit', look: { hat: 'top', glasses: true, height: 1.08 } }],
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * BR, z = FZ + Math.cos(a) * BR;
    piece(world, `plaza.fountain-bench-${i + 1}`, [x, z], (g) => {
      bench(g, x, z, a + Math.PI);
      for (const f of sitters[i]) addFolk(g, f);
    }, [col(x, z, 0.75)]);
  }

  // ---- lamps: around the ring (clear of the walks), at the street mouths, at the hall's steps
  const LAMPS = [];
  const clearOfWalks = (a) => walkAngles.every((w) => Math.abs(Math.atan2(Math.sin(a - w), Math.cos(a - w))) > deg(11));
  for (let i = 0; i < 16 && LAMPS.length < 8; i++) {
    const a = deg(22.5) + (i / 16) * Math.PI * 2;
    if (clearOfWalks(a)) LAMPS.push([Math.sin(a) * (RING + 1.0), FZ + Math.cos(a) * (RING + 1.0)]);
  }
  const owlLamp = { x: LAMPS[0][0], z: LAMPS[0][1], y: LAMP_TOP };   // the night owl sits on this one (finds.js)
  LAMPS.push([-3.0, hz - 1.6], [3.0, hz - 1.6], [hx - 1.6, -3.0], [hx - 1.6, 3.0], [-hx + 1.6, -3.0], [-hx + 1.6, 3.0], [-3.2, hallSteps + 0.6], [3.2, hallSteps + 0.6]);
  LAMPS.forEach(([x, z], i) => {
    piece(world, `plaza.lamp-${i + 1}`, [x, z], (g) => lamp(g, x, z), [col(x, z, 0.35), i === 0 && owlLamp]);
  });

  // ---- bollards along the edge: the plaza ends here, the town goes on. Gaps
  // at the three street mouths, none behind the town hall or on a yard.
  const hallEdge = HALL_SIZE.w / 2 + 1.2;
  const posts = [];
  for (let s = -hx + 0.6; s <= hx - 0.5; s += 2.1) {
    const atStreet = Math.abs(s) < ROAD_CLEAR;
    if (Math.abs(s - HALL.x) > hallEdge && !onBuilding(s, -hz + 0.4)) posts.push([s, -hz + 0.4]);
    if (!atStreet && !onBuilding(s, hz - 0.4)) posts.push([s, hz - 0.4]);
  }
  for (let s = -hz + 0.6; s <= hz - 0.5; s += 2.1) {
    if (Math.abs(s) < ROAD_CLEAR) continue;
    for (const x of [-hx + 0.4, hx - 0.4]) if (!onBuilding(x, s)) posts.push([x, s]);
  }
  bollards(world, posts);

  // ---- street furniture
  const P = {
    truck: { x: -27.5, z: 27.0, rot: deg(112) },   // the food truck; its hatch faces the fountain
    tables: { x: -18.8, z: 30.0 },                  // the middle of its seating
    tableSpots: [{ x: -19.6, z: 27.6, rot: deg(20), r: 1.0 }, { x: -15.8, z: 29.8, rot: deg(-10), r: 1.0 }, { x: -20.6, z: 32.0, rot: deg(112), r: 1.25 }],
    lightPosts: [[-22.0, 25.0], [-14.4, 27.4], [-17.4, 33.6]],
    waiter: [[-25.2, 27.0], [-17.6, 30.2]],     // from the truck's counter to the tables
    bin: { x: -23.6, z: 33.2 },
    flowers: { x: -15.5, z: -21.5 },     // flower boxes between the hall and the post office
    trees: [{ x: 12.5, z: 34.4 }, { x: 15.6, z: 34.8, y: TREE_LOW_BRANCH * 0.85 }],   // a paper plane is stuck in the second, among its lowest limbs
    bikes: [{ x: 12.65, z: 32.45, rot: Math.PI / 2 }, { x: 13.65, z: 32.35, rot: Math.PI / 2 }, { x: 15.15, z: 32.5, rot: -Math.PI / 2 }],
    board: { x: -5.6, z: 33.2 },         // the notice board greeting you as you arrive
    bench: { x: -10.5, z: 30.0 },
    mailbox: { x: -18.5, z: -6.5 },      // in front of the post office
    owlLamp,
  };
  // the food truck in the south-west corner, parked on the paving with its
  // hatch toward the fountain: the cook inside, a queue at the counter, a
  // chalk sign, and string lights tied from its roof to posts round the tables
  const truckAt = truckFrame(P.truck.x, P.truck.z, P.truck.rot);
  const queue = [
    [truckAt(0.55, 1.95), Math.PI, 'idle', { hat: 'beanie', backpack: true }],
    [truckAt(1.25, 2.75), Math.PI - 0.6, 'look', { glasses: true, scarf: true }],
    [truckAt(0.35, 3.35), Math.PI + 0.3, 'chat', { hair: 'long', dress: true }],
    [truckAt(0.95, 3.45), Math.PI - 0.2, 'idle', { hat: 'cone', height: 0.7 }],
  ];
  const signAt = truckAt(-2.2, 2.4), boxAt = truckAt(0.25, 0), potAt = truckAt(-3.5, 1.2);
  const truckBox = { x: boxAt.x, z: boxAt.z, hw: 3.25, hd: 1.48, rot: P.truck.rot };   // the truck, its step, crates and gas
  colliders.push(truckBox);
  piece(world, 'plaza.food-truck', [P.truck.x, P.truck.z], (g) => {
    const { x, z, rot } = P.truck;
    foodTruck(g, x, z, rot);
    const cook = truckAt(0.25, 0.3);
    addFolk(g, { x: cook.x, y: 0.55, z: cook.z, rot, pose: 'vendor', look: { hat: 'cap' } });
    for (const [q, r, pose, look] of queue) addFolk(g, { x: q.x, z: q.z, rot: rot + r, pose, look });
    chalkSign(g, signAt.x, signAt.z, rot - 0.45);
    barrelPlanter(g, potAt.x, potAt.z);
    const posts = P.lightPosts.map(([px, pz]) => barrelPlanter(g, px, pz, true));
    const tie = ([lx, ly, lz]) => { const q = truckAt(lx, lz); return [q.x, ly, q.z]; };
    const bulbs = stringLights(g, [tie(TRUCK.lightsRear), ...posts, tie(TRUCK.lightsFront)]);
    lightPool(g, P.tables.x, P.tables.z, bulbs);
  }, [truckBox, ...queue.map(([q]) => col(q.x, q.z, 0.3)), col(signAt.x, signAt.z, 0.45), col(potAt.x, potAt.z, 0.4),
    ...P.lightPosts.map(([px, pz]) => col(px, pz, 0.42))]);
  // its tables: two bistro tables under umbrellas and a picnic table, with
  // the waiter going between them and the truck
  piece(world, 'plaza.food-truck-tables', [P.tables.x, P.tables.z], (g) => {
    const [b1, b2, pic] = P.tableSpots;
    bistroTable(g, b1.x, b1.z, b1.rot);
    bistroTable(g, b2.x, b2.z, b2.rot);
    picnicTable(g, pic.x, pic.z, pic.rot);
    addFolk(g, { ...chairSpot(b1.x, b1.z, b1.rot, 0), pose: 'sit', look: { hair: 'bun' } });
    addFolk(g, { ...chairSpot(b2.x, b2.z, b2.rot, Math.PI), pose: 'read', look: { glasses: true, item: 'paper' } });
    addFolk(g, { ...benchSpot(pic.x, pic.z, pic.rot, 1, -0.4), pose: 'type', look: { hat: 'cap', height: 0.8 } });
    addFolk(g, { ...benchSpot(pic.x, pic.z, pic.rot, -1, 0.4), pose: 'sit', look: { hat: 'bowler' } });
    addFolk(g, { walk: { path: P.waiter, speed: 0.7 }, look: { item: 'tray', hair: 'bun' } });
    litterBin(g, P.bin.x, P.bin.z);
    lightPool(g, (b1.x + b2.x) / 2, (b1.z + b2.z) / 2);
  }, [...P.tableSpots.map((t) => col(t.x, t.z, t.r)), col(P.bin.x, P.bin.z, 0.35)]);
  piece(world, 'plaza.flowers', [P.flowers.x + 1.0, P.flowers.z], (g) => {
    planter(g, P.flowers.x, P.flowers.z, 'ideas'); planter(g, P.flowers.x + 2.0, P.flowers.z);
  }, [col(P.flowers.x + 1.0, P.flowers.z, 1.8), P.flowers]);
  piece(world, 'plaza.planters-east', [16.5, -21.5], (g) => {
    planter(g, 15.5, -21.5, 'todo'); planter(g, 17.5, -21.5);
  }, [col(16.5, -21.5, 1.8)]);
  piece(world, 'plaza.trees-south', [14.05, 34.6], (g) => {
    for (const t of P.trees) { roundTree(g, t.x, t.z, 0.85); treeGrate(g, t.x, t.z); }
  }, [col(12.5, 34.4, 1.0), col(15.6, 34.8, 1.0), ...P.trees]);
  // bikes parked at a row of stands, by the trees
  piece(world, 'plaza.bikes', [13.9, 32.4], (g) => {
    bikeRack(g, 13.9, 32.4, Math.PI / 2, 3);
    for (const b of P.bikes) bike(g, b.x, b.z, b.rot);
  }, [col(13.15, 32.4, 0.75), col(14.65, 32.4, 0.75)]);
  piece(world, 'plaza.noticeboard', [P.board.x, P.board.z], (g) => {
    noticeboard(g, P.board.x, P.board.z, 0);
    addFolk(g, { x: P.board.x, z: P.board.z + 1.0, rot: Math.PI, pose: 'look', look: { hat: 'top' } });
  }, [col(P.board.x, P.board.z, 1.2), P.board]);
  piece(world, 'plaza.bench-south', [P.bench.x, P.bench.z], (g) => {
    bench(g, P.bench.x, P.bench.z, Math.PI);
    addFolk(g, { x: P.bench.x, z: P.bench.z, rot: Math.PI, seat: 0.5, pose: 'read', look: { hair: 'long', item: 'paper' } });
  });
  piece(world, 'plaza.mailbox', [P.mailbox.x, P.mailbox.z], (g) => mailbox(g, P.mailbox.x, P.mailbox.z, deg(-115)), [col(P.mailbox.x, P.mailbox.z, 0.35)]);
  // trees in planters along both sides of the hall's forecourt
  for (const sx of [-1, 1]) for (const tz of [hallSteps + 1.2, hallSteps + 5.2]) {
    const tx = sx * 8.6;
    const side = sx < 0 ? 'west' : 'east', row = tz < hallSteps + 3 ? 'back' : 'front';
    piece(world, `plaza.forecourt-tree-${side}-${row}`, [tx, tz], (g) => {
      box(g, 1.6, 0.5, 1.6, M.stone, tx, 0.25, tz);
      roundTree(g, tx, tz, 0.95).position.y = 0.5;
    }, [col(tx, tz, 1.1)]);
  }
  // a pair of trees at the south entrance, and trees in the corners behind the buildings
  for (const [name, x, z, s] of [['entrance-west', -8.9, 34.2, 0.9], ['entrance-east', 8.6, 34.4, 0.85],
    ['north-west', -33.0, -33.5, 0.8], ['north-east', 33.0, -33.5, 0.8], ['south-west', -33.0, 33.5, 0.75]]) {
    piece(world, `plaza.tree-${name}`, [x, z], (g) => { roundTree(g, x, z, s); treeGrate(g, x, z); }, [col(x, z, 1.0)]);
  }

  // ---- more street furniture
  // `off` finds a spot beside something turned by `rot`: lx to its right, lz in front
  const off = (x, z, rot, lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];
  const doors = buildings.map((b) => ({ id: b.userData.district, door: b.userData.door, b }));
  // a finger signpost where you come in from the south, one arm per district
  const SIGN = { x: 2.9, z: 12.8 };
  piece(world, 'plaza.signpost', [SIGN.x, SIGN.z], (g) => signpost(g, SIGN.x, SIGN.z, doors.map(({ id, door }) => ({
    text: DISTRICTS[id].name, district: id, angle: Math.atan2(-(door.z - SIGN.z), door.x - SIGN.x),
  }))), [col(SIGN.x, SIGN.z, 0.3)]);
  // the plaza's map at the south entrance, drawn from where everything really stands
  const MAP = { x: 4.6, z: 32.3 };
  const NAMES = { todo: 'Town Hall', finance: 'Bank', study: 'Library', ideas: 'Lighthouse', projects: 'Works', people: 'Post Office' };
  const plan = {
    hx, hz, ring: RING, basin: FOUNTAIN.rim,
    walks: [[0, hz, 0, FZ + RING, 3.2], [hx, 0, RING, 0, 3.2], [-hx, 0, -RING, 0, 3.2], [0, FZ - RING, 0, hallSteps - 0.2, 3.2],
      ...doors.filter(({ b }) => !b.userData.hall).map(({ door }) => {
        const a = Math.atan2(door.x, door.z - FZ);
        return [Math.sin(a) * RING, FZ + Math.cos(a) * RING, door.x, door.z, 2.6];
      })],
    places: doors.map(({ id, b }, i) => ({
      n: i + 1, label: NAMES[id], district: DISTRICTS[id].name, x: b.position.x, z: b.position.z, rot: b.rotation.y,
      ...(b.userData.hall ? { w: HALL_SIZE.w, d: HALL_SIZE.d } : b.userData.footprint),
    })),
  };
  piece(world, 'plaza.map-board', [MAP.x, MAP.z], (g) => mapBoard(g, MAP.x, MAP.z, -0.3, plan), [col(MAP.x, MAP.z, 0.9)]);
  // bunting and festoon lights across the walk in from the south
  piece(world, 'plaza.bunting', [0, 27.0], (g) => bunting(g, 0, 27.0, 0, 6, 3.5), [col(-3, 27.0, 0.2), col(3, 27.0, 0.2)]);
  // litter bins: by the entrance, the notice board, the hall's steps and the east street
  for (const [name, x, z] of [['south', 2.6, 30.4], ['noticeboard', -7.0, 32.4], ['forecourt', -4.6, hallSteps + 0.9], ['east', 31.6, 2.7]]) {
    piece(world, `plaza.bin-${name}`, [x, z], (g) => bin(g, x, z, facingFountain(x, z)), [col(x, z, 0.3)]);
  }
  // a newspaper and flower kiosk, with its vendor behind the counter and a bin beside it
  const KI = { x: 14.2, z: -16.2 }, kRot = facingFountain(KI.x, KI.z);
  const kBin = off(KI.x, KI.z, kRot, -1.95, 0.5);
  piece(world, 'plaza.kiosk', [KI.x, KI.z], (g) => {
    kiosk(g, KI.x, KI.z, kRot);
    const [vx, vz] = off(KI.x, KI.z, kRot, 0, KIOSK.inside);
    addFolk(g, { x: vx, z: vz, rot: kRot, pose: 'vendor', look: { hat: 'cap', glasses: true } });
    bin(g, kBin[0], kBin[1], kRot);
  }, [col(KI.x, KI.z, 1.6), col(kBin[0], kBin[1], 0.3)]);
  // a drinking fountain beside the east walk
  piece(world, 'plaza.drinking-fountain', [12.6, -3.2], (g) => drinkingFountain(g, 12.6, -3.2, 0), [col(12.6, -3.2, 0.5)]);
  // a street clock in the hall's forecourt, its faces toward the fountain and the hall
  piece(world, 'plaza.street-clock', [-3.0, -14.6], (g) => streetClock(g, -3.0, -14.6, 0), [col(-3.0, -14.6, 0.3)]);
  // a telephone box near the post office, its door toward the fountain
  piece(world, 'plaza.phone-box', [-19.8, -4.0], (g) => phoneBox(g, -19.8, -4.0, facingFountain(-19.8, -4.0)), [col(-19.8, -4.0, 0.75)]);
  // a little garden between the fountain and the library: two benches, a bin, hedges behind
  const GA = { x: -11.6, z: 13.2 }, gRot = facingFountain(GA.x, GA.z);
  const gBench = [off(GA.x, GA.z, gRot, -1.2, 0), off(GA.x, GA.z, gRot, 1.2, 0)];
  const gHedge = [off(GA.x, GA.z, gRot, -1.3, -1.6), off(GA.x, GA.z, gRot, 1.3, -1.6)];
  piece(world, 'plaza.garden', [GA.x, GA.z], (g) => {
    for (const [x, z] of gBench) bench(g, x, z, gRot);
    bin(g, GA.x, GA.z, gRot);
    for (const [x, z] of gHedge) shrubPlanter(g, x, z, gRot, 2.4);
    addFolk(g, { x: gBench[1][0], z: gBench[1][1], rot: gRot, seat: 0.5, pose: 'read', look: { hat: 'beanie', scarf: true, item: 'paper' } });
  }, [...gBench.map(([x, z]) => col(x, z, 0.8)), col(GA.x, GA.z, 0.3),
    ...gHedge.flatMap(([x, z]) => [-0.6, 0.6].map((s) => col(...off(x, z, gRot, s, 0), 0.55)))]);
  // bike stands by the library
  const LR = { x: -18.6, z: 14.2 }, lrRot = facingFountain(LR.x, LR.z) + Math.PI / 2;
  piece(world, 'plaza.bikes-library', [LR.x, LR.z], (g) => {
    bikeRack(g, LR.x, LR.z, lrRot, 2);
    bike(g, ...off(LR.x, LR.z, lrRot, 0, -0.75), lrRot);
  }, [col(LR.x, LR.z, 1.1)]);
  // a hopscotch chalked on the paving, near the kid with the kite
  piece(world, 'plaza.hopscotch', [4.4, 17.6], (g) => chalkDrawing(g, 4.4, 17.6, 0.15));
  // potted shrubs either side of each door
  const POTS = { finance: 'ball', study: 'ball', people: 'ball', projects: 'cone', ideas: 'bush' };
  for (const { id, door, b } of doors) {
    if (!POTS[id]) continue;
    const r = b.rotation.y;
    for (const [side, lx] of [['left', -1.95], ['right', 1.95]]) {
      const [x, z] = off(door.x, door.z, r, lx, -0.3);
      piece(world, `plaza.pot-${id}-${side}`, [x, z], (g) => pottedShrub(g, x, z, POTS[id]), [col(x, z, 0.35)]);
    }
  }
  for (const [x, z] of [[1.8, 3.4], [2.3, 3.0], [-3.2, -1.6], [-3.4, -2.2], [3.1, -2.6], [2.2, -3.4]]) pigeon(world, x * 2.2, FZ + z * 2.2);

  // ---- folks, each busy with something (the ones at a bench, the food truck,
  // its tables or the notice board belong to that piece, above)
  addFolk(world, { x: 0, z: FZ + FOUNTAIN.seatR, rot: 0, seat: FOUNTAIN.seat, pose: 'music', look: { hat: 'cap', item: 'guitar' } });
  addFolk(world, { x: -7.8, z: FZ - 3.0, rot: 2.14, pose: 'feed', look: { hair: 'bun', dress: true, height: 0.95 } });
  addFolk(world, { x: 13.0, z: 15.0, rot: 0.93, pose: 'chat', look: { hair: 'long', scarf: true } });
  addFolk(world, { x: 13.8, z: 15.6, rot: 0.93 + Math.PI, pose: 'idle', look: { hat: 'cone', backpack: true } });
  // walkers keep to the open ground around the fountain and across the forecourt
  addFolk(world, { pose: 'walk', walk: { r: 13, cx: 0, cz: FZ, speed: 0.06 }, dog: true, look: { hat: 'cap', scarf: true } });
  addFolk(world, { pose: 'walk', walk: { path: [[-6.5, hallSteps + 3.2], [6.5, hallSteps + 3.2]], speed: 0.8 }, look: { glasses: true, backpack: true } });
  addFolk(world, { pose: 'walk', walk: { path: [[-1.0, hz - 3], [-1.0, FZ + RING + 1]], speed: 0.9 }, look: { hat: 'bowler', item: 'paper' } });
  addFolk(world, { x: HALL.x + 4.0, z: hallSteps + 1.0, rot: 0.8, pose: 'sweep', look: { hat: 'bowler', item: 'broom' } });
  addFolk(world, { x: 7.5, z: 19.0, rot: 2.45, pose: 'kite', kite: true, look: { hat: 'cap', height: 0.72 } });
  addFolk(world, { x: -13.0, z: 17.0, rot: 2.2, pose: 'wave', look: { item: 'balloon', balloon: 'people', height: 0.75 } });
  leaves(world, 30, Math.min(hx, hz) - 2);
  cat(world, 3.6, hz - 8.0, 0.7, true);    // the friendly one, near where you arrive
  cat(world, -16.5, 21.5, 2.4);            // between the library's garden and the food truck's tables

  placeFinds(world, buildings, P);

  return { world, buildings, colliders };
}

// Everything on the plaza that moves. `player` is your position on the plaza
// (null when you're indoors).
export function animatePlaza(time, player = null, dt = 1 / 60) {
  animateFigures(time);
  animateLife(time);
  animateFountain(time);
  animateFinds(time);
  updateClocks();
  animateCranes(time);
  for (const b of beams) b.rotation.y = time * 0.6;
  animateCritters(time, player, dt);
}
