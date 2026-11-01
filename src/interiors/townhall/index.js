// The town hall, inside: the ToDos district as a two-story building.
//
// Ground floor (Today): the task board, where each note is one of today's
// tasks; the clerk's desk with the typewriter for adding tasks; a fireplace
// that burns brighter as you clear the day; the paper-ball jar and streak
// plaque on the mantel.
// Upstairs (Upcoming and Done): the planning wall with a calendar and the
// notes for later, and the archive where finished tasks are filed.
//
// Walls have real openings, so sunlight falls through the windows onto the
// floor and moves with the real time of day. Panes show the real plaza in
// first person (app/window-view.js renders it); in third person the walls facing the
// camera, the upper floor (while you're downstairs) and the ceilings are cut
// away, using render layers so they still cast shadows.
import * as THREE from 'three';
import { M, mesh, box } from '../../kit.js';
import { isNight } from '../../life.js';
import { DISTRICTS } from '../../districts/index.js';
import { W, D, F } from './dims.js';
import { lampOn } from './materials.js';
import { buildHouse, inStair, stairHeight } from './shell.js';
import { furnishGroundFloor } from './ground-floor.js';
import { furnishUpstairs } from './upstairs.js';
import { ballGeo } from './boards.js';
export { glassDay, glassNight } from './materials.js';

export const LAYER_CEILING = 1, LAYER_UPPER = 2;

const todos = () => DISTRICTS.todo.api;
const onLayer = (o, layer) => { o.traverse((c) => c.layers.set(layer)); return o; };

// ---------- building the house ----------
export function buildTownHall(scene, rand, lights) {
  const panes = [];
  const lower = new THREE.Group();   // the ground floor (layer 0)
  const upper = new THREE.Group();   // everything at or above the upper floor (layer 2)
  const ceilings = new THREE.Group(); // hidden in third person, still casts shadows (layer 1)
  const cutLower = new THREE.Group(), cutUpper = new THREE.Group(); // walls facing the third-person camera
  scene.add(lower, upper, ceilings, cutLower, cutUpper);

  const { hinge, doorDir } = buildHouse({ lower, upper, ceilings, cutLower, cutUpper, panes });
  const { board, binPos, binBalls, clerk, fire, progressJar, setPlaque, lamps, chand } = furnishGroundFloor(lower, rand);
  const { U, later, calTex, upBin, stack, upLamps } = furnishUpstairs(upper, rand);

  // ---------- layers ----------
  onLayer(upper, LAYER_UPPER);
  onLayer(cutUpper, LAYER_UPPER);
  onLayer(ceilings, LAYER_CEILING);
  lights.sun.shadow.camera.layers.enableAll();

  // ---------- live data ----------
  const api = todos();
  const refresh = () => {
    const g = api.groups();
    const today = [...g.overdue.map((t) => ({ ...t, late: true })), ...g.today];
    board.set(today, (t) => api.dueLabel(t.due));
    later.set([...g.upcoming, ...g.anytime], (t) => api.dueLabel(t.due));
    const due = new Map();
    const now = new Date();
    for (const t of [...g.today, ...g.upcoming, ...g.overdue]) {
      const [y, m, d] = t.due.split('-').map(Number);
      if (y === now.getFullYear() && m === now.getMonth() + 1) due.set(d, (due.get(d) || 0) + 1);
    }
    calTex.userData.draw(due);
    document.fonts?.load('52px "Patrick Hand SC"').then(() => calTex.userData.draw(due)).catch(() => {});
    const done = api.doneCount();
    progressJar.set(done);
    setPlaque(api.streak());
    stack.clear();
    for (let i = 0; i < Math.min(done, 30); i++) box(stack, 0.48, 0.012, 0.36, M.white, -3.6 + Math.sin(i) * 0.02, 0.95 + i * 0.013, 0.6).rotation.y = Math.sin(i * 3) * 0.08;
  };
  DISTRICTS.todo.subscribe(refresh);
  refresh();

  // ---------- tearing a note off ----------
  const flying = [];
  const ballMat = M.white;
  function tearOff(note, onDone) {
    const task = note.userData.task;
    const world = new THREE.Vector3();
    note.getWorldPosition(world);
    const upstairs = world.y > F;
    scene.attach(note);
    flying.push({ note, task, t0: performance.now(), from: world.clone(), bin: (upstairs ? upBin : binPos).clone().setY((upstairs ? U : 0) + 0.5), ball: null, onDone, layer: upstairs ? LAYER_UPPER : 0 });
  }

  // ---------- light and life ----------
  const t0 = performance.now();
  function update(time, ctx) {
    // notes popping onto the board
    for (const b of [board, later]) {
      for (let i = b.pops.length - 1; i >= 0; i--) {
        const p = b.pops[i], k = Math.min(1, (performance.now() - p.t0) / 350);
        p.n.scale.setScalar(0.2 + 0.8 * (1 - Math.pow(1 - k, 3)) * (1 + Math.sin(k * Math.PI) * 0.15));
        if (k === 1) { p.n.scale.setScalar(1); b.pops.splice(i, 1); }
      }
    }
    // torn notes: pull, crumple, toss
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], s = (performance.now() - f.t0) / 1000;
      if (s < 0.25) {
        f.note.position.copy(f.from).add(new THREE.Vector3(0, -s * 0.4, s * 1.6));
        f.note.rotation.z += 0.05;
      } else if (s < 0.45) {
        const k = (s - 0.25) / 0.2;
        f.note.scale.setScalar(1 - k * 0.85);
        if (!f.ball) {
          f.ball = mesh(new THREE.IcosahedronGeometry(0.12, 0), ballMat, 0, 0, 0, scene);
          f.ball.layers.set(f.layer);
          f.start = f.note.position.clone();
        }
        f.ball.position.copy(f.note.position);
        f.ball.scale.setScalar(k);
      } else if (s < 1.15) {
        if (f.note.parent) scene.remove(f.note);
        const k = (s - 0.45) / 0.7;
        f.ball.position.lerpVectors(f.start, f.bin, k);
        f.ball.position.y += Math.sin(k * Math.PI) * 1.3;
        f.ball.rotation.x += 0.2;
      } else {
        scene.remove(f.ball);
        if (f.bin.y < F) mesh(ballGeo, M.white, binPos.x + (Math.random() - 0.5) * 0.2, 0.5, binPos.z + (Math.random() - 0.5) * 0.2, binBalls).scale.setScalar(1.8);
        flying.splice(i, 1);
        f.onDone();
      }
    }

    // the sun crosses the sky with the real time; lamps come on in the evening
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const day = THREE.MathUtils.clamp((hour - 6) / 13, 0, 1);
    const az = day * Math.PI;
    const dark = isNight() || hour < 6.5 || hour > 19.5;
    const evening = dark || hour >= 18 || hour < 7;
    lights.sun.position.set(Math.cos(az) * 16, 3 + Math.sin(az) * 13, 10);
    lights.sun.target.position.set(0, F / 2, 0);
    lights.sun.intensity = dark ? Math.PI * 0.15 : Math.PI;
    for (const l of [...lamps, ...upLamps]) {
      l.light.intensity = evening ? 6 : 0;
      l.bulb.material = evening ? lampOn : M.white;
    }
    chand.light.intensity = evening ? 9 : 0;
    for (const b of chand.bulbs) b.material = evening ? lampOn : M.white;

    // the fire: brighter the more of today you've cleared
    const g = api.groups();
    const left = g.overdue.length + g.today.length, cleared = api.doneToday();
    const glow = 0.75 + 0.6 * (cleared / Math.max(1, cleared + left));
    const frame = Math.floor((performance.now() - t0) / 140) % 2;
    for (const [i, f] of fire.flames.entries()) {
      const h = f.userData.h * glow * (1 + ((i + frame) % 2 ? 0.12 : -0.08));
      f.scale.set(glow, h, glow);
      f.position.y = 0.2 + h / 2;
    }
    fire.light.intensity = (dark ? 6 : 2.5) * glow * (frame ? 1 : 0.85);
  }

  // what the clerk says when you come close
  function clerkLine() {
    const g = api.groups();
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Morning!' : hour < 18 ? 'Afternoon!' : 'Evening!';
    const s = api.streak();
    if (g.overdue.length) return `${hello} Psst, “${g.overdue[0].title}” is late.`;
    if (g.today.length) return `${hello} ${g.today.length} ${g.today.length === 1 ? 'thing' : 'things'} on the board today.`;
    if (s > 1) return `${hello} All clear, ${s} days running. Lovely.`;
    return `${hello} Nothing due today. Want me to type something up?`;
  }

  // walking: stairs connect the floors; a step bigger than 0.6 m is a wall or railing
  function heightAt(x, z, level) {
    if (inStair(x, z)) {
      const y = stairHeight(z);
      return { y, level: y > F / 2 ? 1 : 0 };
    }
    return { y: level * F, level };
  }

  const colliders = [
    { x: 2.2, z: 0.4, r: 1.35 }, { x: -W / 2 + 0.7, z: 0.1, r: 1.0 }, { x: -3.3, z: -1.75, r: 0.6 }, { x: -3.3, z: 1.95, r: 0.6 },
    { x: -4.5, z: 0.1, r: 0.55 }, { x: -2.7, z: 0.1, r: 0.3 }, { x: 5.1, z: -4.5, r: 0.9 }, { x: -2.5, z: 4.25, r: 0.35 },
    { x: -3.15, z: 4.45, r: 0.2 }, { x: -4.4, z: 4.55, r: 0.75 }, { x: -W / 2 + 0.85, z: -2.45, r: 0.5 }, { x: -W / 2 + 0.55, z: 1.75, r: 0.2 },
    { x: 3.15, z: -4.72, r: 0.45 }, { x: -5.3, z: -4.3, r: 0.5 }, { x: 5.35, z: 4.3, r: 0.5 }, { x: 2.45, z: -4.35, r: 0.4 },
    // the open door
    ...[0.35, 0.8, 1.25].map((t) => ({ x: hinge.x + doorDir.x * t, z: hinge.z + doorDir.z * t, r: 0.2 })),
    { x: -2.4, z: -3.3, r: 1.0, level: 1 }, { x: -2.4, z: -2.2, r: 0.35, level: 1 }, { x: -5.6, z: 0, r: 1.6, level: 1 },
    { x: -5.5, z: -3.25, r: 0.8, level: 1 }, { x: -3.6, z: 0.6, r: 0.9, level: 1 }, { x: -3.4, z: 4.55, r: 0.95, level: 1 },
    { x: 1.0, z: 4.4, r: 0.5, level: 1 }, { x: 3.0, z: 3.6, r: 0.6, level: 1 }, { x: 4.0, z: -4.4, r: 0.35, level: 1 },
  ];

  return {
    levels: { ground: 0, upper: 1, height: F },
    lower, upper, ceilings, cutLower, cutUpper, panes,
    boards: [board, later],
    colliders,
    heightAt,
    tearOff,
    update,
    speakers: [{ object: clerk, height: 1.9, range: 3.0, level: 0, text: clerkLine }],
    stations: [
      { point: new THREE.Vector3(-0.5, 0, -3.5), level: 0, label: 'Open the task board', app: 'todo', tab: 'today' },
      { point: new THREE.Vector3(2.2, 0, 1.95), level: 0, label: 'Ask the clerk to type a task', typewriter: true },
      { point: new THREE.Vector3(1.8, 0, -3.4), level: 1, label: 'Plan ahead', app: 'todo', tab: 'upcoming' },
      { point: new THREE.Vector3(-2.4, 0, 0.6), level: 1, label: 'Look through the archive', app: 'todo', tab: 'done' },
    ],
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.4),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.4 },
    cameraOffset: new THREE.Vector3(10, 15, 17),
    // the room is the building: the same walls, so the window views are exact;
    // only the plinth (0.4 m) lifts the ground floor off the plaza
    plazaOffset: new THREE.Vector3(0, 0.4, 0),
  };
}
