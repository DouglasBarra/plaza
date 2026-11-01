// The plaza: lays out the buildings, props, folks and animals.
import * as THREE from 'three';
import { M, box, cyl, slab } from '../kit.js';
import { placeFinds, animateFinds } from '../finds.js';
import { leaves, animateLife } from '../life.js';
import { addFolk, animateFigures } from '../folks.js';
import { updateClocks, animateCranes } from '../details.js';
import { beams, HALL_SIZE, townHall, bank, library, lighthouse, works, postOffice } from './buildings.js';
import { roundTree, bench, lamp, bollards, planter, cafe, stall, bike, noticeboard, mailbox } from './props.js';
import { cat, pigeon, animateCritters } from './critters.js';
import { fountain, animateFountain, FOUNTAIN } from './fountain.js';
import { piece, placeable } from '../layout.js';

// ---------- the plaza ----------
// A civic square shaped like a U around the fountain, open to the south,
// where you arrive. The town hall heads it; down the west side stand the
// post office (People) and the library (Study), down the east side the Works
// (Projects) and the bank (Finance), each turned toward the opening so you
// see its front as you come in; the lighthouse (Ideas) marks the south-east,
// beside the street you arrive by, and the café and market fill the
// south-west. Every building is real size (see buildings.js).
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
// [x, z, facing] of each building; side buildings turn toward the south opening
const SPOTS = {
  people: [-27, -13.5, deg(65)], projects: [27, -13.5, deg(-65)],
  study: [-27, 12.5, deg(65)], finance: [27, 12.5, deg(-65)],
  ideas: [25.1, 28.9, Math.atan2(-25.1, -28.9)], // in the corner, facing the fountain, clear of the bank's view
};

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
  for (const [id, [x, z, r]] of Object.entries(SPOTS)) place(builders[id](), x, z, r);
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
    });
  }

  // ---- lamps: around the ring (clear of the walks), at the street mouths, at the hall's steps
  const LAMPS = [];
  const clearOfWalks = (a) => walkAngles.every((w) => Math.abs(Math.atan2(Math.sin(a - w), Math.cos(a - w))) > deg(11));
  for (let i = 0; i < 16 && LAMPS.length < 8; i++) {
    const a = deg(22.5) + (i / 16) * Math.PI * 2;
    if (clearOfWalks(a)) LAMPS.push([Math.sin(a) * (RING + 1.0), FZ + Math.cos(a) * (RING + 1.0)]);
  }
  const owlLamp = { x: LAMPS[0][0], z: LAMPS[0][1] };   // the night owl sits on this one (finds.js)
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
    cafe: { x: -15.0, z: 26.0 },
    stall: { x: -24.5, z: 28.5 },
    flowers: { x: -15.5, z: -21.5 },     // flower boxes between the hall and the post office
    trees: [{ x: 12.5, z: 34.4 }, { x: 15.6, z: 34.8 }],
    bikes: [{ x: 13.6, z: 32.6 }, { x: 14.2, z: 32.2 }],
    board: { x: -5.6, z: 33.2 },         // the notice board greeting you as you arrive
    bench: { x: -10.5, z: 30.0 },
    mailbox: { x: -18.5, z: -6.5 },      // in front of the post office
    owlLamp,
  };
  // the café and the market stall bring their customers, waiter and vendor
  piece(world, 'plaza.cafe', [P.cafe.x, P.cafe.z], (g) => {
    cafe(g, P.cafe.x, P.cafe.z);
    addFolk(g, { x: P.cafe.x - 2.15, z: P.cafe.z - 0.8, rot: Math.PI / 2, seat: 0.45, pose: 'sit', look: { hair: 'bun' } });
    addFolk(g, { x: P.cafe.x + 2.15, z: P.cafe.z + 0.6, rot: -Math.PI / 2, seat: 0.45, pose: 'read', look: { glasses: true, item: 'paper' } });
    addFolk(g, { walk: { path: [[P.cafe.x - 1.2, P.cafe.z + 0.4], [P.cafe.x + 1.2, P.cafe.z - 0.5]], speed: 0.7 }, look: { item: 'tray', hair: 'bun' } });
  }, [col(P.cafe.x, P.cafe.z, 2.3)]);
  piece(world, 'plaza.stall', [P.stall.x, P.stall.z], (g) => {
    stall(g, P.stall.x, P.stall.z, deg(35));
    addFolk(g, { x: P.stall.x - 0.6, z: P.stall.z - 0.9, rot: deg(35) + Math.PI, pose: 'vendor', look: { hat: 'cone' } });
    addFolk(g, { x: P.stall.x + 1.2, z: P.stall.z + 1.7, rot: deg(35) + Math.PI, pose: 'chat', look: { hair: 'long', dress: true } });
  }, [col(P.stall.x, P.stall.z, 2)]);
  piece(world, 'plaza.flowers', [P.flowers.x + 1.0, P.flowers.z], (g) => {
    planter(g, P.flowers.x, P.flowers.z, 'ideas'); planter(g, P.flowers.x + 2.0, P.flowers.z);
  }, [col(P.flowers.x + 1.0, P.flowers.z, 1.8), P.flowers]);
  piece(world, 'plaza.planters-east', [16.5, -21.5], (g) => {
    planter(g, 15.5, -21.5, 'todo'); planter(g, 17.5, -21.5);
  }, [col(16.5, -21.5, 1.8)]);
  piece(world, 'plaza.trees-south', [14.05, 34.6], (g) => {
    for (const t of P.trees) roundTree(g, t.x, t.z, 0.85);
  }, [col(12.5, 34.4, 1.0), col(15.6, 34.8, 1.0), ...P.trees]);
  piece(world, 'plaza.bikes', [13.9, 32.4], (g) => {
    for (const [i, b] of P.bikes.entries()) bike(g, b.x, b.z, 0.2 + i * 0.3);
  });
  piece(world, 'plaza.noticeboard', [P.board.x, P.board.z], (g) => {
    noticeboard(g, P.board.x, P.board.z, 0);
    addFolk(g, { x: P.board.x, z: P.board.z + 1.0, rot: Math.PI, pose: 'look', look: { hat: 'top' } });
  }, [col(P.board.x, P.board.z, 1.2), P.board]);
  piece(world, 'plaza.bench-south', [P.bench.x, P.bench.z], (g) => {
    bench(g, P.bench.x, P.bench.z, Math.PI);
    addFolk(g, { x: P.bench.x, z: P.bench.z, rot: Math.PI, seat: 0.5, pose: 'read', look: { hair: 'long', item: 'paper' } });
  });
  piece(world, 'plaza.mailbox', [P.mailbox.x, P.mailbox.z], (g) => mailbox(g, P.mailbox.x, P.mailbox.z, deg(-115)));
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
    piece(world, `plaza.tree-${name}`, [x, z], (g) => roundTree(g, x, z, s), [col(x, z, 1.0)]);
  }
  for (const [x, z] of [[1.8, 3.4], [2.3, 3.0], [-3.2, -1.6], [-3.4, -2.2], [3.1, -2.6], [2.2, -3.4]]) pigeon(world, x * 2.2, FZ + z * 2.2);

  // ---- folks, each busy with something (the ones at a bench, the café, the
  // stall or the notice board belong to that piece, above)
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
  cat(world, -16.5, 21.5, 2.4);            // between the library's garden and the café

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
