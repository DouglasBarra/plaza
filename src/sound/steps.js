// Your footsteps, paced like a stroll: one step per stride (about three a
// second walking, four running), left and right a little different, never
// quite on the beat, and now and then one too soft to hear. A step as you
// set off and a softer one as you stop.
//
// The Sound card picks where you hear them: everywhere, indoors only (out on
// the plaza just the setting off and the stopping), or not at all.
import { settings } from './engine.js';

const FLOORS = { todo: 'wood', finance: 'marble' };
const rnd = (a, b) => a + Math.random() * (b - a);

let next = null, wasMoving = false, foot = 0;

export function stepFeet(me, room, sfx) {
  const mode = settings.steps;
  const surface = room ? FLOORS[room.id] || 'wood' : 'stone';
  const quietOutside = mode === 'indoors' && !room;
  const play = (kind) => {
    foot ^= 1;
    const vol = { start: 0.8, stop: 0.55, walk: 1 }[kind] * (me.running ? 1.35 : 1) * rnd(0.8, 1);
    sfx('step', { surface, foot, kind, vol, steps: true });
  };
  const stride = () => (me.running ? 1.5 : 1.1) * rnd(0.92, 1.08);

  if (mode !== 'off') {
    if (me.moving && !wasMoving) { play('start'); next = me.stride + stride(); }
    else if (!me.moving && wasMoving) play('stop');
    else if (me.moving) {
      if (next == null || next - me.stride > 4) next = me.stride + stride();   // you were moved (a door, a room)
      if (me.stride >= next) {
        if (!quietOutside && Math.random() > 0.06) play('walk');
        next = me.stride + stride();
      }
    }
  }
  wasMoving = me.moving;
}
