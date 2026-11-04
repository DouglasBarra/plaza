// The library, inside: the Study district.
import * as THREE from 'three';
import { M, stamp, mesh, box, cyl } from '../kit.js';
import { folk } from '../folks.js';
import { picture, rug, plant, chair, bookshelf, ladder } from '../decor.js';
import { W, D, LEFT, shell } from './common.js';

export function study(scene, rand) {
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
}
