// You: a plaza folk in a dark beanie and scarf. Walk with WASD / arrows or
// click the ground. You can't leave the plaza; buildings and props block you.
import * as THREE from 'three';
import { makeFigure, poseFigure } from './folks.js';

const WALK = 3.2;   // m/s, an unhurried stroll
const RUN = 6.0;    // with Shift held
const ACCEL = 8;    // how quickly you get up to speed (per second)
const SPEED = WALK;
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
    this.running = false;              // Shift held
    this.vel = new THREE.Vector3();     // current velocity, eased toward where you want to go
    this.stride = 0;                    // distance walked, drives the steps
    this.prevVel = new THREE.Vector3(); // last frame's velocity, to feel speeding up and slowing down
    this.prevHeading = Math.PI;
    this.lean = 0;                      // forward/back, eased
    this.bank = 0;                      // into a turn, eased
    this.wasMoving = false;
    this.stopUntil = 0;                 // showing the pull-up drawing until then
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
    g.position.set(1.2, 0, -18.6); // at the foot of the town hall's steps, the fountain behind you
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
    this.vel.set(0, 0, 0);
    this.prevVel.set(0, 0, 0);
    this.prevHeading = rotY;
    this.lean = this.bank = 0;
    this.wasMoving = false;
    this.stopUntil = 0;
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

    // ease the velocity toward the wanted direction, so starts and stops feel soft
    const want = new THREE.Vector3();
    if (dir.lengthSq() > 0) {
      const toGoal = this.goal ? dir.length() : Infinity;
      dir.normalize();
      // slow down as you arrive at a clicked spot
      want.copy(dir).multiplyScalar((this.running ? RUN : WALK) * Math.min(1, toGoal / 0.9 + 0.25));
    }
    this.vel.lerp(want, 1 - Math.exp(-ACCEL * dt));
    if (want.lengthSq() === 0 && this.vel.lengthSq() < 0.01) this.vel.set(0, 0, 0);
    const speed = this.vel.length();
    this.moving = speed > 0.3;
    const p = this.position;
    if (speed > 0) {
      const prev = p.clone();
      p.addScaledVector(this.vel, dt);
      this.collide();
      // walking into something: lose the speed you can't use
      const moved = p.distanceTo(prev);
      if (moved < speed * dt * 0.5) this.vel.multiplyScalar(0.5);
      this.stride += moved;
      if (this.heightAt) {
        // stairs: follow the floor, but a step taller than 0.6 m is a wall or a railing
        const g = this.heightAt(p.x, p.z, this.level);
        if (Math.abs(g.y - prev.y) > 0.6) { p.x = prev.x; p.z = prev.z; }
        else { p.y = g.y; this.level = g.level; }
      }
      // stuck against something while walking to a goal: give up
      if (this.goal && moved < SPEED * dt * 0.15) { this.goal = null; this.onArrive = null; }
      const target = Math.atan2(this.vel.x, this.vel.z);
      let d = target - this.body.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (speed > 0.2) this.body.rotation.y += d * Math.min(1, dt * 10);
    }

    // hand-drawn frames: two drawings to a step, a step every 0.55 m walked
    // (0.85 m running), so the feet keep pace with the ground at any speed;
    // a quick pull-up drawing when you stop, then idling
    const running = speed > (WALK + RUN) / 2;
    if (this.wasMoving && !this.moving) this.stopUntil = time + 0.28;
    this.wasMoving = this.moving;
    let pose = 'idle', frame = Math.floor(time * 2.5);
    if (this.moving) {
      pose = running ? 'run' : 'walk';
      frame = Math.floor(this.stride / ((running ? 0.85 : 0.55) / 2));
    } else if (time < this.stopUntil) pose = 'stop';
    poseFigure(this.figure, pose, frame);

    // lean into speeding up and slowing down, and into turns
    if (dt > 0) {
      const h = this.body.rotation.y;
      const accel = ((this.vel.x - this.prevVel.x) * Math.sin(h) + (this.vel.z - this.prevVel.z) * Math.cos(h)) / dt;
      let yaw = h - this.prevHeading;
      yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw)) / dt;
      const ease = 1 - Math.exp(-10 * dt);
      this.lean += (THREE.MathUtils.clamp(accel * 0.02, -0.12, 0.15) - this.lean) * ease;
      this.bank += (THREE.MathUtils.clamp(-yaw * speed * 0.02, -0.18, 0.18) - this.bank) * ease;
      this.prevVel.copy(this.vel);
      this.prevHeading = h;
    }
    const torso = this.figure.userData.parts.body;
    torso.rotation.x += this.lean;
    torso.rotation.z += this.bank;
    if (!this.heightAt) p.y = 0;
  }

  collide() {
    const p = this.position;
    for (const c of this.colliders) {
      if ((c.level ?? 0) !== this.level) continue;
      const dx = p.x - c.x, dz = p.z - c.z;
      if (c.hw !== undefined) {
        // a box (hw, hd are half sizes), turned by c.rot like the building it belongs to
        const cos = Math.cos(c.rot || 0), sin = Math.sin(c.rot || 0);
        const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos; // into the box's own frame
        const ex = c.hw + RADIUS, ez = c.hd + RADIUS;
        if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
          // inside: leave by the nearest side
          const px = ex - Math.abs(lx), pz = ez - Math.abs(lz);
          const nx = px < pz ? Math.sign(lx || 1) * ex : lx, nz = px < pz ? lz : Math.sign(lz || 1) * ez;
          p.x = c.x + nx * cos + nz * sin; p.z = c.z - nx * sin + nz * cos;
        }
        continue;
      }
      const d = Math.hypot(dx, dz), min = c.r + RADIUS;
      if (d < min && d > 1e-4) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
    }
    p.x = THREE.MathUtils.clamp(p.x, this.bounds.minX, this.bounds.maxX);
    p.z = THREE.MathUtils.clamp(p.z, this.bounds.minZ, this.bounds.maxZ);
  }
}
