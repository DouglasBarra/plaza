// The town hall's ground floor (Today).
import * as THREE from 'three';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { folk } from '../../folks.js';
import { clockHands, signBoard } from '../../details.js';
import { steam, swingSign } from '../../life.js';
import { picture, wallShelf, rug, coatRack, typewriter, chair, desk, plant, armchair, lowTable, logPile, toolStand } from '../../decor.js';
import { W, D, F } from './dims.js';
import { dark } from './materials.js';
import { taskBoard, jar } from './boards.js';
import { fireplace, pendant, chandelier } from './fixtures.js';

// The ground floor: Today. The task board and wastebasket, the clerk at his
// desk, the fireplace with the jar and streak plaque, the tall clock, the
// seats by the door, and the lamps.
export function furnishGroundFloor(lower, rand) {
  const board = taskBoard(lower, -0.5, 2.25, -D / 2 + 0.1, 5.0, 2.3, 5, 2, stamp.todo);
  signBoard(lower, -0.5, 3.75, -D / 2 + 0.14, 1.6, 0.36, 'Today');
  // wastebasket by the board
  const binPos = new THREE.Vector3(2.45, 0, -4.35);
  cyl(lower, 0.28, 0.22, 0.55, M.planks, binPos.x, 0.275, binPos.z, 14);
  mesh(new THREE.TorusGeometry(0.28, 0.025, 4, 20), M.white, binPos.x, 0.55, binPos.z, lower).rotation.x = Math.PI / 2;
  const binBalls = new THREE.Group();
  lower.add(binBalls);

  // the clerk's desk, facing the door
  desk(lower, 2.2, 0.6, Math.PI);
  chair(lower, 2.2, -0.35, 0);
  const clerk = folk(lower, 2.2, -0.35, 0, { pose: 'type', seat: 0.48, look: { hat: 'bowler', glasses: true, scarf: true } });
  typewriter(lower, 2.2, 0.85, 0.45, Math.PI);
  cyl(lower, 0.06, 0.05, 0.12, M.white, 1.3, 0.91, 0.75, 10);
  steam(lower, 1.3, 0.99, 0.75);
  for (let i = 0; i < 4; i++) box(lower, 0.32, 0.015, 0.42, M.white, 3.0, 0.86 + i * 0.016, 0.7).rotation.y = i * 0.12;
  cyl(lower, 0.03, 0.03, 0.4, dark, 3.05, 1.0, 0.25, 6).rotation.z = 1.3; // a pen
  box(lower, 0.5, 0.2, 0.36, M.planks, 1.35, 0.95, 0.35);                  // in-tray
  signBoard(lower, 2.2, 0.5, 1.1, 1.0, 0.24, 'Clerk');

  // fireplace on the left wall, with armchairs around it
  const fire = fireplace(lower, -W / 2 + 0.32, 0.1);
  // the mantel's front edge, clear of the chimney breast behind it
  const MX = -W / 2 + 0.68;
  const progressJar = jar(lower, MX, 1.42, -0.95);
  let plaque = null;
  const setPlaque = (n) => {
    if (plaque) lower.remove(plaque);
    plaque = signBoard(lower, MX, 1.6, 1.05, 0.72, 0.24, n === 1 ? 'Streak: 1 day' : `Streak: ${n} days`, Math.PI / 2);
    plaque.rotation.z = -0.12; // leaning back against the chimney
  };
  for (const zz of [-0.35, 0.5]) { cyl(lower, 0.06, 0.07, 0.05, dark, MX, 1.45, zz, 10); cyl(lower, 0.035, 0.035, 0.24, M.white, MX, 1.6, zz, 8); } // candles
  picture(lower, -W / 2 + 0.6, 2.9, 0.1, 1.0, 1.1, Math.PI / 2, 'portrait');
  // two armchairs angled in toward the fire, a low table between them and the hearth
  const fireSpot = new THREE.Vector3(-W / 2 + 0.6, 0, 0.1);
  armchair(lower, -3.3, -1.75, fireSpot);
  armchair(lower, -3.3, 1.95, fireSpot);
  lowTable(lower, -4.5, 0.1, Math.PI / 2);
  cyl(lower, 0.16, 0.2, 0.5, M.planks, -2.7, 0.25, 0.1, 10);                     // a side table behind them
  cyl(lower, 0.1, 0.07, 0.2, M.white, -2.7, 0.6, 0.1, 10);
  rug(lower, -4.0, 0.1, 3.4, 2.8, Math.PI / 2, 0);
  // firewood in a pyramid by the chimney, and the fire tools on their stand
  logPile(lower, -W / 2 + 0.45, -2.45, 4, 0);
  toolStand(lower, -W / 2 + 0.55, 1.75);

  // filing cabinets under the landing, coat rack and bench by the door
  for (const x of [4.75, 5.45]) {
    box(lower, 0.65, 1.4, 0.65, M.white, x, 0.7, -4.5);
    for (const y of [0.35, 0.8, 1.2]) box(lower, 0.25, 0.05, 0.04, dark, x, y, -4.15);
  }
  coatRack(lower, -2.5, 4.25);
  // an umbrella stand by the coat rack, with an umbrella in it
  cyl(lower, 0.15, 0.13, 0.55, M.planks, -3.15, 0.27, 4.45, 10);
  cyl(lower, 0.012, 0.012, 0.9, dark, -3.1, 0.65, 4.45, 4).rotation.z = 0.12;
  mesh(new THREE.ConeGeometry(0.17, 0.16, 8), dark, -3.1, 1.13, 4.45, lower).rotation.z = 0.12;
  box(lower, 1.4, 0.08, 0.45, M.planks, -4.4, 0.45, 4.55);
  for (const x of [-4.95, -3.85]) box(lower, 0.08, 0.45, 0.4, M.white, x, 0.22, 4.55);
  folk(lower, -4.6, 4.55, Math.PI, { pose: 'sit', seat: 0.5, look: { hat: 'top', scarf: true } });
  rug(lower, 0.1, 2.5, 3.6, 2.4, 0, 1);
  plant(lower, -5.3, -4.3, 1.1);
  plant(lower, 5.35, 4.3, 1.1); // in the corner, clear of the door and the stairs
  wallShelf(lower, -W / 2 + 0.05, 3.0, -1.7, 0.8, Math.PI / 2, rand);   // clear of the curtains at the window beside it

  // the tall clock against the back wall: a case, a face with slim hands, and a
  // pendulum swinging side to side behind a glass window
  const CZ = -D / 2 + 0.28, CX = 3.15; // clear of the back window at x 4.6
  box(lower, 0.7, 0.14, 0.52, M.planks, CX, 0.07, CZ);                    // plinth
  box(lower, 0.6, 2.2, 0.44, M.planks, CX, 1.24, CZ);                      // case
  box(lower, 0.72, 0.12, 0.54, M.planks, CX, 2.4, CZ);                     // hood
  box(lower, 0.5, 0.2, 0.4, M.white, CX, 2.52, CZ).rotation.z = 0;         // crown
  const face = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 24), [M.white, M.clock, M.white], CX, 1.98, CZ + 0.23, lower);
  face.rotation.x = Math.PI / 2;
  clockHands(lower, CX, 1.98, CZ + 0.26, 0.23);
  box(lower, 0.44, 1.0, 0.02, M.deep, CX, 1.0, CZ + 0.225).castShadow = false;   // the dark back of the window onto the pendulum
  for (const dx of [-0.25, 0.25]) box(lower, 0.05, 1.08, 0.05, M.white, CX + dx, 1.0, CZ + 0.235);
  box(lower, 0.55, 0.05, 0.05, M.white, CX, 1.52, CZ + 0.235);
  box(lower, 0.55, 0.05, 0.05, M.white, CX, 0.48, CZ + 0.235);
  const pendulum = new THREE.Group();                                      // pivots at the top of the window
  pendulum.position.set(CX, 1.48, CZ + 0.255);              // in front of the dark back, so you see it swing
  box(pendulum, 0.02, 0.78, 0.014, M.white, 0, -0.39, 0);
  cyl(pendulum, 0.08, 0.08, 0.03, M.white, 0, -0.8, 0, 16).rotation.x = Math.PI / 2;
  lower.add(pendulum);
  swingSign(pendulum, 'z', 0.15, 2.4);                                     // about the z axis: side to side

  const lamps = [pendant(lower, 2.2, 2.6, 0.6, F - 0.3), pendant(lower, -0.5, 3.15, -3.6, F - 0.3)];
  const chand = chandelier(lower, -0.8, 3.1, 1.6, F - 0.3);
  return { board, binPos, binBalls, clerk, fire, progressJar, setPlaque, lamps, chand };
}
