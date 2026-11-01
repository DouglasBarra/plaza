// Sound for Plaza, a quiet storybook: paper and pencil for the interface,
// footsteps, the fountain and the town outside, each building's own room
// inside. The rest of the app calls `sfx('name', { at })`; main.js calls
// `stepSound()` once a frame.
//
// Sounds made in a room carry `room: id`; sounds with a spot and no room are
// on the plaza, and from indoors they're heard muffled, through the walls.
import * as THREE from 'three';
import { A, settings, saveSettings, whenReady, listen, spot, gain } from './engine.js';
import { VOICES } from './voices.js';
import { buildBeds, buildRoom, dropRoom, stepBeds } from './beds.js';
import { game } from '../app/state.js';

let beds = null, roomParts = null, roomOf = null;
whenReady(() => { beds = buildBeds(); });

const last = new Map();   // name -> when it last played, for `gap`
export function sfx(name, { at = null, room = null, gap = 0, vol = 1, ...opts } = {}) {
  if (!A.ctx || !settings.on || !VOICES[name]) return;
  const t = A.ctx.currentTime;
  if (gap && t - (last.get(name) ?? -1e9) < gap) return;
  last.set(name, t);
  const here = game.room?.id ?? null;
  let out;
  if (!at) out = gain(vol, A.fx);
  else if (room === here) out = gain(vol, spot(at, room ? A.room : A.fx, { ref: 2.5 }));
  else if (room === null) out = gain(vol * 0.35, A.plaza);   // out on the plaza, heard from inside
  else return;                                               // inside a building you're not in
  VOICES[name](t + 0.005, out, opts);
}

// ---------- once a frame ----------
const fwd = new THREE.Vector3();
export function stepSound(t, dt, { camera, me, hour, night, weather }) {
  if (!A.ctx || !beds) return;
  camera.getWorldDirection(fwd);
  listen(me.position, fwd.setY(0).normalize());
  // walked into a building, or out of one
  const id = game.room?.id ?? null;
  if (id !== roomOf) {
    if (roomParts) dropRoom(roomParts);
    roomParts = game.room ? buildRoom(game.room) : null;
    roomOf = id;
    const e = game.room?.enterSound;
    if (e) setTimeout(() => sfx(e.name, { at: e.at, room: id }), (e.delay || 0) * 1000);
  }
  stepBeds(beds, { inside: !!game.room, night, wet: weather?.wet ?? 0, cloud: weather?.cloud ?? 0, hour, room: roomParts, t, dt });
}

// ---------- the interface makes paper sounds ----------
// every button is a little wooden click; typing is a pencil (or, in the
// clerk's typewriter card, the typewriter's keys and its bell)
addEventListener('click', (e) => {
  if (e.target.closest?.('button, [role="button"], .pz-btn')) sfx('click', { gap: 0.03 });
}, { capture: true });
addEventListener('keydown', (e) => {
  const field = e.target.closest?.('input, textarea');
  if (!field || e.metaKey || e.ctrlKey) return;
  const typewriter = field.closest('.typewriter-card');
  if (e.key === 'Enter') { if (typewriter) sfx('ding'); return; }
  if (e.key.length !== 1 && e.key !== 'Backspace') return;
  sfx(typewriter ? 'key' : 'pencil');
}, { capture: true });

// ---------- the Sound button and M ----------
const btn = document.getElementById('toggle-sound');
const show = () => btn?.setAttribute('aria-pressed', String(settings.on));
show();
export function toggleSound() {
  settings.on = !settings.on;
  saveSettings();
  show();
}
// the card with the sliders: `showCard` is passed in, so this module
// doesn't depend on the card's (it depends on lots)
export function soundCard(showCard) {
  const row = (key, label) => `
    <label class="snd-row"><span>${label}</span>
      <input type="range" min="0" max="1" step="0.05" value="${settings[key]}" data-key="${key}">
    </label>`;
  const body = showCard('sound', { tag: 'Sound', title: 'What you hear', cls: 'sound-card', body: `
    <label class="snd-row snd-on"><input type="checkbox" ${settings.on ? 'checked' : ''} data-on> <span>Sound on <kbd>M</kbd></span></label>
    ${row('volume', 'Volume')}
    ${row('amb', 'Ambience: the fountain, the town, the weather, the rooms')}
    ${row('fx', 'Effects: steps, paper, creatures')}
    <p class="snd-note">Everything you hear is drawn in code, like the town.</p>` });
  body.addEventListener('input', (e) => {
    const k = e.target.dataset.key;
    if (k) settings[k] = Number(e.target.value);
    if (e.target.matches('[data-on]')) settings.on = e.target.checked;
    saveSettings();
    show();
  });
}
