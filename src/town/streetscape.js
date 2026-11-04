// The streets themselves: asphalt with a dashed middle line between the
// crossings, raised sidewalks with curbs round every block, zebra crossings
// at the plaza's street mouths and round the ring, street lamps that glow at
// night with a pool of light under them, trees along the avenues, and the
// tram's track and wire down one street.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, THEMES } from '../ink.js';
import { tex } from '../textures.js';
import { skipND, nightOnly } from '../life.js';
import { PLAZA } from '../plaza/index.js';
import { Bag } from './bag.js';
import { art } from './art.js';
import { SIDEWALK, LINE } from './houses.js';
import { ROAD_PITCH, ROAD_W, EXTENT, GROUND_Y, strip } from './common.js';

const Y0 = GROUND_Y;
const HALF = ROAD_W / 2;
const CURB = 0.15;                       // sidewalks stand this high above the road
export const TRAM_Z = 2 * ROAD_PITCH;    // the tram runs along this street
export const ROAD_SPAN = EXTENT * 1.4;   // roads run on into the fog this far
const LAMP_R = 128;                      // lamps only this close in (beyond, fog)

const inPlaza = (x, z, m = 0) => Math.abs(x) < PLAZA.hx + m && Math.abs(z) < PLAZA.hz + m;

// The rectangle minus the plaza: up to four pieces.
function outsidePlaza(x0, x1, z0, z1) {
  const px0 = -PLAZA.hx, px1 = PLAZA.hx, pz0 = -PLAZA.hz, pz1 = PLAZA.hz;
  if (x1 <= px0 || x0 >= px1 || z1 <= pz0 || z0 >= pz1) return [[x0, x1, z0, z1]];
  const out = [];
  if (z0 < pz0) out.push([x0, x1, z0, pz0]);
  if (z1 > pz1) out.push([x0, x1, pz1, z1]);
  const mz0 = Math.max(z0, pz0), mz1 = Math.min(z1, pz1);
  if (x0 < px0) out.push([x0, px0, mz0, mz1]);
  if (x1 > px1) out.push([px1, x1, mz0, mz1]);
  return out.filter(([a, b, c, d]) => b - a > 0.01 && d - c > 0.01);
}

export function buildStreetscape(town, blocks, parkLamps) {
  const road = new Bag(), zebra = new Bag(), paving = new Bag(), curb = new Bag(), rails = new Bag(), wire = new Bag();
  const lines = [];
  for (let c = -4 * ROAD_PITCH; c <= 4 * ROAD_PITCH; c += ROAD_PITCH) lines.push(c);
  const yr = Y0 + 0.03;
  // a stretch of road from a to b along one axis, at c on the other
  const stretch = (alongZ, c, a, b, dashed) => {
    const u = (v) => (dashed ? v * 0.25 : 0.2); // 0.2: a stretch of the tile with no dash
    if (alongZ) road.quad([c - HALF, yr, a], [c + HALF, yr, a], [c + HALF, yr, b], [c - HALF, yr, b], [0, u(-a)], [1, u(-a)], [1, u(-b)], [0, u(-b)], [0, 1, 0]);
    else road.quad([a, yr, c - HALF], [a, yr, c + HALF], [b, yr, c + HALF], [b, yr, c - HALF], [0, u(a)], [1, u(a)], [1, u(b)], [0, u(b)], [0, 1, 0]);
  };
  const nodes = [];
  for (let k = -6 * ROAD_PITCH; k <= 6 * ROAD_PITCH; k += ROAD_PITCH) nodes.push(k);
  for (const c of lines) {
    for (const alongZ of [true, false]) {
      const edge = alongZ ? PLAZA.hz : PLAZA.hx;
      for (let i = 0; i + 1 < nodes.length; i++) {
        const a = nodes[i] + HALF, b = nodes[i + 1] - HALF;
        if (c === 0 && a < edge && b > -edge) {
          // the stub between the plaza's edge and the crossing just outside it
          if (b > edge) stretch(alongZ, c, edge, b, false);
          if (a < -edge) stretch(alongZ, c, a, -edge, false);
          continue;
        }
        stretch(alongZ, c, Math.max(a, -ROAD_SPAN), Math.min(b, ROAD_SPAN), true);
      }
    }
    // the crossings themselves, plain asphalt
    for (const k of nodes) if (!(c === 0 && k === 0) && Math.abs(k) < ROAD_SPAN) stretch(true, c, k - HALF, k + HALF, false);
  }

  // zebra crossings on every arm of the crossings round the plaza
  const yz = Y0 + 0.036;
  const zebraAt = (alongZ, c, a, b) => {
    if (alongZ) zebra.quad([c - HALF + 0.2, yz, a], [c + HALF - 0.2, yz, a], [c + HALF - 0.2, yz, b], [c - HALF + 0.2, yz, b], [0, 0], [ROAD_W - 0.4, 0], [ROAD_W - 0.4, 1], [0, 1], [0, 1, 0]);
    else zebra.quad([a, yz, c - HALF + 0.2], [a, yz, c + HALF - 0.2], [b, yz, c + HALF - 0.2], [b, yz, c - HALF + 0.2], [0, 0], [ROAD_W - 0.4, 0], [ROAD_W - 0.4, 1], [0, 1], [0, 1, 0]);
  };
  const P = ROAD_PITCH;
  for (const [nx, nz] of [[0, P], [P, 0], [-P, 0], [0, -P], [P, P], [-P, P], [P, -P], [-P, -P]]) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ax = nx + dx * (HALF + 0.6), az = nz + dz * (HALF + 0.6);
      if (inPlaza(ax + dx * 3, az + dz * 3)) continue;
      if (dx) zebraAt(false, nz, ax, ax + dx * 3); else zebraAt(true, nx, az, az + dz * 3);
    }
  }

  // sidewalks: a raised ring of paving round every block, with curbs
  const ys = Y0 + CURB;
  const slab = (x0, x1, z0, z1) => {
    for (const [a, b, c, d] of outsidePlaza(x0, x1, z0, z1)) {
      paving.floor(a, b, c, d, ys, 1);
      curb.box(a, b, Y0, ys, c, d, 'yY');
    }
  };
  for (const bl of blocks) {
    const { x0, x1, z0, z1 } = bl;
    const o = SIDEWALK;
    slab(x0 - o, x1 + o, z1, z1 + o);
    slab(x0 - o, x1 + o, z0 - o, z0);
    slab(x0 - o, x0, z0, z1);
    slab(x1, x1 + o, z0, z1);
  }
  // round the plaza too: the thin strip between its edge and the ring road
  for (const [bi, bj] of [[-1, -1], [-1, 0], [0, -1], [0, 0]]) {
    const x0 = bi * P + LINE, x1 = (bi + 1) * P - LINE, z0 = bj * P + LINE, z1 = (bj + 1) * P - LINE, o = SIDEWALK;
    slab(x0 - o, x1 + o, z1, z1 + o); slab(x0 - o, x1 + o, z0 - o, z0);
    slab(x0 - o, x0, z0, z1); slab(x1, x1 + o, z0, z1);
  }

  // the tram: a track down the middle of its street, and a wire overhead
  const yt = Y0 + 0.045, TX = EXTENT - 10;
  rails.quad([-TX, yt, TRAM_Z - 0.9], [TX, yt, TRAM_Z - 0.9], [TX, yt, TRAM_Z + 0.9], [-TX, yt, TRAM_Z + 0.9], [0, -TX], [0, TX], [1, TX], [1, -TX], [0, 1, 0]);
  wire.box(-TX, TX, Y0 + 5.9, Y0 + 5.94, TRAM_Z - 0.02, TRAM_Z + 0.02, '');
  for (let x = -TX + 10; x < TX; x += 35) {
    if (Math.abs(((x % P) + P) % P - P / 2) > P / 2 - 4) continue; // not in a crossing
    wire.box(x - 0.08, x + 0.08, Y0, Y0 + 6.5, TRAM_Z + HALF + 0.35, TRAM_Z + HALF + 0.51);
    wire.box(x - 0.03, x + 0.03, Y0 + 6.1, Y0 + 6.16, TRAM_Z - 0.02, TRAM_Z + HALF + 0.4);
  }

  // the tram stop: a shelter with a bench, on the north sidewalk
  const furniture = new Bag();
  const sx = 20, sz = TRAM_Z - HALF - 1.6;
  furniture.box(sx - 1.9, sx + 1.9, Y0 + 2.5, Y0 + 2.62, sz - 0.9, sz + 0.75, '');
  for (const px of [sx - 1.8, sx + 1.8]) furniture.box(px - 0.05, px + 0.05, ys, Y0 + 2.5, sz - 0.75, sz - 0.65);
  furniture.box(sx - 1.8, sx + 1.8, Y0 + 0.9, Y0 + 2.3, sz - 0.74, sz - 0.68, '');
  furniture.box(sx - 1.3, sx + 1.3, Y0 + 0.6, Y0 + 0.66, sz - 0.6, sz - 0.2);
  furniture.box(sx + 2.6, sx + 2.66, ys, Y0 + 2.8, sz + 0.3, sz + 0.36);
  furniture.box(sx + 2.33, sx + 2.93, Y0 + 2.8, Y0 + 3.4, sz + 0.3, sz + 0.37, '');

  const mk = (bag, mat) => { const m = bag.mesh(mat); if (m) town.add(m); return m; };
  const roadTex = tex.roadZ();
  mk(road, toon('#ffffff', roadTex));
  mk(zebra, toon('#ffffff', art.zebra()));
  mk(paving, toon('#ffffff', tex.paving()));
  mk(curb, toon('#ffffff', tex.stone()));
  mk(rails, toon('#ffffff', art.rails()));
  mk(wire, toon('#3a3a3a'));
  mk(furniture, toon());

  // ---------- street lamps, with pools of light at night ----------
  const lamps = [];
  const off = HALF + 0.45;
  for (const c of lines) {
    for (let k = -5; k < 5; k++) {
      for (const [t, side] of [[13.5, -1], [26.5, 1]]) {
        const a = k * P + t;
        for (const alongZ of [true, false]) {
          const x = alongZ ? c + side * off : a, z = alongZ ? a : c + side * off;
          if (Math.hypot(x, z) > LAMP_R || inPlaza(x, z, 1.8)) continue;
          if (!alongZ && c === TRAM_Z) continue; // the tram's poles light that street
          lamps.push({ x, z, rot: alongZ ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : (side > 0 ? Math.PI : 0) });
        }
      }
    }
  }
  for (const [x, z] of parkLamps) lamps.push({ x, z, rot: 0 });
  const lampMeshes = buildLamps(town, lamps);

  // ---------- trees along the avenues ----------
  const trees = [];
  const avenue = (alongZ, c, sides) => {
    for (let k = -5; k < 5; k++) {
      for (const t of [6.5, 20, 33.5]) {
        const a = k * P + t;
        for (const side of sides) {
          const x = alongZ ? c + side * (HALF + 0.55) : a, z = alongZ ? a : c + side * (HALF + 0.55);
          if (Math.hypot(x, z) > 150 || inPlaza(x, z, 2)) continue;
          trees.push({ x, z, s: 0.85 + ((k * 7 + t) % 5) * 0.04, rot: a });
        }
      }
    }
  };
  avenue(true, 0, [-1, 1]); avenue(false, 0, [-1, 1]);
  // the ring round the plaza: on the town side only
  avenue(true, P, [1]); avenue(true, -P, [-1]); avenue(false, P, [1]); avenue(false, -P, [-1]);
  return { lamps: lampMeshes, streetTrees: trees };
}

// The lamps: one instanced post, one instanced lantern (it glows at night)
// and one instanced pool of light on the ground.
const glowMat = new THREE.MeshBasicMaterial({ color: '#fff1b8' });
const poolMat = new THREE.MeshBasicMaterial({ color: '#ffe38a', transparent: true, opacity: 0.15, depthWrite: false });

function buildLamps(town, lamps) {
  const post = mergeGeometries(strip([
    new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8).translate(0, 0.25, 0),
    new THREE.CylinderGeometry(0.06, 0.09, 3.6, 6).translate(0, 2.3, 0),
    new THREE.CylinderGeometry(0.12, 0.08, 0.15, 6).translate(0, 4.1, 0),
    new THREE.ConeGeometry(0.36, 0.38, 4).rotateY(Math.PI / 4).translate(0, 4.83, 0),
    new THREE.SphereGeometry(0.06, 6, 4).translate(0, 5.06, 0),
    new THREE.BoxGeometry(0.38, 0.05, 0.38).translate(0, 4.2, 0),
  ]));
  const head = new THREE.BoxGeometry(0.3, 0.42, 0.3).translate(0, 4.42, 0);
  const pool = new THREE.CircleGeometry(3.4, 20).rotateX(-Math.PI / 2).translate(0, CURB + 0.03, 0);
  const at = (geo, mat, shadows) => {
    const m = new THREE.InstancedMesh(geo, mat, lamps.length);
    const o = new THREE.Object3D();
    lamps.forEach((l, i) => { o.position.set(l.x, Y0, l.z); o.rotation.set(0, l.rot, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = shadows; m.receiveShadow = true;
    m.computeBoundingSphere();
    town.add(m);
    return m;
  };
  at(post, toon(), true);
  const dayGlass = new THREE.MeshBasicMaterial({ color: THEMES.day.deep });
  const heads = at(head, dayGlass, false);
  const pools = at(pool, poolMat, false);
  pools.visible = false;
  pools.userData.keep = true;
  nightOnly.push(pools);
  skipND.push(pools);
  return {
    setNight(on) { heads.material = on ? glowMat : dayGlass; },
  };
}
