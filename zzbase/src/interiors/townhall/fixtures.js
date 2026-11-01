// The town hall's fireplace and lamps.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M, mesh, box, cyl } from '../../kit.js';
import { dark, flameA, flameB } from './materials.js';

// ---------- the fireplace ----------
export function fireplace(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.PI / 2; // faces +x, into the room
  p.add(g);
  // surround: two brick pillars and a lintel around an open firebox
  for (const sx of [-0.9, 0.9]) box(g, 0.6, 1.3, 0.6, M.bricks, sx, 0.65, 0);
  box(g, 1.2, 0.4, 0.6, M.bricks, 0, 1.1, 0);
  box(g, 1.2, 0.9, 0.08, M.deep, 0, 0.45, -0.26).castShadow = false; // the sooty back
  for (const sx of [-0.58, 0.58]) box(g, 0.04, 0.9, 0.5, M.deep, sx, 0.45, -0.02).castShadow = false; // sooty sides
  box(g, 1.2, 0.04, 0.55, M.stone, 0, 0.02, 0);                       // firebox floor
  // a fire grate
  for (const gx of [-0.35, -0.12, 0.12, 0.35]) box(g, 0.03, 0.14, 0.4, dark, gx, 0.09, 0.02);
  box(g, 2.7, 0.12, 0.8, M.planks, 0, 1.36, 0.08);       // mantel
  box(g, 1.6, 2.9, 0.5, M.bricks, 0, 2.9, -0.05);        // chimney breast
  box(g, 2.6, 0.06, 0.9, M.stone, 0, 0.03, 0.55);        // hearth
  for (const [lx, r] of [[-0.25, 0.1], [0.2, -0.15]]) { const log = cyl(g, 0.08, 0.08, 0.7, M.planks, lx * 0.3, 0.2, 0.02, 8); log.rotation.set(0, r, Math.PI / 2); log.receiveShadow = false; }
  const flames = [];
  for (const [fx, fh, mat] of [[-0.2, 0.42, flameA], [0.05, 0.6, flameA], [0.28, 0.38, flameA], [0, 0.34, flameB], [-0.12, 0.24, flameB]]) {
    const f = mesh(new THREE.ConeGeometry(0.12, 1, 6), mat, fx, 0.28, 0.06, g);
    f.castShadow = false;
    f.userData = { h: fh, x: fx };
    flames.push(f);
  }
  const light = new THREE.PointLight('#ffb070', 0, 7, 1.5);
  light.position.set(0, 0.55, 0.6);
  g.add(light);
  return { group: g, flames, light };
}

// ---------- lamps ----------
export function pendant(p, x, y, z, ceiling) {
  const g = new THREE.Group();
  g.position.set(x, ceiling, z);
  p.add(g);
  const len = ceiling - y;
  cyl(g, 0.012, 0.012, len, dark, 0, -len / 2, 0, 4).castShadow = false;
  const shadeMat = toon();
  shadeMat.side = THREE.DoubleSide;
  const shade = mesh(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), shadeMat, 0, -len, 0, g); // a dome, open below
  shade.castShadow = false;
  cyl(g, 0.045, 0.045, 0.08, dark, 0, -len + 0.34, 0, 6);
  const bulb = mesh(new THREE.SphereGeometry(0.09, 10, 8), M.white, 0, -len + 0.08, 0, g);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe6b0', 0, 9, 1.4);
  light.position.set(0, -len - 0.15, 0);
  g.add(light);
  return { shade, bulb, light };
}

export function chandelier(p, x, y, z, ceiling) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  cyl(g, 0.015, 0.015, ceiling - y, dark, 0, (ceiling - y) / 2, 0, 4).castShadow = false;
  mesh(new THREE.TorusGeometry(0.6, 0.03, 6, 24), dark, 0, 0, 0, g).rotation.x = Math.PI / 2;
  const bulbs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cyl(g, 0.04, 0.03, 0.12, M.white, Math.cos(a) * 0.6, 0.07, Math.sin(a) * 0.6, 6);
    const b = mesh(new THREE.SphereGeometry(0.05, 6, 5), M.white, Math.cos(a) * 0.6, 0.18, Math.sin(a) * 0.6, g);
    b.castShadow = false;
    bulbs.push(b);
  }
  const light = new THREE.PointLight('#ffe6b0', 0, 12, 1.2);
  light.position.y = -0.2;
  g.add(light);
  return { bulbs, light };
}
