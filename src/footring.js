// The ring under your feet, so you can always find yourself: one stroke of
// black watercolor round you, painted onto the ground. It's made of small
// pieces, each lying on the floor right under it, so where the paving steps
// up or down the stroke steps with it, and the paint runs down the face of
// the step between them, as a real brush would leave it. The paint pools a
// little where the brush starts, dries darker at its edges, and thins out
// where the stroke ends, just past where it began.
import * as THREE from 'three';
import { skipND } from './life.js';

const N = 192, M = 5;               // pieces round the circle, and across the stroke
const SWEEP = Math.PI * 2 * 1.05;   // a little past a full turn: the brush overlaps its start
const R = 0.62, W = 0.13;           // radius and stroke width, in meters
const LIFT = 0.012;                 // how far the paint sits above the floor
const STEP = 0.006;                 // a height change bigger than this is a step to paint down

// The stroke's paint, as a mask: along it (u) the brush starts heavy and
// runs dry; across it (v) the edges are ragged and dry darker than the middle.
function paintTexture() {
  const w = 1024, h = 64, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  // slow wobbles along the stroke: how much water and pigment the brush has
  const along = (x, f, p) => Math.sin(x * f + p);
  const top = [], bottom = [];
  for (let x = 0; x < w; x++) {
    const t = x / w;
    // the edges wander, and fray where the brush runs dry
    const fray = 2 + 6 * Math.max(0, t - 0.7) / 0.3;
    top.push(6 + 3 * along(x, 0.031, 1) + 2 * along(x, 0.11, 4) + Math.random() * fray);
    bottom.push(h - 6 - 3 * along(x, 0.027, 2) - 2 * along(x, 0.13, 0.5) - Math.random() * fray);
  }
  for (let x = 0; x < w; x++) {
    const t = x / w;
    const load = 0.86 + 0.07 * along(x, 0.017, 3) + 0.04 * along(x, 0.05, 1.3) + (t < 0.05 ? 0.14 * (1 - t / 0.05) : 0);
    const end = t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.18) : 1;   // running dry
    for (let y = 0; y < h; y++) {
      const a = top[x], b = bottom[x];
      let alpha = 0;
      if (y >= a && y <= b) {
        const edge = Math.min(y - a, b - y);                 // px from the nearer edge
        const rim = edge < 3 ? 0.25 * (1 - edge / 3) : 0;     // the darker dried edge
        const grain = (Math.random() - 0.5) * 0.16;           // pigment settling in the paper
        alpha = (load + rim + grain) * (end > 0 ? end ** 0.6 : 0);
        if (end < 1 && Math.random() > end * 1.4) alpha *= 0.3; // dry-brush gaps at the end
      }
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.round(THREE.MathUtils.clamp(alpha, 0, 1) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class FootRing {
  constructor() {
    // room for every piece's top, and a wall to each neighbour along and across
    const most = N * M * 3 * 6;
    this.pos = new Float32Array(most * 3);
    this.uv = new Float32Array(most * 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2));
    // the hand's wobble: the circle isn't quite round, and the stroke swells and thins
    this.shape = Array.from({ length: N + 1 }, (_, i) => {
      const a = (i / N) * SWEEP;
      return {
        a, c: Math.cos(a), s: Math.sin(a),
        r: R + 0.025 * Math.sin(a * 2 + 0.7) + 0.012 * Math.sin(a * 5 + 2),
        w: W * (1.15 - 0.35 * (i / N)) * (1 + 0.12 * Math.sin(a * 3 + 1)),
      };
    });
    this.h = new Float32Array(N * M);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: '#0b0b0b', map: paintTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.userData.notGround = true;
    skipND.push(this.mesh);
  }

  setColor(c) { this.mesh.material.color.set(c); }

  // Lay the stroke round (x, z), on the floor as `floorAt(x, z)` gives it.
  // (Only when you've moved, or the floor is a different one.)
  place(x, z, floorAt) {
    if (x === this.lastX && z === this.lastZ && floorAt === this.lastFloor) return;
    this.lastX = x; this.lastZ = z; this.lastFloor = floorAt;
    const { h, pos, uv } = this, K = this.corners();
    // each piece's floor, read at its middle
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        const m = (i * M + j) * 2;
        h[i * M + j] = floorAt(x + K.mid[m], z + K.mid[m + 1]) + LIFT;
      }
    }
    let v = 0;
    // corner (i, j) at height y, with texture (u, w)
    const put = (i, j, y, u, w) => {
      const k = (i * (M + 1) + j) * 2;
      pos[v * 3] = x + K.at[k]; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z + K.at[k + 1];
      uv[v * 2] = u; uv[v * 2 + 1] = w;
      v++;
    };
    // a quad from four corners, as two triangles: a b c, a c d
    const quad = (a, b, c, d) => { put(...a); put(...b); put(...c); put(...a); put(...c); put(...d); };
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N;
      for (let j = 0; j < M; j++) {
        const y = h[i * M + j], w0 = j / M, w1 = (j + 1) / M;
        // the piece, flat on its floor
        quad([i, j, y, u0, w0], [i + 1, j, y, u1, w0], [i + 1, j + 1, y, u1, w1], [i, j + 1, y, u0, w1]);
        // the paint running down a step to the next piece along, and across
        if (i + 1 < N) {
          const y2 = h[(i + 1) * M + j];
          if (Math.abs(y2 - y) > STEP) {
            const lo = Math.min(y, y2), hi = Math.max(y, y2);
            quad([i + 1, j, lo, u1, w0], [i + 1, j + 1, lo, u1, w1], [i + 1, j + 1, hi, u0, w1], [i + 1, j, hi, u0, w0]);
          }
        }
        if (j + 1 < M) {
          const y2 = h[i * M + j + 1];
          if (Math.abs(y2 - y) > STEP) {
            const lo = Math.min(y, y2), hi = Math.max(y, y2);
            quad([i, j + 1, lo, u0, w1], [i + 1, j + 1, lo, u1, w1], [i + 1, j + 1, hi, u1, w0], [i, j + 1, hi, u0, w0]);
          }
        }
      }
    }
    const geo = this.mesh.geometry;
    geo.setDrawRange(0, v);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.uv.needsUpdate = true;
  }

  // Where every corner and every piece's middle sits, relative to you
  // (worked out once: the stroke's shape never changes).
  corners() {
    if (this.K) return this.K;
    const { shape } = this, at = new Float32Array((N + 1) * (M + 1) * 2), mid = new Float32Array(N * M * 2);
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= M; j++) {
        const r = shape[i].r + shape[i].w * (j / M - 0.5), k = (i * (M + 1) + j) * 2;
        at[k] = shape[i].c * r; at[k + 1] = shape[i].s * r;
      }
    }
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        const a = (i * (M + 1) + j) * 2, b = ((i + 1) * (M + 1) + j + 1) * 2, m = (i * M + j) * 2;
        mid[m] = (at[a] + at[b]) / 2; mid[m + 1] = (at[a + 1] + at[b + 1]) / 2;
      }
    }
    return (this.K = { at, mid });
  }
}
