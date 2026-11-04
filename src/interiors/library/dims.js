// The library's shared dimensions: one tall reading room, where its windows
// are, and the places you stand to use the things in it.
//
// Room coordinates as in the other interiors: x left-right, z front-back
// (+z is the front, where the door is), y up from the floor. Walls are T
// thick and sit just outside W x D.
import * as THREE from 'three';

export const W = 12, D = 10, H = 4.2, T = 0.3;
export const BACK = -D / 2 - T / 2, FRONT = D / 2 + T / 2;   // the walls' middles
export const LEFT = -W / 2 - T / 2, RIGHT = W / 2 + T / 2;

export const DOOR = { w: 2.0, h: 2.5 };
export const DOOR_HOLE = { c: 0, y: DOOR.h / 2, w: DOOR.w, h: DOOR.h };

// Tall windows, their sills above the wainscot so a shelf can stand under one.
const win = (c) => ({ c, y: 2.25, w: 1.25, h: 2.3 });
export const HOLES = {
  back: [],                            // the tall stacks are against the back wall
  front: [win(-3.8), win(3.8)],
  left: [win(2.2)],                    // the window seat is under this one
  right: [win(-3.2), win(0.2)],
};

// The stacks: four bays along the back wall, two along the left.
export const BAYS = { back: [-4.9, -2.7, 2.7, 4.9], left: [-3.1, -0.85] };
export const SHELF = { z: -D / 2 + 0.25, x: -W / 2 + 0.25 };   // a bay's middle, 0.5 m deep against its wall

// The rail the rolling ladder runs on, across the two right-hand bays.
export const RAIL = { z: -D / 2 + 0.56, y: 3.05, x0: 1.8, x1: 5.8 };

// Where everything stands, so index.js and fixtures.js agree.
export const AT = {
  table: [-1.0, 0.1],
  catalogue: [0, -D / 2 + 0.4],
  counter: { z: 3.5, x0: 1.4, x1: 5.2 },
  stove: [5.45, -1.2],
  nook: [[3.7, -2.1], [3.7, -0.3]],
  lowTable: [4.6, -1.2],
  trolley: [1.2, 2.5],
  returns: [5.75, 2.4],
  globe: [-4.3, 3.5],
  plant: [-5.2, 4.3],
  seat: [-W / 2 + 0.35, 2.2],
};

// Where you stand to use something (app/actions.js: within 1.7 m).
export const SPOTS = {
  desk: new THREE.Vector3(-1.0, 0, 1.25),       // the reading table, your list on it
  catalogue: new THREE.Vector3(0, 0, -3.7),     // the drawers of cards
  counter: new THREE.Vector3(2.2, 0, 2.5),      // the librarian's counter
  stamp: new THREE.Vector3(4.8, 0, 2.6),        // the date stamp at the counter's end
  globe: new THREE.Vector3(-3.5, 0, 3.2),       // the globe by the window
};
