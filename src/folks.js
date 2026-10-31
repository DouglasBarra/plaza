// Plaza folks: little ink figures with arms, legs and outfits, each doing
// something. Everything moves on a 2-frame clock, like hand-drawn animation:
// a pose snaps between two drawings a few times a second.
import * as THREE from 'three';
import { toon, deep } from './ink.js';
import { M, stamp, mesh } from './kit.js';

const dark = toon('#3a3a3a');
const eye = deep();

const G = {
  leg: new THREE.CapsuleGeometry(0.065, 0.26, 3, 8),
  foot: new THREE.BoxGeometry(0.1, 0.06, 0.17),
  torso: new THREE.CapsuleGeometry(0.18, 0.3, 4, 12),
  dress: new THREE.ConeGeometry(0.28, 0.52, 12),
  head: new THREE.SphereGeometry(0.2, 14, 12),
  eye: new THREE.SphereGeometry(0.03, 6, 4),
  arm: new THREE.CapsuleGeometry(0.05, 0.27, 3, 8),
  hand: new THREE.SphereGeometry(0.055, 8, 6),
  halfHead: new THREE.SphereGeometry(0.215, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
};

// ---------- building a figure ----------
// look: { hat: 'cone'|'cap'|'beanie'|'bowler'|'top', hair: 'bun'|'long', glasses,
//         scarf, backpack, dress, height, item: 'paper'|'broom'|'guitar'|'balloon', balloon: district }
export function makeFigure(look = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const legs = [-1, 1].map((side) => {
    const p = new THREE.Group();
    p.position.set(side * 0.09, 0.42, 0);
    mesh(G.leg, M.white, 0, -0.19, 0, p);
    mesh(G.foot, look.dress ? M.white : dark, 0, -0.38, 0.04, p);
    body.add(p);
    return p;
  });
  if (look.dress) mesh(G.dress, M.white, 0, 0.6, 0, body);
  mesh(G.torso, M.white, 0, 0.74, 0, body);

  const head = new THREE.Group();
  head.position.y = 1.22;
  body.add(head);
  mesh(G.head, M.white, 0, 0, 0, head);
  for (const ex of [-0.07, 0.07]) mesh(G.eye, eye, ex, 0.02, 0.18, head).castShadow = false;

  const arms = [-1, 1].map((side) => {
    const p = new THREE.Group();
    p.position.set(side * 0.23, 0.98, 0);
    mesh(G.arm, M.white, 0, -0.19, 0, p);
    const hand = mesh(G.hand, M.white, 0, -0.38, 0, p);
    hand.name = 'hand';
    body.add(p);
    return p;
  });

  // hats and hair sit on the head
  const hats = {
    cone: () => mesh(new THREE.ConeGeometry(0.16, 0.3, 8), M.white, 0, 0.3, 0, head),
    cap: () => { mesh(G.halfHead, dark, 0, 0.02, 0, head); mesh(new THREE.BoxGeometry(0.24, 0.025, 0.18), dark, 0, 0.04, 0.2, head); },
    beanie: () => { mesh(G.halfHead, dark, 0, 0.04, 0, head); mesh(new THREE.SphereGeometry(0.065, 8, 6), dark, 0, 0.27, 0, head); },
    bowler: () => { mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.15, 12), dark, 0, 0.23, 0, head); mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 16), dark, 0, 0.16, 0, head); },
    top: () => { mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 12), dark, 0, 0.33, 0, head); mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 16), dark, 0, 0.17, 0, head); },
  };
  hats[look.hat]?.();
  if (look.hair === 'bun') mesh(new THREE.SphereGeometry(0.1, 8, 6), dark, 0, 0.16, -0.14, head);
  if (look.hair === 'long') { mesh(G.halfHead, dark, 0, 0.03, -0.01, head); mesh(new THREE.BoxGeometry(0.36, 0.38, 0.1), dark, 0, -0.12, -0.14, head); }
  if (look.glasses) for (const ex of [-0.075, 0.075]) mesh(new THREE.TorusGeometry(0.055, 0.013, 5, 12), eye, ex, 0.02, 0.19, head);
  if (look.scarf) {
    mesh(new THREE.TorusGeometry(0.17, 0.055, 6, 14), dark, 0, 1.02, 0, body).rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.1, 0.3, 0.05), dark, 0.09, 0.85, 0.17, body).rotation.z = 0.15;
  }
  if (look.backpack) mesh(new THREE.BoxGeometry(0.28, 0.34, 0.15), M.white, 0, 0.8, -0.23, body);

  // things they hold
  let item = null;
  if (look.item === 'paper') {
    item = mesh(new THREE.BoxGeometry(0.48, 0.34, 0.02), M.white, 0, 0.98, 0.36, body);
    item.rotation.x = -0.3;
  } else if (look.item === 'broom') {
    item = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 5), M.planks, 0, -0.2, 0, item);
    mesh(new THREE.BoxGeometry(0.32, 0.1, 0.12), dark, 0, -0.85, 0, item);
    item.position.set(0, -0.38, 0.05);
    arms[1].add(item);
  } else if (look.item === 'guitar') {
    item = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14), M.white, 0, 0, 0, item).rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.06, 0.55, 0.04), M.planks, 0, 0.36, 0, item);
    item.position.set(0.05, 0.78, 0.26);
    item.rotation.z = 0.9;
    body.add(item);
  } else if (look.item === 'tray') {
    item = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 16), M.white, 0, 0, 0, item);
    for (const cx of [-0.09, 0.09]) mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 8), M.white, cx, 0.065, 0, item);
    item.position.set(0, -0.4, 0);
    arms[1].add(item);
  } else if (look.item === 'balloon') {
    // held in the left hand, so the right one is free to wave
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 3), M.white, 0, 0.2, 0, arms[0]);
    mesh(new THREE.SphereGeometry(0.22, 10, 8), stamp[look.balloon || 'projects'], 0, 0.95, 0, arms[0]);
  }

  root.scale.setScalar(look.height ?? 1);
  root.userData.parts = { body, legs, arms, head, item };
  return root;
}

// ---------- posing ----------
// Two drawings per pose; `frame` is 0 or 1.
export function poseFigure(fig, pose, frame, seat = 0.5) {
  const { body, legs, arms, head, item } = fig.userData.parts;
  const f = frame ? 1 : -1;
  for (const l of legs) l.rotation.set(0, 0, 0);
  arms[0].rotation.set(0, 0, -0.08);
  arms[1].rotation.set(0, 0, 0.08);
  head.rotation.set(0, 0, 0);
  body.rotation.set(0, 0, 0);
  body.position.y = 0;
  const sit = () => {
    for (const l of legs) l.rotation.x = -1.25;
    body.position.y = seat - 0.42;
    arms[0].rotation.x = arms[1].rotation.x = -0.35;
  };

  switch (pose) {
    case 'walk':
      legs[0].rotation.x = 0.55 * f;
      legs[1].rotation.x = -0.55 * f;
      arms[0].rotation.x = -0.45 * f;
      arms[1].rotation.x = 0.45 * f;
      body.position.y = frame ? 0.04 : 0.01;
      break;
    case 'sit':
      sit();
      body.position.y += frame ? 0.015 : 0;
      break;
    case 'read':
      sit();
      arms[0].rotation.set(-1.15, 0, 0.3);
      arms[1].rotation.set(-1.15, 0, -0.3);
      head.rotation.x = 0.25;
      if (item) item.rotation.z = frame ? 0.04 : -0.04;
      break;
    case 'nap':
      sit();
      head.rotation.set(0.25, 0, 0.35);
      body.position.y += frame ? 0.02 : 0;
      break;
    case 'music':
      sit();
      arms[0].rotation.set(-0.95, 0, 0.45);
      arms[1].rotation.set(frame ? -0.75 : -0.5, 0, -0.2);
      head.rotation.z = 0.12 * f;
      break;
    case 'sweep':
      arms[0].rotation.set(-0.75, 0, 0.3);
      arms[1].rotation.set(-0.55, 0, -0.1);
      if (item) item.rotation.z = 0.35 * f;
      body.position.y = frame ? 0.02 : 0;
      break;
    case 'feed':
      arms[1].rotation.x = frame ? -1.3 : -0.45;
      head.rotation.x = 0.25;
      break;
    case 'wave':
      arms[1].rotation.z = frame ? 2.6 : 2.1;
      break;
    case 'chat':
      arms[1].rotation.set(frame ? -0.65 : -0.3, 0, 0.2);
      head.rotation.y = 0.15 * f;
      break;
    case 'kite':
      arms[1].rotation.set(-2.4, 0, 0.1);
      body.rotation.z = 0.04 * f;
      break;
    case 'vendor':
      arms[0].rotation.x = -0.9;
      arms[1].rotation.z = frame ? 2.4 : 2.0;
      break;
    case 'look':
      arms[0].rotation.set(0.35, 0, 0.1);
      arms[1].rotation.set(0.35, 0, -0.1);
      head.rotation.x = -0.15;
      head.rotation.y = 0.12 * f;
      break;
    default: // idle
      arms[0].rotation.z = -0.08 - (frame ? 0.04 : 0);
      arms[1].rotation.z = 0.08 + (frame ? 0.04 : 0);
      body.position.y = frame ? 0.015 : 0;
  }
}

// ---------- a dog and a kite ----------
function makeDog() {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), M.white, 0, 0.34, 0, g);
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.3);
  mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), M.white, 0, 0, 0, head);
  mesh(new THREE.BoxGeometry(0.11, 0.09, 0.12), M.white, 0, -0.04, 0.15, head);
  for (const ex of [-0.1, 0.1]) mesh(new THREE.BoxGeometry(0.05, 0.14, 0.09), dark, ex, 0.06, -0.03, head);
  g.add(head);
  const legs = [];
  for (const lx of [-0.06, 0.06]) for (const lz of [-0.17, 0.17]) {
    const p = new THREE.Group();
    p.position.set(lx, 0.26, lz);
    mesh(new THREE.BoxGeometry(0.06, 0.26, 0.06), M.white, 0, -0.13, 0, p);
    g.add(p);
    legs.push(p);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.42, -0.25);
  mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.26, 5), M.white, 0, 0.12, 0, tail);
  tail.rotation.x = -0.7;
  g.add(tail);
  g.userData = { legs, tail };
  return g;
}

function makeKite() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0.7); s.lineTo(0.45, 0); s.lineTo(0, -0.9); s.lineTo(-0.45, 0); s.closePath();
  mesh(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }), M.white, 0, 0, 0, g);
  mesh(new THREE.BoxGeometry(0.03, 1.6, 0.03), dark, 0, -0.1, 0.05, g);
  mesh(new THREE.BoxGeometry(0.9, 0.03, 0.03), dark, 0, 0, 0.05, g);
  for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.16, 0.08, 0.02), M.white, (i % 2 ? 0.08 : -0.08), -1.1 - i * 0.32, 0, g).rotation.z = 0.6 * (i % 2 ? 1 : -1);
  return g;
}

// A thin line (a unit-height cylinder) stretched between two points.
const UP = new THREE.Vector3(0, 1, 0);
function stretch(m, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, d.length(), 1);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
}
const lineGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 3);

// ---------- the cast ----------
const cast = [];

// cfg: { x, z, rot, pose, look, seat, walk: { r, speed, offset, cx, cz }, dog, kite, fps }
export function addFolk(parent, cfg) {
  const fig = makeFigure(cfg.look);
  fig.position.set(cfg.x ?? 0, cfg.y ?? 0, cfg.z ?? 0);
  fig.rotation.y = cfg.rot ?? 0;
  parent.add(fig);
  const actor = { fig, pose: cfg.pose || 'idle', seat: cfg.seat ?? 0.5, walk: cfg.walk, fps: cfg.fps ?? (cfg.walk ? 5 : 2.5), phase: Math.random() * 10 };
  if (cfg.dog) {
    actor.dog = makeDog();
    parent.add(actor.dog);
    actor.leash = mesh(lineGeo, dark, 0, 0, 0, parent);
  }
  if (cfg.kite) {
    actor.kite = makeKite();
    parent.add(actor.kite);
    actor.string = mesh(lineGeo, M.white, 0, 0, 0, parent);
    actor.string.castShadow = false;
  }
  cast.push(actor);
  return fig;
}

// The old one-line form, still used by the interiors.
export function folk(p, x, z, rotY, opts = {}) {
  return addFolk(p, {
    x, z, rot: rotY, pose: opts.pose, seat: opts.seat,
    look: { hat: opts.hat ? 'cone' : opts.look?.hat, item: opts.balloon ? 'balloon' : undefined, balloon: opts.balloon, ...opts.look },
    walk: opts.walk,
  });
}

const handPos = new THREE.Vector3();
export function animateFigures(time) {
  for (const a of cast) {
    const frame = Math.floor(time * a.fps + a.phase) % 2;
    const w = a.walk;
    if (w?.path) {
      // back and forth between two points, slowing at each end
      const [[x1, z1], [x2, z2]] = w.path;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const s = ((time * w.speed) / len + (w.offset || 0)) % 2;
      const k = s < 1 ? s : 2 - s;
      const e = k * k * (3 - 2 * k);
      a.fig.position.set(x1 + (x2 - x1) * e, 0, z1 + (z2 - z1) * e);
      a.fig.rotation.y = Math.atan2(x2 - x1, z2 - z1) + (s < 1 ? 0 : Math.PI);
      const still = k < 0.04 || k > 0.96;
      poseFigure(a.fig, still ? 'idle' : 'walk', frame, a.seat);
      if (a.fig.userData.parts.item?.parent === a.fig.userData.parts.arms[1]) {
        a.fig.userData.parts.arms[1].rotation.set(-1.5, 0, 0);
        a.fig.userData.parts.item.rotation.x = 1.5;
      }
    } else if (w) {
      const ang = time * w.speed + (w.offset || 0);
      const cx = w.cx || 0, cz = w.cz || 0;
      a.fig.position.set(cx + Math.cos(ang) * w.r, 0, cz + Math.sin(ang) * w.r);
      a.fig.rotation.y = -ang + (w.speed > 0 ? 0 : Math.PI);
      poseFigure(a.fig, 'walk', frame, a.seat);
      if (a.dog) {
        const lag = ang - Math.sign(w.speed) * (1.4 / w.r);
        a.dog.position.set(cx + Math.cos(lag) * (w.r + 0.5), 0, cz + Math.sin(lag) * (w.r + 0.5));
        a.dog.rotation.y = a.fig.rotation.y;
        a.dog.userData.legs.forEach((l, i) => { l.rotation.x = ((i + frame) % 2 ? 0.5 : -0.5); });
        a.dog.userData.tail.rotation.z = frame ? 0.5 : -0.5;
      }
    } else {
      poseFigure(a.fig, a.pose, frame, a.seat);
    }
    if (a.leash) {
      a.fig.userData.parts.arms[0].getObjectByName('hand').getWorldPosition(handPos);
      stretch(a.leash, handPos, a.dog.localToWorld(new THREE.Vector3(0, 0.5, 0.3)));
    }
    if (a.kite) {
      a.fig.userData.parts.arms[1].getObjectByName('hand').getWorldPosition(handPos);
      const k = a.kite;
      k.position.set(a.fig.position.x + 2.5 + Math.sin(time * 0.7) * 0.8, 9 + Math.sin(time * 1.3) * 0.6, a.fig.position.z - 3);
      k.rotation.set(0.3, 0.4, Math.sin(time * 1.1) * 0.25);
      stretch(a.string, handPos, k.position.clone().add(new THREE.Vector3(0, -0.2, 0)));
    }
  }
}
