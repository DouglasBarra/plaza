// Scratch lab for the birds (not part of the app).
import * as THREE from 'three';
import { InkRenderer, applyTheme, THEMES } from '../src/ink.js';
import { M, box } from '../src/kit.js';
import { pigeon, animateCritters } from '../src/plaza/critters.js';
import { placeFinds } from '../src/finds.js';
import { PIGEON, GULL, meshBird, flap, fold } from '../src/birds.js';
import { buildSky } from '../src/town/sky.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
const ink = new InkRenderer(renderer, { samples: 0 });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 500);
const ambient = new THREE.AmbientLight(0xffffff, 1);
const sun = new THREE.DirectionalLight(0xffffff, Math.PI);
sun.position.set(-14, 26, 12); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 80 });
scene.add(ambient, sun);
applyTheme('day', { ambient, sun });
const w = window.innerWidth, h = window.innerHeight;
renderer.setSize(w, h, false); ink.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();

const animateSky = buildSky(scene);
const world = new THREE.Group();
scene.add(world);
box(world, 40, 0.2, 40, M.paving, 0, -0.1, 0);
// pigeons on a ring at radius ~8 around the origin, like the plaza
for (const [x, z] of [[8, 0.0], [8.1, 0.6], [7.9, -0.7], [8.4, 1.2]]) pigeon(world, x, z);

// posed birds for close-ups
const posed = [];
for (const [spec, x, mode] of [[PIGEON, 0, 'fold'], [PIGEON, 1, 'down'], [PIGEON, 2, 'up'], [PIGEON, 3, 'glide'], [GULL, 4.5, 'glide'], [GULL, 6.5, 'fold']]) {
  const sk = meshBird(spec);
  sk.root.position.set(x, 1, -4);
  world.add(sk.root);
  posed.push({ sk, spec, mode });
}
const setPoses = (ph) => {
  for (const p of posed) {
    if (p.mode === 'fold') fold(p.sk, p.spec);
    else if (p.mode === 'glide') flap(p.sk, p.spec, 0, 0);
    else flap(p.sk, p.spec, p.mode === 'down' ? Math.PI : ph, 1);
  }
};
setPoses(0);

// the finds on fake perches
const mk = (district, x, ud) => { const g = new THREE.Group(); g.position.set(x, 0, -8); g.userData = { district, ...ud }; world.add(g); return g; };
const buildings = [
  mk('todo', -20, { roofH: 2, roofW: 10, roofBase: 5 }),
  mk('study', -20, {}),
  mk('ideas', 0, { tower: { x: 0, z: 0, top: 1 }, hut: { x: 2, z: 0, ridge: 1 } }),
];
box(world, 0.4, 1, 0.4, M.stone, 0, 0.5, -8);
box(world, 3, 1.05, 0.2, M.stone, 2, 0.5, -8);
box(world, 0.3, 3.05, 0.3, M.stone, -2, 1.5, -8);
placeFinds(world, buildings, { owlLamp: { x: -2, z: -8 }, flowers: { x: -30, z: 0 }, board: { x: -30, z: 0 }, trees: [{ x: -30, z: 0 }, { x: -30, z: 0 }] });
world.traverse((o) => { if (o.userData.findId === 'owl' || o.userData.findId === 'rooster') o.visible = true; });

let frozen = null, player = null, night = false;
const t0 = performance.now();
const now = () => (frozen ?? (performance.now() - t0) / 1000);
window.__lab = {
  THREE, scene, camera, world, setPoses, posed,
  cam(x, y, z, tx, ty, tz, fov = 30) { camera.position.set(x, y, z); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(tx, ty, tz); },
  freeze(t) { frozen = t; }, player(x, z) { player = x === null ? null : new THREE.Vector3(x, 0, z); },
  night(on) { night = on; applyTheme(on ? 'night' : 'day', { ambient, sun }); ink.setTheme(on ? 'night' : 'day'); },
  step(t0, t1, dt = 1 / 30) { for (let t = t0; t <= t1; t += dt) animateCritters(t, player, dt); frozen = t1; },
  now,
  // put the camera near sky bird i of the instanced flock with `count` birds
  aim(count, i, off = [0, -6, 8], fov = 30) {
    let im = null;
    scene.traverse((o) => { if (o.isInstancedMesh && o.count === count && !im) im = o; });
    const m = new THREE.Matrix4(); im.getMatrixAt(i, m);
    const p = new THREE.Vector3().setFromMatrixPosition(m);
    if (off.length === 4) this.cam(off[0], off[1], off[2], p.x, p.y, p.z, fov);   // [x, y, z, 'at']: from a fixed spot
    else this.cam(p.x + off[0], p.y + off[1], p.z + off[2], p.x, p.y, p.z, fov);
    return p.toArray().map((v) => +v.toFixed(1));
  },
};
renderer.setAnimationLoop(() => {
  const t = now();
  animateCritters(t, player, 1 / 30);
  animateSky(t);
  ink.render(scene, camera, t);
  void night; void THEMES;
});
