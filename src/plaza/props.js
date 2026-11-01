// Street furniture and plants. Each builder adds one object to parent `p`;
// most can be swapped for a hand-made model of the same name (models.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, stamp, mesh, box, cyl, cylGeo } from '../kit.js';
import { swapModel } from '../models.js';
import { fountainWater, steam, sway, swingSign, lampLight } from '../life.js';
import { signBoard } from '../details.js';

export function crate(p, x, y, z, rotY = 0, size = 0.6) {
  const g = new THREE.Group();
  box(g, size, size, size, M.planks, 0, size / 2, 0);
  g.position.set(x, y, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'crate'));
}

export function pine(p, x, z, s = 1) {
  const g = new THREE.Group();
  cyl(g, 0.1, 0.14, 0.6, M.white, 0, 0.3, 0, 6);
  for (let i = 0; i < 3; i++) {
    const c = mesh(new THREE.ConeGeometry((1.0 - i * 0.25), 1.1, 7), M.white, 0, 0.9 + i * 0.6, 0, g);
    c.material = M.white;
  }
  g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = x * 3.1;
  p.add(swapModel(g, 'tree-pine'));
  sway(g);
  return g;
}

export function roundTree(p, x, z, s = 1) {
  const g = new THREE.Group();
  cyl(g, 0.1, 0.15, 1.0, M.white, 0, 0.5, 0, 6);
  const crown = mesh(new THREE.IcosahedronGeometry(0.9, 0), M.white, 0, 1.6, 0, g);
  crown.rotation.set(x, z, 0);
  g.position.set(x, 0, z); g.scale.setScalar(s);
  p.add(swapModel(g, 'tree-round'));
  sway(g, 0.03);
  return g;
}

export function bench(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 1.5, 0.08, 0.45, M.planks, 0, 0.45, 0);
  box(g, 1.5, 0.4, 0.06, M.planks, 0, 0.75, -0.22);
  for (const lx of [-0.6, 0.6]) box(g, 0.08, 0.45, 0.4, M.white, lx, 0.22, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bench'));
  return g;
}

export function lamp(p, x, z) {
  const g = new THREE.Group();
  cyl(g, 0.12, 0.16, 0.2, M.white, 0, 0.1, 0, 8);
  cyl(g, 0.05, 0.05, 2.4, M.white, 0, 1.3, 0, 6);
  const head = box(g, 0.32, 0.4, 0.32, M.white, 0, 2.6, 0);
  mesh(new THREE.ConeGeometry(0.3, 0.25, 4), M.white, 0, 2.92, 0, g).rotation.y = Math.PI / 4;
  const light = lampLight(g, head);
  g.position.set(x, 0, z);
  // in a lamp model, the part named "glow" is the one that lights up
  p.add(swapModel(g, 'lamp', (model) => {
    light.head = model.getObjectByName('glow') || null;
    if (light.head) light.day = light.head.material;
  }));
}

export function fountain(p) {
  const g = new THREE.Group();
  cyl(g, 2.3, 2.4, 0.6, M.stone, 0, 0.3, 0, 24);
  cyl(g, 2.0, 2.0, 0.05, M.water, 0, 0.5, 0, 24);
  cyl(g, 0.3, 0.4, 1.5, M.stone, 0, 1.2, 0, 10);
  cyl(g, 0.9, 0.45, 0.3, M.white, 0, 2.0, 0, 16);
  mesh(new THREE.SphereGeometry(0.22, 10, 8), M.white, 0, 2.35, 0, g);
  fountainWater(g);
  p.add(g);
  return g;
}

export function bollard(p, x, z) {
  cyl(p, 0.14, 0.17, 0.8, M.white, x, 0.4, z, 8);
  mesh(new THREE.SphereGeometry(0.15, 8, 6), M.white, x, 0.82, z, p);
}

// A whole row of bollards as one mesh: the plaza's edge has well over a
// hundred, and one draw call is much cheaper than hundreds.
export function bollards(p, spots) {
  const post = cylGeo(0.14, 0.17, 0.8, 8).toNonIndexed(), cap = new THREE.SphereGeometry(0.15, 8, 6).toNonIndexed();
  cap.deleteAttribute('uv'); post.deleteAttribute('uv');
  const parts = spots.flatMap(([x, z]) => [post.clone().translate(x, 0.4, z), cap.clone().translate(x, 0.82, z)]);
  return mesh(mergeGeometries(parts), M.white, 0, 0, 0, p);
}

export function planter(p, x, z, flowers = 'white') {
  const g = new THREE.Group();
  box(g, 1.6, 0.6, 1.6, M.planks, 0, 0.3, 0);
  for (let i = 0; i < 7; i++) {
    const fx = (Math.random() - 0.5) * 1.1, fz = (Math.random() - 0.5) * 1.1;
    cyl(g, 0.02, 0.02, 0.35, M.white, fx, 0.75, fz, 3);
    mesh(new THREE.SphereGeometry(0.11, 6, 5), flowers === 'white' ? M.white : stamp[flowers], fx, 0.95, fz, g);
  }
  g.position.set(x, 0, z);
  p.add(swapModel(g, 'planter'));
}

export function cafe(p, x, z) {
  for (const [tx, tz] of [[-1.3, -0.8], [1.3, 0.6]]) {
    const g = new THREE.Group();
    cyl(g, 0.5, 0.5, 0.06, M.white, 0, 0.75, 0, 14);
    cyl(g, 0.05, 0.05, 0.72, M.white, 0, 0.37, 0, 6);
    cyl(g, 0.03, 0.03, 1.6, M.white, 0, 1.5, 0, 4);
    mesh(new THREE.ConeGeometry(1.1, 0.5, 8), M.stripes, 0, 2.35, 0, g);
    for (const a of [0, Math.PI]) box(g, 0.4, 0.45, 0.4, M.planks, Math.cos(a) * 0.85, 0.22, Math.sin(a) * 0.85);
    mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 8), M.white, 0.15, 0.84, 0, g);
    steam(g, 0.15, 0.93, 0);
    g.position.set(x + tx, 0, z + tz);
    p.add(swapModel(g, 'cafe-table'));
  }
}

export function stall(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 3, 0.9, 1.2, M.planks, 0, 0.45, 0);
  for (const sx of [-1.4, 1.4]) for (const sz of [-0.5, 0.5]) cyl(g, 0.05, 0.05, 2.2, M.white, sx, 1.1, sz, 5);
  const roof = box(g, 3.4, 0.08, 1.8, M.stripes, 0, 2.25, 0.1);
  roof.rotation.x = 0.18;
  for (let i = 0; i < 5; i++) box(g, 0.45, 0.3, 0.45, M.planks, -1.1 + i * 0.55, 1.05, 0.2);
  for (let i = 0; i < 9; i++) mesh(new THREE.SphereGeometry(0.1, 6, 5), M.white, -1.2 + (i % 5) * 0.55, 1.28, 0.1 + (i > 4 ? 0.18 : 0), g);
  // a sign swinging from the front of the awning
  const pivot = new THREE.Group();
  pivot.position.set(0, 2.05, 0.95);
  for (const s of [-0.45, 0.45]) cyl(pivot, 0.012, 0.012, 0.3, M.white, s, -0.15, 0, 3);
  signBoard(pivot, 0, -0.45, 0, 1.3, 0.34, 'Fresh fruit');
  pivot.userData.keep = true;
  g.add(pivot);
  swingSign(pivot);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'stall'));
}

export function bike(p, x, z, rotY) {
  const g = new THREE.Group();
  const wheel = new THREE.TorusGeometry(0.32, 0.035, 6, 18);
  for (const wx of [-0.5, 0.5]) mesh(wheel, M.white, wx, 0.35, 0, g);
  const bar = (x1, y1, x2, y2) => {
    const m = cyl(g, 0.025, 0.025, Math.hypot(x2 - x1, y2 - y1), M.white, (x1 + x2) / 2, (y1 + y2) / 2, 0, 4);
    m.rotation.z = Math.atan2(x1 - x2, y2 - y1);
  };
  bar(-0.5, 0.35, 0, 0.75); bar(0, 0.75, 0.5, 0.35); bar(0, 0.75, -0.1, 0.35); bar(-0.1, 0.35, -0.5, 0.35);
  bar(0.45, 0.6, 0.5, 0.95); box(g, 0.25, 0.05, 0.12, M.white, -0.05, 0.82, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'bike'));
}

export function noticeboard(p, x, z, rotY) {
  const g = new THREE.Group();
  for (const sx of [-0.9, 0.9]) box(g, 0.12, 1.9, 0.12, M.white, sx, 0.95, 0);
  box(g, 2, 1.1, 0.08, M.planks, 0, 1.3, 0);
  for (const [nx, ny, w, h] of [[-0.5, 1.45, 0.5, 0.6], [0.15, 1.2, 0.45, 0.5], [0.6, 1.5, 0.35, 0.4]]) box(g, w, h, 0.03, M.white, nx, ny, 0.06);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'noticeboard'));
}

export function mailbox(p, x, z, rotY) {
  const g = new THREE.Group();
  box(g, 0.1, 1.0, 0.1, M.white, 0, 0.5, 0);
  box(g, 0.45, 0.35, 0.6, M.white, 0, 1.15, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  p.add(swapModel(g, 'mailbox'));
}
