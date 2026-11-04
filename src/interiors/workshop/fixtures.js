// What the workshop floor holds: the idea wall and the little table under
// it, the workbench with the lighthouse being built on it, the bulb swaying
// over it, the chalkboard, the stove with the kettle, the clockwork's gears
// on the drum, the tool wall, the jars of parts, and the keeper, who walks
// up and down with your newest idea in her hand.
import * as THREE from 'three';
import { M, stamp, mesh, box, cyl } from '../../kit.js';
import { folk } from '../../folks.js';
import { picture, gear, pegboard, coatRack, logPile, rug, wallShelf } from '../../decor.js';
import { swingSign, steam, sway } from '../../life.js';
import { piece } from '../../layout.js';
import { D, W, CEIL, TOWER, at } from './dims.js';
import { wallClock } from '../common.js';
import { iron, brass, dark, flame, jarGlass } from './materials.js';
import { ideaWall, chalkboard } from './displays.js';

// A jar of small parts: screws, springs, lamp wicks. The glass is see-through
// and kept out of the outline pass, like the town hall's jar.
function partsJar(p, x, y, z, r = 0.09, h = 0.22) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const glass = mesh(new THREE.CylinderGeometry(r, r, h, 12, 1, true), jarGlass, 0, h / 2, 0, g);
  glass.castShadow = false;
  glass.userData.inkSkip = true;
  for (const ry of [0, h]) mesh(new THREE.TorusGeometry(r, 0.008, 4, 14), M.white, 0, ry, 0, g).rotation.x = Math.PI / 2;
  cyl(g, r - 0.004, r - 0.004, 0.03, M.planks, 0, h + 0.015, 0, 12);                 // the cork
  for (let i = 0; i < 5; i++) {                                                       // what's in it
    const a = i * 1.7;
    box(g, 0.022, 0.022, 0.05, M.white, Math.cos(a) * r * 0.45, 0.03 + (i % 3) * 0.03, Math.sin(a) * r * 0.45).rotation.set(a, a * 2, 0);
  }
  return g;
}

// A lamp that comes on in the evening: a bulb and the light it throws.
function bulbLamp(p, x, y, z, range = 3.4) {
  const bulb = mesh(new THREE.SphereGeometry(0.07, 10, 8), M.white, x, y, z, p);
  bulb.castShadow = false;
  const light = new THREE.PointLight('#ffe9b5', 0, range, 1.6);
  light.position.set(x, y, z);
  p.add(light);
  return { bulb, light };
}

// The lighthouse being built on the bench: a striped drum on a base board,
// its gallery and lantern still off to one side, a scaffold of sticks round it.
function modelTower(p, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = -0.4;
  p.add(g);
  box(g, 0.44, 0.03, 0.34, M.planks, 0, 0.015, 0);
  cyl(g, 0.07, 0.1, 0.46, M.stripes, -0.05, 0.26, 0, 14);
  cyl(g, 0.12, 0.12, 0.02, M.white, -0.05, 0.5, 0, 14);
  for (let i = 0; i < 6; i++) {                                   // the scaffold
    const a = (i / 6) * Math.PI * 2;
    cyl(g, 0.006, 0.006, 0.5, M.planks, -0.05 + Math.cos(a) * 0.16, 0.26, Math.sin(a) * 0.16, 4);
  }
  for (const ry of [0.14, 0.4]) mesh(new THREE.TorusGeometry(0.16, 0.005, 3, 14), M.planks, -0.05, ry, 0, g).rotation.x = Math.PI / 2;
  // the lantern room, waiting on its side, and the file that shaped it
  const lantern = cyl(g, 0.08, 0.08, 0.12, M.white, 0.16, 0.06, 0.1, 10);
  lantern.rotation.z = Math.PI / 2;
  mesh(new THREE.ConeGeometry(0.1, 0.09, 10), M.white, 0.16, 0.06, -0.06, g).rotation.x = -Math.PI / 2;
  cyl(g, 0.01, 0.01, 0.18, dark, 0.1, 0.05, -0.14, 5).rotation.set(0, 0.6, Math.PI / 2);
  return g;
}

export function furnishWorkshop(lower, rand) {
  const colliders = [];
  const col = (x, z, r) => { const c = { x, z, r }; colliders.push(c); return c; };
  const boxCol = (x, z, hw, hd, rot = 0) => { const c = { x, z, hw, hd, rot }; colliders.push(c); return c; };
  const spots = {
    wall: new THREE.Vector3(1.3, 0, -2.9),      // stand back and read the idea wall
    bench: new THREE.Vector3(2.6, 0, 0.4),      // see what's on the bench
    chalk: new THREE.Vector3(-4.4, 0, 1.7),     // rub out the chalkboard and draw it again
  };
  const lamps = [];

  // ---------- the idea wall ----------
  // Every note is one of your ideas (displays.js fills it), string running
  // from pin to pin, and under it the table where the next one gets written.
  const wall = ideaWall(lower, 1.9, 2.0, -D / 2 + 0.09, 4.8, 2.0);
  piece(lower, 'ideas.card-table', [1.9, -4.3], (g) => {
    box(g, 2.0, 0.08, 0.6, M.planks, 1.9, 0.86, -4.3);
    for (const x of [1.05, 2.75]) for (const z of [-4.5, -4.1]) box(g, 0.07, 0.86, 0.07, M.planks, x, 0.43, z);
    for (let i = 0; i < 5; i++) box(g, 0.3, 0.012, 0.22, M.white, 1.2 + (i % 2) * 0.06, 0.91 + i * 0.013, -4.3).rotation.y = i * 0.3;
    cyl(g, 0.07, 0.06, 0.1, M.white, 2.5, 0.95, -4.35, 10);                     // a pot of pins
    for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(0.03, 6, 5), stamp.ideas, 2.5 + Math.cos(i) * 0.03, 1.02, -4.35 + Math.sin(i) * 0.03, g);
    cyl(g, 0.008, 0.008, 0.17, dark, 2.1, 0.91, -4.1, 5).rotation.set(0, 0.5, Math.PI / 2);
    partsJar(g, 2.75, 0.9, -4.3, 0.07, 0.16);
  }, [spots.wall, boxCol(1.9, -4.3, 1.0, 0.34)]);

  // ---------- the workbench ----------
  let bench;
  piece(lower, 'ideas.bench', [2.6, -0.9], (g) => {
    bench = g;
    box(g, 3.6, 0.1, 0.85, M.planks, 2.6, 0.95, -0.9);
    for (const x of [1.0, 4.2]) for (const z of [-1.24, -0.56]) box(g, 0.1, 0.9, 0.1, M.white, x, 0.45, z);
    box(g, 3.4, 0.06, 0.7, M.planks, 2.6, 0.34, -0.95);                          // the shelf under it
    for (const [x, w] of [[1.3, 0.5], [2.0, 0.26], [3.5, 0.6]]) box(g, w, 0.1, 0.22, M.white, x, 0.43, -0.95 + rand() * 0.2);
    box(g, 3.5, 0.2, 0.05, M.planks, 2.6, 1.1, -1.3);                            // a back rail
    // the vice at the right end, a saw and a mallet, the glue pot and the pins
    box(g, 0.2, 0.16, 0.26, iron, 4.1, 1.08, -0.72);
    box(g, 0.1, 0.14, 0.26, iron, 3.92, 1.07, -0.72);
    cyl(g, 0.02, 0.02, 0.3, brass, 3.78, 1.07, -0.72, 8).rotation.z = Math.PI / 2;
    box(g, 0.5, 0.16, 0.02, M.white, 3.3, 1.1, -1.15).rotation.z = 0.12;         // the saw
    box(g, 0.16, 0.05, 0.05, M.planks, 3.0, 1.06, -1.15);
    cyl(g, 0.05, 0.05, 0.14, M.planks, 1.5, 1.07, -0.65, 10).rotation.z = Math.PI / 2;  // the mallet
    cyl(g, 0.012, 0.012, 0.22, M.planks, 1.5, 1.07, -0.8, 5).rotation.set(Math.PI / 2, 0, 0.2);
    cyl(g, 0.055, 0.05, 0.1, M.white, 2.9, 1.05, -0.6, 10);                      // the glue pot
    partsJar(g, 3.6, 1.0, -0.62, 0.08, 0.2);
    modelTower(g, 2.1, 1.0, -0.78);
    // shavings and offcuts on the floor
    for (let i = 0; i < 9; i++) {
      const s = mesh(new THREE.IcosahedronGeometry(0.05 + rand() * 0.04, 0), M.white, 1.1 + rand() * 3.2, 0.04, -0.3 + rand() * 0.8, g);
      s.rotation.set(rand() * 3, rand() * 3, 0);
      s.castShadow = false;
    }
    for (const [x, z] of [[1.0, 0.1], [4.3, -0.2]]) box(g, 0.3, 0.1, 0.16, M.planks, x, 0.05, z).rotation.y = x;
  }, [spots.bench, boxCol(2.6, -0.9, 1.9, 0.52)]);
  // the lamp clamped to the bench's rail
  const clamp = new THREE.Group();
  bench.add(clamp);
  cyl(clamp, 0.02, 0.02, 0.5, dark, 1.2, 1.35, -1.28, 6);
  cyl(clamp, 0.03, 0.09, 0.14, M.white, 1.2, 1.6, -1.14, 10).rotation.x = 1.1;
  lamps.push(bulbLamp(clamp, 1.2, 1.56, -1.1, 3.0));

  // ---------- the bulb on its cord ----------
  // It sways over the bench, and it is lit whatever the hour: this is the
  // ideas district, and that is what a bulb is for.
  const cord = new THREE.Group();
  cord.position.set(2.6, CEIL, -0.9);
  cyl(cord, 0.014, 0.014, 1.5, M.white, 0, -0.75, 0, 4).castShadow = false;
  cyl(cord, 0.07, 0.1, 0.1, M.white, 0, -1.52, 0, 10);
  const bulb = mesh(new THREE.SphereGeometry(0.17, 14, 10), flame, 0, -1.68, 0, cord);
  bulb.castShadow = false;
  const bulbLight = new THREE.PointLight('#ffe9b5', 0, 7, 1.5);
  bulbLight.position.set(0, -1.7, 0);
  cord.add(bulbLight);
  lower.add(cord);
  swingSign(cord, 'x', 0.05, 1.1);

  // ---------- the keeper ----------
  // Up and down in front of the wall, reading what she has just pinned up.
  const keeper = folk(lower, 0, 0, 0, {
    walk: { path: [[2.2, -2.4], [4.6, -2.4]], speed: 0.45 },
    look: { hat: 'cap', hair: 'bun', item: 'paper', scarf: true },
  });

  // ---------- on the drum ----------
  // The clockwork that turns the lamp, geared off the weight in the well;
  // the plans for it pinned up beside; the tool wall; a cat, drawn over the
  // archway by somebody idle.
  const gearAt = 1.58, R0 = TOWER.r + TOWER.t;
  const tangent = (th, d) => [Math.cos(th) * d, -Math.sin(th) * d];     // along the drum, d meters
  const [gx, gz] = at(gearAt, R0 + 0.1);
  const [tx, tz] = tangent(gearAt, 0.16);
  box(lower, 1.5, 1.6, 0.06, M.white, gx + tx, 2.72, gz + tz).rotation.y = gearAt;   // the plate they turn on
  gear(lower, gx, 2.45, gz, 0.42, 0.55, gearAt);
  const [sx, sz] = tangent(gearAt, 0.32);
  gear(lower, gx + sx, 3.05, gz + sz, 0.26, -0.9, gearAt);
  const [kx, kz] = at(gearAt, R0 + 0.16);
  const [ox, oz] = tangent(gearAt, -0.62);
  cyl(lower, 0.028, 0.028, 0.26, brass, kx + ox, 2.05, kz + oz, 6).rotation.set(Math.PI / 2, gearAt, 0);
  box(lower, 0.05, 0.28, 0.05, brass, kx + ox + Math.sin(gearAt) * 0.12, 1.92, kz + oz + Math.cos(gearAt) * 0.12);   // its crank
  const [bx, bz] = at(0.14, R0 + 0.07);
  picture(lower, bx, 2.3, bz, 1.3, 0.95, 0.14, 'blueprint');
  const [cax, caz] = at(0.9, R0 + 0.04);
  picture(lower, cax, 3.1, caz, 0.5, 0.5, 0.9, 'cat');
  const [px, pz] = at(-0.55, R0 + 0.13);
  pegboard(lower, px, 2.1, pz, -0.55);
  // the toolbox under it, and a coil of rope
  piece(lower, 'ideas.toolbox', [px + 0.5, pz + 0.5], (g) => {
    box(g, 0.66, 0.3, 0.34, M.white, px + 0.5, 0.15, pz + 0.5).rotation.y = -0.55;
    box(g, 0.5, 0.05, 0.05, M.white, px + 0.5, 0.36, pz + 0.5).rotation.y = -0.55;
    box(g, 0.1, 0.06, 0.03, stamp.ideas, px + 0.74, 0.18, pz + 0.38).rotation.y = -0.55;
    for (let i = 0; i < 4; i++) mesh(new THREE.TorusGeometry(0.16 + i * 0.015, 0.03, 4, 16), M.white, px + 0.1, 0.04 + i * 0.03, pz + 1.1, g).rotation.x = Math.PI / 2;
  }, [col(px + 0.5, pz + 0.5, 0.45)]);

  // ---------- the chalkboard ----------
  const chalk = chalkboard(lower, -W / 2 + 0.12, 1.95, 1.7, Math.PI / 2);
  piece(lower, 'ideas.stool', [-3.8, 3.0], (g) => {
    cyl(g, 0.21, 0.19, 0.06, M.planks, -3.8, 0.52, 3.0, 12);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = cyl(g, 0.025, 0.03, 0.52, M.planks, -3.8 + Math.cos(a) * 0.15, 0.26, 3.0 + Math.sin(a) * 0.15, 6);
      leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    }
  }, [col(-3.8, 3.0, 0.3)]);
  piece(lower, 'ideas.rug', [-4.4, 1.9], (g) => rug(g, -4.4, 1.9, 2.4, 1.8, 0.08, 1));

  // ---------- the window wall ----------
  wallShelf(lower, -W / 2 + 0.1, 1.5, 3.6, 1.1, Math.PI / 2, rand);
  for (const [z, r] of [[3.3, 0.08], [3.75, 0.1]]) partsJar(lower, -W / 2 + 0.26, 1.54, z, r, 0.2);
  wallClock(lower, 0.9, 2.9);

  // ---------- the stove ----------
  // Iron, round, with the kettle on it and the flue up through the ceiling.
  const fire = { light: new THREE.PointLight('#ffb46a', 0, 6, 1.7), grate: null };
  piece(lower, 'ideas.stove', [4.9, 3.1], (g) => {
    cyl(g, 0.44, 0.48, 0.12, iron, 4.9, 0.06, 3.1, 16);
    cyl(g, 0.4, 0.42, 0.78, iron, 4.9, 0.51, 3.1, 16);
    cyl(g, 0.48, 0.46, 0.06, iron, 4.9, 0.93, 3.1, 16);
    cyl(g, 0.1, 0.1, 2.3, iron, 4.9, 2.11, 3.1, 10);                      // the flue
    for (const y of [1.3, 1.9]) mesh(new THREE.TorusGeometry(0.11, 0.02, 4, 12), M.white, 4.9, y, 3.1, g).rotation.x = Math.PI / 2;
    // the door, its grate glowing, and the handle
    const door = box(g, 0.34, 0.34, 0.04, iron, 4.55, 0.5, 3.1);
    door.rotation.y = Math.PI / 2;
    fire.grate = box(g, 0.22, 0.14, 0.02, flame, 4.52, 0.47, 3.1);
    fire.grate.rotation.y = Math.PI / 2;
    fire.grate.castShadow = false;
    for (let i = 0; i < 3; i++) box(g, 0.02, 0.14, 0.03, dark, 4.5, 0.47, 3.04 + i * 0.06);
    cyl(g, 0.02, 0.02, 0.1, brass, 4.5, 0.62, 3.26, 6).rotation.z = Math.PI / 2;
    fire.light.position.set(4.6, 0.5, 3.1);
    g.add(fire.light);
    // the kettle, steaming
    cyl(g, 0.13, 0.16, 0.18, M.white, 4.88, 1.05, 3.05, 12);
    cyl(g, 0.02, 0.03, 0.12, M.white, 5.04, 1.12, 3.0, 6).rotation.set(0, 0.4, -0.8);
    mesh(new THREE.TorusGeometry(0.11, 0.012, 4, 12), M.white, 4.88, 1.16, 3.05, g).rotation.x = 0.4;
    steam(g, 5.08, 1.22, 2.96);
    // a coal scuttle and the poker
    cyl(g, 0.16, 0.12, 0.24, M.white, 5.5, 0.12, 3.5, 10);
    cyl(g, 0.016, 0.016, 0.8, dark, 5.42, 0.42, 3.2, 5).rotation.set(0.3, 0, 0.25);
  }, [col(4.9, 3.1, 0.62), col(5.5, 3.5, 0.2)]);
  piece(lower, 'ideas.firewood', [5.3, 1.5], (g) => logPile(g, 5.3, 1.5, 3, -Math.PI / 2), [col(5.3, 1.5, 0.55)]);

  // ---------- the jars and bottles in the back corner ----------
  piece(lower, 'ideas.jar-shelf', [5.3, -4.4], (g) => {
    for (const x of [4.76, 5.84]) box(g, 0.08, 2.2, 0.4, M.planks, x, 1.1, -4.4);
    for (const y of [0.5, 1.1, 1.7, 2.18]) box(g, 1.16, 0.06, 0.4, M.planks, 5.3, y, -4.4);
    for (const [x, y, r, h] of [[4.95, 0.53, 0.1, 0.24], [5.22, 0.53, 0.08, 0.2], [5.6, 0.53, 0.11, 0.26], [5.0, 1.13, 0.09, 0.22], [5.3, 1.13, 0.1, 0.3], [5.62, 1.13, 0.07, 0.18], [5.1, 1.73, 0.08, 0.2]]) {
      partsJar(g, x, y + 0.03, -4.4 + ((x * 7) % 3) * 0.04, r, h);
    }
    for (const [x, hh] of [[5.5, 0.34], [5.72, 0.28]]) {                      // bottles of oil
      cyl(g, 0.05, 0.07, hh, M.white, x, 1.76 + hh / 2, -4.42, 10);
      cyl(g, 0.022, 0.022, 0.08, M.white, x, 1.76 + hh + 0.04, -4.42, 8);
    }
    mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass, 4.95, 2.31, -4.4, g).rotation.x = Math.PI;
    box(g, 1.3, 0.1, 0.5, M.planks, 5.3, 2.26, -4.4);
  }, [boxCol(5.3, -4.4, 0.62, 0.26)]);

  // ---------- by the door ----------
  piece(lower, 'ideas.crates', [-5.0, 4.0], (g) => {
    for (const [x, z, s] of [[-5.1, 3.7, 0.86], [-4.5, 4.3, 0.66], [-5.3, 4.4, 0.6]]) {
      const c = box(g, s, s, s, M.planks, x, s / 2, z);
      c.rotation.y = x * 0.4;
      box(g, s * 0.9, 0.05, s * 0.9, M.white, x, s - 0.02, z).rotation.y = x * 0.4;
    }
    // a hurricane lantern on the tallest crate
    const l = new THREE.Group();
    l.position.set(-5.1, 0.88, 3.7);
    g.add(l);
    cyl(l, 0.1, 0.12, 0.05, iron, 0, 0.025, 0, 10);
    cyl(l, 0.08, 0.08, 0.18, M.white, 0, 0.14, 0, 10).castShadow = false;
    mesh(new THREE.SphereGeometry(0.035, 8, 6), flame, 0, 0.14, 0, l).castShadow = false;
    cyl(l, 0.1, 0.09, 0.06, iron, 0, 0.26, 0, 10);
    mesh(new THREE.TorusGeometry(0.06, 0.008, 4, 12), iron, 0, 0.33, 0, l);
    for (let i = 0; i < 5; i++) mesh(new THREE.TorusGeometry(0.17 + i * 0.012, 0.025, 4, 16), M.white, -4.4, 0.03 + i * 0.025, 4.9, g).rotation.x = Math.PI / 2;
  }, [col(-5.0, 4.0, 0.75)]);
  piece(lower, 'ideas.coat-rack', [-1.9, 4.4], (g) => coatRack(g, -1.9, 4.4), [col(-1.9, 4.4, 0.35)]);
  // a potted thing by the door that somebody is keeping alive
  piece(lower, 'ideas.sprout', [1.8, 4.4], (g) => {
    cyl(g, 0.17, 0.13, 0.24, M.planks, 1.8, 0.12, 4.4, 12);
    cyl(g, 0.19, 0.19, 0.04, M.planks, 1.8, 0.25, 4.4, 12);
    const top = new THREE.Group();
    top.position.set(1.8, 0.27, 4.4);
    g.add(top);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const stem = cyl(top, 0.01, 0.014, 0.4, M.white, Math.cos(a) * 0.05, 0.2, Math.sin(a) * 0.05, 4);
      stem.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      mesh(new THREE.SphereGeometry(0.09, 8, 6).scale(1, 0.3, 0.6), M.white, Math.cos(a) * 0.14, 0.4, Math.sin(a) * 0.14, top).rotation.y = -a;
    }
    sway(top, 0.03);
  }, [col(1.8, 4.4, 0.25)]);

  return { colliders, spots, lamps, wall, chalk, keeper, fire, bulb: { bulb, light: bulbLight } };
}
