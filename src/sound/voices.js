// The one-shots, each drawn in code. A voice gets the time to start and the
// node to play into (already placed in the world when it has a spot), and
// schedules itself; nothing here keeps running.
import { A, gain, filter } from './engine.js';

const rnd = (a, b) => a + Math.random() * (b - a);

// a burst of noise through a band-pass: the brush, paper and wood of it all
function hiss(t, out, { f = 2000, q = 1, dur = 0.05, vol = 0.3, attack = 0.003, type = 'bandpass', to = null, kind = 'white' }) {
  const s = A.ctx.createBufferSource();
  s.buffer = kind === 'brown' ? A.brown : A.noise;
  const fl = filter(type, f, q);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = gain(0, out);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.05);
}
// a pure tone with a soft bell envelope
function tone(t, out, { f, dur = 0.5, vol = 0.2, type = 'sine', attack = 0.004, to = null }) {
  const o = A.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = gain(0, out);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.05);
}
// a little bell, like a music box: soft partials, each doubled a hair out
// of tune so it shimmers as it rings away
function bell(t, out, f, vol = 0.12, dur = 2.4) {
  [[1, 1], [2.76, 0.22], [5.4, 0.06]].forEach(([r, v]) => {
    for (const d of [0.997, 1.003]) tone(t, out, { f: f * r * d, vol: vol * v * 0.6, dur: dur / r ** 0.4, attack: 0.008 });
  });
}

export const VOICES = {
  // ---------- the interface: paper, pencil and wood ----------
  click(t, out) {   // a soft wooden tap
    tone(t, out, { f: rnd(520, 580), to: 380, dur: 0.07, vol: 0.07, attack: 0.004 });
    hiss(t, out, { f: 1100, q: 1.5, dur: 0.03, vol: 0.04 });
  },
  rustle(t, out) {  // a card opening: paper unfolding
    for (let i = 0; i < 6; i++) hiss(t + i * rnd(0.03, 0.06), out, { f: rnd(1800, 3800), q: 1, dur: rnd(0.06, 0.12), vol: rnd(0.03, 0.06), attack: 0.015 });
  },
  slide(t, out) {   // a card closing: paper sliding away
    hiss(t, out, { f: 2600, to: 900, q: 0.9, dur: 0.22, vol: 0.09, attack: 0.04 });
  },
  pencil(t, out) {  // typing: a pencil stroke
    hiss(t, out, { f: rnd(3000, 4500), q: 2, dur: rnd(0.025, 0.05), vol: rnd(0.015, 0.03), attack: 0.006 });
  },
  chime(t, out) {   // something done: two notes up
    bell(t, out, 784, 0.12);
    bell(t + 0.16, out, 1175, 0.1);
  },
  done(t, out) {    // a task done: torn off, crumpled, a chime
    hiss(t, out, { f: 5000, to: 1800, q: 1.4, dur: 0.18, vol: 0.14, attack: 0.01 });     // the tear
    for (let i = 0; i < 12; i++) hiss(t + 0.2 + i * rnd(0.02, 0.04), out, { f: rnd(1200, 6000), q: 3, dur: rnd(0.015, 0.05), vol: rnd(0.05, 0.14) });
    bell(t + 0.62, out, 784, 0.11);
    bell(t + 0.78, out, 988, 0.1);
    bell(t + 0.94, out, 1175, 0.1, 3.2);
  },
  pin(t, out) {     // a note pinned to the board
    tone(t, out, { f: 2400, to: 1600, dur: 0.05, vol: 0.08 });
    hiss(t, out, { f: 1200, q: 1, dur: 0.04, vol: 0.1 });
    bell(t + 0.14, out, 988, 0.09);
  },
  swish(t, out) {   // the ink wipe: a brush stroke across the page
    hiss(t, out, { f: 500, to: 2600, q: 1.6, dur: 0.26, vol: 0.12, attack: 0.08 });
    hiss(t + 0.26, out, { f: 2600, to: 700, q: 1.6, dur: 0.3, vol: 0.07, attack: 0.05 });
  },
  door(t, out) {    // a heavy wooden door
    tone(t, out, { f: 95, to: 60, dur: 0.3, vol: 0.25 });
    hiss(t, out, { f: 380, q: 1, dur: 0.18, vol: 0.18, type: 'lowpass' });
  },

  // ---------- underfoot ----------
  // a small, dark click, like a linear (red) key switch bottoming out: a
  // short low thock and the faintest tap on top, no click from a bump.
  // Boards a little lower and softer, marble a little brighter.
  step(t, out, { surface = 'stone' } = {}) {
    const { f, tap } = { wood: { f: 210, tap: 900 }, marble: { f: 300, tap: 1600 }, grass: { f: 190, tap: 700 } }[surface] || { f: 250, tap: 1200 };
    const v = rnd(0.85, 1.05);
    tone(t, out, { f: f * rnd(0.95, 1.05), to: f * 0.7, dur: 0.035, vol: 0.06 * v, attack: 0.002 });
    hiss(t, out, { f: tap, q: 1.4, dur: 0.018, vol: 0.022 * v, attack: 0.001, type: 'bandpass' });
  },

  // ---------- creatures and folks ----------
  flutter(t, out) { // pigeons taking off
    const n = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) hiss(t + i * 0.065, out, { f: rnd(700, 1300), q: 0.8, dur: 0.05, vol: 0.18 * (1 - i / n), type: 'bandpass' });
  },
  bark(t, out) {    // woof-woof: two barks, the second a touch higher
    // the recording has three clean barks, at these seconds
    const TAPE = [[0.17, 0.31], [1.16, 0.31], [1.87, 0.31]];
    const k = Math.floor(Math.random() * 3);
    [[0, k, 1], [0.3, (k + 1) % 3, 1.06]].forEach(([d, i, rate]) => {
      const s = A.ctx.createBufferSource(), g = gain(0, out), at = t + d;
      if (A.barkTape) {
        const [from, len] = TAPE[i];
        s.buffer = A.barkTape;
        s.playbackRate.value = rate;
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.5, at + 0.01);
        g.gain.setValueAtTime(0.5, at + len / rate - 0.06);
        g.gain.linearRampToValueAtTime(0, at + len / rate);
        s.connect(g);
        s.start(at, from, len);
      } else {
        s.buffer = A.barks[i];
        g.gain.value = 0.55;
        s.connect(g);
        s.start(at);
      }
    });
  },
  quack(t, out) {
    const o = A.ctx.createOscillator(), g = gain(0, out), f = filter('bandpass', 1100, 5), f2 = filter('bandpass', 2300, 6);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rnd(330, 380), t);
    o.frequency.linearRampToValueAtTime(260, t + 0.14);
    o.connect(f).connect(g); o.connect(f2).connect(g);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.015);
    g.gain.setValueAtTime(0.25, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.start(t); o.stop(t + 0.2);
  },
  flame(t, out) {   // a street lamp catching: a soft whump and a hiss of gas
    tone(t, out, { f: 90, to: 55, dur: 0.35, vol: 0.3 });
    hiss(t, out, { f: 300, to: 1400, q: 0.8, dur: 0.4, vol: 0.18, attack: 0.03 });
    hiss(t + 0.1, out, { f: 3000, q: 0.6, dur: 0.6, vol: 0.03, attack: 0.1, type: 'highpass' });
  },
  letter(t, out) {  // the postman's letter through the slot: flap up, clack shut
    hiss(t, out, { f: 2600, q: 2, dur: 0.06, vol: 0.14 });
    tone(t + 0.25, out, { f: 1800, dur: 0.08, vol: 0.12 });
    tone(t + 0.25, out, { f: 2700, dur: 0.05, vol: 0.07 });
    hiss(t + 0.25, out, { f: 3200, q: 6, dur: 0.05, vol: 0.18 });
  },
  tram(t, out) {    // far off in the town: ding-ding
    bell(t, out, 1175, 0.06, 1.4);
    bell(t + 0.3, out, 1175, 0.06, 1.6);
  },
  hour(t, out, { strikes = 1 } = {}) {   // the town hall bell, once per hour
    for (let i = 0; i < strikes; i++) {
      const s = t + i * 2.2;
      [[0.5, 0.4], [1, 0.5], [1.19, 0.25], [1.5, 0.2], [2, 0.18], [2.52, 0.08], [3.01, 0.06]]
        .forEach(([r, v]) => tone(s, out, { f: 196 * r, vol: 0.12 * v, dur: 5.5 / Math.max(1, r) ** 0.5, attack: 0.006 }));
    }
  },

  // ---------- inside ----------
  key(t, out) {     // the clerk's typewriter
    hiss(t, out, { f: rnd(2000, 3000), q: 2, dur: 0.025, vol: 0.2 });
    tone(t, out, { f: rnd(1100, 1300), dur: 0.02, vol: 0.06 });
    tone(t + 0.01, out, { f: 160, dur: 0.04, vol: 0.08 });
  },
  ding(t, out) {    // the carriage return
    bell(t, out, 1568, 0.07, 1.8);
    hiss(t + 0.08, out, { f: 1600, to: 900, q: 2, dur: 0.25, vol: 0.06, attack: 0.02 });
  },
  flaps(t, out) {   // the split-flap board, a patter of cards
    for (let i = 0; i < 9; i++) hiss(t + i * rnd(0.018, 0.035), out, { f: rnd(3500, 5200), q: 4, dur: 0.012, vol: rnd(0.05, 0.11) });
  },
  coins(t, out) {
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const s = t + i * rnd(0.04, 0.11), f = rnd(3000, 4200);
      tone(s, out, { f, dur: 0.25, vol: 0.05 });
      tone(s, out, { f: f * 1.47, dur: 0.18, vol: 0.03 });
      tone(s, out, { f: f * 2.03, dur: 0.12, vol: 0.02 });
    }
  },
  vault(t, out) {   // the vault's bolt: a deep clunk with a ring
    tone(t, out, { f: 58, to: 40, dur: 0.6, vol: 0.4 });
    hiss(t, out, { f: 220, q: 1, dur: 0.3, vol: 0.25, type: 'lowpass' });
    tone(t + 0.02, out, { f: 420, dur: 1.2, vol: 0.04 });
  },
  tube(t, out) {    // the courier's pneumatic tube: thwup and whoosh
    tone(t, out, { f: 180, to: 90, dur: 0.12, vol: 0.18 });
    hiss(t, out, { f: 600, to: 3000, q: 1.2, dur: 0.7, vol: 0.12, attack: 0.05 });
  },
  pageTurn(t, out) {   // a page turned somewhere in the hall
    hiss(t, out, { f: 1500, to: 4500, q: 0.9, dur: 0.25, vol: 0.05, attack: 0.05 });
    hiss(t + 0.22, out, { f: 3000, q: 1, dur: 0.06, vol: 0.05 });
  },
};
