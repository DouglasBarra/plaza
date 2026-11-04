// The lighthouse workshop's measurements, shared by every piece of it.
//
// Room coordinates as in the other interiors: x left-right, z front-back
// (+z is the front, where the door is), y up from the workshop floor. The
// hut is the usual single-story room (12 x 10 m, walls T thick just outside
// it), and the lighthouse tower is built into its back-left corner: a stone
// drum with an archway into it, a spiral stair, and the lamp room above.
export const W = 12, D = 10, T = 0.3;
export const CEIL = 4.2;          // the hut's ceiling
export const F = 3.6;             // the lamp room's floor, up the tower
export const GLAZE = 4.6;         // where the drum's stone gives way to the lantern's glass
export const TOP = 7.2;           // under the lantern's cap

// The drum, tangent to the back and the left wall, and the archway into it.
export const TOWER = { x: -3.3, z: -2.3, r: 2.6, t: 0.3 };
export const ARCH = { a: 0.9, half: 0.44, h: 2.4 };   // bearing of its middle, half its width, its height
export const CAM = 0.56;          // the bearing the third-person camera looks from

// The stair: one turn of STEPS treads, cantilevered off the drum's wall,
// from the archway up to the lamp room's floor. The middle is left open as
// a well, so the lamp's weight can hang down it on its chain.
export const STEPS = 19;
export const WELL = 0.7;
export const TAU = Math.PI * 2;
export const SPAN = ARCH.half * 2;          // the landing inside the doorway
export const RUN = TAU - SPAN;              // the angle the stair turns through
export const DTH = RUN / STEPS;             // one tread
export const RISE = F / STEPS;              // one riser
export const THETA0 = ARCH.a - ARCH.half;   // the bearing the turn starts from
// The lamp room's floor is the half of the drum over the lower stair; the
// other half is the open well, so there is headroom all the way up.
export const DECK = TAU - 11 * DTH;

// Angles, three.js style: a bearing is atan2(x, z), which is what a cylinder
// or a wedge takes as its thetaStart, so geometry and walking agree.
export const bearing = (x, z) => Math.atan2(x - TOWER.x, z - TOWER.z);
export const radiusAt = (x, z) => Math.hypot(x - TOWER.x, z - TOWER.z);
// How far round the turn a spot is: 0 at the archway's edge, growing with the stair.
export const turnAt = (x, z) => (((bearing(x, z) - THETA0) % TAU) + TAU) % TAU;
export const stairY = (u) => (u <= SPAN ? 0 : (F * (u - SPAN)) / RUN);
// A point on the drum, as [x, z]: `th` round it, `r` out from its middle.
export const at = (th, r) => [TOWER.x + Math.sin(th) * r, TOWER.z + Math.cos(th) * r];
// Is this bearing on the side the third-person camera looks from (and so cut away)?
export const facingCamera = (th) => Math.abs(Math.atan2(Math.sin(th - CAM), Math.cos(th - CAM))) < Math.PI / 2;
