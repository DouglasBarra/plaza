// The Works' dimensions. The shop floor is one of the plaza's single-storey
// rooms (12 x 10 m, like interiors/common.js), but its roof is its own: three
// sawtooth teeth, each glazed toward the plaza, as on the brick shell you see
// from outside (plaza/buildings.js, works()).
//
// Room coordinates as everywhere: x left-right, z front-back (+z is the
// front, where the sliding door is), y up from the shop floor.
export const W = 12, D = 10, T = 0.3;
export const EAVES = 4.2;              // the wall head, where the roof starts
export const TEETH = 3;
export const TOOTH = D / TEETH;        // one tooth, front to back
export const RISE = 1.6;               // the glazed riser at a tooth's front
export const RIDGE = EAVES + RISE;     // the top of a tooth
// The glazed front edge of tooth i, counting from the plaza.
export const toothFront = (i) => D / 2 - i * TOOTH;
// How high the sloping roof is at z, inside tooth i, and over any spot on
// the floor (which tooth is overhead).
export const roofAt = (i, z) => EAVES + (RISE * (z - (toothFront(i) - TOOTH))) / TOOTH;
export const roofOver = (z) => roofAt(Math.min(TEETH - 1, Math.max(0, Math.floor((D / 2 - z) / TOOTH))), z);

// The sliding door, the loading hatch above it under the hoist, and the
// windows: tall factory lights down both sides, air vents at the back.
export const DOOR = { w: 2.8, h: 3.2 };
export const DOOR_HOLE = { c: 0, y: DOOR.h / 2, w: DOOR.w, h: DOOR.h };
export const HATCH = { c: -3.6, y: 3.45, w: 1.3, h: 1.1 };
const light = (c) => ({ c, y: 2.9, w: 1.2, h: 2.2 });
const vent = (c) => ({ c, y: 3.8, w: 0.9, h: 0.5 });
export const HOLES = {
  front: [DOOR_HOLE, HATCH],
  left: [light(-2.3), light(2.3)],
  right: [light(-2.3), light(2.3)],
  back: [vent(-4.8), vent(1.1)],
};

// A bay per project, in the order the Projects card lists them: the big
// trestles in the middle of the floor first, then the benches down the
// walls. `spot` is where you stand to look one over, `col` what you bump
// into. Each is built in its own coordinates (the bench runs along x, its
// front faces +z) and turned by `rotY`.
export const BAYS = [
  { id: 'trestles', kind: 'trestle', where: 'on the trestles', x: -1.2, z: -0.9, rotY: 0, len: 2.6, scale: 1.45, lamp: [-1.2, 3.2, -0.9], spot: [-1.2, 0.2], col: { hw: 1.5, hd: 0.45 } },
  { id: 'bench-front', kind: 'bench', where: 'on the front bench', x: -5.55, z: 2.3, rotY: Math.PI / 2, len: 2.8, scale: 1, lamp: [-4.9, 2.95, 2.3], spot: [-4.45, 2.3], col: { hw: 0.5, hd: 1.45 } },
  { id: 'bench-back', kind: 'bench', where: 'on the back bench', x: -5.55, z: -2.3, rotY: Math.PI / 2, len: 2.8, scale: 1, lamp: [-4.9, 2.95, -2.3], spot: [-4.45, -2.3], col: { hw: 0.5, hd: 1.45 } },
  { id: 'bench-across', kind: 'bench', where: 'on the bench across the floor', x: 5.55, z: 2.3, rotY: -Math.PI / 2, len: 2.8, scale: 1, lamp: [4.9, 2.95, 2.3], spot: [4.45, 2.3], col: { hw: 0.5, hd: 1.45 } },
];

// The machine bay runs under the line shaft, along the back of the floor.
export const SHAFT = { z: -1.75, y: 3.8, x0: 0.2, x1: 5.9 };
export const LATHE = { x: 3.9, z: -2.1 };
export const GRINDER = { x: 1.6, z: -2.1 };
export const FORGE = { x: 3.6, z: -4.45 };
