// The town hall's shared dimensions. The outside (world.js) and the inside
// (townhall.js) are both built from these, so what you see from the plaza is
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
export const HOLES = {
  front: { lower: [{ c: -3.4, y: 2.2, w: 1.3, h: 1.7 }, { c: 3.4, y: 2.2, w: 1.3, h: 1.7 }],
           upper: [{ c: -3.4, y: F + 2.0, w: 1.3, h: 1.6 }, { c: 3.4, y: F + 2.0, w: 1.3, h: 1.6 }] },
  back:  { lower: [{ c: -4.4, y: 2.2, w: 1.3, h: 1.7 }], upper: [{ c: 5.1, y: F + 2.0, w: 1.1, h: 1.5 }] },
  left:  { lower: [{ c: -3.3, y: 2.2, w: 1.3, h: 1.7 }, { c: 3.4, y: 2.2, w: 1.3, h: 1.7 }],
           upper: [{ c: 3.4, y: F + 2.0, w: 1.3, h: 1.6 }] },
  right: { lower: [{ c: 3.3, y: 2.2, w: 1.3, h: 1.7 }], upper: [{ c: 0.5, y: F + 2.0, w: 1.3, h: 1.6 }] },
};

// The doorway as a hole in the front wall.
export const DOOR_HOLE = { c: 0, y: DOOR.h / 2, w: DOOR.w, h: DOOR.h };
