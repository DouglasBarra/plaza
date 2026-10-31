// You: a plaza folk in a dark beanie and scarf. Walk with WASD / arrows or
// click the ground. You can't leave the plaza; buildings and props block you.
import * as THREE from 'three';
import { makeFigure, poseFigure } from './folks.js';

const SPEED = 5.5;
const RADIUS = 0.4;

export class Avatar {
  constructor(scene, colliders, half) {
    this.colliders = colliders;
    const l = half - 1.2; // inside the bollards
    this.bounds = { minX: -l, maxX: l, minZ: -l, maxZ: l };
    this.keys = new Set();
    this.goal = null;      // a point to walk to (click)
    this.onArrive = null;  // called when the goal is reached
    this.moving = false;
    this.level = 0;        // which floor you're on (rooms with stairs)
    this.heightAt = null;  // (x, z, level) -> { y, level } in rooms with stairs

    const g = new THREE.Group();
    this.figure = makeFigure({ hat: 'beanie', scarf: true, backpack: true, height: 1.05 });
    g.add(this.figure);
    // a little ink ring under your feet so you can always find yourself
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 28), new THREE.MeshBasicMaterial({ color: '#111111' }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    g.add(ring);
    this.ring = ring;
    this.body = g;
    g.position.set(0, 0, 9.5);
    g.rotation.y = Math.PI;
    scene.add(g);
  }

  get position() { return this.body.position; }

  // Move to another place (the plaza or a room), standing at `pos` facing `rotY`.
  setWorld(scene, colliders, bounds, pos, rotY, heightAt = null) {
    scene.add(this.body);
    this.colliders = colliders;
    this.bounds = bounds;
    this.heightAt = heightAt;
    this.level = 0;
    this.body.position.copy(pos);
    this.body.rotation.set(0, rotY, 0);
    this.goal = null;
    this.onArrive = null;
  }

  walkTo(point, onArrive = null) {
    this.goal = new THREE.Vector3(point.x, 0, point.z);
    this.onArrive = onArrive;
  }

  setInkColor(c) { this.ring.material.color.set(c); }

  update(dt, time, camera) {
    const dir = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const k = this.keys;
    if (k.has('w') || k.has('arrowup')) dir.add(fwd);
    if (k.has('s') || k.has('arrowdown')) dir.sub(fwd);
    if (k.has('d') || k.has('arrowright')) dir.add(right);
    if (k.has('a') || k.has('arrowleft')) dir.sub(right);

    if (dir.lengthSq() > 0) {
      this.goal = null; this.onArrive = null;
    } else if (this.goal) {
      dir.subVectors(this.goal, this.position); dir.y = 0;
      if (dir.length() < 0.25) {
        this.goal = null;
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
        dir.set(0, 0, 0);
      }
    }

    this.moving = dir.lengthSq() > 0;
    const p = this.position;
    if (this.moving) {
      dir.normalize();
      const prev = p.clone();
      p.addScaledVector(dir, SPEED * dt);
      this.collide();
      if (this.heightAt) {
        // stairs: follow the floor, but a step taller than 0.6 m is a wall or a railing
        const g = this.heightAt(p.x, p.z, this.level);
        if (Math.abs(g.y - prev.y) > 0.6) { p.x = prev.x; p.z = prev.z; }
        else { p.y = g.y; this.level = g.level; }
      }
      // stuck against something while walking to a goal: give up
      if (this.goal && p.distanceTo(prev) < SPEED * dt * 0.15) { this.goal = null; this.onArrive = null; }
      const target = Math.atan2(dir.x, dir.z);
      let d = target - this.body.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.body.rotation.y += d * Math.min(1, dt * 12);
    }

    // hand-drawn 2-frame animation: quick steps when walking, slow sway when idle
    const frame = Math.floor(time * (this.moving ? 7 : 2)) % 2;
    poseFigure(this.figure, this.moving ? 'walk' : 'idle', frame);
    if (!this.heightAt) p.y = 0;
  }

  collide() {
    const p = this.position;
    for (const c of this.colliders) {
      if ((c.level ?? 0) !== this.level) continue;
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + RADIUS;
      if (d < min && d > 1e-4) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
    }
    p.x = THREE.MathUtils.clamp(p.x, this.bounds.minX, this.bounds.maxX);
    p.z = THREE.MathUtils.clamp(p.z, this.bounds.minZ, this.bounds.maxZ);
  }
}
