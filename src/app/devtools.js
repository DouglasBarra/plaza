// A handle for testing from the browser console: window.__plaza. main.js
// installs it in development only, so it's left out of builds.
import * as THREE from 'three';
import * as finds from '../finds.js';
import { camera, controls, canvas } from './engine.js';
import { game } from './state.js';
import { me } from './plaza.js';
import { setView, look } from './camera.js';
import { enterBuilding, exitBuilding, currentScene } from './rooms.js';
import { ray, setPointer, tryFind, shownInScene } from './picking.js';
import { findAction } from './actions.js';
import { openApp, closeApp } from '../ui/card.js';
import { openFinds } from '../ui/finds-card.js';

export function installDevtools() {
  window.__plaza = {
    me, camera, enterBuilding, exitBuilding, setView, openApp, closeApp, openFinds, finds,
    room: () => game.room,
    look,                                   // first-person gaze, for taking screenshots
    eye: () => camera.position.toArray(),
    // screen position of an object, after settling the camera
    screenPos(obj) {
      if (game.view === 'third') controls.update();
      camera.updateMatrixWorld();
      currentScene().updateMatrixWorld();
      const p = obj.getWorldPosition(new THREE.Vector3()).project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
    },
    // click a find by id, exactly as a person clicking on it would
    clickFind(id) {
      if (game.view === 'third') controls.update(); // settle the camera even if no frame has run
      camera.updateMatrixWorld();
      const p = finds.worldPositionOf(id).add(new THREE.Vector3(0, 0.1, 0)).project(camera);
      const r = canvas.getBoundingClientRect();
      const e = { clientX: r.left + (p.x * 0.5 + 0.5) * r.width, clientY: r.top + (-p.y * 0.5 + 0.5) * r.height };
      setPointer(e);
      currentScene().updateMatrixWorld();
      const first = ray.intersectObjects(currentScene().children, true).find((h) => !h.object.material?.transparent && shownInScene(h.object));
      return { onScreen: Math.abs(p.x) < 1 && Math.abs(p.y) < 1, firstHit: first?.object.userData.findId ?? first?.object.geometry?.type ?? null, found: tryFind() };
    },
    state: () => ({ room: game.room?.id ?? null, view: game.view, appOpen: game.appOpen, action: game.action?.label ?? null, pos: me.position.toArray().map((n) => +n.toFixed(2)) }),
    // walk with held keys for `seconds`, simulated at 60 fps
    walk(keys, seconds) {
      keys.forEach((k) => me.keys.add(k));
      for (let i = 0; i < seconds * 60; i++) me.update(1 / 60, i / 60, camera);
      keys.forEach((k) => me.keys.delete(k));
      game.action = findAction();
      return this.state();
    },
  };
}
