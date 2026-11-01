// Weather from your week. The sky over the plaza follows how things stand:
// sunny when you're on top of things, clouds gathering when something's
// due, a drizzle of hatched ink lines when tasks are overdue or money is
// running out faster than it comes in, and steady rain when it's a lot.
// The line under the greeting says why.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../ink.js';
import { skipND, isNight } from '../life.js';
import { DISTRICTS } from '../districts/index.js';
import { plazaScene, plazaLights, controls } from './engine.js';
import { game } from './state.js';
import { me } from './plaza.js';

const KINDS = [
  { name: 'Sunny', drops: 0, clouds: 0, sun: 1 },
  { name: 'Clouds', drops: 0, clouds: 0.7, sun: 0.85 },
  { name: 'Drizzle', drops: 380, clouds: 1, sun: 0.7 },
  { name: 'Rain', drops: 900, clouds: 1.2, sun: 0.6 },
];

// How the week stands: a score, and the reasons, in words.
function mood() {
  const todo = DISTRICTS.todo.summary();
  const why = [];
  let score = 0;
  if (todo.overdue) { score += 2 * todo.overdue; why.push(`${todo.overdue} overdue ${todo.overdue === 1 ? 'task' : 'tasks'}`); }
  const today = (todo.count || 0) - (todo.overdue || 0);
  if (today > 2) { score += 1; why.push(`${today} things due today`); } else if (today > 0) why.push(`${today} due today`);
  const d = DISTRICTS.finance.api.data();
  if (d && d.loggedIn && d.month) {
    if (d.month.out > d.month.in && d.month.out > 0) { score += d.month.in > 0 ? 2 : 1; why.push('more going out than coming in'); }
    const soon = (d.accounts || []).find((a) => a.type === 'CREDIT' && a.due && (new Date(`${a.due}T12:00`) - Date.now()) / 864e5 <= 3 && (new Date(`${a.due}T12:00`) - Date.now()) > -864e5);
    if (soon) { score += 1; why.push(`a card bill due ${new Date(`${soon.due}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`); }
  }
  const level = score === 0 ? (why.length ? 1 : 0) : score <= 2 ? 1 : score <= 4 ? 2 : 3;
  return { level, why };
}

const AREA = 46, HIGH = 14;     // the box of rain around you: 46 m across, 14 m tall

export function weather() {
  // ---- rain: thin ink strokes, slanting a little
  const dropGeo = new THREE.BoxGeometry(0.035, 1.1, 0.035);
  const dropMat = new THREE.MeshBasicMaterial({ color: '#5d5d5d' });
  const rain = new THREE.InstancedMesh(dropGeo, dropMat, 900);
  rain.frustumCulled = false;
  rain.count = 0;
  plazaScene.add(rain);
  skipND.push(rain);
  const drops = Array.from({ length: 900 }, () => ({ x: Math.random() * AREA - AREA / 2, z: Math.random() * AREA - AREA / 2, y: Math.random() * HIGH, v: 9 + Math.random() * 3 }));
  // ripples where drops land: little rings that open and vanish
  const ringGeo = new THREE.TorusGeometry(1, 0.03, 3, 18).rotateX(Math.PI / 2);
  const ripples = new THREE.InstancedMesh(ringGeo, dropMat, 60);
  ripples.frustumCulled = false;
  ripples.count = 0;
  plazaScene.add(ripples);
  skipND.push(ripples);
  const rings = Array.from({ length: 60 }, () => ({ x: 0, z: 0, t0: -9 }));

  // ---- low clouds over the square, gathering when the weather turns
  const cloudMat = toon('#e4e4e0'); cloudMat.fog = false; cloudMat.flatShading = true;
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const parts = [];
    for (let k = 0; k < 4; k++) parts.push(new THREE.IcosahedronGeometry(5 + Math.random() * 3, 1).scale(1, 0.55, 1).translate(k * 6 - 9, Math.random() * 2, (Math.random() - 0.5) * 6).toNonIndexed());
    const c = new THREE.Mesh(mergeGeometries(parts), cloudMat);
    const a = (i / 9) * Math.PI * 2;
    c.userData = { a, r: 60 + (i % 3) * 25, y: 58 + (i % 4) * 6, speed: 0.01 + (i % 3) * 0.004 };   // high and wide: over the town, not in your face
    c.userData.inkCrisp = true;
    c.scale.setScalar(0.001);
    plazaScene.add(c);
    clouds.push(c);
  }

  const line = document.createElement('p');
  line.id = 'weather-line';
  document.getElementById('greeting-line').after(line);

  let kind = KINDS[0], cover = 0, last = 0, checked = -99;
  const o = new THREE.Object3D();
  const center = new THREE.Vector3();

  return function update(time, dt) {
    // look at the week every few seconds
    if (time - checked > 3) {
      checked = time;
      const m = mood();
      kind = KINDS[m.level];
      const why = m.why.length ? m.why.join(', ') : 'all clear';
      line.textContent = `${kind.name}: ${why}.`;
      line.dataset.weather = kind.name.toLowerCase();
    }
    // the clouds gather or clear slowly
    cover += (kind.clouds - cover) * Math.min(1, dt * 0.4);
    for (const c of clouds) {
      const u = c.userData, a = u.a + time * u.speed;
      c.position.set(Math.cos(a) * u.r, u.y, Math.sin(a) * u.r);
      c.scale.setScalar(Math.max(0.001, cover * 1.3));
      c.visible = cover > 0.02;
    }
    if (!game.room) plazaLights.sun.intensity = Math.PI * (1 + (kind.sun - 1) * Math.min(1, cover));

    // rain around wherever you're looking
    if (!game.room) center.copy(game.view === 'first' ? me.position : controls.target).setY(0);
    const n = Math.round(kind.drops * Math.min(1, cover));
    dropMat.color.set(isNight() ? '#cfd2d4' : '#5d5d5d');
    rain.count = n;
    for (let i = 0; i < n; i++) {
      const d = drops[i];
      d.y -= d.v * dt;
      if (d.y < 0) {
        d.y += HIGH;
        // some drops leave a ripple
        if (i % 7 === 0) { const r = rings[(last = (last + 1) % rings.length)]; r.x = center.x + d.x; r.z = center.z + d.z; r.t0 = time; }
      }
      o.position.set(center.x + d.x + d.y * 0.08, d.y, center.z + d.z);
      o.rotation.set(0, 0, 0.08);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      rain.setMatrixAt(i, o.matrix);
    }
    rain.instanceMatrix.needsUpdate = true;
    let k = 0;
    if (n) for (const r of rings) {
      const age = time - r.t0;
      if (age < 0 || age > 0.8) continue;
      o.position.set(r.x, 0.06, r.z);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(0.05 + age * 0.45);
      o.updateMatrix();
      ripples.setMatrixAt(k++, o.matrix);
    }
    ripples.count = k;
    ripples.instanceMatrix.needsUpdate = true;
  };
}
