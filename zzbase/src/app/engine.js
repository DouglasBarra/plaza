// The renderer, the camera and its orbit controls, and the plaza's scene and
// sun. Everything that draws uses these.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InkRenderer, applyTheme, THEMES } from '../ink.js';
import { skipND } from '../life.js';

// ?lowpower trades sharpness for speed: for weak GPUs and software
// rendering (the end-to-end tests run headless with no GPU).
export const lowPower = new URLSearchParams(location.search).has('lowpower');
export const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(lowPower ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
export const ink = new InkRenderer(renderer, { samples: lowPower ? 0 : 4 });
ink.skipND = skipND;           // one shared list: things built later (a room's glass) join it too

export const plazaScene = new THREE.Scene();
plazaScene.fog = new THREE.Fog(THEMES.day.paper, 70, 180);
export const camera = new THREE.PerspectiveCamera(30, 1, 1, 1200);

export const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;

const ambient = new THREE.AmbientLight(0xffffff, 1);
const sun = new THREE.DirectionalLight(0xffffff, Math.PI);
sun.position.set(-14, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(lowPower ? 1024 : 4096);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
plazaScene.add(ambient, sun, sun.target);
export const plazaLights = { ambient, sun };
applyTheme('day', plazaLights);

// ---------- window size ----------
// Anything else that has to follow the window's size registers here.
const resizers = [];
export function onResize(fn) {
  resizers.push(fn);
  fn(window.innerWidth, window.innerHeight);
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  ink.setSize(w, h);
  for (const fn of resizers) fn(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
