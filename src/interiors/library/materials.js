// Materials shared by the library's pieces. Paper and ink, like everywhere
// on the plaza: the district's blue shows up only where the room speaks about
// your reading — the ribbons in the books, the bookmarks, the date stamp's
// pad and the mark it leaves.
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { lineArtCanvas, inkLine, LINE_ART_SIZE as S } from '../../textures.js';
export { dark, lampOn, flameA, flameB } from '../townhall/materials.js';

// Parquet: half-metre squares of four slats, each square laid the other way,
// the way a reading-room floor is. One tile is a metre, so two squares a side.
export const parquet = toon('#ffffff', lineArtCanvas((g) => {
  const h = S / 2;
  for (const [qx, qy] of [[0, 0], [h, 0], [0, h], [h, h]]) {
    const across = ((qx + qy) / h) % 2 === 0;
    g.lineWidth = 4;
    inkLine(g, qx, qy, qx + h, qy, 1);
    inkLine(g, qx, qy, qx, qy + h, 1);
    g.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      const k = qy + (i * h) / 4, j = qx + (i * h) / 4;
      if (across) inkLine(g, qx, k, qx + h, k, 1.2); else inkLine(g, j, qy, j, qy + h, 1.2);
    }
  }
}));

// Brass for the rails, the lamps and the drawer pulls: a warm light gray.
export const brass = toon('#d6d2c4');
// The stove's cast iron, and the leather on the table top.
export const iron = toon('#9c9c99');
export const hide = toon('#e9e6de');
// Cushions and the window seat: a touch lighter than the walls.
export const cloth = toon('#f6f6f2');
// Tin lamp shades: you see the inside of them as well as the outside.
export const shadeMat = toon('#3a3a3a');
shadeMat.side = THREE.DoubleSide;

// Glass you see through: the hourglass, the stove's little window.
export const clearGlass = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false });
// Sand in the hourglass.
export const sand = toon('#e2ded0');
// The shafts of light from the windows, and the dust turning over in them.
export const sunbeam = new THREE.MeshBasicMaterial({ color: '#fff4d6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
export const dustMote = new THREE.MeshBasicMaterial({ color: '#fff8e4', transparent: true, opacity: 0, depthWrite: false });
