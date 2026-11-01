// Materials shared by the bank's pieces. Like everywhere on the plaza:
// white and gray surfaces with ink lines, and the district's green only in
// small places (the bankers' lamps, the ledger ribbons, the vault's wheel).
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { lineArtCanvas, inkLine, LINE_ART_SIZE as S } from '../../textures.js';
export { dark, lampOn, flameA, glassDay, glassNight } from '../townhall/materials.js';

// Marble floor: half-meter squares, the dark ones hatched, the light ones
// with a vein here and there. One tile is a meter, so two squares a side.
let seed = 3;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const marble = toon('#ffffff', lineArtCanvas((g) => {
  const h = S / 2;
  g.lineWidth = 3;
  for (const [x, y] of [[0, 0], [h, h]]) {               // the two dark squares
    for (let k = -h; k < h; k += 16) inkLine(g, x + Math.max(0, k), y + Math.max(0, -k), x + Math.min(h, h + k), y + Math.min(h, h - k), 0.6);
  }
  g.lineWidth = 4;
  inkLine(g, 0, 2, S, 2, 0.8); inkLine(g, 0, h, S, h, 0.8);   // the joints
  inkLine(g, 2, 0, 2, S, 0.8); inkLine(g, h, 0, h, S, 0.8);
  g.lineWidth = 2;
  for (const [x, y] of [[h, 0], [0, h]]) {               // veins in the light ones
    const x0 = x + 20 + rand() * 60, y0 = y + 20 + rand() * 40;
    inkLine(g, x0, y0, x0 + 40, y0 + 30, 3); inkLine(g, x0 + 40, y0 + 30, x0 + 70, y0 + 44, 3);
  }
}));

// Polished stone for the counter tops, the columns and the dado: plain, lighter than walls.
export const polished = toon('#f4f4f0');
// Brass, in the ink world: a warm light gray.
export const brass = toon('#d6d2c4');
// The vault's steel.
export const steel = toon('#b9bcbf');
// The green-shaded bankers' lamps, glowing at night.
export const lampShade = toon('#1fcf6a');
export const gold = toon('#e8d27a');
// The dark inside of the vault and the tube.
export const shadowMat = new THREE.MeshBasicMaterial({ color: '#2a2a2a' });
