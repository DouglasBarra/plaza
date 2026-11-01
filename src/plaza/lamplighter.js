// The lamplighter. When night falls, the plaza's street lamps stay dark
// until they come round: in from the south entrance with a long pole, to
// each lamp in turn (always the nearest one still dark), a moment under it
// with the pole raised, and on to the next. Then home, out of the square.
import * as THREE from 'three';
import { M, mesh, cyl } from '../kit.js';
import { makeFigure, poseFigure } from '../folks.js';
import { sfx } from '../sound/index.js';
import { onDusk, setLampLit, isNight } from '../life.js';

const SPEED = 2.6;       // m/s: a brisk walk
const PAUSE = 1.1;       // s under each lamp
const ENTRANCE = new THREE.Vector3(0, 0, 36);

export function lamplighter(world) {
  const fig = makeFigure({ hat: 'cap', scarf: true, height: 1.0 });
  fig.visible = false;
  world.add(fig);
  // the pole, held in the right hand: a long rod with a brass hook at the top
  const arm = fig.userData.parts.arms[1];
  const pole = new THREE.Group();
  pole.position.set(0, -0.38, 0.05);
  arm.add(pole);
  cyl(pole, 0.015, 0.015, 2.6, M.planks, 0, 1.1, 0, 5);
  mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), M.white, 0, 2.42, 0, pole);

  let queue = [], route = null;   // route: { to, kind: 'lamp' | 'home', lamp, waitUntil }
  const pos = fig.position;

  onDusk((lamps) => {
    queue = lamps.slice();
    pos.copy(ENTRANCE);
    fig.visible = true;
    route = null;
  });

  function next() {
    if (!queue.length) { route = { to: ENTRANCE, kind: 'home' }; return; }
    // the nearest dark lamp
    let best = 0, bestD = Infinity;
    queue.forEach((l, i) => {
      const d = l.pool.getWorldPosition(new THREE.Vector3()).distanceTo(pos);
      if (d < bestD) { bestD = d; best = i; }
    });
    const lamp = queue.splice(best, 1)[0];
    // stand beside the post, not inside it
    const post = lamp.pool.getWorldPosition(new THREE.Vector3()).setY(0);
    const at = post.clone();
    const from = new THREE.Vector3().subVectors(pos, at).setY(0);
    at.addScaledVector(from.lengthSq() > 1e-4 ? from.normalize() : new THREE.Vector3(1, 0, 0), 0.55);
    route = { to: at, kind: 'lamp', lamp, post };
  }

  return function update(time, player, dt) {
    if (!isNight()) { fig.visible = false; queue = []; route = null; return; }
    if (!fig.visible) return;
    if (!route) next();
    const frame = Math.floor(time * 5) % 2;
    if (route.waitUntil) {
      // under the lamp: pole up, then the lamp catches
      poseFigure(fig, 'wave', 0);
      if (time >= route.waitUntil) { setLampLit(route.lamp, true); sfx('flame', { at: route.lamp.pool.getWorldPosition(new THREE.Vector3()).setY(3) }); route = null; }
      return;
    }
    const d = new THREE.Vector3().subVectors(route.to, pos).setY(0);
    const len = d.length();
    if (len < 0.05) {
      if (route.kind === 'home') { fig.visible = false; route = null; return; }
      route.waitUntil = time + PAUSE;
      if (route.post) fig.rotation.y = Math.atan2(route.post.x - pos.x, route.post.z - pos.z);   // face the lamp
      return;
    }
    pos.addScaledVector(d.divideScalar(len), Math.min(len, SPEED * dt));
    fig.rotation.y = Math.atan2(d.x, d.z);
    poseFigure(fig, 'walk', frame);
  };
}
