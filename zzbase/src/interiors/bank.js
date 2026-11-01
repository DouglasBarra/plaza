// The bank, inside: the Finance district.
import * as THREE from 'three';
import { M, stamp, mesh, box, cyl } from '../kit.js';
import { folk } from '../folks.js';
import { picture, rug, plant, sack } from '../decor.js';
import { D, LEFT, shell, wallClock } from './common.js';

export function finance(scene) {
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
}
