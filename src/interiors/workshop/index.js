// The lighthouse keeper's workshop, inside: the Ideas district.
import * as THREE from 'three';
import { M, stamp, mesh, box, cyl } from '../kit.js';
import { folk } from '../folks.js';
import { picture, gear, pegboard } from '../decor.js';
import { swingSign } from '../life.js';
import { D, BACK, LEFT, shell, noteBoard } from './common.js';

export function ideas(scene, rand) {
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
    station: { point: new THREE.Vector3(-1, 0, -D / 2 + 1.8), label: 'Look at the idea wall' }
  };
}
