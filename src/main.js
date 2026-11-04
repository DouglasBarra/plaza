// Plaza starts here. The pieces live in app/ (engine, camera, rooms, input),
// ui/ (cards, signs, toggles), plaza/ and interiors/ (the scenes); this file
// wires them together and runs the frame loop.
import * as THREE from 'three';
import { renderer, ink, camera, canvas, lowPower } from './app/engine.js';
import { game } from './app/state.js';
import { me, town, townHall, updatePlaza } from './app/plaza.js';
import { setOrbitLimits, placeCameraBehindMe, stepTween, updateCamera } from './app/camera.js';
import { currentScene, applyRoomView, levelChanged } from './app/rooms.js';
import { renderWindowView } from './app/window-view.js';
import { findAction } from './app/actions.js';
import { pickNote } from './app/picking.js';
import { installDevtools } from './app/devtools.js';
import { installEditor } from './app/editor.js';
import './app/input.js';
import { animatePlaza } from './plaza/index.js';
import { DISTRICTS } from './districts/index.js';
import { refreshSigns, placeLabels } from './ui/labels.js';
import { refreshFinds } from './ui/finds-card.js';
import { showTip, hideTip } from './ui/hall-cards.js';
import { openApp } from './ui/card.js';
import { placeSpeech } from './ui/speech.js';
import './ui/toggles.js';
import { weather } from './app/weather.js';
import { washes } from './ui/washes.js';
import { stepSound } from './sound/index.js';
import { hourNow, isNight } from './life.js';

const stepWeather = weather();
const stepWashes = washes();

setOrbitLimits();
placeCameraBehindMe();

for (const d of Object.values(DISTRICTS)) d.subscribe(refreshSigns);
refreshSigns();
refreshFinds();
// dates roll over at midnight; refresh the signs every minute
setInterval(refreshSigns, 60_000);

// ?district=finance opens that district's app (the bank login comes back this way)
const asked = new URLSearchParams(location.search).get('district');
if (asked && DISTRICTS[asked]) {
  history.replaceState(null, '', location.pathname + location.search.replace(/[?&]district=[^&]*/, '').replace(/^&/, '?'));
  openApp(asked);
}

// the dev handle exists in development and in the end-to-end tests' build (--mode test)
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  installDevtools();
  installEditor();   // the layout editor: press ` (saving needs the dev server)
}

const clock = new THREE.Clock();
// ?lowpower (what the e2e tests use) still runs the plaza every frame but
// only draws it 12 times a second: the drawing is what's costly without a GPU
const DRAW_EVERY = lowPower ? 1000 / 12 : 0;
let drawnAt = -1e9;
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
  } else if (game.appOpen || game.view === 'first') hideTip();   // an open card mustn't be left with a note's tooltip over it

  if (room) {
    ink.setFog(1e5, 1e5);
    room.update?.(t, { view: game.view });
  } else updatePlaza(dt);
  town.animate(t);
  stepWeather(t, dt);
  stepWashes(dt);
  stepSound(t, dt, { camera, me, hour: hourNow(), night: isNight(), weather: game.weather, hall: townHall.position });

  animatePlaza(t, room ? null : me.position, dt);
  if (now - drawnAt >= DRAW_EVERY) {
    drawnAt = now;
    if (room?.plazaOffset && game.view === 'first') renderWindowView(t);
    ink.render(currentScene(), camera, t);
  }
  placeLabels();
  placeSpeech();
});
