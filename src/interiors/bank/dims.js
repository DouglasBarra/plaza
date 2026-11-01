// The bank's shared dimensions. The outside (plaza/buildings.js) and the
// inside (interiors/bank/) are both built from these, like the town hall:
// the same size, the same windows in the same places, one door.
//
// Room coordinates as in the town hall: x left-right, z front-back (+z is
// the front, where the door is), y up from the banking hall's floor. Walls
// are T thick and sit just outside W x D.
//
// Inside it's a banking hall two stories high: a gallery runs along the
// back and the left wall upstairs, around an open atrium under the dome, and
// the stairs climb the right wall to it.
export const W = 12, D = 10, T = 0.3;
export const F = 4.6;       // the gallery's floor
export const TOP = 8.8;     // the ceiling
export const PODIUM = 1.0;  // the hall stands on a podium this high

// The door: tall and double, as banks have.
export const DOOR = { w: 1.8, h: 3.0 };
export const DOOR_HOLE = { c: 0, y: DOOR.h / 2, w: DOOR.w, h: DOOR.h };

// Tall windows below, shorter ones up in the gallery. No windows in the
// back wall downstairs: the vault is there.
const low = (c) => ({ c, y: 2.4, w: 1.3, h: 2.6 });
const up = (c) => ({ c, y: F + 2.1, w: 1.3, h: 2.0 });
export const HOLES = {
  front: { lower: [low(-3.7), low(3.7)], upper: [up(-3.7), up(0), up(3.7)] },
  back:  { lower: [],                    upper: [up(-3.7), up(3.7)] },
  left:  { lower: [low(-2.4), low(2.4)], upper: [up(-2.4), up(2.4)] },
  right: { lower: [low(-2.4), low(2.4)], upper: [up(-2.4), up(2.4)] },
};

// The gallery upstairs: a strip along the back wall and one along the left.
export const GALLERY = { back: -2.0, left: -3.0 }; // its inner edges: z of the back strip, x of the left strip

// The stairs along the right wall, rising toward the back, onto the back strip.
export const STAIR = { x0: 4.4, x1: 5.9, zBottom: 3.0, zTop: GALLERY.back };

// The skylight in the ceiling under the dome, over the middle of the atrium.
export const OCULUS = { x: 0.6, z: 1.2, r: 1.6 };
