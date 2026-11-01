// Everything outside the plaza: a town that goes on until it fades into the
// paper, mountains drawn on the horizon, clouds and birds. You can see all of
// it but only walk inside the plaza. Repeated things are instanced.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from './ink.js';
import { tex } from './textures.js';
import { boxGeo, prismGeo, PLAZA, M } from './world.js';
import { smoke } from './life.js';

const ROAD_PITCH = 40;   // a street every 40m, plus the two through the plaza
const ROAD_W = 5;
const EXTENT = 176;      // town reaches this far; fog eats it before the end
const GROUND_Y = -0.4;

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function strip(geos) {
  return geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.clearGroups(); return n; });
}

function houseGeo(w, h, d, roofH, flat = false) {
  const body = boxGeo(w, h, d); body.translate(0, h / 2, 0);
  const roof = flat ? boxGeo(w + 0.3, 0.4, d + 0.3) : prismGeo(w + 0.5, roofH, d + 0.5);
  roof.translate(0, flat ? h + 0.2 : h, 0);
  return mergeGeometries(strip([body, roof]), true);
}

function pineGeo() {
  const parts = [new THREE.CylinderGeometry(0.15, 0.2, 1, 6).translate(0, 0.5, 0)];
  for (let i = 0; i < 3; i++) parts.push(new THREE.ConeGeometry(1.6 - i * 0.4, 1.8, 7).translate(0, 1.5 + i * 1.0, 0));
  return mergeGeometries(strip(parts));
}

function roundTreeGeo() {
  return mergeGeometries(strip([
    new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6).translate(0, 0.8, 0),
    new THREE.IcosahedronGeometry(1.5, 0).translate(0, 2.5, 0),
  ]));
}

function instanced(geo, mat, items, shadows = true) {
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

const distToRoad = (v) => Math.abs((((v + ROAD_PITCH / 2) % ROAD_PITCH) + ROAD_PITCH) % ROAD_PITCH - ROAD_PITCH / 2);

export function buildTown(scene) {
  const town = new THREE.Group();
  scene.add(town);

  // ground
  const grass = tex.grass();
  grass.repeat.set(EXTENT * 2 / 3.5, EXTENT * 2 / 3.5);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT * 6, EXTENT * 6), toon('#ffffff', grass));
  grass.repeat.multiplyScalar(3);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  town.add(ground);

  // roads
  const rz = tex.roadZ(); rz.repeat.set(1 / ROAD_W, 0.25);
  const rx = tex.roadX(); rx.repeat.set(0.25, 1 / ROAD_W);
  const roadZ = toon('#ffffff', rz), roadX = toon('#ffffff', rx);
  const roadSeg = (alongZ, c, from, to) => {
    const len = to - from, mid = (from + to) / 2;
    const g = alongZ ? boxGeo(ROAD_W, 0.06, len) : boxGeo(len, 0.06, ROAD_W);
    const m = new THREE.Mesh(g, alongZ ? roadZ : roadX);
    m.position.set(alongZ ? c : mid, GROUND_Y + (alongZ ? 0.03 : 0.025), alongZ ? mid : c);
    m.receiveShadow = true;
    town.add(m);
  };
  for (let c = -EXTENT + 16; c <= EXTENT; c += ROAD_PITCH) {
    const k = Math.round(c / ROAD_PITCH) * ROAD_PITCH;
    for (const alongZ of [true, false]) {
      // the two streets through the plaza stop at its edges (a road along z
      // meets the north and south sides, one along x the east and west)
      const edge = alongZ ? PLAZA.hz : PLAZA.hx;
      if (k === 0) { roadSeg(alongZ, 0, -EXTENT * 1.4, -edge); roadSeg(alongZ, 0, edge, EXTENT * 1.4); }
      else roadSeg(alongZ, k, -EXTENT * 1.4, EXTENT * 1.4);
    }
  }

  // houses and trees on a 9m lot grid, skipping roads and the plaza
  const facadeMat = toon('#ffffff', tex.facade());
  const roofMat = toon('#ffffff', tex.shingles());
  const variants = [houseGeo(4, 3, 4, 1.6), houseGeo(4, 6, 4, 1.8), houseGeo(7, 3.5, 4, 1.8), houseGeo(4, 9, 4, 0, true)];
  const houses = variants.map(() => []);
  const pines = [], rounds = [];
  const LOT = 9;
  for (let cx = -EXTENT; cx <= EXTENT; cx += LOT) {
    for (let cz = -EXTENT; cz <= EXTENT; cz += LOT) {
      const x = cx + (rand() - 0.5) * 2, z = cz + (rand() - 0.5) * 2;
      const dist = Math.hypot(x, z);
      if ((Math.abs(x) < PLAZA.hx + 6 && Math.abs(z) < PLAZA.hz + 6) || dist > EXTENT) continue;
      const dx = distToRoad(x), dz = distToRoad(z);
      if (dx < 6 || dz < 6) {
        if ((dx > 3.4 || dz > 3.4) && Math.min(dx, dz) > 3.2 && rand() > 0.55) rounds.push({ x, z, s: 0.5 + rand() * 0.3, rot: rand() * 6 });
        continue;
      }
      const r = rand();
      const town = dist < 120 ? 0.66 : 0.25;
      if (r < town) {
        // face the nearest road
        const rot = dx < dz ? (((x % ROAD_PITCH) + ROAD_PITCH) % ROAD_PITCH > ROAD_PITCH / 2 ? Math.PI / 2 : -Math.PI / 2)
          : (((z % ROAD_PITCH) + ROAD_PITCH) % ROAD_PITCH > ROAD_PITCH / 2 ? 0 : Math.PI);
        const v = dist < 60 ? Math.floor(rand() * 3) : Math.floor(rand() * 4);
        houses[v].push({ x, z, rot, sy: 0.9 + rand() * 0.35 });
      } else if (r < town + 0.2) {
        for (let i = 0; i < 3; i++) pines.push({ x: x + (rand() - 0.5) * 5, z: z + (rand() - 0.5) * 5, s: 0.7 + rand() * 0.6, rot: rand() * 6 });
      } else if (r < town + 0.3) {
        rounds.push({ x, z, s: 0.8 + rand() * 0.4, rot: rand() * 6 });
      }
    }
  }
  // a ring of trees just outside the plaza
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, rr = 1.15 + rand() * 0.08;
    const x = Math.cos(a) * (PLAZA.hx + 3.5) * rr, z = Math.sin(a) * (PLAZA.hz + 3.5) * rr;
    if (distToRoad(x) < 4 || distToRoad(z) < 4) continue;
    (i % 3 ? pines : rounds).push({ x, z, s: 0.7 + rand() * 0.5, rot: rand() * 6 });
  }
  variants.forEach((g, i) => town.add(instanced(g, [facadeMat, roofMat], houses[i])));
  town.add(instanced(pineGeo(), toon(), pines));
  town.add(instanced(roundTreeGeo(), toon(), rounds));

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

  // ---------- clouds: clusters of flat-shaded puffs ----------
  const cloudMat = toon(); cloudMat.fog = false; cloudMat.flatShading = true;
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const parts = [];
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const s = 4 + rand() * 4;
      parts.push(new THREE.IcosahedronGeometry(s, 1).scale(1, 0.62, 1).translate(k * 6 - n * 3 + rand() * 2, rand() * 2.5, (rand() - 0.5) * 5));
    }
    const c = new THREE.Mesh(mergeGeometries(strip(parts)), cloudMat);
    c.userData.inkCrisp = true;
    const a = rand() * Math.PI * 2, d = 290 + rand() * 130;
    c.position.set(Math.cos(a) * d, 40 + rand() * 45, Math.sin(a) * d);
    c.scale.setScalar(1.6);
    c.rotation.y = rand() * 6;
    c.userData = { a, d, speed: 0.004 + rand() * 0.004 };
    town.add(c);
    clouds.push(c);
  }

  // ---------- birds: little V shapes that flap on the 2-frame clock ----------
  const birdMat = toon(); birdMat.fog = false;
  const wing = new THREE.BoxGeometry(0.9, 0.06, 0.32);
  const birds = [];
  for (let f = 0; f < 3; f++) {
    const flock = new THREE.Group();
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Group();
      const l = new THREE.Mesh(wing, birdMat), r = new THREE.Mesh(wing, birdMat);
      l.position.x = -0.42; r.position.x = 0.42;
      b.add(l, r, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.5), birdMat));
      b.position.set((k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.6, rand() * 0.6, -Math.ceil(k / 2) * 1.4);
      b.userData = { l, r, phase: rand() * 4 };
      flock.add(b);
    }
    flock.userData = { r: 26 + f * 14, h: 20 + f * 7, speed: (f % 2 ? -1 : 1) * (0.07 + rand() * 0.05), off: rand() * 6 };
    town.add(flock);
    birds.push(flock);
  }

  function animate(time) {
    for (const c of clouds) {
      const a = c.userData.a + time * c.userData.speed;
      c.position.x = Math.cos(a) * c.userData.d;
      c.position.z = Math.sin(a) * c.userData.d;
    }
    const frame = Math.floor(time * 5);
    for (const f of birds) {
      const u = f.userData, a = u.off + time * u.speed;
      f.position.set(Math.cos(a) * u.r, u.h + Math.sin(time * 0.5 + u.off) * 2, Math.sin(a) * u.r);
      f.rotation.y = -a + (u.speed > 0 ? 0 : Math.PI);
      for (const b of f.children) {
        const up = (frame + Math.floor(b.userData.phase * 5)) % 2;
        b.userData.l.rotation.z = up ? 0.5 : -0.25;
        b.userData.r.rotation.z = up ? -0.5 : 0.25;
      }
    }
  }

  return { town, animate };
}
