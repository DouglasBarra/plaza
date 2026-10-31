// Hand-made models (Blockbench, Blender…) dropped into public/models/.
// Every object built in code can be swapped for a model with the same name:
// list it in public/models/manifest.json and it replaces the code version
// everywhere it appears. Models are "inked" on load: their textures are kept
// but they get the plaza's stepped shading and outlines like everything else.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toon } from './ink.js';

const loader = new GLTFLoader();
let manifest = null;
const cache = new Map();

async function getManifest() {
  if (!manifest) {
    manifest = fetch('/models/manifest.json')
      .then((r) => (r.ok ? r.json() : { models: {} }))
      .catch(() => ({ models: {} }));
  }
  return manifest;
}

function inkify(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    const map = src.map || null;
    if (map) {
      // Blockbench textures are pixel art: keep the pixels crisp
      map.magFilter = THREE.NearestFilter;
      map.colorSpace = THREE.SRGBColorSpace;
    }
    o.material = toon(src.color ? `#${src.color.getHexString()}` : '#ffffff', map);
    o.castShadow = o.receiveShadow = true;
  });
  return root;
}

async function load(name) {
  const { models } = await getManifest();
  const entry = models[name];
  if (!entry) return null;
  if (!cache.has(name)) {
    const file = typeof entry === 'string' ? entry : entry.file;
    cache.set(name, loader.loadAsync(`/models/${file}`).then((g) => inkify(g.scene)).catch((err) => {
      console.warn(`Plaza: couldn't load model "${name}"`, err);
      return null;
    }));
  }
  const scene = await cache.get(name);
  if (!scene) return null;
  const copy = scene.clone(true);
  if (entry.scale) copy.scale.setScalar(entry.scale);
  if (entry.rotateY) copy.rotation.y = THREE.MathUtils.degToRad(entry.rotateY);
  return copy;
}

// Keep the code-built children for now; if a model named `name` exists,
// replace them with it (same position, rotation and scale as the group).
export function swapModel(group, name) {
  load(name).then((model) => {
    if (!model) return;
    group.clear();
    group.add(model);
  });
  return group;
}
