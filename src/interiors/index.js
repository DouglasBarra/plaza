// Walk-in interiors. Each building is a room you enter through its door:
// an open-top diorama in third person (the walls facing the camera are cut
// away), a closed room in first person. Each room has one "station", the
// object you use to open that district's app.
import * as THREE from 'three';
import { placeRoomFinds } from '../finds.js';
import { W, D, lightRoom } from './common.js';
import { buildTownHall } from './townhall/index.js';
import { buildBank } from './bank/index.js';
import { study } from './library/index.js';
import { ideas } from './workshop/index.js';
import { postOffice } from './postoffice/index.js';
import { works } from './works/index.js';

const INTERIORS = {
  todo: buildTownHall, // the town hall: ToDos (see townhall/)
  finance: buildBank,  // the bank: Finance (see bank/)
  study,               // the library: Study (see library/)
  ideas,               // the lighthouse workshop: Ideas (see workshop/)
  people: postOffice,  // the post office: People (see postoffice/)
  projects: works,     // the Works: Projects (see works/)
};

export const hasInterior = (id) => id in INTERIORS;

export function buildInterior(id) {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const scene = new THREE.Scene();
  const lights = lightRoom(scene);
  const room = INTERIORS[id](scene, rand, lights);
  placeRoomFinds(id, scene);
  return {
    id,
    scene,
    lights,
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.4 },
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.2),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    // where the third-person camera looks from (front-right, above the cut walls)
    cameraOffset: new THREE.Vector3(9, 13, 15),
    ...room,
  };
}
