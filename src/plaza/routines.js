// Folks who keep hours, by the real clock (life.js hourNow): the town hall's
// clerk walks in at eight and home at six; the teller and the manager open
// and close the bank; the postman walks his rounds from the post office to
// every door through the day.
//
// Where someone is depends only on the time, so it's right the moment you
// look, and the interiors ask `atWork(who)` to know whether to seat them.
import * as THREE from 'three';
import { makeFigure, poseFigure } from '../folks.js';
import { hourNow } from '../life.js';
import { M, box } from '../kit.js';

const WALK = 1.35;         // m/s
const RING = 11.5;         // they keep to this circle around the fountain
const STOP = 4;            // s the postman spends at each door

// When each one is at work, as [arrive, leave] in hours.
export const HOURS = {
  clerk: [8, 18],
  teller: [9, 17],
  manager: [9.5, 17.5],
};
export function atWork(who) {
  const [a, b] = HOURS[who], h = hourNow();
  return h >= a && h < b;
}
export const backAt = (who) => {
  const h = HOURS[who][0];
  return `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
};

// A path from a to b that goes round the fountain, not through it.
function around(a, b) {
  const pts = [a.clone()];
  const ang = (p) => Math.atan2(p.z, p.x);
  const r = (p) => Math.hypot(p.x, p.z);
  let a0 = ang(a), a1 = ang(b);
  let da = a1 - a0;
  if (da > Math.PI) da -= Math.PI * 2;
  if (da < -Math.PI) da += Math.PI * 2;
  // only detour when the straight line would cross the ring
  const mid = a.clone().lerp(b, 0.5);
  if (r(mid) < RING && Math.abs(da) > 0.3) {
    const n = Math.ceil(Math.abs(da) / 0.2);
    for (let i = 0; i <= n; i++) {
      const t = a0 + (da * i) / n;
      pts.push(new THREE.Vector3(Math.cos(t) * RING, 0, Math.sin(t) * RING));
    }
  }
  pts.push(b.clone());
  return pts;
}

// A walk along points: its length, and where you are after `s` meters.
function polyline(pts) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); seg.push(l); total += l; }
  return {
    pts, total,
    at(s) {
      s = THREE.MathUtils.clamp(s, 0, total);
      for (let i = 0; i < seg.length; i++) {
        if (s <= seg[i] || i === seg.length - 1) {
          const k = seg[i] ? s / seg[i] : 0;
          const p = pts[i].clone().lerp(pts[i + 1], Math.min(1, k));
          return { p, dir: new THREE.Vector3().subVectors(pts[i + 1], pts[i]) };
        }
        s -= seg[i];
      }
      return { p: pts.at(-1).clone(), dir: new THREE.Vector3(0, 0, 1) };
    },
  };
}

export function routines(world, buildings) {
  const door = (id) => buildings.find((b) => b.userData.district === id).userData.door.clone().setY(0);
  const edges = { east: new THREE.Vector3(36, 0, 0), west: new THREE.Vector3(-36, 0, 0), south: new THREE.Vector3(0, 0, 36) };
  const walkers = [];

  // commuters: in from a street at the start of the day, out at the end
  const commute = (who, look, building, from) => {
    const fig = makeFigure(look);
    fig.visible = false;
    world.add(fig);
    const path = polyline(around(edges[from], door(building)));
    walkers.push({ fig, update(h, time) {
      const dur = path.total / WALK / 3600;          // hours on the way
      const [a, b] = HOURS[who];
      let s = null;
      if (h >= a - dur && h < a) s = (h - (a - dur)) * 3600 * WALK;                 // coming in
      else if (h >= b && h < b + dur) s = path.total - (h - b) * 3600 * WALK;       // going home
      fig.visible = s != null;
      if (s == null) return;
      const { p, dir } = path.at(s);
      fig.position.copy(p);
      const sign = h < a ? 1 : -1;
      fig.rotation.y = Math.atan2(dir.x * sign, dir.z * sign);
      poseFigure(fig, 'walk', Math.floor(time * 5) % 2);
    } });
  };
  commute('clerk', { hat: 'bowler', glasses: true, scarf: true }, 'todo', 'west');
  commute('teller', { hair: 'bun', glasses: true }, 'finance', 'east');
  commute('manager', { hat: 'top', glasses: true }, 'finance', 'south');

  // the postman: round and round the doors, from the post office, 8 to 4
  const postman = makeFigure({ hat: 'cap', backpack: true });
  // a satchel at the hip, and a letter in hand
  box(postman.userData.parts.body, 0.26, 0.2, 0.1, M.planks, 0.18, 0.62, 0.12);
  postman.visible = false;
  world.add(postman);
  const order = ['people', 'todo', 'projects', 'finance', 'ideas', 'study', 'people'];
  const legs = [];
  for (let i = 1; i < order.length; i++) legs.push(polyline(around(door(order[i - 1]), door(order[i]))));
  const round = legs.reduce((s, l) => s + l.total / WALK + STOP, 0);   // seconds
  walkers.push({ fig: postman, update(h, time) {
    postman.visible = h >= 8 && h < 16;
    if (!postman.visible) return;
    let t = ((h - 8) * 3600) % round;
    for (const leg of legs) {
      const walk = leg.total / WALK;
      if (t < STOP) {                                       // at a door, dropping the letters
        const { p, dir } = leg.at(0);
        postman.position.copy(p);
        postman.rotation.y = Math.atan2(-dir.x, -dir.z);
        poseFigure(postman, 'vendor', Math.floor(time * 2) % 2);
        return;
      }
      t -= STOP;
      if (t < walk) {
        const { p, dir } = leg.at(t * WALK);
        postman.position.copy(p);
        postman.rotation.y = Math.atan2(dir.x, dir.z);
        poseFigure(postman, 'walk', Math.floor(time * 5) % 2);
        return;
      }
      t -= walk;
    }
  } });

  return function update(time) {
    const h = hourNow();
    for (const w of walkers) w.update(h, time);
  };
}
