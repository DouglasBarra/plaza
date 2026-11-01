// The ambience: what's always there, very quietly. Outside, wind under
// clouds, rain when your week (or the sky) says so, birds by day and
// crickets at night in the trees around you, a tram bell at the edges, and
// the town hall's bell on the hour. Inside, each building's own room: the
// hall's fire and tall clock, the bank's quiet echo. Going in muffles the
// plaza behind you, as through a closed door.
import { A, gain, filter, noiseSource, spot } from './engine.js';
import { VOICES } from './voices.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const ease = (p, v, t, k = 0.4) => p.setTargetAtTime(v, t, k);

export function buildBeds() {
  const out = {};

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
      // the flames: a breath of soft, mid noise that flickers, no rumble
      const flick = gain(0.02, p);
      parts.sources.push(noiseSource('white', filter('bandpass', 1100, 0.6, flick)));
      parts.flick = flick;
      parts.fire = p;
    } else if (s.kind === 'clock') {
      parts.clock = spot(s.at, A.room, { ref: 1, max: 8 });
    } else if (s.kind === 'hush') {
      parts.echo = true;   // a quiet hall: no hum, just its echo and the small sounds in it
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
  ease(A.plazaLow.frequency, st.inside ? 900 : 20000, t, 0.15);
  ease(A.plaza.gain, st.inside ? 0.1 : 1, t, 0.15);
  // the bank's echo
  const echo = !!st.room?.echo;
  ease(A.verbSend.gain, echo ? 0.3 : 0, t, 0.2);
  ease(A.fxVerb.gain, echo ? 0.14 : 0, t, 0.2);

  // the town, the wind, the rain
  ease(b.wind.gain, st.inside ? 0 : st.cloud * 0.02, t, 1.5);
  ease(b.windF.frequency, 260 + 260 * (0.5 + 0.5 * Math.sin(st.t * 0.21) * Math.sin(st.t * 0.07)), t, 0.8);
  ease(b.rain.gain, st.wet * (st.inside ? 0.6 : 0.22), t, 1.2);   // rain you do hear on the roof (muffled)

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
  if (lastHour != null && h !== lastHour) VOICES.hour(t, st.inside ? gain(0.12, A.fx) : gain(0.9, spot(st.hall, A.plaza, { ref: 14, max: 90 })), { strikes: h % 12 || 12 });
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
    if (R.flick) ease(R.flick.gain, 0.012 + 0.012 * Math.random(), t, 0.08);
    if (R.fire && (R.timers.crackle -= dt) < 0) {
      R.timers.crackle = rnd(0.08, 0.6);
      const s = ctx.createBufferSource(), f = filter('highpass', rnd(1500, 4000), 1), g = gain(0, R.fire);
      s.buffer = A.noise; s.connect(f).connect(g);
      const v = Math.random() < 0.12 ? 0.22 : rnd(0.03, 0.1);
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
