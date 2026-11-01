// What pressing E (or clicking in first person) does where you stand: go in
// at a door, use a room's board, counter or table, or leave by the doormat.
import { DISTRICTS } from '../districts/index.js';
import { game } from './state.js';
import { me, buildings } from './plaza.js';
import { enterBuilding, exitBuilding } from './rooms.js';
import { openApp } from '../ui/card.js';
import { openTypewriter } from '../ui/hall-cards.js';

// { label, run } or null.
export function findAction() {
  if (game.appOpen || game.transitioning || game.editing) return null;
  const { room } = game;
  const at = me.position.clone().setY(0);
  if (!room) {
    const b = buildings.find((bb) => bb.userData.door.distanceTo(at) < 1.8);
    if (!b) return null;
    const id = b.userData.district;
    return { label: `Enter ${DISTRICTS[id].name}`, run: () => enterBuilding(id) };
  }
  for (const s of room.stations || [room.station]) {
    if ((s.level ?? 0) !== me.level) continue;
    if (s.point.distanceTo(at) < 1.7) return { label: s.label, run: () => useStation(s) };
  }
  if (me.level === 0 && room.exit.distanceTo(at) < 1.3) return { label: 'Back to the plaza', run: () => exitBuilding() };
  return null;
}

function useStation(s) {
  if (s.typewriter) return openTypewriter();
  if (s.use) return s.use();
  openApp(s.app || game.room.id, s.tab ? { tab: s.tab } : {});
}

export function interact() { game.action?.run(); }
