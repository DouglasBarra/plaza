// Small motions in the town: smoke curling out of some chimneys and washing
// swaying on the lines in the back gardens. Both are one instanced mesh.
import * as THREE from 'three';
import { toon } from '../ink.js';

export function buildMotion(town, chimneys, laundry) {
  // ---------- smoke: a few puffs per chimney, rising and swelling ----------
  const PUFFS = 4;
  const smokers = chimneys.filter(([x, , z]) => Math.hypot(x, z) < 115).slice(0, 16);
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), toon(), smokers.length * PUFFS);
  puffs.castShadow = false;
  puffs.frustumCulled = false;
  puffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  town.add(puffs);

  // ---------- washing: cloths hanging from the line ----------
  const cloth = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
  const mat = toon(); mat.side = THREE.DoubleSide;
  const sheets = new THREE.InstancedMesh(cloth, mat, laundry.length);
  sheets.castShadow = false;
  sheets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  town.add(sheets);
  const phase = laundry.map((_, i) => (i * 2.399) % 6.28);

  const o = new THREE.Object3D();
  let boundsSet = false;
  return function animateMotion(time) {
    smokers.forEach(([x, y, z], c) => {
      for (let i = 0; i < PUFFS; i++) {
        const u = (time * 0.18 + i / PUFFS + c * 0.37) % 1;
        o.position.set(x + Math.sin(u * 3 + c) * 0.15 + u * 1.2, y + u * 2.6, z + u * 0.5);
        o.rotation.set(u * 2 + c, u * 3, 0);
        o.scale.setScalar(0.3 * (0.5 + u * 1.5) * Math.min(1, (1 - u) * 4));
        o.updateMatrix();
        puffs.setMatrixAt(c * PUFFS + i, o.matrix);
      }
    });
    // the washing steps between a few positions, like a hand-drawn loop
    const t = Math.floor(time * 6) / 6;
    laundry.forEach((l, i) => {
      o.position.set(l.x, l.y, l.z);
      o.rotation.set(Math.sin(t * 1.7 + phase[i]) * 0.28 + 0.1, l.rot, 0, 'YXZ');
      o.scale.set(l.w, l.h, 1);
      o.updateMatrix();
      sheets.setMatrixAt(i, o.matrix);
    });
    puffs.instanceMatrix.needsUpdate = true;
    sheets.instanceMatrix.needsUpdate = true;
    if (!boundsSet) { sheets.computeBoundingSphere(); boundsSet = true; }
  };
}
