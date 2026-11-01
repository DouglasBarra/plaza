// The sky over the town: clouds drifting round it and flocks of birds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../ink.js';
import { rand, strip } from './common.js';

export function buildSky(town) {
  // ---------- clouds: clusters of flat-shaded puffs ----------
  const cloudMat = toon(); cloudMat.fog = false; cloudMat.flatShading = true;
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const parts = [];
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const s = 4 + rand() * 4;
      parts.push(new THREE.IcosahedronGeometry(s, 1).scale(1, 0.62, 1).translate(k * 6 - n * 3 + rand() * 2, rand() * 2.5, (rand() - 0.5) * 5));
    }
    const c = new THREE.Mesh(mergeGeometries(strip(parts)), cloudMat);
    c.userData.inkCrisp = true;
    const a = rand() * Math.PI * 2, d = 290 + rand() * 130;
    c.position.set(Math.cos(a) * d, 40 + rand() * 45, Math.sin(a) * d);
    c.scale.setScalar(1.6);
    c.rotation.y = rand() * 6;
    c.userData = { a, d, speed: 0.004 + rand() * 0.004 };
    town.add(c);
    clouds.push(c);
  }

  // ---------- birds: little V shapes that flap on the 2-frame clock ----------
  const birdMat = toon(); birdMat.fog = false;
  const wing = new THREE.BoxGeometry(0.9, 0.06, 0.32);
  const birds = [];
  for (let f = 0; f < 3; f++) {
    const flock = new THREE.Group();
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Group();
      const l = new THREE.Mesh(wing, birdMat), r = new THREE.Mesh(wing, birdMat);
      l.position.x = -0.42; r.position.x = 0.42;
      b.add(l, r, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.5), birdMat));
      b.position.set((k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.6, rand() * 0.6, -Math.ceil(k / 2) * 1.4);
      b.userData = { l, r, phase: rand() * 4 };
      flock.add(b);
    }
    flock.userData = { r: 26 + f * 14, h: 20 + f * 7, speed: (f % 2 ? -1 : 1) * (0.07 + rand() * 0.05), off: rand() * 6 };
    town.add(flock);
    birds.push(flock);
  }

  return function animateSky(time) {
    for (const c of clouds) {
      const a = c.userData.a + time * c.userData.speed;
      c.position.x = Math.cos(a) * c.userData.d;
      c.position.z = Math.sin(a) * c.userData.d;
    }
    const frame = Math.floor(time * 5);
    for (const f of birds) {
      const u = f.userData, a = u.off + time * u.speed;
      f.position.set(Math.cos(a) * u.r, u.h + Math.sin(time * 0.5 + u.off) * 2, Math.sin(a) * u.r);
      f.rotation.y = -a + (u.speed > 0 ? 0 : Math.PI);
      for (const b of f.children) {
        const up = (frame + Math.floor(b.userData.phase * 5)) % 2;
        b.userData.l.rotation.z = up ? 0.5 : -0.25;
        b.userData.r.rotation.z = up ? -0.5 : 0.25;
      }
    }
  };
}
