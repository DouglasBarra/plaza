// How high the floor is anywhere on the plaza: the paving, its raised rings,
// the sidewalks and curbs. The tops of the low, flat things in the scene
// (nothing taller than 30 cm, so never a bench seat) are drawn into a height
// map, 2.5 cm to a square, one 2 m tile at a time the first time something
// asks about it. After that, a height is just a look-up.
import * as THREE from 'three';

const CELL = 0.025, TILE = 80;   // 80 squares of 2.5 cm: 2 m tiles

export function groundSampler(scene) {
  let tris = null;               // every floor's upward-facing triangles, in world space: x0 y0 z0 x1 … z2
  const tiles = new Map();

  function collect() {
    const out = [], box = new THREE.Box3(), size = new THREE.Vector3();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    const m = new THREE.Matrix4(), inst = new THREE.Matrix4();
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.notGround || o.material?.transparent) return;
      box.setFromObject(o);
      box.getSize(size);
      if (!(box.max.y < 0.3 && box.min.y > -0.6 && size.y < 0.4 && (size.x > 0.5 || size.z > 0.5))) return;
      const p = o.geometry.attributes.position, idx = o.geometry.index;
      const count = idx ? idx.count : p.count;
      for (let k = 0; k < (o.isInstancedMesh ? o.count : 1); k++) {
        m.copy(o.matrixWorld);
        if (o.isInstancedMesh) { o.getMatrixAt(k, inst); m.multiply(inst); }
        for (let t = 0; t < count; t += 3) {
          const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
          a.fromBufferAttribute(p, i0).applyMatrix4(m);
          b.fromBufferAttribute(p, i1).applyMatrix4(m);
          c.fromBufferAttribute(p, i2).applyMatrix4(m);
          n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
          if (Math.abs(n.y) < 0.7) continue;          // a side, not a top
          out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        }
      }
    });
    tris = new Float32Array(out);
  }

  // Draw the floors' tops into the tile at (tx, tz): each square keeps the
  // highest top over its middle.
  function buildTile(tx, tz) {
    const h = new Float32Array(TILE * TILE);
    const x0 = tx * TILE * CELL, z0 = tz * TILE * CELL, x1 = x0 + TILE * CELL, z1 = z0 + TILE * CELL;
    for (let t = 0; t < tris.length; t += 9) {
      const ax = tris[t], ay = tris[t + 1], az = tris[t + 2];
      const bx = tris[t + 3], by = tris[t + 4], bz = tris[t + 5];
      const cx = tris[t + 6], cy = tris[t + 7], cz = tris[t + 8];
      const minX = Math.min(ax, bx, cx), maxX = Math.max(ax, bx, cx), minZ = Math.min(az, bz, cz), maxZ = Math.max(az, bz, cz);
      if (maxX < x0 || minX > x1 || maxZ < z0 || minZ > z1) continue;
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const i0 = Math.max(0, Math.floor((minX - x0) / CELL)), i1 = Math.min(TILE - 1, Math.ceil((maxX - x0) / CELL));
      const j0 = Math.max(0, Math.floor((minZ - z0) / CELL)), j1 = Math.min(TILE - 1, Math.ceil((maxZ - z0) / CELL));
      for (let j = j0; j <= j1; j++) {
        const pz = z0 + (j + 0.5) * CELL;
        for (let i = i0; i <= i1; i++) {
          const px = x0 + (i + 0.5) * CELL;
          // is the square's middle inside the triangle (seen from above), and how high is it there?
          const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det;
          const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
          const l3 = 1 - l1 - l2;
          if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
          const y = l1 * ay + l2 * by + l3 * cy;
          if (y > h[j * TILE + i]) h[j * TILE + i] = y;
        }
      }
    }
    return h;
  }

  return function groundAt(x, z) {
    if (!tris) collect();
    const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL);
    const tx = Math.floor(gx / TILE), tz = Math.floor(gz / TILE), key = tx * 100000 + tz;
    let h = tiles.get(key);
    if (!h) tiles.set(key, (h = buildTile(tx, tz)));
    return h[(gz - tz * TILE) * TILE + (gx - tx * TILE)];
  };
}
