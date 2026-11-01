// The ambience: what's always there, very quietly. Outside, the fountain
// (louder as you walk up to it), a murmur of the town, wind under clouds,
// rain when your week (or the sky) says so, birds by day and crickets at
// night, a tram bell far off, and the town hall's bell on the hour. Inside,
// each building's own room: the hall's fire and tall clock, the bank's hush.
// Going in muffles the plaza behind you, as through a closed door.
import { A, gain, filter, noiseSource, spot } from './engine.js';
import { VOICES } from './voices.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const ease = (p, v, t, k = 0.4) => p.setTargetAtTime(v, t, k);

// A source that sits in the plaza: placed in the world while you're out
// there, and heard flat (and muffled) once you're inside.
function plazaSpot(at, opts) {
  const input = gain(1);
  const near = gain(1, spot(at, A.plaza, opts));
  const far = gain(0, A.plaza);
  input.connect(near); input.connect(far);
  return { input, near, far };
}

export function buildBeds() {
  const out = {};

  // the fountain: water bubbling into the basin, heard from a few steps away
  // and full by the rim; two copies of the loop, out of step, so it never repeats
  const fount = plazaSpot({ x: 0, y: 1.2, z: 0 }, { ref: 6, max: 26 });
  for (const [rate, off] of [[1, 0], [0.93, 2.7]]) {
    const s = A.ctx.createBufferSource();
    s.buffer = A.water; s.loop = true; s.playbackRate.value = rate;
    s.connect(filter('lowpass', 3800, 0.5, gain(0.5, fount.input)));
    s.start(0, off);
  }
  out.fountain = fount;

  // the town: a low murmur of people that drifts up and down
  const murmur = gain(0, A.plaza);
  noiseSource('brown', filter('lowpass', 700, 0.5, filter('bandpass', 420, 1.1, murmur)));
  out.murmur = murmur;

  // wind under clouds, its pitch wandering
  const wind = gain(0, A.plaza);
  const windF = filter('lowpass', 400, 1.2, wind);
  noiseSource('white', windF);
  out.wind = wind; out.windF = windF;

  // rain on the paving
  const rain = gain(0, A.plaza);
  noiseSource('white', filter('highpass', 500, 0.5, filter('lowpass', 3200, 0.5, rain)));
  out.rain = rain;

  // the room you're in, rebuilt each time you go in
  out.room = null;
  out.timers = { bird: 0, cricket: 0, tram: rnd(20, 50), plink: 0, drip: 0, duck: 0 };
  return out;
}

// ---------- the indoors ----------
// sounds: [{ kind: 'fire' | 'clock' | 'hush', at }]
export function buildRoom(room) {
  const parts = { sources: [], ticks: [], kind: room.id, timers: { coin: rnd(4, 9), page: rnd(6, 14), crackle: 0 } };
  for (const s of room.sounds || []) {
    if (s.kind === 'fire') {
      const p = spot(s.at, A.room, { ref: 1.2, max: 10 });
      parts.sources.push(noiseSource('brown', filter('lowpass', 380, 0.7, gain(0.35, p))));
      parts.fire = p;
    } else if (s.kind === 'clock') {
      parts.clock = spot(s.at, A.room, { ref: 1, max: 8 });
    } else if (s.kind === 'hush') {
      parts.sources.push(noiseSource('brown', filter('lowpass', 160, 0.6, gain(0.12, A.room))));
      parts.echo = true;
    }
  }
  parts.spots = room.soundSpots || [];
  return parts;
}
export function dropRoom(parts) {
  for (const s of parts.sources) { try { s.stop(); } catch { /* already stopped */ } }
}

// ---------- every frame ----------
// st: { inside, night, wet (0–1), cloud (0–1), hour, room parts, t, dt }
let lastHour = null, tock = 0;
export function stepBeds(b, st) {
  const ctx = A.ctx, t = ctx.currentTime, T = b.timers;
  // the door: open air, or the plaza through the walls
  ease(A.plazaLow.frequency, st.inside ? 650 : 20000, t, 0.15);
  ease(A.plaza.gain, st.inside ? 0.3 : 1, t, 0.15);
  ease(b.fountain.near.gain, st.inside ? 0 : 1, t, 0.1);
  ease(b.fountain.far.gain, st.inside ? 0.04 : 0, t, 0.1);
  // the bank's echo
  const echo = !!st.room?.echo;
  ease(A.verbSend.gain, echo ? 0.6 : 0, t, 0.2);
  ease(A.fxVerb.gain, echo ? 0.35 : 0, t, 0.2);

  // the town, the wind, the rain
  const busy = st.night ? 0.008 : 0.025;   // barely there: the town is far off
  ease(b.murmur.gain, busy * (0.75 + 0.25 * Math.sin(st.t * 0.13) * Math.sin(st.t * 0.31)) * (1 - st.wet * 0.5), t, 1);
  ease(b.wind.gain, 0.004 + st.cloud * 0.03, t, 1.5);
  ease(b.windF.frequency, 260 + 260 * (0.5 + 0.5 * Math.sin(st.t * 0.21) * Math.sin(st.t * 0.07)), t, 0.8);
  ease(b.rain.gain, st.wet * 0.22, t, 1.2);

  const dt = st.dt;
  // drips when it rains
  if (st.wet > 0.05 && (T.drip -= dt) < 0) {
    T.drip = rnd(0.05, 0.4) / st.wet;
    const s = ctx.createOscillator(), g = gain(0, A.plaza), p = ctx.createStereoPanner();
    p.pan.value = rnd(-0.9, 0.9); p.connect(g);
    s.frequency.setValueAtTime(rnd(1800, 3500), t); s.frequency.exponentialRampToValueAtTime(rnd(900, 1500), t + 0.05);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    s.connect(p); s.start(t); s.stop(t + 0.1);
  }
  // birds by day (fewer in the rain), crickets at night
  if (!st.night && (T.bird -= dt) < 0) {
    T.bird = rnd(1.5, 5) * (1 + st.wet * 4);
    if (st.wet < 0.7) birdSong(t, around(st.pos, 4, 16));
  }
  if (st.night && (T.cricket -= dt) < 0) {
    T.cricket = rnd(0.5, 1.1);
    cricket(t, around(st.pos, 3, 12));
  }
  // a tram bell far off in the town
  // (out on the streets past the square, so you hear it near the edges)
  if ((T.tram -= dt) < 0) {
    T.tram = rnd(30, 70);
    const a = rnd(0, Math.PI * 2);
    VOICES.tram(t, gain(0.7, spot({ x: Math.cos(a) * 44, y: 2, z: Math.sin(a) * 44 }, A.plaza, { ref: 6, max: 34 })));
  }
  // the hour, struck on the town hall's bell
  const h = Math.floor(st.hour);
  // (the one sound that carries across the whole square)
  if (lastHour != null && h !== lastHour) VOICES.hour(t, gain(0.9, st.inside ? A.plaza : spot(st.hall, A.plaza, { ref: 14, max: 90 })), { strikes: h % 12 || 12 });
  lastHour = h;

  // the room you're in
  const R = st.room;
  if (R) {
    if (R.clock && Math.floor(st.t) !== tock) {
      tock = Math.floor(st.t);
      const s = ctx.createBufferSource(), f = filter('bandpass', tock % 2 ? 2300 : 1700, 6), g = gain(0, R.clock);
      s.buffer = A.noise; s.connect(f).connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      s.start(t, Math.random()); s.stop(t + 0.05);
    }
    if (R.fire && (R.timers.crackle -= dt) < 0) {
      R.timers.crackle = rnd(0.04, 0.35);
      const s = ctx.createBufferSource(), f = filter('highpass', rnd(1500, 4000), 1), g = gain(0, R.fire);
      s.buffer = A.noise; s.connect(f).connect(g);
      const v = Math.random() < 0.15 ? 0.5 : rnd(0.06, 0.2);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, t + rnd(0.01, 0.04));
      s.start(t, Math.random()); s.stop(t + 0.06);
    }
    if (R.echo && R.spots.length) {
      // the bank at work: coins counted, a page turned, somewhere across the hall
      if ((R.timers.coin -= dt) < 0) { R.timers.coin = rnd(7, 16); VOICES.coins(t, gain(0.6, spot(pick(R.spots), A.room, { ref: 1.5, max: 14 }))); }
      if ((R.timers.page -= dt) < 0) { R.timers.page = rnd(8, 18); VOICES.pageTurn(t, gain(0.8, spot(pick(R.spots), A.room, { ref: 1.5, max: 14 }))); }
    }
  }
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// somewhere in the trees and eaves around you
function around(pos, near, far) {
  const a = rnd(0, Math.PI * 2), r = rnd(near, far);
  return { x: pos.x + Math.cos(a) * r, y: rnd(2, 7), z: pos.z + Math.sin(a) * r };
}

// a short phrase: a few quick whistles, rising and falling
function birdSong(t, at) {
  const ctx = A.ctx, p = gain(0.6, spot(at, A.plaza, { ref: 3, max: 20 }));
  const base = rnd(2600, 4200), n = 2 + Math.floor(Math.random() * 5);
  let s = t;
  for (let i = 0; i < n; i++) {
    const o = ctx.createOscillator(), e = gain(0, p), d = rnd(0.05, 0.14);
    const f0 = base * rnd(0.85, 1.25), f1 = f0 * rnd(0.7, 1.4);
    o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f1, s + d);
    e.gain.setValueAtTime(0, s); e.gain.linearRampToValueAtTime(0.035, s + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.connect(e); o.start(s); o.stop(s + d + 0.02);
    s += d + rnd(0.03, 0.12);
  }
}
// three quick chirps, each a buzz of pulses
function cricket(t, at) {
  const ctx = A.ctx, p = gain(0.5, spot(at, A.plaza, { ref: 2, max: 14 }));
  const f = rnd(4200, 4800);
  for (let c = 0; c < 3; c++) {
    const s = t + c * 0.11, o = ctx.createOscillator(), e = gain(0, p);
    o.frequency.value = f;
    for (let k = 0; k < 4; k++) {
      const q = s + k * 0.018;
      e.gain.setValueAtTime(0, q); e.gain.linearRampToValueAtTime(0.02, q + 0.004); e.gain.linearRampToValueAtTime(0, q + 0.014);
    }
    o.connect(e); o.start(s); o.stop(s + 0.09);
  }
}
