// The bank, inside: the Finance district as a banking hall two stories high.
//
// Downstairs (everyday money): the vault, open, with as much gold as you
// have cash; the split-flap board over it with your cards; a limit dial per
// card; the tellers; the ticker printing your latest transactions; the
// easel with the month's spending; and the courier, whose pneumatic tube
// fetches news from your banks (Sync).
// Upstairs (the records): a ledger per account, the year at a glance, the
// manager's desk, and the statements, a drawer for every month.
//
// Built like the town hall (interiors/townhall/): the same walls as outside
// (dims.js), real windows showing the plaza in first person, and the walls
// facing the camera, the gallery and the ceilings cut away in third person.
import * as THREE from 'three';
import { M } from '../../kit.js';
import { isNight, hourNow } from '../../life.js';
import { DISTRICTS } from '../../districts/index.js';
import { LAYER_CEILING, LAYER_UPPER } from '../townhall/index.js';
import { W, D, F, PODIUM } from './dims.js';
import { lampOn } from './materials.js';
import { buildHall, inStair, stairHeight } from './shell.js';
import { furnishGroundFloor } from './ground-floor.js';
import { furnishUpstairs } from './upstairs.js';
import { money } from './displays.js';
import { openApp } from '../../ui/card.js';
import { atWork, backAt } from '../../plaza/routines.js';

const onLayer = (o, layer) => { o.traverse((c) => c.layers.set(layer)); return o; };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (n) => (n == null ? '—' : Math.round(n).toLocaleString('pt-BR'));
const dayMonth = (d) => (d ? `${d.slice(8, 10)} ${MONTHS[Number(d.slice(5, 7)) - 1]}` : '');

export function buildBank(scene, rand, lights) {
  const panes = [];
  const lower = new THREE.Group(), upper = new THREE.Group(), ceilings = new THREE.Group();
  const cutLower = new THREE.Group(), cutUpper = new THREE.Group();
  scene.add(lower, upper, ceilings, cutLower, cutUpper);

  const hall = buildHall({ lower, upper, ceilings, cutLower, cutUpper, panes });
  const ground = furnishGroundFloor(lower);
  const up = furnishUpstairs(upper);

  onLayer(upper, LAYER_UPPER);
  onLayer(cutUpper, LAYER_UPPER);
  onLayer(ceilings, LAYER_CEILING);
  lights.sun.shadow.camera.layers.enableAll();

  // ---------- live data ----------
  const fin = DISTRICTS.finance.api;
  const refresh = () => {
    const d = fin.data();
    const ok = d && !d.offline && d.loggedIn;
    const accounts = ok ? d.accounts || [] : [];
    const cards = accounts.filter((a) => a.type === 'CREDIT');
    const cash = accounts.filter((a) => a.type === 'BANK').reduce((s, a) => s + (a.balance || 0), 0);

    // the board: cash, then each card's used amount, limit and due date
    const lines = [' BANK OF PLAZA  ACCOUNTS'];
    const cents = (n) => money(n).replace('R$', '').trim();
    if (!ok) lines.push('', d?.offline ? '  CLOSED: NO SERVER' : '  PLEASE SEE THE COURIER', d?.offline ? '' : '  TO OPEN AN ACCOUNT');
    else if (!accounts.length) lines.push('', '  NO BANKS CONNECTED YET');
    else {
      lines.push(`CASH ${cents(cash).padStart(21)}`);
      // 26 columns: card (7), used (6), /, limit (6), due (6)
      if (cards.length) lines.push('CARD     USED/LIMIT   DUE');
      for (const c of cards.slice(0, 2)) {
        const name = c.name.replace(/^\S+\s/, '').slice(0, 7).padEnd(7);
        lines.push(`${name}${short(c.used ?? c.balance).padStart(6)}/${short(c.limit).padEnd(6)}${dayMonth(c.due).padStart(6)}`);
      }
      const bill = (d.bills || [])[0];
      if (bill) lines.push(`LAST BILL ${dayMonth(bill.due)} ${cents(bill.total).padStart(9)}`);
    }
    ground.board.set(lines);

    cards.slice(0, 2).forEach((c, i) => ground.dials[i].set(c.name, c.limit ? (c.used ?? c.balance) / c.limit : 0));
    for (let i = cards.length; i < 2; i++) ground.dials[i].set(i ? 'Second card' : 'Card limit', 0);
    ground.dials[1].group.visible = cards.length > 1;
    ground.gold.set(cash);

    const month = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    ground.chart.set(ok ? d.month?.byCategory || [] : [], month);
    const recent = ok ? d.recent || [] : [];
    ground.ticker.set(recent.length
      ? recent.slice(0, 40).map((t) => `${t.description.toUpperCase().slice(0, 22)} ${t.amount > 0 ? '+' : ''}${money(t.amount).replace('R$', '').trim()}`).join('   ·   ') + '   ·   '
      : 'NO NEWS ON THE WIRE   ·   ');

    // upstairs: a ledger per account (up to three), the year, the drawers
    up.ledgers.forEach((l, i) => {
      const a = accounts[i];
      l.group.visible = !!a || i === 0;
      l.set(a || null, a ? recent.filter((t) => t.accountId === a.id) : []);
    });
    const months = ok ? d.months || [] : [];
    up.setYear(months);
    up.setArchive(months.slice(-12).map((m) => ({ label: `${MONTHS[Number(m.month.slice(5)) - 1]} ${m.month.slice(2, 4)}`, out: m.out })));
  };
  DISTRICTS.finance.subscribe(refresh);
  refresh();

  // ---------- light and life ----------
  let last = 0;
  function update(time) {
    // the staff keep bank hours
    for (const t of ground.tellers) t.visible = atWork('teller');
    up.manager.visible = atWork('manager');
    const dt = Math.min(0.1, time - last); last = time;
    ground.board.update();
    for (const dial of ground.dials) dial.update(dt);
    ground.ticker.update(time);

    // while syncing, a capsule shoots up and down the courier's tube
    const syncing = fin.data()?.syncing;
    const { capsule, base } = ground.tube;
    if (syncing) {
      const k = (time * 0.6) % 1, y = k < 0.5 ? k * 2 : 2 - k * 2;
      capsule.position.y = base.y + y * (F - 1.8);
    } else capsule.position.y += (base.y - capsule.position.y) * Math.min(1, dt * 4);

    // the sun crosses the sky with the real time; lamps come on in the evening
    const hour = hourNow();
    const day = THREE.MathUtils.clamp((hour - 6) / 13, 0, 1);
    const az = day * Math.PI;
    const dark = isNight() || hour < 6.5 || hour > 19.5;
    const evening = dark || hour >= 18 || hour < 7;
    lights.sun.position.set(Math.cos(az) * 16, 4 + Math.sin(az) * 14, 10);
    lights.sun.target.position.set(0, F / 2, 0);
    lights.sun.intensity = dark ? Math.PI * 0.15 : Math.PI;
    for (const l of [...ground.lamps, ...up.lamps]) {
      l.light.intensity = evening ? 3 : 0;
      l.bulb.material = evening ? lampOn : M.white;
    }
    ground.chand.light.intensity = evening ? 14 : 0;
    for (const b of ground.chand.bulbs) b.material = evening ? lampOn : M.white;
  }

  // what the teller and the manager say when you come close
  function hello() {
    const h = hourNow();
    return h < 12 ? 'Good morning!' : h < 18 ? 'Good afternoon!' : 'Good evening!';
  }
  function tellerLine() {
    if (!atWork('teller')) return `The bank is closed. We open at ${backAt('teller')}.`;
    const d = fin.data();
    if (!d || d.offline) return `${hello()} We're closed: Plaza's server isn't running.`;
    if (!d.loggedIn) return `${hello()} No account with us yet? The courier can set one up.`;
    if (!d.accounts?.length) return `${hello()} Connect a bank, and I'll keep its books.`;
    const cash = d.accounts.filter((a) => a.type === 'BANK').reduce((s, a) => s + (a.balance || 0), 0);
    const card = d.accounts.find((a) => a.type === 'CREDIT' && a.due && a.due >= new Date().toISOString().slice(0, 10));
    if (card) return `${hello()} ${money(cash)} in the bank. Your ${card.name} is due ${dayMonth(card.due)}.`;
    return `${hello()} You have ${money(cash)} in the bank.`;
  }
  function managerLine() {
    if (!atWork('manager')) return `The manager is out. Back at ${backAt('manager')}.`;
    const d = fin.data();
    const m = d?.month;
    if (!m || (!m.in && !m.out)) return 'The books are quiet this month.';
    const top = m.byCategory?.[0];
    const net = m.in - m.out;
    return `This month: ${money(m.in)} in, ${money(m.out)} out${top ? `, mostly ${top[0].toLowerCase()}` : ''}. ${net >= 0 ? 'Well kept.' : 'Spending more than came in.'}`;
  }

  // the courier fetches news from your banks: each fetch spends calls on your Banco plan
  async function sendCourier() {
    const d = fin.data();
    if (!d || d.offline || !d.loggedIn || !d.accounts?.length) return openApp('finance'); // logging in and connecting a bank happen in the card
    const quota = d.quota ? `\n\nYour Banco plan: ${d.quota}.` : '';
    if (!confirm(`Send the courier for news from your banks?\n\nThis syncs your accounts and uses about 5 calls on your Banco plan.${quota}`)) return;
    fin.sync();
  }

  // walking: the stairs connect the floors
  function heightAt(x, z, level) {
    if (inStair(x, z)) {
      const y = stairHeight(z);
      return { y, level: y > F / 2 ? 1 : 0 };
    }
    return { y: level * F, level };
  }

  return {
    levels: { ground: 0, upper: 1, height: F },
    lower, upper, ceilings, cutLower, cutUpper, panes,
    colliders: [...hall.colliders, ...ground.colliders, ...up.colliders],
    heightAt,
    update,
    speakers: [
      { object: ground.tellers[0], height: 1.9, range: 3.2, level: 0, text: tellerLine, persona: 'teller', name: 'the teller' },
      { object: up.manager, height: 1.6, range: 3.0, level: 1, text: managerLine, persona: 'manager', name: 'the manager' },
    ],
    stations: [
      { point: ground.spots.teller, level: 0, label: 'Talk to the teller', app: 'finance', tab: 'overview' },
      { point: ground.spots.vault, level: 0, label: 'Look over your money', app: 'finance', tab: 'overview' },
      { point: ground.spots.ticker, level: 0, label: 'Read the ticker tape', app: 'finance', tab: 'activity' },
      { point: ground.spots.chart, level: 0, label: 'Study the month', app: 'finance', tab: 'overview' },
      { point: ground.spots.courier, level: 0, label: 'Send the courier for news', use: sendCourier },
      { point: up.spots.ledgers, level: 1, label: 'Open the ledgers', app: 'finance', tab: 'accounts' },
      { point: up.spots.archive, level: 1, label: 'Look through the statements', app: 'finance', tab: 'activity' },
    ],
    spawn: new THREE.Vector3(0, 0, D / 2 - 2.0),
    exit: new THREE.Vector3(0, 0, D / 2 - 0.6),
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.4 },
    cameraOffset: new THREE.Vector3(10, 16, 17),
    // the room is the building: the yard tile (0.4 m) and the podium lift the hall off the plaza
    plazaOffset: new THREE.Vector3(0, 0.4 + PODIUM, 0),
  };
}
