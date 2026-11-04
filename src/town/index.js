// Everything outside the plaza: a town that goes on until it fades into the
// paper, mountains drawn on the horizon, clouds and birds. You can see all of
// it but only walk inside the plaza. Repeated things are instanced.
//
// streets.js   the ground, the streets, houses and trees
// mountains.js the mountains and foothills on the horizon
// sky.js       clouds and birds
import * as THREE from 'three';
import { buildStreets } from './streets.js';
import { buildMountains } from './mountains.js';
import { buildSky } from './sky.js';

export function buildTown(scene) {
  const town = new THREE.Group();
  scene.add(town);
  // built in this order, so the seeded random numbers come out the same
  const animateStreets = buildStreets(town);
  buildMountains(town);   // the mountains stand still
  const animateSky = buildSky(town);
  function animate(time) {
    animateStreets?.(time);
    animateSky?.(time);
  }
  return { town, animate };
}
