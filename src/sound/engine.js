// The sound engine: one Web Audio context, a few buses, and the settings.
//
//   master ── compressor ── speakers
//     ├─ amb ─┬─ plaza (muffled through a low-pass when you're indoors)
//     │       └─ room  (the inside of the building you're in, with its echo)
//     └─ fx       (one-shots: steps, paper, chimes…)
//
// Everything is drawn in code, no recordings: noise shaped by filters and
// little bells made of sine partials, which suits a plaza drawn in ink.
// Browsers only allow sound after you've clicked or pressed a key, so the
// context starts on the first gesture.

import { drawBark } from './bark.js';

const KEY = 'plaza.sound';
export const settings = { on: true, volume: 0.8, amb: 0.8, fx: 0.9, steps: 'everywhere', stepVol: 0.6 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* defaults */ }
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* not remembered */ }
  apply();
}

export const A = { ctx: null, master: null, amb: null, fx: null, dry: null, steps: null, plaza: null, plazaLow: null, room: null, roomVerb: null, noise: null, brown: null };
const starters = [];
// fn(A) runs once the context exists (beds build themselves here)
export function whenReady(fn) { if (A.ctx) fn(A); else starters.push(fn); }

function start() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = A.ctx = new Ctx();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -8; comp.ratio.value = 2;   // a safety net only, so nothing pumps
  comp.connect(ctx.destination);
  // dreamy: the top end rounded off, nothing sharp
  const shelf = filter('highshelf', 4200, 0.7, filter('lowpass', 9000, 0.5, comp));
  shelf.gain.value = -8;
  A.master = gain(0, shelf);
  // and a long, soft, dark echo under everything, like a memory of the place
  A.dream = ctx.createConvolver();
  A.dream.buffer = impulse(2.2, 3);   // short and soft: a hint of space, not a hall
  A.dream.connect(filter('lowpass', 2800, 0.5, gain(0.8, A.master)));
  A.amb = gain(1, A.master);
  A.fx = gain(1, A.master);
  A.dry = gain(1, A.master);   // effects with no echo at all (the dog)
  A.steps = gain(1, A.master); // your footsteps, dry, with their own volume
  // the plaza bus: open outdoors, through a closed window when you're in
  A.plazaLow = ctx.createBiquadFilter();
  A.plazaLow.type = 'lowpass'; A.plazaLow.frequency.value = 20000;
  A.plazaLow.connect(A.amb);
  A.plaza = gain(1, A.plazaLow);
  // the room bus, with a send into a soft hall echo
  A.room = gain(1, A.amb);
  A.roomVerb = ctx.createConvolver();
  A.roomVerb.buffer = impulse(1.6, 2.6);
  A.verbSend = gain(0, A.roomVerb);
  A.room.connect(A.verbSend);
  A.roomVerb.connect(A.amb);
  A.fxVerb = gain(0, A.roomVerb);   // one-shots echo in the bank too
  A.fx.connect(A.fxVerb);
  A.plaza.connect(gain(0.1, A.dream));
  A.fx.connect(gain(0.1, A.dream));
  A.room.connect(gain(0.04, A.dream));
  A.noise = noiseBuffer('white');
  A.brown = noiseBuffer('brown');
  // the dog's bark: a real recording (public/sounds, credited in the README),
  // with a drawn one (bark.js) until it loads, or if it can't
  fetch(`${import.meta.env.BASE_URL}sounds/dog-bark.ogg`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))
    .then((b) => { A.barkTape = b; }).catch(() => { /* keep the drawn bark */ });
  A.barks = [0.96, 1, 1.05, 1.1].map((pitch) => {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.17), ctx.sampleRate);
    b.copyToChannel(drawBark(ctx.sampleRate, { pitch }), 0);
    return b;
  });
  apply();
  starters.splice(0).forEach((fn) => fn(A));
}
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, start, { capture: true });

export function apply() {
  if (!A.ctx) return;
  const t = A.ctx.currentTime;
  A.master.gain.setTargetAtTime(settings.on ? settings.volume * 0.9 : 0, t, 0.08);
  A.amb.gain.setTargetAtTime(settings.amb, t, 0.08);
  A.fx.gain.setTargetAtTime(settings.fx, t, 0.08);
  A.dry.gain.setTargetAtTime(settings.fx, t, 0.08);
  A.steps.gain.setTargetAtTime(settings.fx * settings.stepVol, t, 0.08);
}

// ---------- small helpers ----------
export function gain(v, to) {
  const g = A.ctx.createGain();
  g.gain.value = v;
  if (to) g.connect(to);
  return g;
}
export function filter(type, freq, q = 0.7, to = null) {
  const f = A.ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  if (to) f.connect(to);
  return f;
}
// a looping noise source, started now
export function noiseSource(kind = 'white', to = null) {
  const s = A.ctx.createBufferSource();
  s.buffer = kind === 'brown' ? A.brown : A.noise;
  s.loop = true;
  s.loopStart = Math.random();   // so two beds never line up
  if (to) s.connect(to);
  s.start(0, Math.random() * 1.5);
  return s;
}
function noiseBuffer(kind) {
  const n = A.ctx.sampleRate * 2, b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}
function impulse(seconds, decay) {
  const r = A.ctx.sampleRate, n = r * seconds, b = A.ctx.createBuffer(2, n, r);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}

// ---------- where you hear from ----------
// The listener stands where you stand, facing where the camera faces.
export function listen(pos, forward) {
  if (!A.ctx) return;
  const L = A.ctx.listener, t = A.ctx.currentTime;
  if (L.positionX) {
    L.positionX.setTargetAtTime(pos.x, t, 0.03); L.positionY.setTargetAtTime(pos.y + 1.6, t, 0.03); L.positionZ.setTargetAtTime(pos.z, t, 0.03);
    L.forwardX.setTargetAtTime(forward.x, t, 0.03); L.forwardY.setTargetAtTime(0, t, 0.03); L.forwardZ.setTargetAtTime(forward.z, t, 0.03);
    L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
  } else {
    L.setPosition(pos.x, pos.y + 1.6, pos.z);
    L.setOrientation(forward.x, 0, forward.z, 0, 1, 0);
  }
}
// A panner at a spot in the world, feeding `to`: full within `ref` meters,
// fading to silence at `max`, so things are only heard once you're near.
export function spot(at, to, { ref = 2, max = 18 } = {}) {
  const p = A.ctx.createPanner();
  p.panningModel = 'equalpower';
  p.distanceModel = 'linear';
  p.refDistance = ref; p.maxDistance = max; p.rolloffFactor = 1;
  if (p.positionX) { p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z; } else p.setPosition(at.x, at.y, at.z);
  p.connect(to);
  return p;
}
