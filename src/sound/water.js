// The fountain's water, drawn sample by sample (no browser needed, so it can
// be rendered to a file for listening too).
//
// A calm fountain is a slow burble: a few rounded bubbles at a time, low and
// unhurried, over a soft wash that breathes in and out. Each bubble rings at
// a pitch set by its size and glides up a little as it bursts. The loop wraps
// round so it has no seam.
export function drawWater(rate, seconds, seed = Math.random) {
  const n = Math.floor(rate * seconds), d = new Float32Array(n);
  // the wash: noise smoothed to a soft murmur, swelling slowly
  let l1 = 0, l2 = 0, l3 = 0;
  for (let i = 0; i < n; i++) {
    l1 += 0.06 * (seed() * 2 - 1 - l1); l2 += 0.06 * (l1 - l2); l3 += 0.06 * (l2 - l3);
    const breathe = 0.75 + 0.25 * Math.sin((2 * Math.PI * i) / n * 2) * Math.sin((2 * Math.PI * i) / n * 3 + 1);
    d[i] = l3 * 0.9 * breathe;
  }
  // the bubbles: about 45 a second, mostly low and round
  for (let k = 0; k < seconds * 45; k++) {
    const big = seed() ** 0.8;
    const f0 = 1300 - big * 950;                        // 350 Hz (big) to 1300 Hz (small)
    const tau = 0.012 + 0.03 * big;                     // big ones ring longer
    const amp = (0.04 + seed() * 0.06) * (0.7 + big * 0.6);
    const start = Math.floor(seed() * n), len = Math.floor(tau * 6 * rate);
    const attack = Math.floor(rate * 0.003);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      ph += (2 * Math.PI * f0 * (1 + 0.06 * t / tau)) / rate;
      const env = Math.exp(-t / tau) * Math.min(1, i / attack);   // a soft start, no click
      d[(start + i) % n] += Math.sin(ph) * env * amp;
    }
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  for (let i = 0; i < n; i++) d[i] *= 0.6 / peak;
  return d;
}
