// Materials the workshop shares. Like everywhere on the plaza: white and
// gray surfaces with ink lines, and the district's yellow only in small
// places (the pins on the idea wall, the lamp in the lens, the beam).
import * as THREE from 'three';
import { toon } from '../../ink.js';
import { M } from '../../kit.js';

// The tower's whitewashed stone. Double-sided: the drum is one skin of wall,
// seen from the workshop outside it and from the stair inside.
export const towerStone = toon('#f4f4f0', M.stone.map);
towerStone.side = THREE.DoubleSide;

// The lantern's cap, seen from under it in the lamp room as well as above.
export const capMat = toon('#f4f4f0');
capMat.side = THREE.DoubleSide;

export const iron = toon('#b9bcbf');     // the stair, the lantern's frame, the stove
export const brass = toon('#d6d2c4');    // the lens cage, the clockwork, the telescope
export const dark = toon('#3a3a3a');     // handles, hinges, chalk tray
export const prism = toon('#eef1ee');    // the lens's glass rings

export const lampOn = new THREE.MeshBasicMaterial({ color: '#fff1b8' });
export const flame = new THREE.MeshBasicMaterial({ color: '#ffd21f' });
// See-through things: the lantern's panes and the beam. Both are kept out of
// the outline pass (life.js skipND), so they draw no lines and hide nothing.
export const paneGlass = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
export const beamGlow = new THREE.MeshBasicMaterial({ color: '#ffd21f', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
export const jarGlass = new THREE.MeshBasicMaterial({ color: '#dfe8ee', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
