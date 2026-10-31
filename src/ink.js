// Ink renderer: flat stepped shading (toon) + a screen-space outline pass
// that draws pen lines on silhouettes and creases, with optional "boiling"
// wobble so the lines feel hand-drawn.
import * as THREE from 'three';

// Each theme sets the lighting so a white surface lands exactly on the
// design system's gray steps: lit = surface, side = shade-1, shadow = shade-2.
// Values are linear-light fractions; see makeGradient().
export const THEMES = {
  day: {
    paper: '#f3f3f0',
    ink: '#111111',
    deep: '#6b6b67',
    shadow: 0.455, // shade-2 #b4b4af
    side: 0.73,    // shade-1 #dededa
    lit: 1.0,      // surface #ffffff
    glow: '#ffd21f',
  },
  night: {
    paper: '#1c1c1d',
    ink: '#f1f0ec',
    deep: '#121213',
    shadow: 0.02,
    side: 0.055,
    lit: 0.13,
    glow: '#ffd21f',
  },
};

// Toon shading: final = albedo * (ambient + gradient(dotNL) * shadow)
// three divides both by PI (BRDF_Lambert), so intensities are multiplied by PI.
export function makeGradient(theme) {
  const t = THEMES[theme];
  const step = (v) => Math.round(Math.max(0, v - t.shadow) * 255);
  // coord = dotNL * 0.5 + 0.5 → 4 buckets: away, away, grazing, facing
  const data = new Uint8Array([
    0, 0, 0, 255,
    0, 0, 0, 255,
    step(t.side), step(t.side), step(t.side), 255,
    step(t.lit), step(t.lit), step(t.lit), 255,
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Everything that should react to the Day/Night switch registers here.
const toonMaterials = new Set();
const deepMaterials = new Set();
let gradient = makeGradient('day');

// Line-art textures (bricks, shingles…) are read as "how much ink is here"
// and painted in the current ink color after shading, so the details stay
// black on white by day and turn to chalk at night.
const inkUniform = { value: new THREE.Color(THEMES.day.ink) };
function drawLinesInInk(shader) {
  shader.uniforms.uInk = inkUniform;
  shader.fragmentShader = 'uniform vec3 uInk;\n' + shader.fragmentShader
    .replace('#include <map_fragment>', `
      float lineAmt = 0.0;
      #ifdef USE_MAP
        lineAmt = 1.0 - texture2D( map, vMapUv ).r;
      #endif`)
    .replace('#include <opaque_fragment>', `
      outgoingLight = mix( outgoingLight, uInk, lineAmt );
      #include <opaque_fragment>`);
}

export function toon(color = '#ffffff', map = null) {
  const m = new THREE.MeshToonMaterial({ color, map, gradientMap: gradient });
  if (map?.userData.lineArt) {
    m.onBeforeCompile = drawLinesInInk;
    m.customProgramCacheKey = () => 'ink-lines';
  }
  toonMaterials.add(m);
  return m;
}

// Unlit dark fill for windows, doorways and openings (shade-3).
export function deep() {
  const m = new THREE.MeshBasicMaterial({ color: THEMES.day.deep });
  deepMaterials.add(m);
  return m;
}

export function applyTheme(theme, lights) {
  const t = THEMES[theme];
  gradient = makeGradient(theme);
  for (const m of toonMaterials) { m.gradientMap = gradient; m.needsUpdate = true; }
  for (const m of deepMaterials) m.color.set(t.deep);
  inkUniform.value.set(t.ink);
  lights.ambient.intensity = t.shadow * Math.PI;
  lights.sun.intensity = Math.PI;
}

// Normal + linear depth, one pass. Background stays alpha 0.
const ndMaterial = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    varying vec3 vN;
    varying float vZ;
    void main() {
      vec4 p = vec4(position, 1.0);
      vec3 n = normal;
      #ifdef USE_INSTANCING
        p = instanceMatrix * p;
        n = mat3(instanceMatrix) * n;
      #endif
      vec4 mv = modelViewMatrix * p;
      vN = normalize(normalMatrix * n);
      vZ = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vN;
    varying float vZ;
    void main() { gl_FragColor = vec4(normalize(vN) * 0.5 + 0.5, vZ); }`,
});

const compositeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: null },
    tND: { value: null },
    resolution: { value: new THREE.Vector2() },
    ink: { value: new THREE.Color(THEMES.day.ink) },
    thickness: { value: 1.5 },
    wobble: { value: 1.0 },
    seed: { value: 0 },
    grain: { value: 0.035 },
    fogNear: { value: 70 },
    fogFar: { value: 180 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor, tND;
    uniform vec2 resolution;
    uniform vec3 ink;
    uniform float thickness, wobble, seed, grain, fogNear, fogFar;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                 mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }

    float edgeAt(vec2 uv, vec4 c, vec2 o) {
      vec4 s = texture2D(tND, uv + o);
      bool bgA = c.a <= 0.0, bgB = s.a <= 0.0;
      if (bgA != bgB) return 1.0;
      if (bgA) return 0.0;
      float dz = abs(s.a - c.a) / c.a;
      float dn = 1.0 - dot(c.rgb * 2.0 - 1.0, s.rgb * 2.0 - 1.0);
      return max(step(0.035, dz), step(0.3, dn));
    }

    void main() {
      vec2 px = 1.0 / resolution;
      // hand-drawn wobble: low-frequency jitter that changes a few times a second
      vec2 j = vec2(noise(vUv * vec2(18.0, 12.0) + seed), noise(vUv * vec2(12.0, 18.0) + seed + 9.0)) - 0.5;
      vec2 uv = vUv + j * wobble * 2.5 * px;
      vec4 c = texture2D(tND, uv);
      float t = thickness;
      float e = 0.0;
      e = max(e, edgeAt(uv, c, vec2( t, 0.0) * px));
      e = max(e, edgeAt(uv, c, vec2(-t, 0.0) * px));
      e = max(e, edgeAt(uv, c, vec2(0.0,  t) * px));
      e = max(e, edgeAt(uv, c, vec2(0.0, -t) * px));
      // lines fade out with the town into the paper; the horizon beyond
      // (mountains, clouds) is drawn crisp again, like a backdrop
      // nearest surface around this pixel (so silhouettes against the sky fade too)
      float d = c.a > 0.0 ? c.a : 1e6;
      for (int i = 0; i < 4; i++) {
        vec2 o = vec2(i == 0 ? t : i == 1 ? -t : 0.0, i == 2 ? t : i == 3 ? -t : 0.0) * px;
        float a = texture2D(tND, uv + o).a;
        if (a > 0.0) d = min(d, a);
      }
      float fade = smoothstep(fogNear, fogFar, d) * (1.0 - smoothstep(fogFar + 60.0, fogFar + 110.0, d));
      e *= 1.0 - fade;
      vec3 col = texture2D(tColor, vUv).rgb;
      col = mix(col, ink, e);
      col += (hash(vUv * resolution + seed) - 0.5) * grain;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
  depthTest: false,
  depthWrite: false,
});

// Several InkRenderers can share the one composite shader (the main view,
// and the plaza seen through the town hall's windows): each keeps its own
// settings and applies them when it renders.
export class InkRenderer {
  constructor(renderer, { samples = 4, scale = 1 } = {}) {
    this.renderer = renderer;
    this.scale = scale;
    const opts = { type: THREE.HalfFloatType };
    this.ndRT = new THREE.WebGLRenderTarget(1, 1, opts);
    this.colorRT = new THREE.WebGLRenderTarget(1, 1, { samples });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial));
    this.uniforms = compositeMaterial.uniforms;
    this.paper = new THREE.Color(THEMES.day.paper);
    this.ink = new THREE.Color(THEMES.day.ink);
    this.resolution = new THREE.Vector2(1, 1);
    this.thickness = 1.5;
    this.fog = [70, 180];
    this.wobbleOn = true;
    this.skipND = [];
    this.lastStep = -1;
    this.seed = 0;
  }

  setSize(w, h) {
    const dpr = this.renderer.getPixelRatio() * this.scale;
    this.ndRT.setSize(w * dpr, h * dpr);
    this.colorRT.setSize(w * dpr, h * dpr);
    this.resolution.set(w * dpr, h * dpr);
    this.thickness = 1.5 * dpr;
  }

  setTheme(theme) {
    this.paper.set(THEMES[theme].paper);
    this.ink.set(THEMES[theme].ink);
  }

  setFog(near, far) {
    this.fog = [near, far];
  }

  // Renders to the screen, or into `target` when one is given.
  render(scene, camera, time, target = null) {
    const r = this.renderer;
    // boil the lines ~4 times a second, like hand-drawn animation
    const stepIndex = Math.floor(time * 4);
    if (stepIndex !== this.lastStep) { this.lastStep = stepIndex; this.seed = (stepIndex % 3) * 17.3; }
    const u = this.uniforms;
    u.seed.value = this.seed;
    u.wobble.value = this.wobbleOn ? 1 : 0;
    u.resolution.value.copy(this.resolution);
    u.thickness.value = this.thickness;
    u.ink.value.copy(this.ink);
    u.fogNear.value = this.fog[0];
    u.fogFar.value = this.fog[1];

    const bg = scene.background;
    scene.background = null;
    // see-through things (the lighthouse beam) get no outlines and hide none
    const skipped = this.skipND.filter((o) => o.visible);
    for (const o of skipped) o.visible = false;
    scene.overrideMaterial = ndMaterial;
    r.setRenderTarget(this.ndRT);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, camera);

    scene.overrideMaterial = null;
    for (const o of skipped) o.visible = true;
    scene.background = this.paper;
    r.setRenderTarget(this.colorRT);
    r.render(scene, camera);
    scene.background = bg;

    u.tColor.value = this.colorRT.texture;
    u.tND.value = this.ndRT.texture;
    r.setRenderTarget(target);
    r.render(this.quadScene, this.quadCam);
    r.setRenderTarget(null);
  }
}

// A window that shows another scene: samples a full-view render of it at
// this pixel's screen position, so the view lines up with your eye.
export function portalMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { tView: { value: null }, screen: { value: new THREE.Vector2(1, 1) } },
    vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tView;
      uniform vec2 screen;
      void main() {
        gl_FragColor = texture2D(tView, gl_FragCoord.xy / screen);
        #include <colorspace_fragment>
      }`,
  });
}
