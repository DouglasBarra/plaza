// The town around the plaza: the ground, the street grid, and houses and
// trees on lots between the streets. Repeated things are instanced.
import * as THREE from 'three';
import { toon } from '../ink.js';
import { tex } from '../textures.js';
import { boxGeo } from '../kit.js';
import { PLAZA } from '../plaza/index.js';
import { ROAD_PITCH, ROAD_W, EXTENT, GROUND_Y, rand, distToRoad, houseGeo, pineGeo, roundTreeGeo, instanced } from './common.js';

export function buildStreets(town) {
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
}
