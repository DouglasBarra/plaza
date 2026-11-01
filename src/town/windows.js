// Windows you can see into. Every pane in the town is one quad of a single
// merged mesh drawn with this shader, which fakes a room behind the glass:
// it follows your line of sight into a box (back wall, side walls, floor and
// ceiling), with a drawn back wall, sometimes somebody or something standing
// in the room, a lamp hanging from the ceiling, and curtains on the glass.
// It moves with your eye like a real room would ("interior mapping").
// At night some rooms light up warm; each one switches on and off on its own
// slow clock, so the town changes through the evening. Nothing here is a
// real light: it's all unlit color.
import * as THREE from 'three';
import { roomAtlas } from './art.js';
import { wallQuad } from './bag.js';

// What a pane looks into (aWin.y).
export const KIND = { room: 0, ground: 1, shop: 2, attic: 3, church: 4, tram: 5 };

// palette slots: back wall, side walls, floor, ceiling, furniture, ink, curtain, curtain ink, frame
const hex = (list) => list.map((c) => new THREE.Color(c));
const DAY = hex(['#8f8f8a', '#7d7d78', '#6c6c68', '#878782', '#64645f', '#262622', '#e4e4de', '#7a7a72', '#f6f6f2']);
const NIGHT = hex(['#1a1a1b', '#161617', '#121213', '#18181a', '#202021', '#2e2e2e', '#232324', '#323232', '#3c3c3b']);
const LIT = hex(['#ffe7a3', '#f0cf86', '#d8b268', '#fff0c4', '#c79f5e', '#5a3c16', '#ffd98c', '#a07a38', '#3c3c3b']);

const vertexShader = /* glsl */ `
  attribute vec4 aWin;
  varying vec2 vUv;
  varying vec4 vWin;
  varying vec3 vWorld;
  varying vec3 vN;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vWin = aWin;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uArt;
  uniform float uNight, uTime;
  uniform vec3 uPal[9];
  uniform vec3 uLit[9];
  varying vec2 vUv;
  varying vec4 vWin;
  varying vec3 vWorld;
  varying vec3 vN;
  #include <fog_pars_fragment>

  float hash(float n) { return fract(sin(n * 91.7 + 3.1) * 43758.5453); }

  // ink and fill (0..1) of atlas tile k at p (0..1 across the tile)
  vec2 art(float k, vec2 p) {
    vec2 cell = vec2(mod(k, 4.0), 3.0 - floor(k / 4.0));
    vec3 c = texture2D(uArt, (cell + clamp(p, 0.004, 0.996)) * 0.25).rgb;
    return vec2(1.0 - smoothstep(0.25, 0.75, c.r), 1.0 - smoothstep(0.25, 0.75, c.g));
  }

  void main() {
    float seed = vWin.x, kind = vWin.y, W = vWin.z, H = vWin.w;
    bool shop = kind > 1.5 && kind < 2.5, church = kind > 3.5 && kind < 4.5, tram = kind > 4.5;

    // is the light on? each window flips on its own slow clock
    float period = 50.0 + 110.0 * hash(seed * 7.7);
    float slot = floor(uTime / period + hash(seed * 1.3));
    float share = shop ? 0.94 : tram ? 1.0 : church ? 0.6 : kind > 0.5 ? 0.32 : 0.46;
    float lit = uNight * step(hash(seed * 13.1 + slot * 7.31), share);
    // a few rooms have the television on: the light flickers a little
    float tv = step(0.92, hash(seed * 3.9)) * (0.8 + 0.2 * step(0.5, hash(floor(uTime * 5.0) + seed * 40.0)));
    float bright = tv > 0.0 ? tv : 1.0;
    #define PAL(i) mix(uPal[i], uLit[i] * bright, lit)

    // the ray into the room, in the window's own frame: x across, y up, z in
    vec3 n = normalize(vN);
    vec3 t = normalize(vec3(n.z, 0.0, -n.x));
    vec3 d = normalize(vWorld - cameraPosition);
    vec3 rd = vec3(dot(d, t), d.y, -dot(d, n));
    rd = vec3(rd.x >= 0.0 ? max(rd.x, 1e-4) : min(rd.x, -1e-4), rd.y >= 0.0 ? max(rd.y, 1e-4) : min(rd.y, -1e-4), max(rd.z, 1e-3));
    vec3 ro = vec3(vUv.x * W, vUv.y * H, 0.0);

    float side = shop ? 0.4 : tram ? 0.0 : 0.4 + 0.7 * hash(seed * 3.1);
    float below = shop ? 0.5 : tram ? 0.9 : church ? 0.3 : kind > 2.5 ? 0.8 : 0.9;
    float above = shop ? 0.5 : tram ? 0.3 : church ? 4.0 : kind > 2.5 ? 0.25 : 0.55;
    float D = tram ? 2.2 : church ? 18.0 : (shop ? 4.0 : 3.0) + 2.0 * hash(seed * 5.3);
    vec3 lo = vec3(-side, -below, 0.0), hi = vec3(W + side, H + above, D);
    vec3 tp = (mix(lo, hi, step(0.0, rd)) - ro) / rd;
    float tm = min(min(tp.x, tp.y), tp.z);
    vec3 h = ro + rd * tm;
    vec3 col;
    float roomW = W + 2.0 * side, roomH = H + below + above;
    vec2 wallP = vec2((h.x + side) / roomW, (h.y + below) / roomH);
    if (tm == tp.z) {
      // the back wall
      if (church) col = PAL(0) * 0.8;
      // in a tram: the windows on the far side, and seat backs under them
      else if (tram) col = wallP.y > 0.45 ? mix(uPal[6], PAL(3), uNight) : PAL(1);
      else {
        float k = shop ? 8.0 + floor(seed * 4.0) : floor(hash(seed * 5.3) * 4.0);
        vec2 a = art(k, wallP);
        col = mix(mix(PAL(0), PAL(4), a.y), PAL(5), a.x);
      }
    } else if (tm == tp.x) {
      col = PAL(1);
      if (h.y < -below + 0.12) col = mix(col, PAL(5), 0.6); // skirting
    } else if (rd.y < 0.0) {
      col = PAL(2);
      if (fract(h.x * 3.0) < 0.07) col = mix(col, PAL(5), 0.35); // floorboards
    } else {
      col = PAL(3);
    }
    col *= 1.0 - 0.3 * (h.z / D);

    // somebody or something standing in the room
    float midOn = shop ? step(0.65, hash(seed * 8.3)) : tram ? step(0.3, hash(seed * 8.3)) : step(0.45, hash(seed * 8.3));
    if (midOn > 0.0 && !church) {
      float zp = tram ? 1.0 : D * (0.35 + 0.2 * hash(seed * 2.9));
      float tz = zp / rd.z;
      if (tz < tm) {
        vec3 q = ro + rd * tz;
        vec2 p = vec2((q.x + side + (hash(seed * 6.1) - 0.5) * 0.8) / roomW, (q.y + below) / roomH);
        if (p.x > 0.0 && p.x < 1.0 && p.y > 0.0 && p.y < 1.0) {
          float k = shop ? 4.0 : tram ? 4.0 + step(0.5, hash(seed * 4.4)) : 4.0 + floor(hash(seed * 4.4) * 4.0);
          vec2 a = art(k, p);
          vec3 c = mix(PAL(4) * (1.0 - 0.15 * zp / D), PAL(5), a.x);
          col = mix(col, c, max(a.x, a.y));
        }
      }
    }

    // a lamp hanging from the ceiling, lit when the room is
    if (!tram && hash(seed * 9.7) > (shop ? 0.2 : 0.5)) {
      vec3 c = vec3(W * 0.5 + (hash(seed * 2.2) - 0.5) * 0.8, H + above - 0.8, D * 0.45);
      vec3 oc = ro - c;
      float b = dot(oc, rd), c2 = dot(oc, oc) - 0.04;
      float disc = b * b - c2;
      if (disc > 0.0) {
        float ts = -b - sqrt(disc);
        if (ts > 0.0 && ts < tm) {
          vec3 q = ro + rd * ts;
          col = q.y < c.y ? mix(PAL(4), vec3(1.0, 0.97, 0.85), lit) : PAL(4) * 0.8;
          tm = ts;
        }
      }
      // its cord
      vec2 rxz = rd.xz, oxz = ro.xz - c.xz;
      float tc = -dot(oxz, rxz) / dot(rxz, rxz);
      vec3 q = ro + rd * tc;
      if (tc > 0.0 && tc < tm && q.y > c.y && q.y < H + above && length(q.xz - c.xz) < 0.015) col = PAL(5);
    }

    // curtains or a blind on the glass
    if (!shop && !church && !tram) {
      float cs = hash(seed * 11.9);
      if (cs > 0.35) {
        vec2 a = art(12.0 + floor((cs - 0.35) / 0.65 * 4.0), vUv);
        vec3 c = mix(PAL(6), PAL(7), a.x);
        col = mix(col, c, max(a.x, a.y * 0.92));
      }
    }

    // by day the glass catches the sky: a couple of pale streaks
    float g = fract((vUv.x * W * 0.7 + vUv.y * H * 0.5) * 0.45 + hash(seed));
    col = mix(col, vec3(1.0), (1.0 - uNight) * 0.22 * step(0.08, g) * step(g, 0.16));

    // frame, mullion and transom (or leading in a church window)
    vec2 q = vec2(vUv.x * W, vUv.y * H);
    float fw = shop ? 0.08 : 0.06;
    float bar = step(min(min(q.x, W - q.x), min(q.y, H - q.y)), fw);
    if (church) {
      vec2 dq = q * 3.0;
      bar = max(bar, step(abs(fract(dq.x + dq.y) - 0.5), 0.04) + step(abs(fract(dq.x - dq.y) - 0.5), 0.04));
    } else if (shop) {
      float panes = max(1.0, floor(W / 1.3 + 0.5));
      bar = max(bar, step(abs(fract(vUv.x * panes + 0.5) - 0.5) * W / panes, 0.035));
      bar = max(bar, step(abs(q.y - (H - 0.45)), 0.035));
    } else if (!tram) {
      bar = max(bar, step(abs(q.x - W * 0.5), 0.03));
      bar = max(bar, step(abs(q.y - H * 0.72), 0.03));
    }
    col = mix(col, uPal[8], clamp(bar, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }`;

let material = null;
export function windowMaterial() {
  if (material) return material;
  material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uArt: { value: null }, uNight: { value: 0 }, uTime: { value: 0 },
      uPal: { value: DAY.map((c) => c.clone()) }, uLit: { value: LIT.map((c) => c.clone()) },
    }]),
    vertexShader, fragmentShader, fog: true,
  });
  material.uniforms.uArt.value = roomAtlas();
  return material;
}

// Day or night: rooms go dark, and some light up.
export function setWindowsNight(on) {
  const u = windowMaterial().uniforms;
  u.uNight.value = on ? 1 : 0;
  u.uPal.value.forEach((c, i) => c.copy((on ? NIGHT : DAY)[i]));
}
export function animateWindows(time) {
  windowMaterial().uniforms.uTime.value = time;
}

// A pane from s0 to s1 and y0 to y1 on a facade frame, d out from the wall.
export function addWindow(bag, F, s0, s1, y0, y1, d, seed, kind) {
  bag.win = [seed, kind, s1 - s0, y1 - y0];
  wallQuad(bag, F, s0, s1, y0, y1, d, (s, y) => [(s - s0) / (s1 - s0), (y - y0) / (y1 - y0)]);
}
