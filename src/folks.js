// Plaza folks: little ink figures with arms, legs and outfits, each doing
// something. Everything moves on a 2-frame clock, like hand-drawn animation:
// a pose snaps between two drawings a few times a second.
import * as THREE from 'three';
import { toon, deep } from './ink.js';
import { M, stamp, mesh } from './kit.js';

const dark = toon('#3a3a3a');
const eye = deep();

const G = {
  thigh: new THREE.CapsuleGeometry(0.065, 0.1, 3, 8),
  shin: new THREE.CapsuleGeometry(0.06, 0.1, 3, 8),
  foot: new THREE.BoxGeometry(0.1, 0.06, 0.17),
  torso: new THREE.CapsuleGeometry(0.18, 0.3, 4, 12),
  dress: new THREE.ConeGeometry(0.28, 0.52, 12),
  head: new THREE.SphereGeometry(0.2, 14, 12),
  eye: new THREE.SphereGeometry(0.03, 6, 4),
  upperArm: new THREE.CapsuleGeometry(0.05, 0.1, 3, 8),
  forearm: new THREE.CapsuleGeometry(0.047, 0.1, 3, 8),
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

  // each leg turns at the hip and bends at the knee; each arm at the shoulder
  // and the elbow
  const shins = [];
  const legs = [-1, 1].map((side) => {
    const p = new THREE.Group();
    p.position.set(side * 0.09, 0.42, 0);
    mesh(G.thigh, M.white, 0, -0.1, 0, p);
    const knee = new THREE.Group();
    knee.position.y = -0.2;
    mesh(G.shin, M.white, 0, -0.09, 0, knee);
    mesh(G.foot, look.dress ? M.white : dark, 0, -0.18, 0.04, knee);
    p.add(knee);
    shins.push(knee);
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

  const forearms = [];
  const arms = [-1, 1].map((side) => {
    const p = new THREE.Group();
    p.position.set(side * 0.23, 0.98, 0);
    mesh(G.upperArm, M.white, 0, -0.09, 0, p);
    const elbow = new THREE.Group();
    elbow.position.y = -0.19;
    mesh(G.forearm, M.white, 0, -0.09, 0, elbow);
    const hand = mesh(G.hand, M.white, 0, -0.19, 0, elbow);
    hand.name = 'hand';
    p.add(elbow);
    forearms.push(elbow);
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
    item.position.set(0, -0.19, 0.05);
    forearms[1].add(item);
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
    item.position.set(0, -0.21, 0);
    forearms[1].add(item);
  } else if (look.item === 'balloon') {
    // held in the left hand, so the right one is free to wave
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 3), M.white, 0, 0.2, 0, arms[0]);
    mesh(new THREE.SphereGeometry(0.22, 10, 8), stamp[look.balloon || 'projects'], 0, 0.95, 0, arms[0]);
  }

  root.scale.setScalar(look.height ?? 1);
  root.userData.parts = { body, legs, shins, arms, forearms, head, item };
  return root;
}

// ---------- posing ----------
// Each pose is a few drawings; `frame` counts up and each pose picks its own
// drawing from it (walks and runs cycle through 4, so a step has a contact
// drawing and a passing one). A hip, shoulder or body angle is in radians:
// a positive x swings a leg or an arm back, a negative knee or elbow bends it.
export function poseFigure(fig, pose, frame, seat = 0.5) {
  const { body, legs, shins, arms, forearms, head, item } = fig.userData.parts;
  const n = Math.max(0, Math.floor(frame)), k = n % 4, f = n % 2 ? 1 : -1;
  const leg = (i, hip, knee = 0) => { legs[i].rotation.set(hip, 0, 0); shins[i].rotation.set(knee, 0, 0); };
  const arm = (i, x, elbow = -0.15, out = 0.08) => {
    arms[i].rotation.set(x, 0, i ? out : -out);
    forearms[i].rotation.set(elbow, 0, 0);
  };
  leg(0, 0); leg(1, 0);
  arm(0, 0); arm(1, 0);
  head.rotation.set(0, 0, 0);
  body.rotation.set(0, 0, 0);
  body.position.y = 0;
  if (item && item.parent === forearms[1]) item.rotation.set(0, 0, 0);
  // seated: thighs level on the seat, shins hanging, hands in the lap
  const sit = () => {
    leg(0, -1.45, 1.25); leg(1, -1.45, 1.25);
    body.position.y = seat - 0.42;
    arm(0, -0.35, -0.55); arm(1, -0.35, -0.55);
  };

  switch (pose) {
    case 'walk': {
      // 0, 2: contact, the leading heel down and the other foot pushing off;
      // 1, 3: passing, weight over the planted leg, the other swinging through
      const s = k < 2 ? 0 : 1, o = 1 - s;
      if (k % 2 === 0) {
        leg(s, -0.5, 0.08); leg(o, 0.42, 0.32);
        arm(s, 0.38, -0.15); arm(o, -0.42, -0.45);
        body.position.y = -0.015;
      } else {
        leg(s, 0.08, 0.04); leg(o, -0.3, 0.75);
        arm(s, 0.12, -0.2); arm(o, -0.12, -0.3);
        body.position.y = 0.035;
      }
      body.rotation.x = 0.03;
      head.rotation.x = -0.02;
      break;
    }
    case 'run': {
      // 0, 2: contact; 1, 3: in the air, one knee driven up, the other heel
      // kicked back. Leaning in, arms bent and pumping.
      const s = k < 2 ? 0 : 1, o = 1 - s, lean = 0.12;
      if (k % 2 === 0) {
        leg(s, -0.62 - lean, 0.3); leg(o, 0.55 - lean, 0.85);
        arm(s, 0.55, -1.25); arm(o, -0.7, -1.45);
        body.position.y = -0.01;
      } else {
        leg(s, 0.6 - lean, 1.2); leg(o, -0.95 - lean, 1.1);
        arm(s, -0.7, -1.45); arm(o, 0.55, -1.2);
        body.position.y = 0.09;
      }
      body.rotation.x = lean;
      head.rotation.x = -0.18;
      break;
    }
    case 'stop':
      // pulling up: feet planted, weight rocked back, arms swung forward
      leg(0, -0.18, 0.2); leg(1, 0.12, 0.25);
      arm(0, -0.3, -0.35); arm(1, -0.22, -0.3);
      body.rotation.x = -0.07;
      body.position.y = -0.02;
      head.rotation.x = 0.05;
      break;
    case 'sit':
      sit();
      body.position.y += k === 1 ? 0.015 : 0;
      if (k === 3) shins[n % 8 < 4 ? 0 : 1].rotation.x = 1.0;   // a dangling foot swings
      head.rotation.y = [0, 0, 0.3, 0, 0, -0.25][Math.floor(n / 4) % 6];
      break;
    case 'read': {
      sit();
      // both hands at the bottom of the page; every so often one reaches over to turn it
      arm(0, -0.72, -0.72, 0.28); arm(1, -0.72, -0.72, 0.28);
      if (n % 12 === 11) arm(1, -0.95, -1.0, -0.45);
      head.rotation.x = 0.25;
      head.rotation.y = k % 2 ? 0.06 : -0.06;
      if (item) item.rotation.z = k === 1 ? 0.04 : k === 3 ? -0.04 : 0;
      break;
    }
    case 'type':
      sit();
      if (n % 16 >= 13) {
        // a pause to look at the screen, chin up
        arm(0, -0.5, -0.95, 0.25); arm(1, -0.5, -0.95, 0.25);
        head.rotation.x = 0.05;
        break;
      }
      arm(0, -0.5, [-0.7, -1.0, -0.85, -1.0][k], 0.25);
      arm(1, -0.5, [-1.0, -0.75, -1.0, -0.85][k], 0.25);
      head.rotation.x = 0.2;
      break;
    case 'nap':
      sit();
      leg(0, -1.35, 0.55); leg(1, -1.3, 0.7);      // legs stretched out
      arm(0, -0.2, -0.75); arm(1, -0.2, -0.75);
      head.rotation.set(0.3, 0, 0.35);
      body.rotation.x = -0.06;
      body.position.y += n % 4 < 2 ? 0.02 : 0;     // slow breaths
      break;
    case 'music':
      sit();
      arm(0, -0.95, -0.4, 0.45);                   // fretting the neck
      arm(1, -0.6, [-0.45, -0.9, -0.55, -0.85][k], -0.2);   // strumming, down and up
      head.rotation.z = 0.12 * f;
      head.rotation.x = k === 0 ? 0.12 : 0;        // a nod on the beat
      break;
    case 'sweep': {
      // push, push, lift, bring back
      const b = [-0.35, 0.05, 0.4, 0.05][k];
      arm(0, -0.75, -0.3, 0.3);
      arm(1, -0.55, -0.35, -0.1);
      if (item) item.rotation.z = b;
      body.rotation.y = -b * 0.35;
      leg(0, -0.15, 0.2); leg(1, 0.1, 0.15);
      body.position.y = k === 2 ? 0.02 : -0.01;
      break;
    }
    case 'feed':
      // the left hand holds the bag; the right dips in and throws
      arm(0, -0.55, -1.15, 0.15);
      arm(1, ...[[-0.35, -1.4], [-0.7, -1.1], [-1.45, -0.1], [-1.0, -0.35]][k]);
      head.rotation.x = k === 2 ? 0.1 : 0.28;
      body.rotation.x = k === 2 ? 0.06 : 0.02;
      break;
    case 'wave':
      // the arm up, the hand swinging side to side from the elbow
      arms[1].rotation.set(0, 0, 2.5);
      forearms[1].rotation.set(0, 0, [0.5, 0.05, -0.4, 0.05][k]);
      body.position.y = k % 2 ? 0.012 : 0;
      head.rotation.z = -0.08;
      break;
    case 'chat': {
      // a few gestures, picked through a longer cycle so it doesn't repeat every second
      const g = n % 8;
      if (g < 4) arm(1, [-0.65, -0.35, -0.55, -0.2][g], [-0.9, -0.5, -1.1, -0.3][g], 0.2);
      else arm(0, [-0.6, -0.3, -0.5, -0.1][g - 4], [-0.9, -0.6, -1.2, -0.2][g - 4], 0.2);
      head.rotation.y = 0.15 * f;
      head.rotation.x = g === 2 || g === 6 ? 0.12 : 0;
      break;
    }
    case 'kite':
      // both hands on the line, tugging now and then
      arm(1, -2.4, k === 1 ? -0.5 : -0.2, 0.1);
      arm(0, -0.95, -0.55, 0.05);
      body.rotation.z = 0.04 * f;
      body.rotation.x = k === 1 ? -0.08 : -0.03;
      leg(0, -0.25, 0.15);
      break;
    case 'vendor':
      arm(0, -0.9, -0.35);
      arms[1].rotation.set(0, 0, k % 2 ? 2.4 : 2.0);
      forearms[1].rotation.set(0, 0, k % 2 ? -0.25 : 0.3);
      break;
    case 'look':
      // hands clasped behind the back, gazing up and about
      arm(0, 0.45, -1.0, 0.12); arm(1, 0.45, -1.0, 0.12);
      head.rotation.x = -0.18;
      head.rotation.y = [0.15, 0.1, -0.1, -0.15][k];
      body.rotation.x = -0.03;
      break;
    default: { // idle: breathing, now and then easing onto one foot or glancing about
      arm(0, 0, -0.14, k === 1 ? 0.12 : 0.08);
      arm(1, 0, -0.14, k === 1 ? 0.12 : 0.08);
      body.position.y = k === 1 ? 0.014 : 0;
      if (k === 3) { leg(0, -0.06, 0.2); body.rotation.z = 0.02; }
      head.rotation.y = [0, 0, 0.4, 0, -0.3, 0][Math.floor(n / 4) % 6];
    }
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

// Walkers take a step every STEP meters, two drawings to a step, so their feet
// keep pace with the ground. Path walkers stop at each end, turn round in a
// few stepped drawings and set off back.
const STEP = 0.55;
const PAUSE = 1.6, SETTLE = 0.4, SNAP = 0.3;   // seconds: the whole pause, standing, each turning step
const handPos = new THREE.Vector3();

// What a walker's hands do with what they carry: a tray held up level on the
// forearm, a paper held open in front.
function carry(parts) {
  const { arms, forearms, item } = parts;
  if (!item) return;
  if (item.parent === forearms[1]) {
    arms[1].rotation.set(-0.3, 0, 0.08);
    forearms[1].rotation.set(-1.27, 0, 0);
    item.rotation.set(1.57, 0, 0);
  } else if (item.parent === parts.body && item.geometry) {
    for (const i of [0, 1]) {
      arms[i].rotation.set(-0.72, 0, i ? 0.28 : -0.28);
      forearms[i].rotation.set(-0.72, 0, 0);
    }
  }
}

export function animateFigures(time) {
  for (const a of cast) {
    const frame = Math.floor(time * a.fps + a.phase);
    const w = a.walk, parts = a.fig.userData.parts;
    if (w?.path) {
      const [[x1, z1], [x2, z2]] = w.path;
      const len = Math.hypot(x2 - x1, z2 - z1), T = len / w.speed, leg = T + PAUSE;
      const clock = time + (w.offset || 0) * leg, u = clock % (2 * leg);
      const back = u >= leg ? 1 : 0, t = u - back * leg, laps = Math.floor(clock / (2 * leg));
      const heading = Math.atan2(x2 - x1, z2 - z1) + back * Math.PI;
      if (t < T) {
        // walking, easing out of the start and into the stop
        const p = t / T, e = p * p * (3 - 2 * p), q = back ? 1 - e : e;
        a.fig.position.set(x1 + (x2 - x1) * q, 0, z1 + (z2 - z1) * q);
        a.fig.rotation.y = heading;
        const walked = (laps * 2 + back + e) * len;
        poseFigure(a.fig, 'walk', walked / (STEP / 2) + a.phase, a.seat);
        carry(parts);
      } else {
        // at the end: pull up, turn round in three steps, then stand a moment
        const r = t - T, turn = Math.floor((r - SETTLE) / SNAP);
        a.fig.rotation.y = heading + (r < SETTLE ? 0 : Math.PI * Math.min(3, turn + 1) / 3);
        if (r < SETTLE) poseFigure(a.fig, 'stop', 0, a.seat);
        else if (turn < 3) poseFigure(a.fig, 'walk', turn % 2 ? 3 : 1, a.seat);
        else poseFigure(a.fig, 'idle', frame, a.seat);
        carry(parts);
      }
    } else if (w) {
      const ang = time * w.speed + (w.offset || 0);
      const cx = w.cx || 0, cz = w.cz || 0;
      a.fig.position.set(cx + Math.cos(ang) * w.r, 0, cz + Math.sin(ang) * w.r);
      a.fig.rotation.y = -ang + (w.speed > 0 ? 0 : Math.PI);
      const step = Math.floor(Math.abs(time * w.speed) * w.r / (STEP / 2) + a.phase);
      poseFigure(a.fig, 'walk', step, a.seat);
      carry(parts);
      if (a.dog) {
        // the lead hand held out in front, steady
        parts.arms[0].rotation.set(-0.45, 0, -0.1);
        parts.forearms[0].rotation.set(-0.6, 0, 0);
        const lag = ang - Math.sign(w.speed) * (1.4 / w.r);
        a.dog.position.set(cx + Math.cos(lag) * (w.r + 0.5), 0, cz + Math.sin(lag) * (w.r + 0.5));
        a.dog.rotation.y = a.fig.rotation.y;
        a.dog.userData.legs.forEach((l, i) => { l.rotation.x = ((i + step) % 2 ? 0.5 : -0.5); });
        a.dog.userData.tail.rotation.z = step % 2 ? 0.5 : -0.5;
      }
    } else {
      poseFigure(a.fig, a.pose, frame, a.seat);
    }
    if (a.leash) {
      parts.arms[0].getObjectByName('hand').getWorldPosition(handPos);
      stretch(a.leash, handPos, a.dog.localToWorld(new THREE.Vector3(0, 0.5, 0.3)));
    }
    if (a.kite) {
      parts.arms[1].getObjectByName('hand').getWorldPosition(handPos);
      const k = a.kite;
      k.position.set(a.fig.position.x + 2.5 + Math.sin(time * 0.7) * 0.8, 9 + Math.sin(time * 1.3) * 0.6, a.fig.position.z - 3);
      k.rotation.set(0.3, 0.4, Math.sin(time * 1.1) * 0.25);
      stretch(a.string, handPos, k.position.clone().add(new THREE.Vector3(0, -0.2, 0)));
    }
  }
}
