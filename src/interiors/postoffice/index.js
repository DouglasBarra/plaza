// The post office, inside: the People district as a sorting office.
//
// The counter with its brass grille is the public face, the postmaster behind
// it (eight till four); behind him the floor is the works. The pigeonhole
// rack on the back wall has a hole for everyone you talk to, with their name
// on the shelf under it and a letter standing in it for every message waiting;
// the brass scale on the counter weighs the day's post; the wire trays on the
// sorting table hold what has come in and what has been dealt with; and the
// shelf in the back corner, a little dusty, keeps a tied bundle for everyone
// who has gone quiet. The chalk board by the door says how things stand.
//
// Without Plaza's server the office is simply shut: the holes are empty, the
// shelf is swept, and the board says so. That is the normal case, not a fault.
import * as THREE from 'three';
import { M } from '../../kit.js';
import { isNight, hourNow } from '../../life.js';
import { DISTRICTS } from '../../districts/index.js';
import { openApp } from '../../ui/card.js';
import { sfx } from '../../sound/index.js';
import { atWork, backAt } from '../../plaza/routines.js';
import { FRONT, HOLES, QUIET_SLOTS, TABLE } from './dims.js';
import { lampOn } from './materials.js';
import { buildShell } from './shell.js';
import { furnish } from './fixtures.js';

const hello = () => {
  const h = hourNow();
  return h < 12 ? 'Good morning!' : h < 18 ? 'Good afternoon!' : 'Good evening!';
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const ago = (iso) => {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const m = Math.round((Date.now() - t) / 60e3);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} minutes ago`;
  if (m < 1440) return `${plural(Math.round(m / 60), 'hour', 'hours')} ago`;
  return `${plural(Math.round(m / 1440), 'day', 'days')} ago`;
};

// What the board is chalked with when the office can't read your post. The
// words the room shows instead of an error.
const SHUT = {
  loading: { title: 'Back shortly', note: 'Still sorting the morning post.' },
  offline: { title: 'Closed', note: "Plaza's server isn't running, so no post can be read." },
  beeper: { title: 'Closed', note: "Beeper Desktop isn't open on this Mac. Open it and the post comes in." },
  connect: { title: 'Closed', note: 'Connect your chats at the counter and the post starts again.' },
  accounts: { title: 'No post', note: 'No WhatsApp or LinkedIn in Beeper yet.' },
};

export function postOffice(scene, rand, lights) {
  const shell = buildShell(scene);
  const room = furnish(scene);
  const lamps = [...shell.lamps, ...room.lamps];

  // ---------- live data ----------
  const pe = DISTRICTS.people.api;
  // What the room is showing: 'open' with the chats, or why it is shut.
  const look = () => {
    const d = pe.data();
    if (!d) return { shut: 'loading' };
    if (d.offline) return { shut: 'offline' };
    if (!d.running) return { shut: 'beeper' };
    if (!d.loggedIn) return { shut: 'connect' };
    if (!d.accounts?.length) return { shut: 'accounts' };
    const chats = d.chats || [], quiet = d.quiet || [];
    const waiting = chats.filter((c) => c.unread && !c.muted);
    const done = chats.filter((c) => !(c.unread && !c.muted));
    return { chats, quiet, waiting, done };
  };

  const refresh = () => {
    const s = look();
    // the pigeonholes: whoever is waiting takes the top holes, then the rest
    room.rack.set(s.shut ? [] : [...s.waiting, ...s.done].slice(0, HOLES));
    room.scale.set(s.shut ? 0 : s.waiting.length);
    room.trayIn.set(s.shut ? 0 : s.waiting.length);
    room.trayDone.set(s.shut ? 0 : s.done.length);
    room.shelf.set(s.shut ? [] : s.quiet.slice(0, QUIET_SLOTS));
    room.board.set(s.shut ? SHUT[s.shut] : {
      title: 'Post today',
      rows: [['Waiting on you', s.waiting.length], ['Sorted', s.done.length], ['Gone quiet', s.quiet.length]],
      note: 'Collection at 17:00.',
    });
  };
  DISTRICTS.people.subscribe(refresh);
  refresh();

  // ---------- what the postmaster says ----------
  function postmasterLine() {
    if (!atWork('postmaster')) return `The counter is closed. I'm back at ${backAt('postmaster')}.`;
    const s = look();
    if (s.shut === 'loading') return `${hello()} One moment, I'm still sorting.`;
    if (s.shut === 'offline') return `${hello()} We're closed: Plaza's server isn't running.`;
    if (s.shut === 'beeper') return `${hello()} No post today — Beeper Desktop isn't open on this Mac.`;
    if (s.shut === 'connect') return `${hello()} Connect your chats and I'll sort the post for you.`;
    if (s.shut === 'accounts') return `${hello()} Beeper's here, but there's no WhatsApp or LinkedIn in it yet.`;
    const { waiting, quiet } = s;
    if (waiting.length === 1) return `${hello()} A letter from ${waiting[0].title}, ${ago(waiting[0].last)}.`;
    if (waiting.length === 2) return `${hello()} Two waiting: ${waiting[0].title} and ${waiting[1].title}.`;
    if (waiting.length) return `${hello()} ${plural(waiting.length, 'letter', 'letters')} waiting — ${waiting[0].title}, ${waiting[1].title} and ${waiting.length - 2} more.`;
    if (quiet.length) return `All sorted. Nothing from ${quiet[0].title} in three weeks, mind.`;
    return 'All sorted — not a letter in the place.';
  }

  // The bell on the counter: asks the server for the post again. Reading
  // only; nothing is ever marked read from here.
  function ringBell() {
    sfx('ding', { at: room.spots.bell.clone().setY(1.3), room: 'people' });
    const d = pe.data();
    if (!d || d.offline || !d.running || !d.loggedIn) return openApp('people');   // the card says what to do
    pe.refresh();
  }

  // ---------- light and life ----------
  let last = 0;
  function update(time) {
    const dt = Math.min(0.1, time - last); last = time;
    // everyone here keeps the postman's hours; out of them the office is tidy and empty
    const open = atWork('postmaster');
    room.postmaster.visible = open;
    for (const f of room.folks) f.visible = open;
    room.scale.update(dt);
    // the franking press thumps away while someone is working
    const k = (time / 2.8) % 1;
    const down = open ? (k < 0.06 ? k / 0.06 : k < 0.15 ? 1 - (k - 0.06) / 0.09 : 0) : 0;
    room.press.arm.rotation.z = 0.45 * (1 - down);

    // the sun crosses the sky with the real time; the lamps come on in the evening
    const hour = hourNow();
    const az = THREE.MathUtils.clamp((hour - 6) / 13, 0, 1) * Math.PI;
    const dark = isNight() || hour < 6.5 || hour > 19.5;
    const evening = dark || hour >= 18 || hour < 7;
    lights.sun.position.set(Math.cos(az) * 14, 5 + Math.sin(az) * 12, 9);
    lights.sun.target.position.set(0, 1.4, 0);
    lights.sun.intensity = dark ? Math.PI * 0.15 : Math.PI;
    for (const l of lamps) {
      l.light.intensity = evening ? 3.2 : 0;
      l.bulb.material = evening ? lampOn : M.white;
    }
  }

  return {
    cutaway: shell.cutaway,
    colliders: room.colliders,
    update,
    // the live things, so a test can count the letters in the holes
    rack: room.rack,
    shelf: room.shelf,
    speakers: [
      { object: room.postmaster, height: 1.9, range: 3.0, level: 0, text: postmasterLine, persona: 'postmaster', name: 'the postmaster' },
    ],
    stations: [
      { point: room.spots.counter, label: 'Ask the postmaster for your post', app: 'people', tab: 'waiting' },
      { point: room.spots.bell, label: 'Ring the bell for fresh post', use: ringBell },
      { point: room.spots.holes, label: 'Look through the pigeonholes', app: 'people', tab: 'recent' },
      { point: room.spots.quiet, label: 'Look over the unclaimed shelf', app: 'people', tab: 'quiet' },
    ],
    // a quiet hall with paper and coins in it, and the clock on the back wall
    sounds: [{ kind: 'hush' }, { kind: 'clock', at: room.clockAt }],
    soundSpots: [room.spots.counter, room.spots.holes, room.spots.quiet, new THREE.Vector3(TABLE.x, 0, TABLE.z)]
      .map((p) => p.clone().setY(1.2)),
    // a letter through the slot as you come in
    enterSound: { name: 'letter', at: new THREE.Vector3(-1.9, 1.05, FRONT - 0.3), delay: 0.45 },
  };
}
