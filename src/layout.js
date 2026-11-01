// Where movable things stand. Everything is placed in code; src/layout.json
// holds the changes made with the layout editor (app/editor.js), by id. A
// piece's colliders, the spot where you use it and the like are its
// "followers": they move and turn with it, so moving a desk moves the place
// you bump into it too.
import * as THREE from 'three';
import saved from './layout.json';

const pieces = new Map();   // id -> { obj, followers, home, layout }

// Group what `build(g)` adds into one movable piece, pivoting at (x, z).
// `build` keeps using the parent's coordinates, so existing code moves in
// unchanged: it builds into an inner group shifted back by the pivot.
export function piece(parent, id, [x, z], build, followers = []) {
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  outer.position.set(x, 0, z);
  inner.position.set(-x, 0, -z);
  outer.add(inner);
  parent.add(outer);
  const result = build(inner);
  placeable(outer, id, followers);
  return result ?? outer;
}

// Register `obj` (already placed) as movable piece `id`, apply its saved
// layout and keep `followers` with it. A follower is anything with x and z
// (a collider, a THREE.Vector3); a collider's `rot` turns with the piece too.
export function placeable(obj, id, followers = []) {
  if (pieces.has(id)) console.warn(`Plaza layout: "${id}" is used twice`);
  const home = { x: obj.position.x, y: obj.position.y, z: obj.position.z, rotY: obj.rotation.y };
  const entry = {
    obj, home,
    followers: followers.filter(Boolean).map((f) => ({ f, dx: f.x - home.x, dz: f.z - home.z, rot: f.rot })),
  };
  obj.userData.layoutId = id;
  pieces.set(id, entry);
  if (saved[id]) move(id, saved[id]);
  return obj;
}

// Move piece `id` to { x, y, z, rotY } (any of them; the rest stay).
export function move(id, to) {
  const p = pieces.get(id);
  if (!p) return;
  const { obj, home } = p;
  obj.position.set(to.x ?? obj.position.x, to.y ?? obj.position.y, to.z ?? obj.position.z);
  if (to.rotY != null) obj.rotation.y = to.rotY;
  const turn = obj.rotation.y - home.rotY;
  const c = Math.cos(turn), s = Math.sin(turn);
  for (const { f, dx, dz, rot } of p.followers) {
    // the offset from the piece turns with it (rotation about y: x' = x cos + z sin, z' = -x sin + z cos)
    f.x = obj.position.x + dx * c + dz * s;
    f.z = obj.position.z - dx * s + dz * c;
    if (rot != null) f.rot = rot + turn;
  }
}

export const pieceOf = (id) => pieces.get(id);
export const whereIs = (id) => {
  const { obj } = pieces.get(id);
  return { x: obj.position.x, y: obj.position.y, z: obj.position.z, rotY: obj.rotation.y };
};
export const homeOf = (id) => ({ ...pieces.get(id).home });

const round = (v) => Math.round(v * 1000) / 1000;
const same = (a, b) => Math.abs(a - b) < 1e-4;

// Every change from the code's layout: what was saved before (including
// pieces in rooms not built this session) plus where pieces are now.
export function layoutChanges() {
  const out = { ...saved };
  for (const [id, { obj, home }] of pieces) {
    const now = { x: obj.position.x, y: obj.position.y, z: obj.position.z, rotY: obj.rotation.y };
    const diff = {};
    for (const k of ['x', 'y', 'z', 'rotY']) if (!same(now[k], home[k])) diff[k] = round(now[k]);
    if (Object.keys(diff).length) out[id] = diff; else delete out[id];
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

// After saving, the saved file is the new baseline for layoutChanges().
export function markSaved(changes) {
  for (const k of Object.keys(saved)) delete saved[k];
  Object.assign(saved, changes);
}
