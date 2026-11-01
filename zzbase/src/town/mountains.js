// The mountains right past the edge of town, never fogged, with forested
// foothills, and on the one behind the plaza a path, a cabin, a lookout and
// a waterfall into a lake.
import * as THREE from 'three';
import { toon } from '../ink.js';
import { tex } from '../textures.js';
import { boxGeo, prismGeo, M } from '../kit.js';
import { smoke } from '../life.js';
import { GROUND_Y, rand, pineGeo } from './common.js';

export function buildMountains(town) {
  // ---------- the mountains: right past the edge of town ----------
  // Never fogged and never faded (inkCrisp), so they rise behind the town as
  // it fades into the paper. Foothills carry pine forests; the mountain
  // behind the plaza has a path, a cabin, a lookout and a waterfall.
  const crisp = (o) => { o.userData.inkCrisp = true; return o; };
  const rockTex = tex.rock(); rockTex.repeat.set(3, 2);
  const rockMat = toon('#ececea', rockTex); rockMat.fog = false; rockMat.flatShading = true;
  const snowMat = toon('#ffffff'); snowMat.fog = false; snowMat.flatShading = true;
  const hillMat = toon('#ffffff', tex.grass()); hillMat.fog = false; hillMat.flatShading = true;
  const sceneryMat = toon(); sceneryMat.fog = false;

  // a craggy cone: jittered rings, so every mountain has its own ridges
  function craggy(r, h, seg, jitter, keep = 1) {
    const g = new THREE.ConeGeometry(r, h, seg, 5, true);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const k = (y + h / 2) / h; // 0 at the foot, 1 at the tip
      if (k > 0.98) continue;
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      const n = 1 + (Math.sin(a * 3 + r) * 0.5 + Math.sin(a * 7 + h) * 0.3 + (rand() - 0.5) * 0.6) * jitter * (1 - k * 0.6);
      pos.setX(i, pos.getX(i) * n); pos.setZ(i, pos.getZ(i) * n);
      pos.setY(i, y + (rand() - 0.5) * h * 0.04 * (1 - k));
    }
    g.computeVertexNormals();
    g.translate(0, h / 2, 0);
    if (keep < 1) g.scale(1, 1, 1);
    return g;
  }

  function mountain(x, z, h, r, snow) {
    const g = crisp(new THREE.Group());
    g.position.set(x, GROUND_Y - 1, z);
    g.rotation.y = rand() * 6;
    const seg = 9 + Math.floor(rand() * 4);
    g.add(new THREE.Mesh(craggy(r, h, seg, 0.22), rockMat));
    // shoulder peaks make a ridge rather than a lone cone
    for (let k = 0; k < 2; k++) {
      const sh = h * (0.45 + rand() * 0.25), sr = r * (0.5 + rand() * 0.2);
      const m = new THREE.Mesh(craggy(sr, sh, seg - 2, 0.25), rockMat);
      const a = rand() * Math.PI * 2;
      m.position.set(Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55);
      g.add(m);
    }
    if (snow) {
      const capH = h * 0.32;
      const cap = new THREE.Mesh(craggy(r * 0.34, capH, seg, 0.18), snowMat);
      cap.position.y = h - capH + 0.4;
      g.add(cap);
    }
    town.add(g);
    return g;
  }

  // forest on rounded foothills
  const forest = [];
  function hill(x, z, R, H) {
    const m = crisp(new THREE.Mesh(new THREE.SphereGeometry(R, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, H / R, 1), hillMat));
    m.position.set(x, GROUND_Y - 0.5, z);
    town.add(m);
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * R * 0.85;
      const y = H * Math.sqrt(Math.max(0, 1 - (d / R) ** 2));
      forest.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, y: GROUND_Y - 0.5 + y, s: 1.4 + rand() * 1.2, rot: rand() * 6 });
    }
  }

  const feature = -2.1; // the angle behind the plaza, as the camera first looks
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rand() * 0.1;
    if (Math.abs(Math.atan2(Math.sin(a - feature), Math.cos(a - feature))) < 0.18) continue; // leave room
    const dist = 215 + rand() * 45;
    const h = 45 + rand() * 60;
    mountain(Math.cos(a) * dist, Math.sin(a) * dist, h, h * (0.8 + rand() * 0.35), h > 70);
  }
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + rand() * 0.15;
    const dist = 186 + rand() * 14;
    hill(Math.cos(a) * dist, Math.sin(a) * dist, 14 + rand() * 12, 8 + rand() * 9);
  }

  // ---- the mountain worth exploring, right behind the plaza
  const fx = Math.cos(feature) * 230, fz = Math.sin(feature) * 230;
  const peak = mountain(fx, fz, 120, 85, true);
  peak.rotation.y = 0;
  const toPlaza = new THREE.Vector3(-fx, 0, -fz).normalize();
  const side = new THREE.Vector3(toPlaza.z, 0, -toPlaza.x);
  const onSlope = (along, across, up) => new THREE.Vector3(fx, GROUND_Y, fz)
    .addScaledVector(toPlaza, along).addScaledVector(side, across).setY(GROUND_Y + up);
  // a switchback path up the face, drawn as flat dashes
  const pathMat = new THREE.MeshBasicMaterial({ color: '#111111', fog: false });
  let prev = null;
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    const along = 80 - k * 62, up = k * 70, across = Math.sin(k * Math.PI * 5) * (24 - k * 18);
    const p = onSlope(along, across, up + 1);
    if (prev && i % 2) {
      const d = new THREE.Vector3().subVectors(p, prev);
      const dash = crisp(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, d.length() * 0.7), pathMat));
      dash.position.copy(prev).addScaledVector(d, 0.5);
      dash.lookAt(p);
      town.add(dash);
    }
    prev = p;
  }
  // a cabin halfway up, with a smoking chimney
  const cabin = crisp(new THREE.Group());
  cabin.position.copy(onSlope(42, 10, 38));
  cabin.lookAt(cabin.position.clone().add(toPlaza));
  const cb = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(boxGeo(w, h, d), mat); m.position.set(x, y, z); cabin.add(m); return m; };
  cb(9, 6, 7, sceneryMat, 0, 3, 0);
  const cr = new THREE.Mesh(prismGeo(10.5, 4.5, 8), sceneryMat); cr.position.y = 6; cabin.add(cr);
  cb(1.4, 4, 1.4, sceneryMat, 2.6, 8, -1.5);
  cb(1.6, 2.6, 0.2, M.deep, 0, 1.3, 3.55);
  cb(1.4, 1.4, 0.2, M.deep, -2.6, 3.4, 3.55);
  town.add(cabin);
  smoke(cabin, 2.6, 10.4, -1.5, { n: 5, rise: 9, size: 1.1, speed: 0.12, drift: 3, mat: sceneryMat }); // unfogged, like the mountain
  // a lookout tower on a shoulder near the top, with a flag
  const tower = crisp(new THREE.Group());
  tower.position.copy(onSlope(18, -14, 92));
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { const leg = new THREE.Mesh(boxGeo(0.5, 12, 0.5), sceneryMat); leg.position.set(x, 6, z); tower.add(leg); }
  const deck = new THREE.Mesh(boxGeo(6, 0.6, 6), sceneryMat); deck.position.y = 12; tower.add(deck);
  const hut = new THREE.Mesh(boxGeo(4, 3, 4), sceneryMat); hut.position.y = 13.8; tower.add(hut);
  const hatRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.6, 4), sceneryMat); hatRoof.position.y = 16.6; hatRoof.rotation.y = Math.PI / 4; tower.add(hatRoof);
  const pole = new THREE.Mesh(boxGeo(0.2, 4, 0.2), sceneryMat); pole.position.y = 19.8; tower.add(pole);
  const flag = new THREE.Mesh(boxGeo(2.4, 1.4, 0.1), toon('#ff6a13')); flag.material.fog = false; flag.position.set(1.2, 21, 0); tower.add(flag);
  town.add(tower);
  // a waterfall down a cliff into a small lake at the foot
  const lake = crisp(new THREE.Mesh(new THREE.CircleGeometry(16, 28), (() => { const m = toon('#ffffff', tex.water()); m.fog = false; return m; })()));
  lake.rotation.x = -Math.PI / 2;
  lake.position.copy(onSlope(92, -26, 0.15));
  town.add(lake);
  const fall = crisp(new THREE.Mesh(new THREE.PlaneGeometry(5, 46, 1, 8), (() => { const m = toon('#ffffff', tex.water()); m.fog = false; m.side = THREE.DoubleSide; return m; })()));
  fall.position.copy(onSlope(72, -24, 24));
  fall.lookAt(fall.position.clone().add(toPlaza));
  fall.rotation.x -= 0.35;
  town.add(fall);
  for (let i = 0; i < 6; i++) {
    const foam = crisp(new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rand(), 0), sceneryMat));
    foam.position.copy(onSlope(86 + rand() * 4, -24 + (rand() - 0.5) * 6, 0.8));
    town.add(foam);
  }
  // forests on the foothills and around the lake
  for (let i = 0; i < 30; i++) {
    const a = rand() * Math.PI * 2, d = 18 + rand() * 14;
    const c = onSlope(92, -26, 0);
    forest.push({ x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d, y: GROUND_Y, s: 1.4 + rand(), rot: rand() * 6 });
  }
  const pinesFar = new THREE.InstancedMesh(pineGeo(), sceneryMat, forest.length);
  const o3 = new THREE.Object3D();
  forest.forEach((t, i) => { o3.position.set(t.x, t.y, t.z); o3.rotation.set(0, t.rot, 0); o3.scale.setScalar(t.s); o3.updateMatrix(); pinesFar.setMatrixAt(i, o3.matrix); });
  pinesFar.computeBoundingSphere();
  town.add(crisp(pinesFar));
}
