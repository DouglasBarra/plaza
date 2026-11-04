// Materials for the Works. Like everywhere on the plaza: white and gray
// surfaces with ink lines, and the Projects pink only in small stamps (a bay
// card's dot, the paint mark on a finished piece, a tick on the job board).
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { lineArtCanvas, inkLine, LINE_ART_SIZE as S } from '../../textures.js';
// the ink world's fire and lamplight, the same as the town hall's hearth
export { dark, lampOn, flameA, flameB } from '../townhall/materials.js';

// The shop floor: a concrete slab ruled into metre squares, with a crack and
// a few chips where things have been dropped on it.
export const concrete = toon('#ffffff', lineArtCanvas((g) => {
  g.lineWidth = 4;
  inkLine(g, 0, 3, S, 3, 1.2);
  inkLine(g, 3, 0, 3, S, 1.2);
  g.lineWidth = 3;
  inkLine(g, 148, 36, 192, 94, 2.6);
  inkLine(g, 192, 94, 176, 152, 2.6);
  g.lineWidth = 2;
  for (const [x, y] of [[58, 178], [94, 206], [124, 62], [208, 198], [36, 108]]) inkLine(g, x, y, x + 8, y + 5, 1);
}));

// Cast iron for the machines, and the steel of the roof's glazing frames.
export const iron = toon('#b9bcbf');
export const steel = toon('#d6d2c4');

// The glass in the sawtooth: you look up through it, so it is a thin wash of
// white rather than the dark fill the side windows get.
export const glazing = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });

// The flat belts from the line shaft: stitches across the leather, so they
// read as running when the shop is in gear.
export const belt = toon('#ffffff', lineArtCanvas((g) => {
  g.lineWidth = 4;
  for (let y = 8; y < S; y += 36) inkLine(g, S * 0.22, y, S * 0.78, y, 1.4);
  g.lineWidth = 3;
  inkLine(g, S * 0.12, 0, S * 0.12, S, 1);
  inkLine(g, S * 0.88, 0, S * 0.88, S, 1);
}));

// Sacking for the dust sheets: a loose weave, so a covered bay reads as cloth.
export const canvasCloth = toon('#ffffff', lineArtCanvas((g) => {
  g.lineWidth = 3;
  for (let k = 0; k < S; k += 42) { inkLine(g, k, 0, k, S, 2); inkLine(g, 0, k, S, k, 2); }
}));
