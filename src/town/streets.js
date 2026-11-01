// The town around the plaza: the ground, the streets (streetscape.js), the
// blocks of houses with their gardens, a park and a church (houses.js), the
// windows you can see into (windows.js), trees, and what moves: traffic and
// people (traffic.js), smoke and washing (motion.js).
// Everything that stands still is merged into a few meshes per material;
// everything repeated and moving is instanced.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../ink.js';
import { tex } from '../textures.js';
import { isNight } from '../life.js';
import { EXTENT, GROUND_Y, roundTreeGeo, pineGeo, instanced, strip } from './common.js';
import { buildHouses, BAGS } from './houses.js';
import { buildStreetscape } from './streetscape.js';
import { art, signAtlas } from './art.js';
import { windowMaterial, setWindowsNight, animateWindows } from './windows.js';
import { buildTraffic } from './traffic.js';
import { buildMotion } from './motion.js';

// A tall narrow tree for gardens and the park.
function poplarGeo() {
  return mergeGeometries(strip([
    new THREE.CylinderGeometry(0.13, 0.2, 1.4, 6).translate(0, 0.7, 0),
    new THREE.IcosahedronGeometry(1.1, 0).scale(1, 2.6, 1).translate(0, 3.9, 0),
  ]));
}

// A street tree: a tall clean trunk (so people and cars pass under it) and
// a crown of a few lumps.
function streetTreeGeo() {
  return mergeGeometries(strip([
    new THREE.CylinderGeometry(0.11, 0.17, 3.2, 6).translate(0, 1.6, 0),
    new THREE.IcosahedronGeometry(1.45, 0).translate(0, 4.3, 0),
    new THREE.IcosahedronGeometry(1.05, 0).translate(0.8, 5.1, 0.35),
    new THREE.IcosahedronGeometry(0.95, 0).rotateY(0.6).translate(-0.85, 4.9, -0.3),
  ]));
}

function materials() {
  const lined = (t) => toon('#ffffff', t);
  const M = {
    stucco: lined(art.stucco()), bricks: lined(art.bricks()), shutters: lined(art.shutters()), plinth: lined(art.plinth()),
    plain: toon(), tiles: lined(tex.roofTiles()), slate: lined(tex.shingles()), flat: lined(tex.dirt()),
    door: lined(art.door()), win: windowMaterial(), awning: lined(art.awning()), sign: lined(signAtlas()),
    railing: lined(art.railing()), fence: lined(tex.planks()), paving: lined(tex.paving()), hedge: lined(art.hedge()),
    gravel: lined(tex.dirt()), stone: lined(tex.stone()), water: lined(tex.water()),
  };
  M.door.vertexColors = true;
  M.awning.vertexColors = true;
  M.railing.side = THREE.DoubleSide;
  M.paving.map.repeat.set(1, 1);
  return M;
}

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

  // the houses, merged a material at a time: near ones cast shadows
  const T = buildHouses();
  const M = materials();
  for (const [set, shadows] of [[T.near, true], [T.far, false]]) {
    for (const name of BAGS) {
      const m = set[name].mesh(M[name], { shadows: shadows && name !== 'win' });
      if (m) town.add(m);
    }
  }

  const street = buildStreetscape(town, T.blocks, T.parkLamps);

  // trees: in the gardens, the park and along the avenues
  town.add(instanced(roundTreeGeo(), toon(), T.trees.round));
  town.add(instanced(streetTreeGeo(), toon(), street.streetTrees));
  town.add(instanced(poplarGeo(), toon(), T.trees.poplar));
  if (T.trees.pine.length) town.add(instanced(pineGeo(), toon(), T.trees.pine));

  const animateTraffic = buildTraffic(town);
  const animateMotion = buildMotion(town, T.chimneys, T.laundry);

  let night = null;
  return function animateStreets(time) {
    if (isNight() !== night) {
      night = isNight();
      setWindowsNight(night);
      street.lamps.setNight(night);
    }
    animateWindows(time);
    animateTraffic(time);
    animateMotion(time);
  };
}
