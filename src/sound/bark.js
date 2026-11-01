// The dog's bark, drawn sample by sample the way a voice is made (no browser
// needed, so it can be rendered to a file for listening too).
//
// A throat: a buzz of pulses that wobble a little in pitch and strength,
// which is what makes it rough, with breath mixed in. A mouth: three
// resonances (formants) that shape the buzz into a vowel; the first one
// opens up as the jaw drops, which turns the start into a "w". The pitch
// jumps up and falls away, the shape of a single "wuff". A small dog, so
// it's pitched high and short.
export function drawBark(rate, { pitch = 1, length = 0.17, seed = Math.random } = {}) {
  const n = Math.floor(rate * length), d = new Float32Array(n);
  const res = (f, bw) => {   // a resonator whose frequency can move
    const r = Math.exp((-Math.PI * bw) / rate);
    let y1 = 0, y2 = 0;
    return (x, freq = f) => {
      const y = (1 - r) * x + 2 * r * Math.cos((2 * Math.PI * freq) / rate) * y1 - r * r * y2;
      y2 = y1; y1 = y;
      return y;
    };
  };
  const F1 = res(1000, 200), F2 = res(1900, 220), F3 = res(3100, 320);
  let ph = 0, jitter = 0, shimmer = 1, breath = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    // the pitch: up fast, then falling away
    const f0 = pitch * (t < 0.025 ? 420 + (640 - 420) * (t / 0.025) : 640 * Math.pow(360 / 640, Math.min(1, (t - 0.025) / (length - 0.04))));
    // each new pulse wobbles a little: roughness
    const prev = ph;
    ph += (f0 * (1 + jitter)) / rate;
    if (Math.floor(ph) !== Math.floor(prev)) { jitter = (seed() - 0.5) * 0.09; shimmer = 0.75 + seed() * 0.5; }
    const frac = ph % 1;
    // a glottal pulse: a quick open and a sharp close
    const pulse = (frac < 0.6 ? Math.sin((Math.PI * frac) / 0.6) : 0) * shimmer - 0.38;
    breath += 0.5 * (seed() * 2 - 1 - breath);
    // the sharp close of each pulse is where the brightness comes from:
    // take the change, not the level (and lose the low hum with it)
    const raw = pulse * 0.9 + breath * 0.7;
    const src = raw - last;
    last = raw;
    // the jaw opens over the first 40 ms: "w" into "uff"
    const open = Math.min(1, t / 0.04);
    const v = F1(src, 600 + 500 * open) * 0.8 + F2(src, 1400 + 500 * open) * 1.0 + F3(src) * 0.5;
    // loudness: a hard start, a short hold, a fall
    const env = Math.min(1, t / 0.006) * (t < 0.05 ? 1 : Math.exp(-(t - 0.05) / 0.045));
    d[i] = Math.tanh(v * env * 40);   // a touch of grit
  }
  // a soft fade at the very end so it never clicks
  for (let i = 0; i < 64 && i < n; i++) d[n - 1 - i] *= i / 64;
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  for (let i = 0; i < n; i++) d[i] *= 0.8 / peak;
  return d;
}
