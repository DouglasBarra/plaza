// Grass along the plaza's edge: low fenced beds of a very light green, laid
// wherever the border is clear of props, trees, yards and street mouths.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, box, slab, stamp } from '../kit.js';
import { toon } from '../ink.js';
import { tex } from '../textures.js';
import { piece } from '../layout.js';

const BED = 0.12;           // how high the stone curb stands
const DEPTH = 2.2;          // how deep a bed is, from the bollards inward
const GAP = 0.9;            // from the plaza's edge to the bed (the bollards stand in it)
const MIN_RUN = 3.5, MAX_RUN = 11, BREAK = 1.4;

const lawn = toon('#e8f6dc', tex.grass());
const blade = toon('#ffffff');

// a deterministic random stream
const seeded = (n) => () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296);

// tufts of three blades over a bed of w by d
function tufts(w, d, seed) {
  const r = seeded(seed), parts = [];
  const count = Math.round(w * d * 7);
  for (let i = 0; i < count; i++) {
    const x = (r() - 0.5) * (w - 0.3), z = (r() - 0.5) * (d - 0.3), h = 0.14 + r() * 0.14;
    for (let k = 0; k < 3; k++) {
      const g = new THREE.ConeGeometry(0.024, h, 3, 1);
      g.translate(0, h / 2, 0);
      g.rotateZ((k - 1) * 0.35 + (r() - 0.5) * 0.2);
      g.rotateY(r() * 6.28);
      g.translate(x + (r() - 0.5) * 0.08, BED, z + (r() - 0.5) * 0.08);
      parts.push(g);
    }
  }
  return mergeGeometries(parts);
}

// A run of fenced beds. `isFree(x, z)` says whether a spot is clear; the
// beds' own colliders are pushed onto `colliders` so nobody walks into them.
export function edgeLawns(world, { hx, hz }, roadClear, isFree, colliders) {
  // side: where the edge is, which way is in, and how long it is
  const sides = [
    { name: 'north', at: (s, d) => [s, -hz + d], rot: 0, half: hx },
    { name: 'south', at: (s, d) => [s, hz - d], rot: Math.PI, half: hx },
    { name: 'east', at: (s, d) => [hx - d, s], rot: -Math.PI / 2, half: hz },
    { name: 'west', at: (s, d) => [-hx + d, s], rot: Math.PI / 2, half: hz },
  ];
  let n = 0;
  for (const side of sides) {
    // which stretches of the edge are clear, in half-meter cells
    const clear = [];
    for (let s = -side.half + 1.5; s <= side.half - 1.5; s += 0.5) {
      const mouth = Math.abs(s) < roadClear + 1.4 && side.name !== 'north';
      clear.push(!mouth && [GAP, GAP + DEPTH / 2, GAP + DEPTH].every((d) => isFree(...side.at(s, d))));
    }
    // group them into runs, then cut the long ones into beds
    const runs = [];
    for (let i = 0; i < clear.length;) {
      if (!clear[i]) { i++; continue; }
      let j = i;
      while (j < clear.length && clear[j]) j++;
      runs.push([-side.half + 1.5 + i * 0.5, -side.half + 1.5 + (j - 1) * 0.5]);
      i = j;
    }
    for (const [a, b] of runs) {
      let s0 = a;
      while (b - s0 >= MIN_RUN) {
        const len = Math.min(MAX_RUN, b - s0), s1 = s0 + len;
        // a short stub left over joins the last bed instead of standing alone
        const end = b - s1 < MIN_RUN ? b : s1;
        const w = end - s0, mid = (s0 + end) / 2;
        const [cx, cz] = side.at(mid, GAP + DEPTH / 2);
        const id = ++n;
        const collider = { x: cx, z: cz, hw: w / 2 + 0.1, hd: DEPTH / 2 + 0.1, rot: side.rot };
        colliders.push(collider);
        piece(world, `plaza.lawn-${side.name}-${id}`, [cx, cz], (g) => {
          const bed = new THREE.Group();
          bed.position.set(cx, 0, cz);
          bed.rotation.y = side.rot;
          g.add(bed);
          slab(bed, w, BED, DEPTH, lawn, M.stone, 0, BED / 2, 0);
          const t = new THREE.Mesh(tufts(w, DEPTH, id * 31 + 7), blade);
          t.castShadow = t.receiveShadow = true;
          bed.add(t);
          // a few daisies
          const r = seeded(id * 17 + 3);
          for (let i = 0; i < Math.round(w * DEPTH / 3); i++) {
            const x = (r() - 0.5) * (w - 0.6), z = (r() - 0.5) * (DEPTH - 0.6);
            const stem = box(bed, 0.012, 0.2, 0.012, M.white, x, BED + 0.1, z);
            stem.castShadow = false;
            const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), M.white);
            head.position.set(x, BED + 0.22, z);
            const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), stamp.ideas);
            eye.position.set(x, BED + 0.26, z);
            bed.add(head, eye);
          }
          // the fence on the inner side and across both ends: posts and two rails
          const fence = (x0, z0, x1, z1) => {
            const len = Math.hypot(x1 - x0, z1 - z0), rot = Math.atan2(-(z1 - z0), x1 - x0);
            const posts = Math.max(1, Math.round(len / 0.9));
            for (let i = 0; i <= posts; i++) {
              const k = i / posts;
              box(bed, 0.07, 0.58, 0.07, M.white, x0 + (x1 - x0) * k, BED + 0.29, z0 + (z1 - z0) * k);
            }
            for (const y of [0.28, 0.5]) {
              const rail = box(bed, len, 0.035, 0.04, M.white, (x0 + x1) / 2, BED + y, (z0 + z1) / 2);
              rail.rotation.y = rot;
            }
          };
          const hw = w / 2, hd = DEPTH / 2;
          fence(-hw, hd, hw, hd);
          fence(-hw, -hd, -hw, hd);
          fence(hw, -hd, hw, hd);
        }, [collider]);
        s0 = end + BREAK;
      }
    }
  }
}
