// Walk-in interiors. Each building is a room you enter through its door:
// an open-top diorama in third person (the walls facing the camera are cut
// away), a closed room in first person. Each room has one "station", the
// object you use to open that district's app.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, stamp, boxGeo, mesh, box, cyl, windowAt, folk, roundTree } from './world.js';
import { swapModel } from './models.js';
import { placeRoomFinds } from './finds.js';
import { buildTownHall } from './townhall.js';
import { clockHands } from './details.js';
import { steam, swingSign } from './life.js';
import { picture, wallShelf, rug, coatRack, ladder, gear, pegboard, typewriter, sack, chair, desk, plant, bookshelf } from './decor.js';

const W = 12, D = 10, H = 4.2, T = 0.3;
const BACK = -D / 2 + 0.04, LEFT = -W / 2 + 0.04; // just in front of the back and left walls

// A wall clock facing +x on the left wall, telling the real time.
function wallClock(p, z, y, r = 0.32) {
  const face = mesh(new THREE.CylinderGeometry(r, r, 0.05, 24), [M.white, M.clock, M.white], LEFT + 0.03, y, z, p);
  face.rotation.z = -Math.PI / 2;
  const hands = new THREE.Group();
  hands.position.set(LEFT + 0.07, y, z);
  hands.rotation.y = Math.PI / 2;
  p.add(hands);
  clockHands(hands, 0, 0, 0, r * 0.9);
}

function shell(scene, wallMat, floorMat) {
  const cutaway = [];
  const cut = (m) => { cutaway.push(m); return m; };
  box(scene, W + T * 2, 0.3, D + T * 2, floorMat, 0, -0.15, 0);
  box(scene, W + T * 2, H, T, wallMat, 0, H / 2, -D / 2 - T / 2);          // back
  box(scene, T, H, D, wallMat, -W / 2 - T / 2, H / 2, 0);                  // left
  cut(box(scene, T, H, D, wallMat, W / 2 + T / 2, H / 2, 0));              // right
  const seg = (W - 2) / 2;
  cut(box(scene, seg, H, T, wallMat, -(W / 2 + 1) / 2, H / 2, D / 2 + T / 2)); // front, left of door
  cut(box(scene, seg, H, T, wallMat, (W / 2 + 1) / 2, H / 2, D / 2 + T / 2));  // front, right of door
  cut(box(scene, 2, H - 2.5, T, wallMat, 0, 2.5 + (H - 2.5) / 2, D / 2 + T / 2));
  const ceiling = cut(box(scene, W + T * 2, 0.2, D + T * 2, M.white, 0, H + 0.1, 0));
  ceiling.castShadow = false;
  // the way out: a door frame and a doormat that stay visible in the cutaway
  for (const x of [-1.08, 1.08]) box(scene, 0.16, 2.5, 0.4, M.white, x, 1.25, D / 2 + T / 2);
  box(scene, 2.32, 0.16, 0.4, M.white, 0, 2.5, D / 2 + T / 2);
  box(scene, 1.8, 0.04, 1.0, M.dirt, 0, 0.02, D / 2 - 0.7);
  // windows
  for (const x of [-3.5, 3.5]) windowAt(scene, x, 2.3, -D / 2 + 0.04, 1.3, 1.5);
  for (const z of [-2, 2]) windowAt(scene, -W / 2 + 0.04, 2.3, z, 1.3, 1.5, Math.PI / 2);
  return cutaway;
}

function lightRoom(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 1);
  const sun = new THREE.DirectionalLight(0xffffff, Math.PI);
  sun.position.set(-6, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(ambient, sun, sun.target);
  return { ambient, sun };
}

// Paper notes pinned to a board; the count can change live.
function noteBoard(p, x, y, z, w, h, pinMat) {
  const g = new THREE.Group();
  box(g, w + 0.2, h + 0.2, 0.1, M.planks, 0, 0, 0);
  box(g, w, h, 0.12, M.dirt, 0, 0, 0.02);
  const notes = new THREE.Group();
  g.add(notes);
  g.position.set(x, y, z);
  p.add(g);
  const slots = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) slots.push([-w / 2 + 0.5 + c * (w - 1) / 4, h / 2 - 0.55 - r * (h / 2 - 0.1)]);
  return {
    group: g,
    setNotes(n) {
      notes.clear();
      slots.slice(0, Math.min(n, slots.length)).forEach(([nx, ny], i) => {
        const note = box(notes, 0.5, 0.6, 0.02, M.white, nx, ny - 0.15, 0.1);
        note.rotation.z = ((i * 37) % 9 - 4) * 0.025;
        mesh(new THREE.SphereGeometry(0.05, 8, 6), pinMat, nx, ny + 0.1, 0.12, notes);
      });
    },
  };
}

const INTERIORS = {
  // ---------- Town hall: the ToDos district (see townhall.js) ----------
  todo: buildTownHall,

  // ---------- Bank: Finance ----------
  finance(scene) {
    const cutaway = shell(scene, M.stone, M.paving);
    box(scene, 7, 1.1, 0.8, M.stone, 0, 0.55, -2.4);
    box(scene, 7.2, 0.1, 1.0, M.white, 0, 1.15, -2.4);
    for (const x of [-3.4, -1.15, 1.15, 3.4]) box(scene, 0.08, 1.2, 0.08, M.white, x, 1.8, -2.4);
    box(scene, 7, 0.1, 0.12, M.white, 0, 2.4, -2.4);
    for (const [x, n] of [[-1.8, 4], [-1.5, 6], [2.2, 3]]) for (let i = 0; i < n; i++) cyl(scene, 0.12, 0.12, 0.05, M.white, x, 1.23 + i * 0.05, -2.3, 12);
    folk(scene, 0, -3.4, 0, { pose: 'vendor', look: { hat: 'cap' } });
    folk(scene, -2.6, -3.5, 0.2, { pose: 'chat', look: { hair: 'bun', glasses: true } });
    const vault = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 28), stamp.finance, 3.6, 1.7, -D / 2 + 0.2, scene);
    vault.rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) box(scene, 1.6, 0.1, 0.1, M.white, 3.6, 1.7, -D / 2 + 0.42).rotation.z = (i * Math.PI) / 3;
    for (const x of [1.8, 3.8]) for (const z of [0.6, 2.6]) cyl(scene, 0.07, 0.1, 1.0, M.white, x, 0.5, z, 8);
    for (const x of [1.8, 3.8]) box(scene, 0.04, 0.04, 2, M.white, x, 0.9, 1.6);
    plant(scene, -5.2, 4.2);
    plant(scene, 5.2, -4.2);
    wallClock(scene, -3.8, 3.0);
    picture(scene, LEFT, 2.4, 0, 1.1, 1.3, Math.PI / 2, 'portrait');
    picture(scene, LEFT, 2.4, 4.0, 1.0, 0.9, Math.PI / 2, 'chart');
    rug(scene, 0, 3.3, 3, 1.8);
    box(scene, 0.4, 0.06, 0.3, M.white, 0.6, 1.23, -2.3).rotation.y = 0.2;
    sack(scene, -1.0, -4.0);
    sack(scene, -0.45, -4.3, 0.8);
    // customers queuing between the ropes
    folk(scene, 2.8, 0.3, Math.PI, { pose: 'idle', look: { hat: 'top', backpack: false } });
    folk(scene, 2.8, 1.4, Math.PI, { pose: 'look', look: { hair: 'long', dress: true } });
    return {
      cutaway,
      colliders: [-3, -1.5, 0, 1.5, 3].map((x) => ({ x, z: -2.4, r: 0.85 })).concat([{ x: 2.8, z: 1.6, r: 1.3 }, { x: -5.2, z: 4.2, r: 0.5 }]),
      station: { point: new THREE.Vector3(0, 0, -1.2), label: 'Talk to the teller' },
    };
  },

  // ---------- Library: Study ----------
  study(scene, rand) {
    const cutaway = shell(scene, M.planks, M.floor);
    for (const x of [-4.6, -2.2, 2.2, 4.6]) bookshelf(scene, x, -D / 2 + 0.35, 0, rand);
    for (const z of [-1.0, 1.4]) bookshelf(scene, -W / 2 + 0.35, z, Math.PI / 2, rand);
    box(scene, 3, 0.1, 1.5, M.planks, 0.6, 0.85, 0.6);
    for (const x of [-0.6, 1.8]) for (const z of [0.05, 1.15]) box(scene, 0.1, 0.8, 0.1, M.white, x, 0.4, z);
    for (const [x, z, r] of [[-0.3, -0.4, 0], [1.5, -0.4, 0], [-0.3, 1.6, Math.PI], [1.5, 1.6, Math.PI]]) chair(scene, x, z, r);
    cyl(scene, 0.03, 0.03, 0.55, M.white, 1.7, 1.18, 0.5, 6);
    mesh(new THREE.ConeGeometry(0.3, 0.3, 12), stamp.study, 1.7, 1.5, 0.5, scene);
    box(scene, 0.7, 0.04, 0.5, M.white, 0.2, 0.92, 0.7).rotation.y = 0.15;
    cyl(scene, 0.05, 0.12, 0.9, M.white, 4.4, 0.45, 2.6, 8);
    mesh(new THREE.IcosahedronGeometry(0.45, 1), M.white, 4.4, 1.3, 2.6, scene);
    folk(scene, 3.4, -3.9, Math.PI, { pose: 'look', look: { hair: 'long' } });
    folk(scene, -0.3, -0.4, 0, { pose: 'read', seat: 0.48, look: { glasses: true, item: 'paper' } });
    plant(scene, 5.2, 4.2);
    rug(scene, 0.6, 0.6, 4.4, 3.2);
    ladder(scene, 4.6, -4.0, 3.1);
    picture(scene, LEFT, 2.4, 3.8, 0.9, 0.7, Math.PI / 2, 'boat');
    // a librarian pacing with a book, a pile of books, an hourglass on the table
    folk(scene, 0, 0, 0, { walk: { path: [[-3.6, -2.7], [2.6, -2.7]], speed: 0.6 }, look: { hair: 'bun', glasses: true, item: 'paper' } });
    for (let i = 0; i < 5; i++) box(scene, 0.5 - i * 0.04, 0.12, 0.35, M.white, -4.6, 0.06 + i * 0.12, 3.6).rotation.y = (i % 2 ? 0.2 : -0.15);
    mesh(new THREE.ConeGeometry(0.08, 0.12, 8), M.white, 1.3, 0.97, 1.0, scene).rotation.x = Math.PI;
    mesh(new THREE.ConeGeometry(0.08, 0.12, 8), M.white, 1.3, 1.09, 1.0, scene);
    return {
      cutaway,
      colliders: [{ x: 0.6, z: 0.6, r: 1.8 }, { x: 4.4, z: 2.6, r: 0.6 }, { x: 5.2, z: 4.2, r: 0.5 }, { x: 4.6, z: -3.8, r: 0.45 }, { x: -4.6, z: 3.6, r: 0.5 }],
      station: { point: new THREE.Vector3(3.0, 0, 0.4), label: 'Open your reading list' },
    };
  },

  // ---------- Lighthouse workshop: Ideas ----------
  ideas(scene, rand) {
    const cutaway = shell(scene, M.planks, M.floor);
    const board = noteBoard(scene, -1, 2.3, -D / 2 + 0.12, 5.2, 2.4, stamp.ideas);
    board.setNotes(10);
    // string between some of the notes: the idea wall
    for (const [x1, y1, x2, y2] of [[-3.0, 3.0, -1.6, 1.9], [-1.6, 1.9, 0.4, 3.0], [0.4, 3.0, 1.6, 1.9]]) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const s = cyl(scene, 0.012, 0.012, len, M.white, (x1 + x2) / 2 - 1, (y1 + y2) / 2, -D / 2 + 0.3, 4);
      s.rotation.z = Math.atan2(x1 - x2, y2 - y1);
    }
    box(scene, 3, 0.12, 1.1, M.planks, 4.2, 0.95, -1.2);
    for (const x of [2.9, 5.5]) for (const z of [-1.6, -0.8]) box(scene, 0.1, 0.9, 0.1, M.white, x, 0.45, z);
    for (const [x, w] of [[3.4, 0.5], [4.2, 0.3], [4.9, 0.6]]) box(scene, w, 0.12, 0.2, M.white, x, 1.07, -1.1 + rand() * 0.3);
    cyl(scene, 0.25, 0.25, 0.7, M.planks, 3.6, 0.35, 0.2, 10);
    // the bulb hangs from a cord and sways a little
    const cord = new THREE.Group();
    cord.position.set(0, 4.2, 0);
    cyl(cord, 0.015, 0.015, 1.6, M.white, 0, -0.8, 0, 4);
    const bulb = mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffd21f' }), 0, -1.7, 0, cord);
    bulb.castShadow = false;
    scene.add(cord);
    swingSign(cord);
    // turning gears, a blueprint, a tool wall, a small cat doodle, a toolbox
    gear(scene, 5.25, 2.5, BACK, 0.42, 0.6);
    gear(scene, 4.72, 3.18, BACK, 0.28, -0.9);
    picture(scene, LEFT, 2.4, 0, 1.4, 1.0, Math.PI / 2, 'blueprint');
    picture(scene, 2.3, 3.2, BACK, 0.5, 0.5, 0, 'cat');
    pegboard(scene, LEFT + 0.02, 2.2, 3.6, Math.PI / 2);
    box(scene, 0.7, 0.35, 0.35, stamp.ideas, 5.2, 0.18, 1.5);
    box(scene, 0.5, 0.05, 0.05, M.white, 5.2, 0.42, 1.5);
    folk(scene, 0, 0, 0, { walk: { path: [[-2.6, 1.9], [2.2, 1.9]], speed: 0.5 }, look: { hat: 'cap', item: 'paper', height: 0.85 } });
    for (const [x, z, s] of [[-4.8, 3.6, 0.9], [-4.0, 4.1, 0.7], [-4.6, 2.7, 0.6]]) box(scene, s, s, s, M.planks, x, s / 2, z).rotation.y = x;
    for (let i = 0; i < 6; i++) mesh(new THREE.IcosahedronGeometry(0.1, 0), M.white, -2 + rand() * 4, 0.1, 1 + rand() * 2, scene);
    folk(scene, 4.2, -0.3, Math.PI, { pose: 'feed', look: { hat: 'cap', glasses: true } });
    return {
      cutaway,
      colliders: [{ x: 4.2, z: -1.2, r: 1.6 }, { x: 3.6, z: 0.2, r: 0.4 }, { x: -4.5, z: 3.5, r: 1.2 }, { x: 5.2, z: 1.5, r: 0.45 }],
      station: { point: new THREE.Vector3(-1, 0, -D / 2 + 1.8), label: 'Look at the idea wall' },
    };
  },
};

export const hasInterior = (id) => id in INTERIORS;

export function buildInterior(id) {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const scene = new THREE.Scene();
  const lights = lightRoom(scene);
  const room = INTERIORS[id](scene, rand, lights);
  placeRoomFinds(id, scene);
  return {
    id,
    scene,
    lights,
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.4 },
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.2),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    // where the third-person camera looks from (front-right, above the cut walls)
    cameraOffset: new THREE.Vector3(9, 13, 15),
    ...room,
  };;
}
