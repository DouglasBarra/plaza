// Materials for the sorting office. Like everywhere on the plaza: white and
// gray surfaces with ink lines, and the district's purple only in small
// places (the stamp on a letter, the pins in the notice board, the tag on a
// mail sack).
import * as THREE from 'three';
import { toon } from '../../ink.js';
export { dark, lampOn } from '../townhall/materials.js';

// Scrubbed deal: the counter, the sorting table, the pigeonhole rack.
export const deal = toon('#f6f5f1');
// Brass, in the ink world: a warm light gray. The grille, the scale, the bell.
export const brass = toon('#d9d5c8');
// The enamel lamp shades over the floor, seen from both sides.
export const enamel = toon('#f7f6f2');
enamel.side = THREE.DoubleSide;
// A dust sheet over what nobody has claimed.
export const sheet = toon('#eceae2');
// The inside of a pigeonhole, and the letter slot: deep shadow.
export const hollow = new THREE.MeshBasicMaterial({ color: '#2a2a2a' });
