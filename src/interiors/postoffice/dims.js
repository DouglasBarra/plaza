// The post office's inside measurements, in one place, so the shell, the
// fixtures and the live displays all agree.
//
// Room coordinates as everywhere else: x left-right, z front-back (+z is the
// front, where the door is), y up from the floor. It is the shared
// single-story room (common.js): 12 x 10 m, 4.2 m to the ceiling.
import { W, D, H, T } from '../common.js';

export { W, D, H, T };

// The inner faces of the four walls.
export const BACK = -D / 2, FRONT = D / 2, LEFT = -W / 2, RIGHT = W / 2;

// The counter runs across the room with the public lobby in front of it. It
// stops short of the right wall: that gap, with its gate swung open, is how
// you get through to the sorting floor.
export const COUNTER = {
  x0: LEFT, x1: 1.0,     // from the left wall to here
  z: 1.42, d: 0.78,      // the middle of it, and how deep the counter is
  h: 1.05,               // counter height
  top: 2.42,             // the top rail of the grille
  windows: [-3.4, -0.4], // the two openings in the grille
};
export const FRONT_FACE = COUNTER.z + COUNTER.d / 2;   // the public side of the counter

// The pigeonhole rack on the back wall: a hole per person, eight across and
// four up, each hole sitting on a shelf whose front edge is its name card.
export const RACK = {
  x: -2.4, y0: 0.98, depth: 0.32,
  cols: 8, rows: 4,
  hole: 0.5, high: 0.34,   // one hole's opening
  rib: 0.045, shelf: 0.09, // the uprights between holes, and the shelves under them
};
export const HOLES = RACK.cols * RACK.rows;
export const RACK_W = RACK.cols * RACK.hole + (RACK.cols + 1) * RACK.rib;
export const RACK_H = RACK.rows * RACK.high + (RACK.rows + 1) * RACK.shelf;

// The shelf of what nobody has claimed, in the back right corner: three
// shelves of four slots for the chats that have gone quiet (the server sends
// at most twelve).
export const QUIET = { x: 3.4, w: 4.0, d: 0.5, cols: 4, shelves: [0.5, 1.12, 1.74], top: 2.26 };
export const QUIET_SLOTS = QUIET.cols * QUIET.shelves.length;

// The sorting table out on the floor.
export const TABLE = { x: -1.1, z: -1.8, w: 3.3, d: 1.25, h: 0.9 };
