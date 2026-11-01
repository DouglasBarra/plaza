// Shared building kit: materials, stamp colors and shape helpers.
// Units are meters; geometry UVs are in meters so textures keep their scale.
import * as THREE from 'three';
import { toon, deep } from './ink.js';
import { tex } from './textures.js';

export const STAMPS = {
  todo: '#ff6a13',
  finance: '#1fcf6a',
  study: '#19a7ff',
  projects: '#ff2e88',
  ideas: '#ffd21f',
  people: '#9b6bff',
};


// ---------- materials ----------
const M = {
  white: toon(),
  bricks: toon('#ffffff', tex.bricks()),
  stone: toon('#ffffff', tex.stone()),
  paving: toon('#ffffff', tex.paving()),
  shingles: toon('#ffffff', tex.shingles()),
  planks: toon('#ffffff', tex.planks()),
  floor: toon('#ffffff', tex.floorboards()),
  dirt: toon('#ffffff', tex.dirt()),
  grass: toon('#ffffff', tex.grass()),
  water: toon('#ffffff', tex.water()),
  stripes: toon('#ffffff', tex.stripes()),
  roofTiles: toon('#ffffff', tex.roofTiles()),
  clock: toon('#ffffff', tex.clock()),
  deep: deep(),
};
const stamp = {};
for (const [k, c] of Object.entries(STAMPS)) stamp[k] = toon(c);
const glow = new THREE.MeshBasicMaterial({ color: STAMPS.ideas });

// ---------- geometry helpers (UVs in meters so textures keep their scale) ----------
function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * sizes[f][0], uv.getY(k) * sizes[f][1]);
  }
  return g;
}

function cylGeo(rt, rb, h, seg = 16) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  const uv = g.attributes.uv;
  const circ = Math.PI * (rt + rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
  return g;
}

// Triangular prism for gable roofs: triangle in x/y, extruded along z.
function prismGeo(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

const box = (p, w, h, d, mat, x, y, z) => mesh(boxGeo(w, h, d), mat, x, y, z, p);
const cyl = (p, rt, rb, h, mat, x, y, z, seg) => mesh(cylGeo(rt, rb, h, seg), mat, x, y, z, p);

// A box with one material on top and another on the sides.
function slab(p, w, h, d, top, side, x, y, z) {
  return mesh(boxGeo(w, h, d), [side, side, top, side, side, side], x, y, z, p);
}

function windowAt(p, x, y, z, w, h, rotY = 0) {
  const m = box(p, w, h, 0.08, M.deep, x, y, z);
  m.rotation.y = rotY;
  m.castShadow = false;
  return m;
}

function gable(p, w, h, d, mat, y, z = 0, rotY = 0) {
  const r = mesh(prismGeo(w, h, d), mat, 0, y, z, p);
  r.rotation.y = rotY;
  return r;
}

export { M, stamp, glow, boxGeo, cylGeo, prismGeo, mesh, box, cyl, slab, windowAt, gable };
