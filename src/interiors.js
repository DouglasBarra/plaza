// Walk-in interiors. Each building is a room you enter through its door:
// an open-top diorama in third person (the walls facing the camera are cut
// away), a closed room in first person. Each room has one "station", the
// object you use to open that district's app.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, stamp, boxGeo, mesh, box, cyl, windowAt, folk, roundTree } from './world.js';
import { swapModel } from './models.js';
import { placeRoomFinds } from './finds.js';

const W = 12, D = 10, H = 4.2, T = 0.3;

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
  scene.add(ambient, sun);
  return { ambient, sun };
}

function chair(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 0.5, 0.06, 0.5, M.planks, 0, 0.48, 0);
  box(g, 0.5, 0.6, 0.06, M.planks, 0, 0.8, -0.22);
  for (const lx of [-0.2, 0.2]) for (const lz of [-0.2, 0.2]) box(g, 0.05, 0.46, 0.05, M.white, lx, 0.23, lz);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'chair'));
}

function desk(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 2.4, 0.1, 1.1, M.planks, 0, 0.8, 0);
  for (const sx of [-1.05, 1.05]) box(g, 0.25, 0.75, 1.0, M.planks, sx, 0.38, 0);
  box(g, 2.1, 0.6, 0.06, M.planks, 0, 0.45, -0.45);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'desk'));
  return g;
}

function plant(p, x, z) {
  cyl(p, 0.3, 0.24, 0.5, M.planks, x, 0.25, z, 10);
  roundTree(p, x, z, 0.55);
}

// A shelf unit full of books, merged into one mesh so a room of them stays cheap.
function bookshelf(p, x, z, rotY, rand) {
  const g = new THREE.Group();
  const w = 2.2, h = 3.0, d = 0.5;
  box(g, w, 0.08, d, M.planks, 0, h, 0);
  for (const sx of [-w / 2, w / 2]) box(g, 0.08, h, d, M.planks, sx, h / 2, 0);
  box(g, w, h, 0.04, M.planks, 0, h / 2, -d / 2);
  const books = [];
  for (let s = 0; s < 4; s++) {
    const y = 0.1 + s * 0.74;
    box(g, w, 0.05, d, M.planks, 0, y, 0);
    let bx = -w / 2 + 0.1;
    while (bx < w / 2 - 0.2) {
      const bw = 0.07 + rand() * 0.08, bh = 0.38 + rand() * 0.24;
      if (rand() > 0.12) books.push(boxGeo(bw, bh, 0.32).translate(bx + bw / 2, y + 0.03 + bh / 2, 0.04));
      bx += bw + 0.01;
    }
  }
  if (books.length) g.add(mesh(mergeGeometries(books), M.white));
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bookshelf'));
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
  // ---------- Town hall: the ToDos office ----------
  todo(scene, rand) {
    const cutaway = shell(scene, M.bricks, M.floor);
    const board = noteBoard(scene, 0, 2.3, -D / 2 + 0.12, 4.2, 2.2, stamp.todo);
    desk(scene, 3.6, -1.6, -Math.PI / 2);
    chair(scene, 4.6, -1.6, -Math.PI / 2);
    folk(scene, 4.6, -1.6, -Math.PI / 2, { pose: 'read', seat: 0.48, look: { hat: 'bowler', glasses: true, item: 'paper' } });
    box(scene, 0.5, 0.12, 0.4, M.white, 3.4, 0.9, -2.0);
    box(scene, 0.45, 0.06, 0.35, M.white, 3.5, 0.99, -1.95).rotation.y = 0.2;
    cyl(scene, 0.04, 0.04, 0.5, M.white, 3.3, 1.1, -0.8, 6);
    mesh(new THREE.ConeGeometry(0.25, 0.25, 10), M.white, 3.3, 1.4, -0.8, scene);
    for (const z of [-4.2, -3.4]) {
      box(scene, 0.7, 1.4, 0.7, M.white, -5.5, 0.7, z);
      for (const y of [0.35, 0.8, 1.2]) box(scene, 0.04, 0.05, 0.25, M.white, -5.13, y, z);
    }
    box(scene, 0.6, 2.3, 0.45, M.planks, -5.6, 1.15, 2.4);
    const face = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 20), [M.white, M.clock, M.white], -5.36, 1.9, 2.4, scene);
    face.rotation.z = -Math.PI / 2;
    plant(scene, -5.2, 4.2);
    plant(scene, 5.2, 4.2);
    chair(scene, -2.6, 2.8, Math.PI / 2);
    chair(scene, -2.6, 3.6, Math.PI / 2);
    return {
      cutaway,
      colliders: [{ x: 3.6, z: -1.6, r: 1.3 }, { x: -5.5, z: -3.8, r: 0.9 }, { x: -5.6, z: 2.4, r: 0.5 }, { x: -5.2, z: 4.2, r: 0.5 }, { x: 5.2, z: 4.2, r: 0.5 }, { x: -2.6, z: 3.2, r: 0.7 }],
      station: { point: new THREE.Vector3(0, 0, -D / 2 + 1.8), label: 'Open the task board' },
      setNotes: board.setNotes,
    };
  },

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
    return {
      cutaway,
      colliders: [{ x: 0.6, z: 0.6, r: 1.8 }, { x: 4.4, z: 2.6, r: 0.6 }, { x: 5.2, z: 4.2, r: 0.5 }],
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
    cyl(scene, 0.015, 0.015, 1.6, M.white, 0, 3.4, 0, 4);
    const bulb = mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffd21f' }), 0, 2.5, 0, scene);
    bulb.castShadow = false;
    for (const [x, z, s] of [[-4.8, 3.6, 0.9], [-4.0, 4.1, 0.7], [-4.6, 2.7, 0.6]]) box(scene, s, s, s, M.planks, x, s / 2, z).rotation.y = x;
    for (let i = 0; i < 6; i++) mesh(new THREE.IcosahedronGeometry(0.1, 0), M.white, -2 + rand() * 4, 0.1, 1 + rand() * 2, scene);
    folk(scene, 4.2, -0.3, Math.PI, { pose: 'feed', look: { hat: 'cap', glasses: true } });
    return {
      cutaway,
      colliders: [{ x: 4.2, z: -1.2, r: 1.6 }, { x: 3.6, z: 0.2, r: 0.4 }, { x: -4.5, z: 3.5, r: 1.2 }],
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
  const room = INTERIORS[id](scene, rand);
  placeRoomFinds(id, scene);
  return {
    id,
    scene,
    lights,
    ...room,
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.4 },
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.2),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    // where the third-person camera looks from (front-right, above the cut walls)
    cameraOffset: new THREE.Vector3(9, 13, 15),
  };
}
