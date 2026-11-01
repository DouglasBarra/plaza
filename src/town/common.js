// What the town's parts share: its size and street grid, one seeded random
// number source (so the town comes out the same every time), and the
// geometry helpers for houses and trees.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { boxGeo, prismGeo } from '../kit.js';

export const ROAD_PITCH = 40;   // a street every 40m, plus the two through the plaza
export const ROAD_W = 5;
export const EXTENT = 176;      // town reaches this far; fog eats it before the end
export const GROUND_Y = -0.4;

let seed = 42;
export const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export function strip(geos) {
  return geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.clearGroups(); return n; });
}

export function houseGeo(w, h, d, roofH, flat = false) {
  const body = boxGeo(w, h, d); body.translate(0, h / 2, 0);
  const roof = flat ? boxGeo(w + 0.3, 0.4, d + 0.3) : prismGeo(w + 0.5, roofH, d + 0.5);
  roof.translate(0, flat ? h + 0.2 : h, 0);
  return mergeGeometries(strip([body, roof]), true);
}

export function pineGeo() {
  const parts = [new THREE.CylinderGeometry(0.15, 0.2, 1, 6).translate(0, 0.5, 0)];
  for (let i = 0; i < 3; i++) parts.push(new THREE.ConeGeometry(1.6 - i * 0.4, 1.8, 7).translate(0, 1.5 + i * 1.0, 0));
  return mergeGeometries(strip(parts));
}

export function roundTreeGeo() {
  return mergeGeometries(strip([
    new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6).translate(0, 0.8, 0),
    new THREE.IcosahedronGeometry(1.5, 0).translate(0, 2.5, 0),
  ]));
}

export function instanced(geo, mat, items, shadows = true) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const o = new THREE.Object3D();
  items.forEach((it, i) => {
    o.position.set(it.x, GROUND_Y, it.z);
    o.rotation.set(0, it.rot || 0, 0);
    o.scale.set(it.s || 1, it.sy || it.s || 1, it.s || 1);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  });
  m.castShadow = shadows;
  m.receiveShadow = true;
  m.computeBoundingSphere();
  return m;
}

export const distToRoad = (v) => Math.abs((((v + ROAD_PITCH / 2) % ROAD_PITCH) + ROAD_PITCH) % ROAD_PITCH - ROAD_PITCH / 2);
