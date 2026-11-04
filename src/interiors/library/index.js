// The library, inside: the Study district as a reading room.
//
// What you are reading is on the furniture. Every row of
// DISTRICTS.study.items becomes a thing on the long reading table, and which
// thing depends on how its progress is written (see displays.js): a
// percentage is an open book whose pages are split where you got to, with a
// blue ribbon on that page; a count is a tray with that many cards still
// standing in it; a day is a closed book with a slip saying when it is
// wanted. The same list is filed in the open drawer of the card catalogue.
//
// Around that: the stacks against the back and left walls with a ladder that
// rolls along them, the issue counter with its bell and a date stamp you can
// press, the returns shelf and the trolley of books waiting to go back, a
// stove and two armchairs, the window seat, the globe, and the librarian,
// who paces the floor with a book from nine until eight and tells you what
// you are in the middle of.
import * as THREE from 'three';
import { M, box, cyl } from '../../kit.js';
import { isNight, hourNow } from '../../life.js';
import { DISTRICTS } from '../../districts/index.js';
import { folk } from '../../folks.js';
import { chair, plant, rug, picture, armchair, lowTable } from '../../decor.js';
import { piece } from '../../layout.js';
import { sfx } from '../../sound/index.js';
import { atWork, backAt } from '../../plaza/routines.js';
import { W, D, H, AT, SPOTS, RAIL } from './dims.js';
import { lampOn, dark, sunbeam, dustMote } from './materials.js';
import { buildShell } from './shell.js';
import { readingPiece, catalogueCards, dateSlip, readingOf, sayWhere } from './displays.js';
import { stacks, rollingLadder, catalogue, issueCounter, returnsShelf, trolley, readingTable, stove, windowSeat, globeStand, hourglass, readingLamp, pendant, sconce, wallClock, readingSpots } from './fixtures.js';

const TOP = 0.848;                              // the reading table's leather surface
const items = () => DISTRICTS.study.items || [];

export function study(scene, rand, lights) {
  const colliders = [];
  const col = (x, z, r) => { const c = { x, z, r }; colliders.push(c); return c; };
  const boxCol = (x, z, hw, hd, rot = 0) => { const c = { x, z, hw, hd, rot }; colliders.push(c); return c; };
  const lamps = [], pendants = [], sconces = [];

  const { cutaway, shafts } = buildShell(scene);

  // ---------- the stacks, the ladder and the catalogue ----------
  stacks(scene, rand);
  const ladder = rollingLadder(scene);
  const ladderCol = col((RAIL.x0 + RAIL.x1) / 2, RAIL.z + 0.7, 0.45);   // it nudges you aside as it rolls
  let cards = null;
  piece(scene, 'library.catalogue', AT.catalogue, (g) => {
    const cabinet = catalogue(g, ...AT.catalogue);
    cards = catalogueCards(cabinet.drawer, 0, 0, -0.25, items());
  }, [SPOTS.catalogue, boxCol(0, -D / 2 + 0.5, 1.06, 0.55)]);
  wallClock(scene, 0, 3.4, -D / 2 + 0.06);
  for (const x of [-1.35, 1.35]) sconces.push(sconce(scene, x, 2.5, -D / 2 + 0.06));

  // ---------- the reading table: your list, laid out on it ----------
  const [tx, tz] = AT.table;
  const list = new THREE.Group();
  let glass = null;
  piece(scene, 'library.reading-table', AT.table, (g) => {
    readingTable(g, tx, tz);
    for (const [cx, cz, r] of [[tx - 1.2, tz - 1.25, 0], [tx + 0.7, tz - 1.25, 0], [tx - 2.2, tz, Math.PI / 2], [tx + 2.2, tz, -Math.PI / 2]]) chair(g, cx, cz, r);
    // somebody already at it, reading
    folk(g, tx - 1.2, tz - 1.25, 0, { pose: 'read', seat: 0.48, look: { glasses: true, item: 'paper' } });
    lamps.push(readingLamp(g, tx - 1.45, TOP, tz - 0.4, 0.5));
    lamps.push(readingLamp(g, tx + 1.45, TOP, tz - 0.4, -0.4));
    glass = hourglass(g, tx - 0.9, TOP, tz - 0.55);
    // scrap slips and a pencil left out
    for (let i = 0; i < 4; i++) box(g, 0.14, 0.004, 0.1, M.white, tx + 0.25 + (i % 2) * 0.012, TOP + 0.002 + i * 0.005, tz - 0.5).rotation.y = i * 0.2;
    cyl(g, 0.008, 0.008, 0.16, dark, tx + 0.55, TOP + 0.008, tz - 0.42, 5).rotation.set(Math.PI / 2, 0, 0.6);
    g.add(list);
  }, [SPOTS.desk, boxCol(tx, tz, 1.85, 0.95), col(tx - 1.2, tz - 1.4, 0.35), col(tx + 0.7, tz - 1.4, 0.35), col(tx - 2.3, tz, 0.35), col(tx + 2.3, tz, 0.35)]);
  piece(scene, 'library.rug', AT.table, (g) => rug(g, tx, tz, 5.0, 3.4, 0, 1));
  for (const x of [tx - 0.9, tx + 1.3]) pendants.push(pendant(scene, x, 2.5, tz));

  // ---------- the counter, the returns shelf and the trolley ----------
  let counter = null;
  const { x0, x1, z: cz0 } = AT.counter;
  piece(scene, 'library.counter', [(x0 + x1) / 2, cz0], (g) => { counter = issueCounter(g, AT.counter); },
    [SPOTS.counter, SPOTS.stamp, boxCol((x0 + x1) / 2, cz0 + 0.1, (x1 - x0) / 2 + 0.1, 0.55), col((x0 + x1) / 2, cz0 + 0.84, 0.3)]);
  lamps.push(readingLamp(counter.group, x0 + 0.95, 1.08, cz0 + 0.2, Math.PI * 0.8));
  piece(scene, 'library.returns-shelf', AT.returns, (g) => returnsShelf(g, ...AT.returns), [boxCol(AT.returns[0], AT.returns[1], 0.26, 0.9)]);
  piece(scene, 'library.trolley', AT.trolley, (g) => trolley(g, ...AT.trolley, -0.45), [boxCol(AT.trolley[0], AT.trolley[1], 0.5, 0.32, -0.45)]);

  // ---------- the stove and the two chairs in front of it ----------
  let fire = null;
  const warm = new THREE.Vector3(AT.stove[0], 0, AT.stove[1]);
  piece(scene, 'library.nook', [4.4, -1.2], (g) => {
    fire = stove(g, ...AT.stove);
    for (const [ax, az] of AT.nook) armchair(g, ax, az, warm);
    lowTable(g, ...AT.lowTable, Math.PI / 2);
    // one reader asleep over his book by the fire
    const [nx, nz] = AT.nook[1];
    folk(g, nx, nz, Math.atan2(warm.x - nx, warm.z - nz), { pose: 'nap', seat: 0.5, look: { hat: 'bowler', glasses: true } });
  }, [col(...AT.stove, 0.5), col(...AT.nook[0], 0.55), col(...AT.nook[1], 0.55), col(...AT.lowTable, 0.45)]);

  // ---------- the quiet corner by the window ----------
  piece(scene, 'library.window-seat', AT.seat, (g) => windowSeat(g, ...AT.seat), [boxCol(AT.seat[0] - 0.05, AT.seat[1], 0.36, 0.99)]);
  let globe = null;
  piece(scene, 'library.globe', AT.globe, (g) => { globe = globeStand(g, ...AT.globe); }, [SPOTS.globe, col(...AT.globe, 0.5)]);
  piece(scene, 'library.plant', AT.plant, (g) => plant(g, ...AT.plant, 1.15), [col(...AT.plant, 0.5)]);
  picture(scene, -W / 2 + 0.06, 2.4, 4.3, 0.95, 0.72, Math.PI / 2, 'map');

  // ---------- the librarian, pacing the floor with a book ----------
  const librarian = folk(scene, 0, 0, 0, {
    walk: { path: [[-3.4, -2.6], [2.1, -2.6]], speed: 0.55 },
    look: { hair: 'bun', glasses: true, item: 'paper' },
  });

  // ---------- your reading list, on the table and in the drawer ----------
  const spread = [-1.0, 0.15, 1.25];              // along the table, from its left
  const refresh = () => {
    list.clear();
    items().slice(0, 3).forEach((item, i) => {
      readingPiece(list, tx + spread[i], TOP, tz + (i === 2 ? 0.02 : 0.12), i * 0.12 - 0.12, item);
    });
    cards.set(items());
  };
  DISTRICTS.study.subscribe(refresh);
  refresh();

  // ---------- the date stamp ----------
  // Press it and it leaves today on a fresh slip, in the tray. It stamps
  // paper and nothing else: the library never writes to your list.
  const slips = [];
  let press = 0;
  function stampSlip() {
    if (press > 0.02) return;
    press = 1;
    sfx('ding', { at: SPOTS.stamp.clone().setY(1.2), room: 'study' });
    const when = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    const n = slips.length;
    slips.push(dateSlip(counter.tray, ((n * 7) % 5 - 2) * 0.012, 0.008 + (n % 5) * 0.004, ((n * 3) % 5 - 2) * 0.012, ((n * 11) % 7 - 3) * 0.1, when));
    if (slips.length > 5) { const old = slips.shift(); old.parent?.remove(old); }
  }

  // ---------- the globe ----------
  let spun = 0;
  function spinGlobe() {
    spun = 3.2;
    sfx('click', { at: SPOTS.globe.clone().setY(1.2), room: 'study', vol: 0.6 });
  }

  // ---------- light and life ----------
  let last = 0, nextPage = 8;
  const spots = readingSpots();
  function update(time) {
    const dt = Math.min(0.1, time - last); last = time;
    librarian.visible = atWork('librarian');      // nine until eight, the library's hours

    // the sun crosses the sky with the real time; the lamps come on in the evening
    const hour = hourNow();
    const az = THREE.MathUtils.clamp((hour - 6) / 13, 0, 1) * Math.PI;
    const night = isNight() || hour < 6.5 || hour > 19.5;
    const evening = night || hour >= 18 || hour < 7;
    lights.sun.position.set(Math.cos(az) * 16, 4 + Math.sin(az) * 14, 10);
    lights.sun.target.position.set(0, H / 2, 0);
    lights.sun.intensity = night ? Math.PI * 0.15 : Math.PI;
    for (const l of lamps) {
      l.light.intensity = evening ? 3.6 : 0;
      l.bulb.material = evening ? lampOn : M.white;
    }
    for (const l of pendants) {
      l.light.intensity = evening ? 7 : 0;
      l.bulb.material = evening ? lampOn : M.white;
    }
    for (const s of sconces) s.bulb.material = evening ? lampOn : M.white;

    // the shafts from the windows, and the dust turning over in them
    const k = night ? 0 : THREE.MathUtils.clamp(1 - Math.abs(hour - 12.5) / 6.5, 0, 1);
    sunbeam.opacity = 0.08 * k;
    dustMote.opacity = 0.55 * k;
    for (const s of shafts) for (const m of s.motes) {
      const { k: k0, ph, w, h, len } = m.userData;
      const u = (time * 0.03 + k0) % 1;
      m.position.set(Math.sin(time * 0.31 + ph) * w * 0.38, (Math.cos(time * 0.19 + ph * 2) * 0.3 + (u - 0.5) * 0.7) * h, u * len);
    }

    // the hourglass runs with the minute, and gets turned over at the top of it
    const u = ((Date.now() / 1000) % 60) / 60, flip = Math.floor(Date.now() / 60000) % 2 === 1;
    const to = flip ? Math.PI : 0;
    glass.turn.rotation.z += (to - glass.turn.rotation.z) * Math.min(1, dt * 7);
    const sign = flip ? -1 : 1;
    const heap = Math.max(0.04, u), funnel = Math.max(0.04, 1 - u);
    glass.lower.scale.setScalar(heap);
    glass.lower.rotation.x = flip ? Math.PI : 0;
    glass.lower.position.y = sign * (-0.11 + 0.05 * heap);
    glass.upper.scale.setScalar(funnel);
    glass.upper.rotation.x = flip ? 0 : Math.PI;
    glass.upper.position.y = sign * (0.005 + 0.05 * funnel);
    glass.stream.visible = u > 0.03 && u < 0.97;

    // the ladder rolls slowly along its rail; the globe keeps turning a while
    const lx = (RAIL.x0 + RAIL.x1) / 2 + Math.sin(time * 0.06) * ((RAIL.x1 - RAIL.x0) / 2 - 0.6);
    ladder.set(lx);
    ladderCol.x = lx;
    globe.ball.rotation.y += spun * dt;
    spun *= Math.exp(-dt * 0.9);

    // the stamp comes down and back up
    press = Math.max(0, press - dt * 2.2);
    counter.press.position.y = 1.08 - 0.055 * Math.sin(press * Math.PI);

    // the stove: a small fire, and the light it throws at night
    const beat = Math.floor(time * 7) % 2;
    for (const [i, f] of fire.flames.entries()) {
      const h = f.userData.h * (1 + ((i + beat) % 2 ? 0.16 : -0.1));
      f.scale.set(1, h, 1);
      f.position.y = 0.36 + h / 2;
    }
    fire.light.intensity = (night ? 5 : 2.2) * (beat ? 1 : 0.86);

    // somewhere across the room, somebody turns a page
    if ((nextPage -= dt) < 0) {
      nextPage = 7 + Math.random() * 13;
      sfx('pageTurn', { at: spots[Math.floor(Math.random() * spots.length)], room: 'study', vol: 0.8 });
    }
  }

  // ---------- what the librarian says when you come close ----------
  function librarianLine() {
    if (!atWork('librarian')) return `The library is closed. We open at ${backAt('librarian')}.`;
    const hour = hourNow();
    const hello = hour < 12 ? 'Morning.' : hour < 18 ? 'Afternoon.' : 'Good evening.';
    const list2 = items().map(readingOf);
    if (!list2.length) return `${hello} Nothing on your list. Shall we find you something?`;
    const open = list2.find((r) => r.kind === 'pct');
    const due = list2.find((r) => r.kind === 'due');
    const pile = list2.find((r) => r.kind === 'count');
    const lines = [];
    if (open) lines.push(`${hello} ${open.title} is still open at ${Math.round(open.pct * 100)}%. It's on the table.`);
    if (due) lines.push(`${due.title} is wanted ${due.progress}. Don't leave it to the day.`);
    if (pile) lines.push(`${pile.count} cards still standing in the tray. Ten a day and they're gone.`);
    if (!lines.length) lines.push(`${hello} ${sayWhere(list2[0])}.`);
    return lines[Math.floor(Date.now() / 9000) % lines.length];
  }

  return {
    cutaway,
    colliders,
    update,
    speakers: [{ object: librarian, height: 1.95, range: 3.4, level: 0, text: librarianLine, persona: 'librarian', name: 'the librarian' }],
    stations: [
      { point: SPOTS.desk, level: 0, label: 'Look over your reading list', app: 'study' },
      { point: SPOTS.catalogue, level: 0, label: 'Search the card catalogue', app: 'study' },
      { point: SPOTS.counter, level: 0, label: 'Ask the librarian about a book', app: 'study' },
      { point: SPOTS.stamp, level: 0, label: 'Press the date stamp', use: stampSlip },
      { point: SPOTS.globe, level: 0, label: 'Spin the globe', use: spinGlobe },
    ],
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.2),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.4 },
    cameraOffset: new THREE.Vector3(9, 14, 16),
    // a hushed room: the stove crackling, the clock on the back wall, and the
    // echo a room of this size has. A page turns as you come in.
    sounds: [{ kind: 'fire', at: new THREE.Vector3(AT.stove[0] - 0.4, 0.5, AT.stove[1]) }, { kind: 'clock', at: new THREE.Vector3(0, 3.4, -D / 2 + 0.2) }, { kind: 'hush' }],
    enterSound: { name: 'pageTurn', at: new THREE.Vector3(tx, 1.0, tz), delay: 0.9 },
  };
}
