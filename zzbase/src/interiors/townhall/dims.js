// The town hall's shared dimensions. The outside (plaza/buildings.js) and the
// inside (interiors/townhall/) are both built from these, so what you see from the plaza is
// exactly what you walk into: the same size, two floors, the same windows
// in the same places, and one door size.
//
// Room coordinates: x runs left-right, z front-back (+z is the front, where
// the door is), y up from the ground floor. Walls are T thick and sit just
// outside W x D.
export const W = 12, D = 10, T = 0.3, F = 4.4, TOP = 8.6;

// One door, inside and out.
export const DOOR = { w: 1.5, h: 2.5 };

// Window openings per wall: { c: position along the wall, y: height of the
// center, w, h }. On the front and back walls c is x; on the sides it is z.
// Every window is the same size, 1.3 by 1.7 m, and sits at the same height on
// its own floor (its middle 2.2 m above that floor).
const win = (c, floor) => ({ c, y: (floor ? F : 0) + 2.2, w: 1.3, h: 1.7 });
// Laid out symmetrically, so each side of the building reads as one
// composed façade: a pair on every floor of every side, and a third window
// upstairs on the front, right above the door. 17 windows, inside and out.
export const HOLES = {
  front: { lower: [win(-3.4), win(3.4)],  upper: [win(-3.4, 1), win(0, 1), win(3.4, 1)] },
  back:  { lower: [win(-4.6), win(4.6)],  upper: [win(-4.6, 1), win(4.6, 1)] },
  left:  { lower: [win(-3.4), win(3.4)],  upper: [win(-3.4, 1), win(3.4, 1)] },
  right: { lower: [win(-3.4), win(3.4)],  upper: [win(-3.4, 1), win(3.4, 1)] },
};

// The doorway as a hole in the front wall.
export const DOOR_HOLE = { c: 0, y: DOOR.h / 2, w: DOOR.w, h: DOOR.h };
