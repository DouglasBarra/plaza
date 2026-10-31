import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InkRenderer, applyTheme, THEMES } from './ink.js';
import { buildPlaza, animateFolks, PLAZA_HALF } from './world.js';
import { buildTown } from './town.js';
import { Avatar } from './avatar.js';
import { DISTRICTS } from './districts/index.js';

// ---------- renderer, scene, camera ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const ink = new InkRenderer(renderer);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(THEMES.day.paper, 70, 180);
const camera = new THREE.PerspectiveCamera(30, 1, 1, 1200);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.45; // low enough to see the mountains on the horizon
controls.minDistance = 14;
controls.maxDistance = 140;
controls.enablePan = false;

const ambient = new THREE.AmbientLight(0xffffff, 1);
const sun = new THREE.DirectionalLight(0xffffff, Math.PI);
sun.position.set(-14, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(ambient, sun, sun.target);
const lights = { ambient, sun };

const { buildings, colliders } = buildPlaza(scene);
const town = buildTown(scene);
const me = new Avatar(scene, colliders, PLAZA_HALF);

let theme = 'day';
applyTheme(theme, lights);

// camera starts behind you, looking over the plaza
const followOffset = new THREE.Vector3(18, 26, 32);
controls.target.copy(me.position).add(new THREE.Vector3(0, 1, 0));
camera.position.copy(controls.target).add(followOffset);

// ---------- labels ----------
const labelsEl = document.getElementById('labels');
const labels = new Map();
for (const b of buildings) {
  const el = document.createElement('div');
  el.className = `label pz-d-${b.userData.district}`;
  labelsEl.appendChild(el);
  labels.set(b, el);
}

// Signs, greeting and the town hall flag follow each district's live summary.
const townHall = buildings.find((b) => b.userData.district === 'todo');
function refreshSigns() {
  for (const [b, el] of labels) {
    const d = DISTRICTS[b.userData.district];
    const s = d.summary();
    el.innerHTML = `<span class="tag"><span class="stampdot"></span>${d.name}${s.count ? `<span class="count">${s.count}</span>` : ''}</span><small>${s.status}</small>`;
  }
  const todo = DISTRICTS.todo.summary();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting-line').textContent = todo.overdue
    ? `${hello}. ${todo.overdue} ${todo.overdue === 1 ? 'task is' : 'tasks are'} overdue.`
    : todo.count ? `${hello}. ${todo.count} ${todo.count === 1 ? 'thing needs' : 'things need'} you today.`
    : `${hello}. Nothing due today.`;
  // the flag flies at the top of the tower when nothing is due
  townHall.userData.flagUp = todo.allClear;
}
for (const d of Object.values(DISTRICTS)) d.subscribe(refreshSigns);
const prompt = document.createElement('div');
prompt.className = 'prompt';
labelsEl.appendChild(prompt);

const tmp = new THREE.Vector3();
function screenOf(v) {
  tmp.copy(v).project(camera);
  return [(tmp.x * 0.5 + 0.5) * canvas.clientWidth, (-tmp.y * 0.5 + 0.5) * canvas.clientHeight, tmp.z];
}
function placeLabels() {
  const camDist = camera.position.distanceTo(controls.target);
  for (const [b, el] of labels) {
    const [x, y, z] = screenOf(new THREE.Vector3(0, b.userData.labelY, 0).applyMatrix4(b.matrixWorld));
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    el.classList.toggle('is-hidden', z > 1 || (focused && focused !== b) || camDist > 110);
  }
  if (nearDoor && !focused) {
    const [x, y] = screenOf(me.position.clone().add(new THREE.Vector3(0, 2, 0)));
    prompt.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    prompt.innerHTML = `<kbd>E</kbd> Enter ${DISTRICTS[nearDoor.userData.district].name}`;
    prompt.classList.remove('is-hidden');
  } else prompt.classList.add('is-hidden');
}

// ---------- dock ----------
const dock = document.getElementById('dock');
const dockButtons = new Map();
for (const [id, d] of Object.entries(DISTRICTS)) {
  const btn = document.createElement('button');
  btn.className = `pz-d-${id}`;
  btn.innerHTML = `<span class="stampdot"></span><span class="name">${d.name}</span><kbd>${d.key}</kbd>`;
  btn.addEventListener('click', () => enter(id));
  dock.appendChild(btn);
  dockButtons.set(id, btn);
}

// ---------- camera moves ----------
let tween = null;
function flyTo(pos, target, ms = 900) {
  tween = { from: camera.position.clone(), fromT: controls.target.clone(), pos, target, t0: performance.now(), ms };
  controls.enabled = false;
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function stepTween(now) {
  if (!tween) return;
  const t = Math.min(1, (now - tween.t0) / tween.ms), k = ease(t);
  camera.position.lerpVectors(tween.from, tween.pos, k);
  controls.target.lerpVectors(tween.fromT, tween.target, k);
  if (t === 1) { tween = null; controls.enabled = true; }
}

// ---------- entering a district ----------
const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
let focused = null;
let nearDoor = null;
let savedOffset = followOffset.clone();

function buildingFor(id) { return buildings.find((b) => b.userData.district === id); }

function enter(id) {
  const b = buildingFor(id);
  if (!b) return;
  if (!focused) savedOffset = camera.position.clone().sub(controls.target);
  focused = b;
  me.goal = null;
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(b.quaternion);
  const target = b.position.clone().add(new THREE.Vector3(0, 2.6, 0));
  // aim below the building so it sits in the top half, above the panel
  const side = new THREE.Vector3(front.z, 0, -front.x).multiplyScalar(7);
  const pos = target.clone().add(front.clone().multiplyScalar(30)).add(side).add(new THREE.Vector3(0, 20, 0));
  flyTo(pos, target.clone().add(new THREE.Vector3(0, -6.5, 0)).add(front.multiplyScalar(4)));
  document.body.classList.add('in-district');
  for (const [k, btn] of dockButtons) btn.classList.toggle('is-active', k === id);
  setTimeout(() => focused === b && openPanel(id), 520);
}

let unmount = null;
function openPanel(id) {
  const d = DISTRICTS[id];
  unmount?.();
  panel.className = `pz-panel pz-d-${id}`;
  panel.innerHTML = `
    <header class="pz-panel-head">
      <span class="pz-panel-tag">${d.name}</span>
      <h2 class="pz-panel-title">${d.title}</h2>
      <button class="pz-panel-close" aria-label="Back to plaza">×</button>
    </header>
    <div class="pz-panel-body"></div>`;
  overlay.hidden = false;
  panel.querySelector('.pz-panel-close').addEventListener('click', leave);
  unmount = d.mount(panel.querySelector('.pz-panel-body'), { reward });
}

function leave() {
  unmount?.();
  unmount = null;
  overlay.hidden = true;
  focused = null;
  document.body.classList.remove('in-district');
  for (const btn of dockButtons.values()) btn.classList.remove('is-active');
  const t = me.position.clone().add(new THREE.Vector3(0, 1, 0));
  flyTo(t.clone().add(savedOffset), t);
}

function reward(text) {
  const el = document.createElement('div');
  el.className = 'reward';
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<line x1="${180 + Math.cos(a) * 120}" y1="${180 + Math.sin(a) * 70}" x2="${180 + Math.cos(a) * 150}" y2="${180 + Math.sin(a) * 92}"/>`;
  }).join('');
  el.innerHTML = `<div><svg viewBox="0 0 360 360" aria-hidden="true">${rays}</svg>${text}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// ---------- picking: click a building to walk to its door, click the ground to walk there ----------
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let hovered = null;
let downAt = null;

function setPointer(e) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
}
function pickBuilding() {
  const hit = ray.intersectObjects(buildings, true)[0];
  let o = hit?.object;
  while (o && !o.userData.district) o = o.parent;
  return o || null;
}

canvas.addEventListener('pointermove', (e) => {
  setPointer(e);
  const b = pickBuilding();
  if (b === hovered) return;
  if (hovered) labels.get(hovered).classList.remove('is-hover');
  hovered = b;
  if (b) labels.get(b).classList.add('is-hover');
  canvas.classList.toggle('hovering', !!b);
});
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  setPointer(e);
  if (focused) return leave();
  const b = pickBuilding();
  if (b) return me.walkTo(b.userData.door, () => enter(b.userData.district));
  const p = ray.ray.intersectPlane(floor, new THREE.Vector3());
  if (p) me.walkTo(p);
});

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'escape' && focused) return leave();
  // typing in a district's app must not walk you around
  if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  if (MOVE_KEYS.has(k)) { if (!focused) me.keys.add(k); e.preventDefault(); return; }
  if ((k === 'e' || k === 'enter') && nearDoor && !focused) return enter(nearDoor.userData.district);
  const id = Object.keys(DISTRICTS).find((key) => DISTRICTS[key].key === e.key);
  if (id) enter(id);
});
window.addEventListener('keyup', (e) => me.keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => me.keys.clear());

// ---------- toggles ----------
const themeBtn = document.getElementById('toggle-theme');
themeBtn.addEventListener('click', () => {
  theme = theme === 'day' ? 'night' : 'day';
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === 'day' ? 'Night' : 'Day';
  applyTheme(theme, lights);
  ink.setTheme(theme);
  scene.fog.color.set(THEMES[theme].paper);
  me.setInkColor(THEMES[theme].ink);
});
const wobbleBtn = document.getElementById('toggle-wobble');
wobbleBtn.addEventListener('click', () => {
  ink.wobbleOn = !ink.wobbleOn;
  wobbleBtn.setAttribute('aria-pressed', String(ink.wobbleOn));
});

refreshSigns();
// dates roll over at midnight; refresh the signs every minute
setInterval(refreshSigns, 60_000);

// ---------- loop ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  ink.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
const follow = new THREE.Vector3();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  stepTween(now);
  if (!focused) me.update(dt, t, camera);

  // the camera follows you, keeping whatever angle you've orbited to
  if (!tween && !focused) {
    follow.copy(me.position).setY(1).sub(controls.target).multiplyScalar(Math.min(1, dt * 5));
    controls.target.add(follow);
    camera.position.add(follow);
  }
  controls.update();

  nearDoor = buildings.find((b) => b.userData.door.distanceTo(me.position.clone().setY(0)) < 1.8) || null;

  // fog starts just past what you're looking at, so zooming out reveals more town
  const camDist = camera.position.distanceTo(controls.target);
  scene.fog.near = camDist + 30;
  scene.fog.far = camDist + 150;
  ink.setFog(scene.fog.near, scene.fog.far);

  const hall = townHall.userData;
  const flagY = hall.flagUp ? hall.flagHigh : hall.flagLow;
  hall.flag.position.y += (flagY - hall.flag.position.y) * Math.min(1, dt * 2);

  animateFolks(t);
  town.animate(t);
  ink.render(scene, camera, t);
  placeLabels();
});
