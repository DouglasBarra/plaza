// The lighthouse keeper's workshop, inside: the Ideas district.
//
// The workshop floor (the ideas themselves): the idea wall, where every note
// is one of your ideas with the day it came and string runs from pin to pin;
// the table under it where the next note gets written; the workbench, with a
// lighthouse half built on it and a bulb swaying over it; the chalkboard,
// which can be rubbed out and drawn again; the stove, the tool wall, the
// jars of parts, and the keeper, walking up and down with your newest idea.
// The lamp room (up the stair): the lens turning on its pedestal, the
// clockwork and the weight that runs it, the keeper's log with every idea
// written up in order, the tide table, and a telescope at the glass.
//
// Built like the bank (interiors/bank/): the stair joins two levels, the
// walls between you and the third-person camera are cut away, and the hut's
// ceiling and the lantern's cap hide while still shading the room.
import * as THREE from 'three';
import { M } from '../../kit.js';
import { isNight, hourNow } from '../../life.js';
import { DISTRICTS } from '../../districts/index.js';
import { LAYER_CEILING, LAYER_UPPER } from '../townhall/index.js';
import { sfx } from '../../sound/index.js';
import { atWork, backAt } from '../../plaza/routines.js';
import { W, D, F, CEIL, TOWER, DECK, radiusAt, turnAt, stairY } from './dims.js';
import { lampOn } from './materials.js';
import { buildShell } from './shell.js';
import { furnishWorkshop } from './fixtures.js';
import { furnishLampRoom } from './lamproom.js';

const onLayer = (o, layer) => { o.traverse((c) => c.layers.set(layer)); return o; };
const RUNDOWN = 240;        // seconds for the lamp's weight to run all the way down

export function ideas(scene, rand, lights) {
  const lower = new THREE.Group(), upper = new THREE.Group(), ceilings = new THREE.Group();
  const cutLower = new THREE.Group(), cutUpper = new THREE.Group();
  scene.add(lower, upper, ceilings, cutLower, cutUpper);

  const shell = buildShell({ lower, upper, ceilings, cutLower, cutUpper });
  const ground = furnishWorkshop(lower, rand);
  const lamp = furnishLampRoom(upper);

  onLayer(upper, LAYER_UPPER);
  onLayer(cutUpper, LAYER_UPPER);
  onLayer(ceilings, LAYER_CEILING);
  lights.sun.shadow.camera.layers.enableAll();

  // ---------- live data ----------
  // One note per idea, the same ideas written up in the log, and the newest
  // one chalked under the sketch. Whatever Ideas holds is what the wall holds.
  const items = () => DISTRICTS.ideas.items || [];
  const refresh = () => {
    const list = items();
    ground.wall.set(list);
    lamp.log.set(list);
    ground.chalk.setCaption(list[0] ? list[0][0] : 'A thought, waiting');
  };
  DISTRICTS.ideas.subscribe(refresh);
  refresh();

  // ---------- the stations that do something ----------
  function redraw() {
    ground.chalk.next();
    sfx('rustle');
    setTimeout(() => sfx('pencil'), 220);
  }
  let drop = 0.9, winding = 0;
  function windUp() {
    winding = 1.4;
    sfx('ding');
  }

  // ---------- light and life ----------
  let last = 0;
  function update(time) {
    const dt = Math.min(0.1, time - last);
    last = time;
    ground.keeper.visible = atWork('keeper');      // she keeps the light: always in

    // the sun crosses the sky with the real time; the lamps come on in the evening
    const hour = hourNow();
    const day = THREE.MathUtils.clamp((hour - 6) / 13, 0, 1);
    const az = day * Math.PI;
    const dark = isNight() || hour < 6.5 || hour > 19.5;
    const evening = dark || hour >= 18 || hour < 7;
    lights.sun.position.set(Math.cos(az) * 16, 4 + Math.sin(az) * 14, 10);
    lights.sun.target.position.set(0, CEIL / 2, 0);
    lights.sun.intensity = dark ? Math.PI * 0.15 : Math.PI;
    for (const l of ground.lamps) {
      l.light.intensity = evening ? 3 : 0;
      l.bulb.material = evening ? lampOn : M.white;
    }
    // the bulb over the bench is lit whatever the hour: this is the ideas
    // district, and that is what a bulb is for
    ground.bulb.light.intensity = evening ? 5 : 1.4;
    // the stove, flickering on a two-frame clock like everything hand-drawn
    const frame = Math.floor(time * 7) % 2;
    ground.fire.light.intensity = (dark ? 5 : 2.4) * (frame ? 1 : 0.86);

    // the lens turns, a turn every half minute, and throws its beams at night
    lamp.lens.group.rotation.y = time * 0.21;
    lamp.lens.light.intensity = evening ? 9 : 2;
    for (const b of lamp.lens.beams) b.visible = evening;

    // the weight sinks as the clockwork runs; winding it pulls it back up
    if (winding > 0) {
      winding -= dt;
      drop = Math.max(0.2, drop - dt * 0.9);
      sfx('flaps', { at: lamp.spots.wind.clone().setY(F + 0.4), room: 'ideas', gap: 0.11 });
    } else drop = Math.min(1.4, drop + (dt * 1.2) / RUNDOWN);
    lamp.weight.lead.position.y = -drop;
    lamp.weight.chain.scale.y = drop;
    lamp.weight.chain.position.y = -drop / 2;
  }

  // ---------- what the keeper says ----------
  function keeperLine() {
    if (!atWork('keeper')) return `The keeper is up the tower. Back at ${backAt('keeper')}.`;
    const list = items();
    const h = hourNow();
    const hello = h < 5 ? 'Still awake?' : h < 12 ? 'Morning!' : h < 18 ? 'Afternoon!' : 'Evening!';
    if (!list.length) return `${hello} The wall's bare. Think of something and I'll pin it up.`;
    const [title, when] = list[0];
    const n = list.length;
    const newest = `“${title}”, ${String(when || '').toLowerCase()}`;
    if (n === 1) return `${hello} One idea on the wall: ${newest}.`;
    return `${hello} ${n} ideas on the wall. The newest is ${newest}.`;
  }

  // ---------- walking ----------
  // Out in the workshop the floor is flat. Inside the drum, how high you
  // stand depends on how far round the turn you are; the lamp room's floor
  // is the half of the drum you can be on when you're up there, and its
  // parapet and the open well are steps too big to take.
  function heightAt(x, z, level) {
    const r = radiusAt(x, z);
    if (r >= TOWER.r) return { y: level ? F : 0, level };
    if (level === 1 && r > TOWER.r - 0.42) return { y: F + 2, level: 1 };
    const u = turnAt(x, z);
    if (level === 1 && u < DECK) return { y: F, level: 1 };
    const y = stairY(u);
    return { y, level: y > F - 0.1 ? 1 : 0 };
  }

  return {
    levels: { ground: 0, upper: 1, height: F },
    lower, upper, ceilings, cutLower, cutUpper,
    panes: [],                               // no window views: the room is bigger than its tower
    colliders: [...shell.colliders, ...ground.colliders, ...lamp.colliders],
    boards: [ground.wall],
    heightAt,
    update,
    speakers: [
      { object: ground.keeper, height: 1.95, range: 3.2, level: 0, text: keeperLine, persona: 'keeper', name: 'the keeper' },
    ],
    stations: [
      { point: ground.spots.wall, level: 0, label: 'Look over the idea wall', app: 'ideas' },
      { point: ground.spots.bench, level: 0, label: "See what's on the bench", app: 'ideas' },
      { point: ground.spots.chalk, level: 0, label: 'Rub out the chalkboard and draw it again', use: redraw },
      { point: lamp.spots.log, level: 1, label: "Read the keeper's log", app: 'ideas' },
      { point: lamp.spots.wind, level: 1, label: "Wind up the lamp's clockwork", use: windUp },
    ],
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.0),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    bounds: { minX: -W / 2 + 0.3, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.3, maxZ: D / 2 - 0.4 },
    cameraOffset: new THREE.Vector3(11, 17, 19),
    // the stove crackling in the corner, the clock ticking on the wall
    sounds: [
      { kind: 'fire', at: new THREE.Vector3(4.7, 0.5, 3.1) },
      { kind: 'clock', at: new THREE.Vector3(-W / 2 + 0.1, 2.9, 0.9) },
    ],
    // a note going up on the wall as you come in
    enterSound: { name: 'pin', at: new THREE.Vector3(1.9, 1.9, -4.5), delay: 0.8 },
    // the chalkboard and the lamp's weight, so a test can watch them change
    chalk: ground.chalk,
    weight: () => drop,
  };
}
