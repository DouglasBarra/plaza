// Plaza starts here. The pieces live in app/ (engine, camera, rooms, input),
// ui/ (cards, signs, toggles), plaza/ and interiors/ (the scenes); this file
// wires them together and runs the frame loop.
import * as THREE from 'three';
import { renderer, ink, camera, canvas } from './app/engine.js';
import { game } from './app/state.js';
import { me, town, updatePlaza } from './app/plaza.js';
import { setOrbitLimits, placeCameraBehindMe, stepTween, updateCamera } from './app/camera.js';
import { currentScene, applyRoomView, levelChanged } from './app/rooms.js';
import { renderWindowView } from './app/window-view.js';
import { findAction } from './app/actions.js';
import { pickNote } from './app/picking.js';
import { installDevtools } from './app/devtools.js';
import './app/input.js';
import { animatePlaza } from './plaza/index.js';
import { DISTRICTS } from './districts/index.js';
import { refreshSigns, placeLabels } from './ui/labels.js';
import { refreshFinds } from './ui/finds-card.js';
import { showTip } from './ui/hall-cards.js';
import { placeSpeech } from './ui/speech.js';
import './ui/toggles.js';

setOrbitLimits();
placeCameraBehindMe();

for (const d of Object.values(DISTRICTS)) d.subscribe(refreshSigns);
refreshSigns();
refreshFinds();
// dates roll over at midnight; refresh the signs every minute
setInterval(refreshSigns, 60_000);

// the dev handle exists in development and in the end-to-end tests' build (--mode test)
if (import.meta.env.DEV || import.meta.env.MODE === 'test') installDevtools();

const clock = new THREE.Clock();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const { room } = game;
  stepTween(now);
  if (!game.appOpen && !game.transitioning) me.update(dt, t, camera);
  updateCamera(dt);

  game.action = findAction();
  if (room && levelChanged()) applyRoomView(); // went up or down the stairs
  if (room && game.view === 'first' && !game.appOpen) {
    const note = pickNote(true);
    showTip(note, canvas.clientWidth / 2 + 14, canvas.clientHeight / 2 + 14);
  }

  if (room) {
    ink.setFog(1e5, 1e5);
    room.update?.(t, { view: game.view });
  } else updatePlaza(dt);
  town.animate(t);

  animatePlaza(t, room ? null : me.position, dt);
  if (room?.plazaOffset && game.view === 'first') renderWindowView(t);
  ink.render(currentScene(), camera, t);
  placeLabels();
  placeSpeech();
});
