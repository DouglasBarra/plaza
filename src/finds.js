// Little things to find, in the spirit of Hidden Folks: a cat asleep on a
// roof, a kid hiding behind the library, a sock on the hoist at the Works… Click one
// (or look at it in first person and click) to find it. Some only show up at
// certain times: the owl at night, the rooster in the morning.
import * as THREE from 'three';
import { toon } from './ink.js';
import { M, stamp, mesh, box, cyl } from './kit.js';
import { makeFigure, poseFigure } from './folks.js';
import { createStore } from './store.js';
import { isNight, nightOnly } from './life.js';

const dark = toon('#3a3a3a');
const store = createStore('plaza.finds.v1', { found: {} });

// id → { name, hint, root (Object3D), when?: () => boolean }
const finds = new Map();

function register(id, name, hint, root, when) {
  root.traverse((o) => { o.userData.findId = id; });
  if (when) root.visible = when(); // right from the start, not just from the first frame
  finds.set(id, { id, name, hint, root, when });
  return root;
}

// The office mouse lives in a room that's only built when you first go in;
// list it from the start so the total doesn't change.
register('mouse', 'The office mouse', 'Inside the town hall, someone lives in the wall.', new THREE.Group());

// Where a find is in the world (for tests and hints).
export const worldPositionOf = (id) => finds.get(id)?.root.getWorldPosition(new THREE.Vector3());

// ---------- tiny models ----------
function sleepingCat() {
  const g = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.2, 10, 8).scale(1.3, 0.6, 1), M.white, 0, 0.12, 0, g);
  mesh(new THREE.SphereGeometry(0.11, 8, 6), M.white, 0.2, 0.15, 0.05, g);
  for (const ez of [-0.02, 0.12]) mesh(new THREE.ConeGeometry(0.04, 0.08, 4), M.white, 0.22, 0.26, ez, g);
  const tail = cyl(g, 0.025, 0.025, 0.35, M.white, -0.15, 0.06, 0.17, 5);
  tail.rotation.set(Math.PI / 2, 0, 0.9);
  return g;
}

function bird({ gull = false, owl = false, rooster = false } = {}) {
  const g = new THREE.Group();
  const body = owl ? new THREE.CapsuleGeometry(0.14, 0.14, 4, 8) : new THREE.BoxGeometry(0.3, 0.16, 0.14);
  mesh(body, owl ? dark : M.white, 0, owl ? 0.2 : 0.12, 0, g);
  mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), owl ? dark : M.white, owl ? 0 : 0.17, owl ? 0.42 : 0.24, 0, g);
  if (owl) {
    for (const ex of [-0.04, 0.04]) mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe38a' }), ex, 0.44, 0.06, g);
    for (const ex of [-0.04, 0.04]) mesh(new THREE.ConeGeometry(0.025, 0.06, 4), dark, ex, 0.51, 0, g);
  } else {
    mesh(new THREE.BoxGeometry(0.07, 0.03, 0.04), gull ? M.white : dark, 0.26, 0.23, 0, g);
    box(g, 0.02, 0.1, 0.02, dark, -0.02, 0.0, 0.03);
  }
  if (rooster) {
    for (let i = 0; i < 3; i++) box(g, 0.03, 0.06, 0.04, stamp.todo, 0.14 + i * 0.03, 0.33, 0);
    for (let i = 0; i < 3; i++) box(g, 0.03, 0.2, 0.12, dark, -0.16 - i * 0.03, 0.22 + i * 0.03, 0).rotation.z = 0.5 + i * 0.2;
  }
  return g;
}

function snail() {
  const g = new THREE.Group();
  box(g, 0.14, 0.03, 0.04, M.white, 0, 0, 0);
  mesh(new THREE.TorusGeometry(0.035, 0.022, 6, 12), M.white, -0.01, 0.045, 0, g);
  for (const ez of [-0.01, 0.01]) cyl(g, 0.004, 0.004, 0.05, dark, 0.07, 0.03, ez, 3);
  return g;
}

function frog() {
  const g = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(1.2, 0.7, 1), M.white, 0, 0.07, 0, g);
  for (const ez of [-0.05, 0.05]) {
    mesh(new THREE.SphereGeometry(0.035, 8, 6), M.white, 0.06, 0.13, ez, g);
    mesh(new THREE.SphereGeometry(0.015, 6, 4), dark, 0.085, 0.14, ez, g);
  }
  return g;
}

function paperPlane() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0.22, 0); s.lineTo(-0.15, 0.12); s.lineTo(-0.1, 0); s.lineTo(-0.15, -0.12); s.closePath();
  mesh(new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: false }), M.white, 0, 0, 0, g).rotation.x = -Math.PI / 2;
  return g;
}

function sock() {
  const g = new THREE.Group();
  box(g, 0.12, 0.3, 0.08, M.white, 0, -0.15, 0);
  box(g, 0.18, 0.1, 0.08, M.white, 0.04, -0.3, 0);
  box(g, 0.13, 0.04, 0.09, stamp.projects, 0, -0.02, 0);
  return g;
}

function mouse() {
  const g = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.06, 8, 6).scale(1.5, 0.8, 1), M.white, 0, 0.05, 0, g);
  for (const ez of [-0.03, 0.03]) mesh(new THREE.SphereGeometry(0.025, 6, 4), M.white, 0.06, 0.1, ez, g);
  const tail = cyl(g, 0.006, 0.006, 0.14, dark, -0.12, 0.03, 0, 3);
  tail.rotation.z = Math.PI / 2.3;
  return g;
}

// ---------- the plaza's finds ----------
let balloon = null;
export function placeFinds(world, buildings, P) {
  const at = (id) => buildings.find((b) => b.userData.district === id);
  const T = 0.4;

  const cat = sleepingCat();
  // asleep on the sunny slope of the town hall's roof, tilted to lie along it
  const hall = at('todo').userData;
  const slope = Math.atan2(hall.roofH, hall.roofW / 2);
  cat.position.set(3.0, hall.roofBase + hall.roofH * (1 - 3.0 / (hall.roofW / 2)) + 0.03, -1.5);
  cat.rotation.set(0, 0.4, -slope);
  at('todo').add(register('roofcat', 'The rooftop cat', 'Someone is napping up high, on the town hall.', cat));

  const kid = makeFigure({ hat: 'cap', height: 0.7 });
  poseFigure(kid, 'look', 0);
  kid.position.set(3.2, T, -4.3);                                    // round the back corner
  kid.rotation.y = 0.3;
  at('study').add(register('hider', 'The kid playing hide-and-seek', 'Behind the library, someone is counting to ten.', kid));

  const gull = bird({ gull: true });
  const tower = at('ideas').userData.tower;
  gull.position.set(tower.x, tower.top + 0.05, tower.z);            // on the lighthouse's vane
  at('ideas').add(register('gull', 'The lighthouse gull', 'The highest point on the plaza has a visitor.', gull));

  const rooster = bird({ rooster: true });
  const hut = at('ideas').userData.hut;
  rooster.position.set(hut.x - 0.8, hut.ridge + 0.05, hut.z);       // on the workshop's ridge
  at('ideas').add(register('rooster', 'The morning rooster', 'Before noon, someone crows on the workshop roof.', rooster, () => new Date().getHours() < 12));

  const owl = bird({ owl: true });
  owl.position.set(P.owlLamp.x, P.owlLamp.y ?? 3.05, P.owlLamp.z); // on top of a street lamp
  world.add(register('owl', 'The night owl', 'At night, someone keeps watch from a street lamp.', owl, () => isNight()));

  const f = frog();
  f.position.set(P.flowers.x + 0.3, 0.6, P.flowers.z - 0.3);  // in the flower box
  f.rotation.y = 2.5;
  world.add(register('frog', 'The frog in the flowers', 'Someone green-hearted sits among the flower boxes.', f));

  const s = snail();
  s.position.set(P.board.x - 0.9, 1.1, P.board.z - 0.12);      // on the notice board's post
  s.rotation.set(0, Math.PI, Math.PI / 2);
  world.add(register('snail', 'The slow snail', 'Someone is climbing the notice board, very slowly.', s));

  const plane = paperPlane();
  plane.position.set(P.trees[1].x - 0.2, P.trees[1].y ?? 1.6, P.trees[1].z - 0.5);  // caught in a tree
  plane.rotation.set(0.3, 0.8, -0.4);
  world.add(register('plane', 'The stuck paper plane', 'A flight that ended in a tree, near the bikes.', plane));

  const hook = world.getObjectByName('hoistHook');
  if (hook) {
    const k = sock();
    k.position.set(0, -0.22, 0);
    hook.add(register('sock', 'The odd sock', 'Something is dangling from the hoist at the Works.', k));
  }

  // a lost balloon drifting high over the town
  balloon = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.45, 12, 10), stamp.people, 0, 0, 0, balloon);
  cyl(balloon, 0.01, 0.01, 1.4, M.white, 0, -1.1, 0, 3);
  world.add(register('balloon', 'The lost balloon', 'Somebody let go. Look up.', balloon));

  // the night sky: a moon and stars
  const sky = new THREE.Group();
  const moonMat = toon('#fff8dd'); moonMat.fog = false;
  const moon = mesh(new THREE.SphereGeometry(14, 24, 16), moonMat, -180, 170, -330, sky);
  moon.castShadow = false;
  const starMat = new THREE.MeshBasicMaterial({ color: '#fff8dd', fog: false });
  const stars = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), starMat, 160);
  const o = new THREE.Object3D();
  for (let i = 0; i < 160; i++) {
    const a = Math.random() * Math.PI * 2, h = 0.25 + Math.random() * 0.7;
    o.position.set(Math.cos(a) * 480 * Math.cos(h), 480 * Math.sin(h), Math.sin(a) * 480 * Math.cos(h));
    o.scale.setScalar(0.6 + Math.random() * 1.2);
    o.updateMatrix();
    stars.setMatrixAt(i, o.matrix);
  }
  sky.add(stars);
  sky.visible = false;
  sky.userData.inkCrisp = true;
  world.add(sky);
  nightOnly.push(sky);
}

// ---------- the office's find ----------
export function placeRoomFinds(id, scene) {
  if (id !== 'todo') return;
  // a little arched hole at the bottom of the left wall
  const hole = mesh(new THREE.CircleGeometry(0.16, 16, 0, Math.PI), M.deep, -5.98, 0, 2.1, scene);
  hole.rotation.y = Math.PI / 2;
  hole.castShadow = false;
  const m = mouse();
  m.position.set(-5.55, 0, 2.4);
  m.rotation.y = -0.6;
  scene.add(register('mouse', 'The office mouse', 'Inside the town hall, someone lives in the wall.', m));
}

// ---------- finding ----------
export const isFound = (id) => !!store.get().found[id];
export const subscribe = (fn) => store.subscribe(fn);
export const progress = () => ({ found: Object.keys(store.get().found).length, total: finds.size });

export function list() {
  return [...finds.values()].map((f) => ({ id: f.id, name: f.name, hint: f.hint, found: isFound(f.id) }));
}

// Given a raycast hit object, returns the find it belongs to (or null).
export function findOf(object) {
  let o = object;
  while (o && !o.userData.findId) o = o.parent;
  const f = o && finds.get(o.userData.findId);
  return f && f.root.visible ? f : null;
}

export function markFound(f) {
  if (isFound(f.id)) return false;
  store.set((s) => ({ ...s, found: { ...s.found, [f.id]: Date.now() } }));
  return true;
}

export function animateFinds(time) {
  for (const f of finds.values()) if (f.when) f.root.visible = f.when();
  if (balloon) {
    const a = time * 0.03;
    balloon.position.set(Math.cos(a) * 24, 21 + Math.sin(time * 0.4) * 1.5, Math.sin(a) * 24);
    balloon.rotation.z = Math.sin(time * 0.7) * 0.15;
  }
}
