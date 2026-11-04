// The Works, inside: the Projects district as a workshop floor where your
// projects are physically on the go.
//
// A bay per project, in the order the card lists them: the trestles out in
// the middle of the floor first, then the benches down the walls. One is
// clamped and half built, one is a stack of pages with a pen beside it, one
// lies under a dust sheet with its finished piece set aside on the done
// shelf. Over it all the sawtooth roof's three teeth drop north light onto
// the floor, and behind the bays the machine shop runs off one line shaft:
// the lathe, the grindstone, the flywheel, and the forge that feeds the
// smokestack you see from the plaza.
//
// Built like the single-storey rooms (interiors/common.js) but with its own
// shell (shell.js), because the roof is the whole point of the building.
import * as THREE from 'three';
import { M } from '../../kit.js';
import { isNight, hourNow } from '../../life.js';
import { DISTRICTS } from '../../districts/index.js';
import { folk } from '../../folks.js';
import { piece } from '../../layout.js';
import { crate } from '../../plaza/props.js';
import { atWork, backAt } from '../../plaza/routines.js';
import { sfx } from '../../sound/index.js';
import { wallClock } from '../common.js';
import { W, D, EAVES, BAYS, SHAFT, LATHE, GRINDER, FORGE } from './dims.js';
import { lampOn, belt as beltMat } from './materials.js';
import { buildShell } from './shell.js';
import {
  bench, trestles, dustSheet, pendant, lineShaft, flatBelt, lathe, grindstone, clutchLever,
  forge, toolWall, timberRack, doneShelf, hoist, anvil, quenchBarrel, sawdust, broom, partsChest, stool, teaCrate,
} from './fixtures.js';
import { jobBoard, bayCard, buildWork, finishedPiece, tally } from './displays.js';

const COUNT = ['Nothing', 'One thing', 'Two', 'Three', 'Four', 'Five', 'Six'];
const short = (s) => (s.length > 24 ? `${s.slice(0, 23)}…` : s);

export function works(scene, rand, lights) {
  const { cutaway } = buildShell(scene);
  const colliders = [];
  const col = (x, z, r) => { const c = { x, z, r }; colliders.push(c); return c; };
  const boxCol = (x, z, hw, hd, rot = 0) => { const c = { x, z, hw, hd, rot }; colliders.push(c); return c; };
  const lamps = [];

  // ---------- a bay per project ----------
  const bays = BAYS.map((b) => {
    const spot = new THREE.Vector3(b.spot[0], 0, b.spot[1]);
    const bay = { spot, where: b.where, busy: false };
    piece(scene, `works.${b.id}`, [b.x, b.z], (p) => {
      const g = new THREE.Group();
      g.position.set(b.x, 0, b.z);
      g.rotation.y = b.rotY;
      p.add(g);
      const built = b.kind === 'bench' ? bench(g, b.len) : trestles(g, b.len);
      const card = bayCard(g, built.card);
      const work = new THREE.Group();
      work.position.set(...built.work);
      g.add(work);
      const sheet = dustSheet(g, built.sheet.w, built.sheet.d, built.sheet.y);
      sheet.visible = false;
      // what this bay holds: the work out on it, or a sheet over a finished one
      bay.set = (item) => {
        bay.busy = !!item && item[2] !== 'done';
        work.clear();
        if (bay.busy) buildWork(work, item, b.scale);
        sheet.visible = !!item && !bay.busy;
        card.set(item ? item[0] : '', item ? item[1] : '', !!item && !bay.busy);
        card.dot.visible = !!item;
        bay.station.label = !item ? 'A bench with nothing on it'
          : bay.busy ? `Look over “${short(item[0])}”` : 'Look under the dust sheet';
      };
    }, [spot, boxCol(b.x, b.z, b.col.hw, b.col.hd)]);
    bay.station = { point: spot, label: 'Look over the bench', app: 'projects' };
    lamps.push({ ...pendant(scene, ...b.lamp), bay });
    return bay;
  });

  // ---------- the job board, just inside the door ----------
  let board;
  const spots = {
    board: new THREE.Vector3(2.5, 0, 4.3),
    foreman: new THREE.Vector3(1.8, 0, 1.4),
    done: new THREE.Vector3(1.05, 0, -3.55),
    lever: new THREE.Vector3(2.4, 0, -1.15),
  };
  // turned toward the door, so you read it on your way in
  piece(scene, 'works.job-board', [3.55, 3.5], (p) => { board = jobBoard(p, 3.55, 3.5, -0.45); }, [spots.board, col(3.55, 3.5, 0.45)]);

  // ---------- the done shelf ----------
  let shelf, done, marks;
  piece(scene, 'works.done-shelf', [1.05, -4.7], (p) => {
    shelf = doneShelf(p, 1.05, -4.7);
    done = new THREE.Group();
    shelf.group.add(done);
    marks = tally(shelf.group, -1.4, 1.6, -0.12);
  }, [spots.done, boxCol(1.05, -4.7, 1.3, 0.32)]);

  // ---------- the machine shop ----------
  const shafting = lineShaft(scene);
  let turning, grinder, lever;
  piece(scene, 'works.lathe', [LATHE.x, LATHE.z], (p) => { turning = lathe(p, LATHE.x, LATHE.z); }, [boxCol(LATHE.x, LATHE.z, 1.25, 0.4)]);
  piece(scene, 'works.grindstone', [GRINDER.x, GRINDER.z], (p) => { grinder = grindstone(p, GRINDER.x, GRINDER.z); }, [col(GRINDER.x, GRINDER.z, 0.55)]);
  flatBelt(scene, 3.1, { y: SHAFT.y, z: SHAFT.z, r: 0.22 }, turning.drive);
  flatBelt(scene, 1.6, { y: SHAFT.y, z: SHAFT.z, r: 0.19 }, grinder.drive);
  piece(scene, 'works.lever', [2.4, -2.1], (p) => { lever = clutchLever(p, 2.4, -2.1); }, [spots.lever, col(2.4, -2.1, 0.2)]);
  lamps.push(pendant(scene, 4.6, 3.0, -0.7));
  lamps.push(pendant(scene, 3.4, 3.0, 4.0));

  // ---------- the forge ----------
  const hearth = forge(scene, FORGE.x, FORGE.z);
  boxCol(FORGE.x, FORGE.z, 1.18, 0.62);
  piece(scene, 'works.anvil', [2.6, -3.5], (p) => anvil(p, 2.6, -3.5, 0.4), [col(2.6, -3.5, 0.42)]);
  piece(scene, 'works.quench', [5.3, -4.2], (p) => quenchBarrel(p, 5.3, -4.2), [col(5.3, -4.2, 0.38)]);

  // ---------- around the walls ----------
  toolWall(scene, -1.9, 1.95, -D / 2 + 0.07);
  piece(scene, 'works.timber', [-4.8, -4.6], (p) => timberRack(p, -4.8, -4.6), [boxCol(-4.8, -4.6, 1.25, 0.45)]);
  piece(scene, 'works.parts-chest', [-5.6, 0], (p) => partsChest(p, -5.6, 0, Math.PI / 2), [boxCol(-5.6, 0, 0.3, 0.38)]);
  hoist(scene, -3.6);
  wallClock(scene, 0, 3.1);
  // the loading bay under the hoist: crates waiting to go out
  piece(scene, 'works.crates', [-4.0, 3.5], (p) => {
    crate(p, -4.3, 0, 3.3, 0.3, 0.72);
    crate(p, -3.4, 0, 4.1, -0.25, 0.56);
    crate(p, -4.26, 0.72, 3.34, 0.85, 0.5);
  }, [col(-4.3, 3.3, 0.52), col(-3.4, 4.1, 0.4)]);
  // sawdust where the work is, and the broom the sweeper left
  sawdust(scene, -4.6, 1.1, 1.0);
  sawdust(scene, 0.4, -0.1, 0.8);
  sawdust(scene, 4.5, -1.2, 0.7);
  broom(scene, -5.3, -4.2, 0.9);

  // ---------- the hands ----------
  // The Works keeps early hours (plaza/routines.js): the foreman walks the
  // floor, someone is at the bench and someone at the lathe, and a sweeper
  // keeps after the shavings.
  const foreman = folk(scene, 2.2, 0.5, -0.5, { pose: 'chat', look: { hat: 'cap', glasses: true } });
  col(2.2, 0.5, 0.35);
  const turner = folk(scene, LATHE.x + 0.2, LATHE.z + 0.95, Math.PI, { pose: 'feed', look: { hair: 'bun', glasses: true } });
  col(LATHE.x + 0.2, LATHE.z + 0.95, 0.32);
  const hands = [
    turner,
    folk(scene, -4.8, 1.15, -Math.PI / 2, { pose: 'feed', look: { hat: 'beanie' } }),
    folk(scene, -2.4, 1.8, -Math.PI / 2 - 0.4, { pose: 'sweep', look: { hat: 'cap', item: 'broom' } }),
  ];
  piece(scene, 'works.foremans-corner', [3.0, 1.5], (p) => {
    stool(p, 3.0, 1.5);
    teaCrate(p, 3.35, 0.6);
  }, [col(3.0, 1.5, 0.25), col(3.35, 0.6, 0.3)]);

  // ---------- what the shop is building ----------
  const items = () => DISTRICTS.projects.items || [];
  const refresh = () => {
    const rows = items();
    bays.forEach((bay, i) => bay.set(rows[i] || null));
    const finished = rows.filter((r) => r[2] === 'done');
    done.clear();
    finished.slice(0, shelf.slots.length).forEach((item, i) => finishedPiece(done, shelf.slots[i], item));
    marks.set(finished.length);
    board.set(rows);
  };
  DISTRICTS.projects.subscribe(refresh);
  refresh();

  // ---------- the shop's day ----------
  // The belts run while the shop is open; the lever lets you throw them in
  // or out of gear yourself, and the day puts them back as it finds them.
  let inGear = atWork('foreman'), wasOpen = inGear;
  let angle = 0, speed = inGear ? 1 : 0, last = 0;
  const leverStation = {
    point: spots.lever,
    label: 'Throw the line shaft into gear',
    use() {
      inGear = !inGear;
      sfx('tube', { at: spots.lever.clone().setY(1.4), room: 'projects' });
    },
  };

  function update(time) {
    const dt = Math.min(0.1, time - last); last = time;
    const open = atWork('foreman');
    if (open !== wasOpen) { wasOpen = open; inGear = open; }
    foreman.visible = open;
    for (const h of hands) h.visible = open;

    // the shafting: the belts take up slowly and coast down slower still
    speed += ((inGear ? 1 : 0) - speed) * Math.min(1, dt * (inGear ? 1.1 : 0.5));
    angle += speed * dt * 2.6;
    shafting.shaft.rotation.x = -angle;
    turning.spindle.rotation.x = -angle * 3.6;
    grinder.wheel.rotation.x = -angle * 2.4;
    beltMat.map.offset.y = (-angle * 0.42) % 1;
    lever.lever.rotation.x += ((inGear ? -0.42 : 0.42) - lever.lever.rotation.x) * Math.min(1, dt * 6);
    leverStation.label = inGear ? 'Take the line shaft out of gear' : 'Throw the line shaft into gear';

    // the sun crosses the sky with the real time; lamps come on in the evening
    const hour = hourNow();
    const day = THREE.MathUtils.clamp((hour - 6) / 13, 0, 1);
    const az = day * Math.PI;
    const dark = isNight() || hour < 6.5 || hour > 19.5;
    const evening = dark || hour >= 18 || hour < 7;
    lights.sun.position.set(Math.cos(az) * 16, 4 + Math.sin(az) * 14, 11);
    lights.sun.target.position.set(0, EAVES / 2, 0);
    lights.sun.intensity = dark ? Math.PI * 0.15 : Math.PI;
    for (const l of lamps) {
      const on = evening && (!l.bay || l.bay.busy);
      l.light.intensity = on ? 3.4 : 0;
      l.bulb.material = on ? lampOn : M.white;
    }

    // the forge, banked when the shop is shut, and the bellows breathing
    const breath = 1 + 0.12 * Math.sin(time * 1.6);
    const glow = (open ? 1 : 0.4) * breath;
    const frame = Math.floor(time * 7) % 2;
    for (const [i, flame] of hearth.flames.entries()) {
      const h = flame.userData.h * glow * (1 + ((i + frame) % 2 ? 0.14 : -0.1));
      flame.scale.set(glow, h, glow);
      flame.position.y = 0.98 + h / 2;
    }
    hearth.light.intensity = (dark ? 7 : 3) * glow * (frame ? 1 : 0.85);
    hearth.handle.rotation.z = Math.sin(time * 1.6) * (open ? 0.2 : 0.03);
  }

  // ---------- what the shop says ----------
  function foremanLine() {
    if (!atWork('foreman')) return `The Works is shut. The foreman is back at ${backAt('foreman')}.`;
    const hour = hourNow();
    const hello = hour < 12 ? 'Morning!' : hour < 18 ? 'Afternoon!' : 'Evening!';
    const rows = items();
    const going = rows.filter((r) => r[2] !== 'done'), finished = rows.length - going.length;
    const note = finished ? ` ${finished === 1 ? 'One' : finished} finished, up on the shelf.` : '';
    if (!going.length) return `${hello} Benches are clear.${note} What shall we put on next?`;
    const i = rows.findIndex((r) => r[2] !== 'done');
    const [title, stage] = rows[i];
    const where = BAYS[i] ? BAYS[i].where : 'on the bench';
    return `${hello} ${COUNT[Math.min(going.length, 6)]} on the go. “${title}” is ${where} — ${stage}.${note}`;
  }
  function turnerLine() {
    if (!atWork('foreman')) return `Nobody at the lathe. The belts come on at ${backAt('foreman')}.`;
    if (speed < 0.2) return 'Shaft is out of gear. Throw the lever and I\'ll turn you a leg.';
    const finished = items().filter((r) => r[2] === 'done');
    if (finished.length) return `Turning spindles. “${finished.at(-1)[0]}” came off the bench and went up on the shelf.`;
    return 'Turning spindles. Nothing off the bench yet — early days.';
  }

  return {
    cutaway,
    colliders,
    update,
    speakers: [
      { object: foreman, height: 1.9, range: 3.2, level: 0, text: foremanLine, persona: 'foreman', name: 'the foreman' },
      { object: turner, height: 1.8, range: 2.4, level: 0, text: turnerLine, name: 'the turner' },
    ],
    stations: [
      { point: spots.board, label: 'Read the job board', app: 'projects' },
      { point: spots.foreman, label: 'Ask the foreman what is on', app: 'projects' },
      ...bays.map((bay) => bay.station),
      { point: spots.done, label: 'Look over what is finished', app: 'projects' },
      leverStation,
    ],
    cameraOffset: new THREE.Vector3(10, 14, 16),
    // the forge crackling in the back corner, the clock on the left wall
    sounds: [
      { kind: 'fire', at: new THREE.Vector3(FORGE.x, 1.1, FORGE.z + 0.5) },
      { kind: 'clock', at: new THREE.Vector3(-W / 2 + 0.3, 3.1, 0) },
    ],
    enterSound: { name: 'flame', at: new THREE.Vector3(FORGE.x, 1.2, FORGE.z + 0.5), delay: 0.8 },
  };
}
