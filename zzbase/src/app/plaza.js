// The plaza you walk around on: its buildings, the town around it, and you.
import { buildPlaza, PLAZA, PLAZA_HALF } from '../plaza/index.js';
import { buildTown } from '../town/index.js';
import { Avatar } from '../avatar.js';
import { plazaScene, camera, controls, ink } from './engine.js';
import { game } from './state.js';

export const { buildings, colliders } = buildPlaza(plazaScene);
export const town = buildTown(plazaScene);
export const me = new Avatar(plazaScene, colliders, PLAZA_HALF);
// inside the bollards of the rectangular square
me.bounds = { minX: -PLAZA.hx + 1.2, maxX: PLAZA.hx - 1.2, minZ: -PLAZA.hz + 1.2, maxZ: PLAZA.hz - 1.2 };
export const plazaBounds = { ...me.bounds };

export const buildingFor = (id) => buildings.find((b) => b.userData.district === id);
// The town hall's flag flies at the top of its tower when nothing is due.
export const townHall = buildingFor('todo');

// Each frame on the plaza: the fog and the town hall's flag.
export function updatePlaza(dt) {
  // fog starts just past what you're looking at, so zooming out reveals more town
  const camDist = game.view === 'first' ? 20 : camera.position.distanceTo(controls.target);
  plazaScene.fog.near = camDist + 30;
  plazaScene.fog.far = camDist + 150;
  ink.setFog(plazaScene.fog.near, plazaScene.fog.far);
  const hall = townHall.userData;
  const flagY = hall.flagUp ? hall.flagHigh : hall.flagLow;
  hall.flag.position.y += (flagY - hall.flag.position.y) * Math.min(1, dt * 2);
}
