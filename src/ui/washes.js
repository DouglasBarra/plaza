// Color washes: a faint watercolor tint at the edges of the screen in the
// color of the district you're in, or near. Blotchy like paint on wet paper,
// and it fades out and back in when you move to another district. The
// Washes button (C) turns it off; the choice is remembered in this browser.
import { STAMPS } from '../kit.js';
import { game } from '../app/state.js';
import { me, buildings } from '../app/plaza.js';

const NEAR = 15;          // m from a door at which its district starts to show
const STRENGTH = 0.65;    // the wash at its strongest

export function washes() {
  const el = document.getElementById('wash');
  const btn = document.getElementById('toggle-washes');
  let on = true;
  try { on = localStorage.getItem('plaza.washes') !== 'off'; } catch { /* storage blocked: keep the default */ }
  const show = () => btn.setAttribute('aria-pressed', String(on));
  show();
  btn.addEventListener('click', () => {
    on = !on;
    show();
    try { localStorage.setItem('plaza.washes', on ? 'on' : 'off'); } catch { /* fine, just not remembered */ }
  });

  let color = null, amount = 0;
  return function update(dt) {
    // which district, and how strongly
    let want = null, k = 0;
    if (game.room) { want = game.room.id; k = 1; } else {
      let best = NEAR;
      for (const b of buildings) {
        const d = b.userData.door.distanceTo(me.position.clone().setY(0));
        if (d < best) { best = d; want = b.userData.district; }
      }
      k = want ? 1 - best / NEAR : 0;
    }
    if (!on || game.editing) k = 0;
    // fade out before changing color, then fade in
    const target = want === color ? k * STRENGTH : 0;
    amount += (target - amount) * Math.min(1, dt * 2.5);
    if (amount < 0.01 && want !== color) { color = want; if (color) el.style.setProperty('--wash', STAMPS[color]); }
    el.style.opacity = amount.toFixed(3);
  };
}
