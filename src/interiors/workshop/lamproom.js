// The lamp room, at the top of the stair: the lens on its pedestal, turning;
// the clockwork that turns it, with its weight hanging down the open well;
// the keeper's log on a lectern; the tide table on the parapet; and a brass
// telescope at the glass, pointed out to sea.
import * as THREE from 'three';
import { M, mesh, box, cyl } from '../../kit.js';
import { skipND } from '../../life.js';
import { F, TOWER, THETA0, DECK, at } from './dims.js';
import { bar, point } from './shell.js';
import { iron, brass, dark, prism, flame, beamGlow } from './materials.js';
import { keepersLog, tideTable } from './displays.js';

// A brass telescope on a tripod, aimed up through the glazing.
function telescope(p, th, r) {
  const g = new THREE.Group();
  const [x, z] = at(th, r);
  g.position.set(x, F, z);
  g.rotation.y = th;
  p.add(g);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(g, 0.016, 0.02, 1.1, M.planks, Math.cos(a) * 0.17, 0.55, Math.sin(a) * 0.17, 6);
    leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
  }
  cyl(g, 0.05, 0.05, 0.08, brass, 0, 1.12, 0, 10);
  const tube = new THREE.Group();
  tube.position.set(0, 1.2, 0);
  tube.rotation.x = -0.45;          // tipped up, out through the glass
  g.add(tube);
  cyl(tube, 0.065, 0.075, 0.82, brass, 0, 0, 0, 14).rotation.x = Math.PI / 2;
  cyl(tube, 0.05, 0.05, 0.3, brass, 0, 0, -0.5, 12).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.08, 0.012, 4, 14), brass, 0, 0, 0.4, tube).rotation.x = Math.PI / 2;
  cyl(tube, 0.02, 0.02, 0.1, dark, 0.07, -0.05, -0.64, 8).rotation.set(Math.PI / 2, 0, 0.4);
  return g;
}

export function furnishLampRoom(upper) {
  const colliders = [];
  const spots = {};

  // ---------- the lens ----------
  // A drum of cut glass rings in a brass cage, the lamp burning inside it,
  // and two beams leaving it: the only turning light in the town.
  cyl(upper, 0.56, 0.62, 0.86, brass, TOWER.x, F + 0.43, TOWER.z, 20);          // the pedestal
  for (const y of [F + 0.1, F + 0.78]) mesh(new THREE.TorusGeometry(0.6, 0.03, 4, 24), M.white, TOWER.x, y, TOWER.z, upper).rotation.x = Math.PI / 2;
  const lens = new THREE.Group();
  lens.position.set(TOWER.x, F + 1.52, TOWER.z);
  upper.add(lens);
  for (let i = 0; i < 11; i++) {
    const y = -0.6 + i * 0.12;
    const r = 0.62 - ((i - 5) / 5) ** 2 * 0.2;      // fattest round the middle, like a belt of prisms
    mesh(new THREE.TorusGeometry(r, 0.055, 4, 28), prism, 0, y, 0, lens).rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 8; i++) {                      // the cage
    const a = (i / 8) * Math.PI * 2;
    cyl(lens, 0.022, 0.022, 1.5, brass, Math.cos(a) * 0.66, 0, Math.sin(a) * 0.66, 5);
  }
  for (const y of [-0.74, 0.74]) mesh(new THREE.TorusGeometry(0.66, 0.035, 4, 24), brass, 0, y, 0, lens).rotation.x = Math.PI / 2;
  cyl(lens, 0.3, 0.3, 0.06, brass, 0, 0.78, 0, 16);
  cyl(lens, 0.04, 0.04, 0.5, brass, 0, 1.05, 0, 8);                             // up to the vent in the cap
  const lamp = mesh(new THREE.SphereGeometry(0.15, 14, 10), flame, 0, -0.05, 0, lens);
  lamp.castShadow = false;
  const light = new THREE.PointLight('#ffe9b5', 0, 11, 1.4);
  lens.add(light);
  const beams = [];
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.3, 16, 1, true), beamGlow);
    cone.rotation.z = s * Math.PI / 2;               // the tip at the lamp, widening to the glass
    cone.position.x = s * 1.15;
    cone.castShadow = false;
    cone.userData.inkSkip = true;
    cone.visible = false;
    skipND.push(cone);
    beams.push(cone);
    lens.add(cone);
  }

  // ---------- the clockwork ----------
  // A brass train under the lens, and the weight it runs on: a lead cylinder
  // on a chain down the open well. It sinks all day; winding it is the station.
  const wind = THETA0 + DECK - 0.5;                  // by the railing, over the well
  const gearbox = new THREE.Group();
  const [bx, bz] = at(wind, 0.82);
  gearbox.position.set(bx, F, bz);
  gearbox.rotation.y = wind;
  upper.add(gearbox);
  box(gearbox, 0.42, 0.34, 0.3, brass, 0, 0.17, 0);
  for (const [gx, gy, r] of [[-0.1, 0.22, 0.12], [0.11, 0.3, 0.07]]) {
    const w = cyl(gearbox, r, r, 0.03, M.white, gx, gy, 0.17, 14);
    w.rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      box(gearbox, 0.022, 0.03, 0.03, M.white, gx + Math.cos(a) * r, gy + Math.sin(a) * r, 0.17);
    }
  }
  cyl(gearbox, 0.03, 0.03, 0.26, brass, 0.22, 0.2, 0.1, 8).rotation.y = Math.PI / 2;
  box(gearbox, 0.04, 0.22, 0.04, brass, 0.33, 0.1, 0.1);                        // the crank
  mesh(new THREE.SphereGeometry(0.035, 8, 6), M.planks, 0.33, -0.02, 0.1, gearbox);
  // the pulley on an arm out over the open well, and the weight under it
  const over = THETA0 + DECK + 0.6;
  const arm = point(over, 1.2, F + 0.4);
  bar(upper, brass, point(wind, 0.8, F + 0.3), arm, 0.028);
  mesh(new THREE.TorusGeometry(0.09, 0.022, 4, 14), brass, arm.x, arm.y, arm.z, upper).rotation.y = over;
  const weight = new THREE.Group();
  weight.position.copy(arm);
  upper.add(weight);
  const chain = cyl(weight, 0.012, 0.012, 1, dark, 0, -0.5, 0, 4);              // scaled in update
  chain.castShadow = false;
  const lead = new THREE.Group();
  lead.position.y = -1;
  weight.add(lead);
  cyl(lead, 0.1, 0.1, 0.46, iron, 0, -0.23, 0, 12);
  for (const y of [-0.08, -0.38]) mesh(new THREE.TorusGeometry(0.1, 0.014, 4, 12), M.white, 0, y, 0, lead).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.035, 0.012, 4, 10), dark, 0, 0.02, 0, lead);

  // ---------- the log, the tide table, the telescope ----------
  const logAt = THETA0 + 0.62;
  const [lx, lz] = at(logAt, 2.1);
  const log = keepersLog(upper, lx, F, lz, logAt + Math.PI);
  colliders.push({ x: lx, z: lz, r: 0.3, level: 1 });
  const [tx, tz] = at(THETA0 + 1.45, TOWER.r - 0.06);
  tideTable(upper, tx, F + 1.15, tz, THETA0 + 1.45 + Math.PI);
  // a ledge on the parapet with the oil can and the spare wicks
  const ledgeAt = THETA0 + 2.05;
  const [sx, sz] = at(ledgeAt, TOWER.r - 0.2);
  box(upper, 1.1, 0.06, 0.34, M.planks, sx, F + 0.9, sz).rotation.y = ledgeAt;
  cyl(upper, 0.07, 0.09, 0.16, M.white, sx, F + 1.01, sz, 10);
  cyl(upper, 0.015, 0.015, 0.2, M.white, sx + 0.1, F + 1.12, sz, 5).rotation.set(0.3, 0, 0.9);
  box(upper, 0.22, 0.12, 0.16, M.planks, sx + 0.34, F + 0.99, sz).rotation.y = ledgeAt + 0.3;
  telescope(upper, THETA0 + 2.72, 1.9);

  // where you stand to use them (x and z only: actions.js ignores the height)
  const spot = (th, r) => { const [x, z] = at(th, r); return new THREE.Vector3(x, 0, z); };
  spots.log = spot(logAt, 1.35);
  spots.wind = spot(wind, 1.5);

  return { colliders, spots, lens: { group: lens, lamp, light, beams }, weight: { group: weight, chain, lead }, log };
}
