// What's going on right now. The app's modules share this one object
// instead of passing it around.
export const game = {
  theme: 'day',          // 'day' or 'night'
  view: 'third',         // 'third' or 'first' person
  room: null,            // null on the plaza, else the interior you're in
  appOpen: null,         // the open card: a district id, 'finds', 'note' or 'typewriter'
  focused: null,         // the building (without an inside yet) the camera is looking at
  transitioning: false,  // fading into or out of a building
  action: null,          // what pressing E would do right now: { label, run }
  editing: false,        // the layout editor is on (development only)
};
