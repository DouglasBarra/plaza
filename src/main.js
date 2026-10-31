import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InkRenderer, applyTheme, THEMES } from './ink.js';
import { buildPlaza, animateFolks, PLAZA_HALF } from './world.js';
import { skipND, setNight } from './life.js';
import { buildTown } from './town.js';
import { Avatar } from './avatar.js';
import { DISTRICTS } from './districts/index.js';
import { buildInterior, hasInterior } from './interiors.js';
import * as finds from './finds.js';

// ---------- renderer, scene, camera ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const ink = new InkRenderer(renderer);

const plazaScene = new THREE.Scene();
plazaScene.fog = new THREE.Fog(THEMES.day.paper, 70, 180);
const camera = new THREE.PerspectiveCamera(30, 1, 1, 1200);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;

const ambient = new THREE.AmbientLight(0xffffff, 1);
const sun = new THREE.DirectionalLight(0xffffff, Math.PI);
sun.position.set(-14, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
plazaScene.add(ambient, sun, sun.target);
const plazaLights = { ambient, sun };

const { buildings, colliders } = buildPlaza(plazaScene);
const town = buildTown(plazaScene);
const me = new Avatar(plazaScene, colliders, PLAZA_HALF);
const plazaBounds = { ...me.bounds };
ink.skipND.push(...skipND);

let theme = 'day';
applyTheme(theme, plazaLights);

// ---------- where you are and how you look ----------
const PLAZA_VIEW = { minPolar: 0.5, maxPolar: 1.45, minDist: 14, maxDist: 140, offset: new THREE.Vector3(18, 26, 32) };
const ROOM_VIEW = { minPolar: 0.55, maxPolar: 1.15, minDist: 9, maxDist: 26, minAz: 0.05, maxAz: 1.5 };
let room = null;            // null on the plaza, else the interior you're in
let view = 'third';         // 'third' or 'first'
const rooms = new Map();    // interiors are built the first time you enter
const current = () => (room ? room.scene : plazaScene);

function setOrbitLimits() {
  const v = room ? ROOM_VIEW : PLAZA_VIEW;
  controls.minPolarAngle = v.minPolar;
  controls.maxPolarAngle = v.maxPolar;
  controls.minDistance = v.minDist;
  controls.maxDistance = v.maxDist;
  controls.minAzimuthAngle = v.minAz ?? -Infinity;
  controls.maxAzimuthAngle = v.maxAz ?? Infinity;
}

function placeCameraBehindMe() {
  controls.target.copy(me.position).setY(1);
  camera.position.copy(controls.target).add(room ? room.cameraOffset : PLAZA_VIEW.offset);
}
setOrbitLimits();
placeCameraBehindMe();

// ---------- labels and the action prompt ----------
const labelsEl = document.getElementById('labels');
const labels = new Map();
for (const b of buildings) {
  const el = document.createElement('div');
  el.className = `label pz-d-${b.userData.district}`;
  labelsEl.appendChild(el);
  labels.set(b, el);
}
const prompt = document.createElement('button');
prompt.className = 'prompt is-hidden';
prompt.addEventListener('click', () => interact());
labelsEl.appendChild(prompt);

// Signs, greeting, the town hall flag and the office board follow live data.
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
  townHall.userData.flagUp = todo.allClear;
  rooms.get('todo')?.setNotes(todo.count);
}
for (const d of Object.values(DISTRICTS)) d.subscribe(refreshSigns);

const tmp = new THREE.Vector3();
function screenOf(v) {
  tmp.copy(v).project(camera);
  return [(tmp.x * 0.5 + 0.5) * canvas.clientWidth, (-tmp.y * 0.5 + 0.5) * canvas.clientHeight, tmp.z];
}

// What pressing E would do right now: { label, run } or null.
let action = null;
function findAction() {
  if (appOpen || transitioning) return null;
  const at = me.position.clone().setY(0);
  if (!room) {
    const b = buildings.find((bb) => bb.userData.door.distanceTo(at) < 1.8);
    if (!b) return null;
    const id = b.userData.district;
    return { label: `Enter ${DISTRICTS[id].name}`, run: () => enterBuilding(id) };
  }
  if (room.station.point.distanceTo(at) < 1.7) return { label: room.station.label, run: () => openApp(room.id) };
  if (room.exit.distanceTo(at) < 1.3) return { label: 'Back to the plaza', run: () => exitBuilding() };
  return null;
}
function interact() { action?.run(); }

const hudEls = ['.greeting', '.hud-actions', '#dock'].map((s) => document.querySelector(s));
const overlaps = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

function placeLabels() {
  const camDist = camera.position.distanceTo(controls.target);
  const hud = hudEls.map((el) => { const r = el.getBoundingClientRect(); return { l: r.left - 8, r: r.right + 8, t: r.top - 8, b: r.bottom + 8 }; });
  // nearest labels claim their spot first; farther ones step up out of the way
  const items = [];
  for (const [b, el] of labels) {
    const [x, y, z] = screenOf(new THREE.Vector3(0, b.userData.labelY, 0).applyMatrix4(b.matrixWorld));
    const hidden = !!room || z > 1 || (focused && focused !== b) || (view === 'third' && camDist > 110);
    items.push({ el, x, y, z, hidden, w: el.offsetWidth, h: el.offsetHeight });
  }
  items.sort((a, b) => a.z - b.z);
  const placed = [];
  for (const it of items) {
    let { y } = it;
    if (!it.hidden) {
      for (let tries = 0; tries < 10; tries++) {
        const box = { l: it.x - it.w / 2, r: it.x + it.w / 2, t: y - it.h, b: y };
        const hit = placed.find((p) => overlaps(box, p));
        if (!hit) break;
        y = hit.t - 4;
      }
      const box = { l: it.x - it.w / 2, r: it.x + it.w / 2, t: y - it.h, b: y };
      if (hud.some((h) => overlaps(box, h))) it.hidden = true;
      else placed.push(box);
    }
    it.el.style.transform = `translate(${it.x}px, ${y}px) translate(-50%, -100%)`;
    it.el.classList.toggle('is-hidden', it.hidden);
  }
  prompt.classList.toggle('is-hidden', !action);
  prompt.classList.toggle('is-center', view === 'first');
  if (!action) return;
  prompt.innerHTML = `<kbd>E</kbd> ${action.label}`;
  if (view === 'first') { prompt.style.transform = ''; return; }
  const [x, y] = screenOf(me.position.clone().add(new THREE.Vector3(0, 2, 0)));
  prompt.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
}

// ---------- dock: jump straight to a district's app ----------
const dock = document.getElementById('dock');
const dockButtons = new Map();
for (const [id, d] of Object.entries(DISTRICTS)) {
  const btn = document.createElement('button');
  btn.className = `pz-d-${id}`;
  btn.innerHTML = `<span class="stampdot"></span><span class="name">${d.name}</span><kbd>${d.key}</kbd>`;
  btn.addEventListener('click', () => openApp(id));
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
  if (t === 1) { tween = null; controls.enabled = view === 'third'; }
}

// ---------- going in and out of buildings ----------
const fade = document.getElementById('fade');
let transitioning = false;
function fadeThrough(swap) {
  transitioning = true;
  fade.classList.add('is-on');
  setTimeout(() => {
    swap();
    requestAnimationFrame(() => fade.classList.remove('is-on'));
    setTimeout(() => { transitioning = false; }, 260);
  }, 260);
}

function enterBuilding(id) {
  if (!hasInterior(id)) return visitLot(id);
  fadeThrough(() => {
    if (!rooms.has(id)) { rooms.set(id, buildInterior(id)); setRoomLights(rooms.get(id).lights); }
    room = rooms.get(id);
    refreshSigns();
    me.setWorld(room.scene, room.colliders, room.bounds, room.spawn, Math.PI);
    setCutaway();
    setOrbitLimits();
    if (view === 'first') lookFrom(Math.PI); else placeCameraBehindMe();
    document.body.classList.add('in-room');
  });
}

function exitBuilding() {
  const b = buildings.find((bb) => bb.userData.district === room.id);
  fadeThrough(() => {
    room = null;
    me.setWorld(plazaScene, colliders, plazaBounds, b.userData.door.clone(), b.rotation.y);
    setOrbitLimits();
    if (view === 'first') lookFrom(b.rotation.y); else placeCameraBehindMe();
    document.body.classList.remove('in-room');
  });
}

// Empty lots have no inside yet: the camera looks at the lot and the card opens.
let focused = null;
let savedOffset = PLAZA_VIEW.offset.clone();
function visitLot(id) {
  const b = buildings.find((bb) => bb.userData.district === id);
  if (view === 'third') {
    savedOffset = camera.position.clone().sub(controls.target);
    focused = b;
    const front = new THREE.Vector3(0, 0, 1).applyQuaternion(b.quaternion);
    const target = b.position.clone().add(new THREE.Vector3(0, 2.6, 0));
    const side = new THREE.Vector3(front.z, 0, -front.x).multiplyScalar(7);
    const pos = target.clone().add(front.clone().multiplyScalar(30)).add(side).add(new THREE.Vector3(0, 20, 0));
    flyTo(pos, target.clone().add(new THREE.Vector3(0, -6.5, 0)).add(front.multiplyScalar(4)));
    setTimeout(() => openApp(id), 520);
  } else openApp(id);
}

// In third person the walls between you and the camera are cut away.
function setCutaway() {
  if (room) for (const m of room.cutaway) m.visible = view === 'first';
}

// ---------- district apps (the card) ----------
const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
let appOpen = null;
let unmount = null;

function openApp(id) {
  const d = DISTRICTS[id];
  unmount?.();
  appOpen = id;
  me.goal = null;
  me.keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  panel.className = `pz-panel pz-d-${id}`;
  panel.innerHTML = `
    <header class="pz-panel-head">
      <span class="pz-panel-tag">${d.name}</span>
      <h2 class="pz-panel-title">${d.title}</h2>
      <button class="pz-panel-close" aria-label="Close">×</button>
    </header>
    <div class="pz-panel-body"></div>`;
  overlay.hidden = false;
  document.body.classList.add('app-open');
  panel.querySelector('.pz-panel-close').addEventListener('click', closeApp);
  unmount = d.mount(panel.querySelector('.pz-panel-body'), { reward });
  for (const [k, btn] of dockButtons) btn.classList.toggle('is-active', k === id);
}

function closeApp() {
  unmount?.();
  unmount = null;
  appOpen = null;
  overlay.hidden = true;
  document.body.classList.remove('app-open');
  for (const btn of dockButtons.values()) btn.classList.remove('is-active');
  if (focused) {
    focused = null;
    const t = me.position.clone().setY(1);
    flyTo(t.clone().add(savedOffset), t);
  }
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

// ---------- the finds list ----------
const findsBtn = document.getElementById('finds-btn');
function refreshFinds() {
  const { found, total } = finds.progress();
  findsBtn.textContent = `Finds ${found}/${total}`;
}
finds.subscribe(refreshFinds);
findsBtn.addEventListener('click', openFinds);

function openFinds() {
  unmount?.();
  unmount = null;
  appOpen = 'finds';
  me.goal = null;
  me.keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  const { found, total } = finds.progress();
  panel.className = 'pz-panel finds-panel';
  panel.innerHTML = `
    <header class="pz-panel-head">
      <span class="pz-panel-tag">Finds</span>
      <h2 class="pz-panel-title">Little things</h2>
      <button class="pz-panel-close" aria-label="Close">×</button>
    </header>
    <div class="pz-panel-body">
      <p class="finds-intro">${found} of ${total} found. Click anything that looks a little out of place.</p>
      ${finds.list().map((f) => `
        <div class="row">
          <span class="box${f.found ? ' done' : ''}" aria-hidden="true"></span>
          <span class="t">${f.found ? f.name : '???'}<small>${f.hint}</small></span>
        </div>`).join('')}
    </div>`;
  overlay.hidden = false;
  document.body.classList.add('app-open');
  panel.querySelector('.pz-panel-close').addEventListener('click', closeApp);
}

// Click (or, in first person, look and click): did that hit a find?
const centerOfView = new THREE.Vector2(0, 0);
function shownInScene(o) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}
function tryFind(fromCenter = false) {
  current().updateMatrixWorld(); // positions as they are right now
  if (fromCenter) ray.setFromCamera(centerOfView, camera);
  const hit = ray.intersectObjects(current().children, true)
    .find((h) => !h.object.material?.transparent && shownInScene(h.object) && (!fromCenter || h.distance < 25));
  const f = hit && finds.findOf(hit.object);
  if (!f) return false;
  if (finds.markFound(f)) reward(`Found: ${f.name.replace(/^The /, '')}!`);
  return true;
}

// ---------- first person ----------
const viewBtn = document.getElementById('toggle-view');
let yaw = 0, pitch = -0.08;

function lookFrom(bodyRotY) {
  // the body faces +z at rotation 0; the camera faces -z at yaw 0
  yaw = bodyRotY + Math.PI;
  pitch = -0.08;
}

function setView(next) {
  view = next;
  const first = view === 'first';
  me.body.visible = !first;
  camera.near = first ? 0.05 : 1;
  camera.fov = first ? 70 : 30;
  camera.updateProjectionMatrix();
  controls.enabled = !first;
  setCutaway();
  if (first) {
    lookFrom(me.body.rotation.y);
    canvas.requestPointerLock?.();
  } else {
    if (document.pointerLockElement) document.exitPointerLock();
    placeCameraBehindMe();
  }
  viewBtn.textContent = first ? 'Third person' : 'First person';
  viewBtn.setAttribute('aria-pressed', String(first));
  document.body.classList.toggle('first-person', first);
}
viewBtn.addEventListener('click', () => setView(view === 'first' ? 'third' : 'first'));

document.addEventListener('mousemove', (e) => {
  if (view !== 'first') return;
  // look with the captured mouse, or by dragging when the mouse isn't captured
  const dragging = e.buttons === 1 && e.target === canvas;
  if (document.pointerLockElement !== canvas && !dragging) return;
  yaw -= e.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -1.3, 1.2);
});
document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('looking', document.pointerLockElement === canvas);
});

// ---------- picking: click a building to walk to its door, click the floor to walk there ----------
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
  if (room) return null;
  const hit = ray.intersectObjects(buildings, true)[0];
  let o = hit?.object;
  while (o && !o.userData.district) o = o.parent;
  return o || null;
}

canvas.addEventListener('pointermove', (e) => {
  if (view === 'first') return;
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
  if (view === 'first') {
    if (appOpen) return;
    if (document.pointerLockElement !== canvas) {
      // mouse not captured: a click finds what's under the pointer, else captures it
      const clicked = downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) <= 5;
      if (clicked) { setPointer(e); if (tryFind()) return; }
      return canvas.requestPointerLock?.();
    }
    if (tryFind(true)) return;
    return interact();
  }
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  setPointer(e);
  if (appOpen) return closeApp();
  if (tryFind()) return;
  const b = pickBuilding();
  if (b) return me.walkTo(b.userData.door, () => enterBuilding(b.userData.district));
  const p = ray.ray.intersectPlane(floor, new THREE.Vector3());
  if (p) me.walkTo(p);
});

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'escape' && appOpen) return closeApp();
  // typing in a district's app must not walk you around
  if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  if (appOpen) return;
  if (MOVE_KEYS.has(k)) { me.keys.add(k); e.preventDefault(); return; }
  if (k === 'e' || k === 'enter') return interact();
  if (k === 'v') return setView(view === 'first' ? 'third' : 'first');
  const id = Object.keys(DISTRICTS).find((key) => DISTRICTS[key].key === e.key);
  if (id) openApp(id);
});
window.addEventListener('keyup', (e) => me.keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => me.keys.clear());

// ---------- toggles ----------
function setRoomLights(l) {
  l.ambient.intensity = THEMES[theme].shadow * Math.PI;
  l.sun.intensity = Math.PI;
}
const themeBtn = document.getElementById('toggle-theme');
themeBtn.addEventListener('click', () => {
  theme = theme === 'day' ? 'night' : 'day';
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === 'day' ? 'Night' : 'Day';
  applyTheme(theme, plazaLights);
  for (const r of rooms.values()) setRoomLights(r.lights);
  ink.setTheme(theme);
  plazaScene.fog.color.set(THEMES[theme].paper);
  me.setInkColor(THEMES[theme].ink);
  setNight(theme === 'night');
});
const wobbleBtn = document.getElementById('toggle-wobble');
wobbleBtn.addEventListener('click', () => {
  ink.wobbleOn = !ink.wobbleOn;
  wobbleBtn.setAttribute('aria-pressed', String(ink.wobbleOn));
});

refreshSigns();
refreshFinds();
// dates roll over at midnight; refresh the signs every minute
setInterval(refreshSigns, 60_000);

// Dev-only handle for testing from the browser console (left out of builds).
if (import.meta.env.DEV) {
  window.__plaza = {
    me, camera, enterBuilding, exitBuilding, setView, openApp, closeApp, openFinds, finds,
    // click a find by id, exactly as a person clicking on it would
    clickFind(id) {
      if (view === 'third') controls.update(); // settle the camera even if no frame has run
      camera.updateMatrixWorld();
      const p = finds.worldPositionOf(id).add(new THREE.Vector3(0, 0.1, 0)).project(camera);
      const r = canvas.getBoundingClientRect();
      const e = { clientX: r.left + (p.x * 0.5 + 0.5) * r.width, clientY: r.top + (-p.y * 0.5 + 0.5) * r.height };
      setPointer(e);
      current().updateMatrixWorld();
      const first = ray.intersectObjects(current().children, true).find((h) => !h.object.material?.transparent && shownInScene(h.object));
      return { onScreen: Math.abs(p.x) < 1 && Math.abs(p.y) < 1, firstHit: first?.object.userData.findId ?? first?.object.geometry?.type ?? null, found: tryFind() };
    },
    state: () => ({ room: room?.id ?? null, view, appOpen, action: action?.label ?? null, pos: me.position.toArray().map((n) => +n.toFixed(2)) }),
    // walk with held keys for `seconds`, simulated at 60 fps
    walk(keys, seconds) {
      keys.forEach((k) => me.keys.add(k));
      for (let i = 0; i < seconds * 60; i++) me.update(1 / 60, i / 60, camera);
      keys.forEach((k) => me.keys.delete(k));
      action = findAction();
      return this.state();
    },
  };
}

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
  if (!appOpen && !transitioning) me.update(dt, t, camera);

  if (view === 'first') {
    camera.position.copy(me.position).setY(1.5);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    me.body.rotation.y = yaw + Math.PI;
  } else {
    // the camera follows you, keeping whatever angle you've orbited to
    if (!tween && !focused) {
      follow.copy(me.position).setY(1).sub(controls.target).multiplyScalar(Math.min(1, dt * 5));
      controls.target.add(follow);
      camera.position.add(follow);
    }
    controls.update();
  }

  action = findAction();

  if (room) {
    ink.setFog(1e5, 1e5);
  } else {
    // fog starts just past what you're looking at, so zooming out reveals more town
    const camDist = view === 'first' ? 20 : camera.position.distanceTo(controls.target);
    plazaScene.fog.near = camDist + 30;
    plazaScene.fog.far = camDist + 150;
    ink.setFog(plazaScene.fog.near, plazaScene.fog.far);
    const hall = townHall.userData;
    const flagY = hall.flagUp ? hall.flagHigh : hall.flagLow;
    hall.flag.position.y += (flagY - hall.flag.position.y) * Math.min(1, dt * 2);
    town.animate(t);
  }

  animateFolks(t, room ? null : me.position, dt);
  ink.render(current(), camera, t);
  placeLabels();
});
