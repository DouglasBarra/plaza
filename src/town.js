// Everything outside the plaza: a town that goes on until it fades into the
// paper, mountains drawn on the horizon, clouds and birds. You can see all of
// it but only walk inside the plaza. Repeated things are instanced.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from './ink.js';
import { tex } from './textures.js';
import { boxGeo, prismGeo, PLAZA_HALF } from './world.js';

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
      if (k === 0) { roadSeg(alongZ, 0, -EXTENT * 1.4, -PLAZA_HALF); roadSeg(alongZ, 0, PLAZA_HALF, EXTENT * 1.4); }
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
      if (Math.max(Math.abs(x), Math.abs(z)) < PLAZA_HALF + 6 || dist > EXTENT) continue;
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
    const a = (i / 28) * Math.PI * 2, rr = PLAZA_HALF + 3 + rand() * 2;
    const x = Math.cos(a) * rr * 1.15, z = Math.sin(a) * rr * 1.15;
    if (distToRoad(x) < 4 || distToRoad(z) < 4) continue;
    (i % 3 ? pines : rounds).push({ x, z, s: 0.7 + rand() * 0.5, rot: rand() * 6 });
  }
  variants.forEach((g, i) => town.add(instanced(g, [facadeMat, roofMat], houses[i])));
  town.add(instanced(pineGeo(), toon(), pines));
  town.add(instanced(roundTreeGeo(), toon(), rounds));

  // ---------- the horizon: mountains (never fogged, drawn as a backdrop) ----------
  const peakMat = toon(); peakMat.fog = false; peakMat.flatShading = true;
  const snowMat = toon(); snowMat.fog = false; snowMat.flatShading = true;
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + rand() * 0.12;
    const dist = 380 + rand() * 110;
    const h = 28 + rand() * 50, r = h * (1.3 + rand() * 0.6);
    const seg = 5 + Math.floor(rand() * 3);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg, 1), peakMat);
    body.position.y = h / 2 - 2;
    g.add(body);
    if (h > 52) {
      // a snow cap: a smaller cone sitting on the peak
      const capH = h * 0.28;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.29, capH, seg, 1), snowMat);
      cap.position.y = h - 2 - capH / 2 + 0.6;
      g.add(cap);
    }
    g.position.set(Math.cos(a) * dist, GROUND_Y, Math.sin(a) * dist);
    g.rotation.y = rand() * 6;
    town.add(g);
  }

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
