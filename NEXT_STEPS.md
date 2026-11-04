# Next steps

What's left after the round that built the four remaining interiors and rebuilt
the plaza's walks. Ordered by what's worth doing first.

## Look at these in the browser

None of the new rooms has been checked by eye. The end-to-end suite passes and
every room was verified by arithmetic or by a script driving the dev server, but
nobody has stood in them and looked. These are the specific places where a
number can be right and the picture still wrong.

- **The fountain's terrace.** The walks meet the stone ring dead flush (both
  tops at 0.10), but there is still a 6 cm rise from the ring band onto the
  paving inside it, at r = 9.0, all the way round. You now *walk* up it smoothly,
  since `plaza/ground.js` puts you on whatever is under you, so this is only a
  line you can see, not a lip you catch on. Making the terrace one level would
  need the ring rebuilt as an annulus: two coplanar discs at 0.10 would z-fight
  over 254 m².
- **Folks standing on the walks.** You stand on the paving now
  (`plaza/ground.js`, merged from main), but the folks don't: they are placed at
  y = 0, so anyone walking a 0.10 walk is 10 cm into the stone, and the four
  fountain benches and the pigeons have the same trouble on the 0.16 terrace.
  Giving `folks.js` the same `groundAt` the avatar uses would settle all of it.
  Watch the folk whose path runs down the south walk and the dog-walker.
- **The bank's clearances.** 24 cm from the east street walk and 30 cm from the
  lighthouse walk, at its two front corners. Look from the east street mouth.
  Moving `SPOTS.finance` from `[27, 12.5]` to `[27.45, 12.7]` takes them to
  45/51 cm without moving a door or breaking the U.
- **The bank's yard** is now only 0.2 m wider than its podium, so the podium
  rises from a thin ledge. Look at it from the south-east.
- **The town hall's front.** A step that hung 0.55 m past the plinth with air
  under it is gone, and there is a 3.5 m landing against the plinth instead.
- **The library:** the open book's page split and the ribbon on the table, the
  rolling ladder's lean (its sign was wrong once and fixed by arithmetic), the
  dust shafts at midday, and the shelf-mark signs at 3.3 m against the room's
  cornice at 3.96 m.
- **The Works:** the bands of sawtooth light, best in third person near midday.
  They come from invisible shadow casters for the roof, which is the one trick
  in the room and the knob to turn if the diorama looks over-shaded.
- **The workshop:** the third-person framing. The tower's drum runs off the top
  of the frame at the default camera, because `ROOM_VIEW.maxDist` is 26 and the
  room's `cameraOffset` is already at that limit. Also the keeper stands half
  behind her own bench from the default angle.
- **The post office:** whether the pigeonhole name cards read from a metre
  (`RACK.shelf` in its `dims.js` is the card's height), and the lobby's left
  side, which is the emptiest part of the floor.
- **The colour wash** now sits under the HUD (`z-index: 0`) instead of painting
  over the greeting, dock and open card. Check a district card over a busy
  street.

## Code

1. **`src/ui/card.js` isn't a dialog.** No `role="dialog"`, no `aria-modal`, no
   `aria-labelledby` on the title, no focus trap, and `closeApp()` doesn't
   return focus to the dock button that opened it, so a keyboard user leaving a
   district lands at the top of the document. One file, and the biggest
   remaining accessibility gap now that the ToDos and Finance tablists are done.
2. **`src/interiors/bank/index.js`: a UTC/local date bug, one line.**
   `a.due >= new Date().toISOString().slice(0, 10)` — after 21:00 in BRT the
   teller skips a card that is due today. Use `dateKey()` from `src/store.js`,
   as the other places now do.
3. **`server/claude.js`: the same class of bug.** `daysAgo` is UTC while
   `today()` just above it is local, so Claude's finance windows disagree with
   the calendar in the evening, and `recentlyDone` stamps completions in UTC.
   Also worth a comment tying its `PROPOSALS` to `src/ui/chat.js`'s `ACTIONS`:
   nothing makes them stay in step.
4. **`src/districts/people.js` has the tablist gap** that ToDos and Finance no
   longer have: it emits `role="tablist"` with click-only tabs, no
   `aria-controls`, no roving `tabindex`, no arrow keys. The pattern to copy is
   in both of those files.
5. **The generic CSS primitives break the prefix rule.** `.row`, `.box`, `.t`
   and the unprefixed town-hall classes (`.nt`, `.nd`, `.paper-note`, `.tw-*`)
   are shared across districts, and override rules exist purely to undo a
   neighbour's styling. Renaming them spans `people.js`, `card.js`,
   `finds-card.js` and several specs, so do it when nothing else is in flight.
6. **`server/finance.js`, four things left deliberately**, each needing a
   decision about the sync model rather than a patch:
   `bank: bankOf[itemId] || items[0].bank` labels an orphan account with the
   first bank's name; `history` is recorded even when a transaction fetch
   returned nothing, which permanently downgrades that account to the 10-day
   window; `db.bank.clear` clears `item` and `account` but not `tx`, so
   transactions from a disconnected card lose their `CREDIT` classification and
   start counting as money coming in; and `auth()`'s own OAuth HTTP is still
   untimed, the one remaining way a dead upstream can hang a Finance call.
   `server/people.js` takes `limit=200` with no cursor and drops later chats.
7. **The park's three.js primitives carry 0..1 UVs into metre-UV bags**, so one
   stone course wraps the bandstand's 23 m circumference and one water tile
   covers the 6.8 m pond — textures 7–12× too big.
8. **The pond sits on a diagonal path and cannot be moved clear.** The largest
   circle fitting a lawn octant has radius 3.235 m; the pond's rim is 3.68 m.
   Any fix is a look decision: shrink the pond, reroute the diagonals, or add
   stepping stones.

## Sound

**Left alone on purpose** — the sound is not to be changed without asking. These
were found while reading it and are recorded here only so they aren't lost:

- `src/sound/engine.js:62,64`: the Ambience slider doesn't reach the plaza's or
  the rooms' reverb. Both tap `A.dream`, which goes straight to master and
  bypasses `A.amb` sitting downstream, so Ambience at 0 still lets the birds,
  tram and hour bell through. The `A.fx` tap on line 63 *is* post-fader.
- `src/sound/index.js:26`: the Effects slider doesn't reach any positioned
  in-room one-shot. They route to `A.room`, a child of `A.amb`, so the bank's
  tube, split-flap board and vault sound are all on Ambience, which contradicts
  the module's own diagram and the Sound card's labels. Line 27 also ignores
  `dry`, so the dog heard from indoors gets reverb it is built to avoid.
- `src/sound/engine.js:60-61`: effects' echo runs through the Ambience bus, so
  with Effects at 1 and Ambience at 0 the bank's echo on one-shots vanishes, and
  the wet signal is scaled twice.
- Smaller: the hour bell is an effect indoors and ambience outdoors
  (`beds.js:105`); the Sound card's controls never re-read `settings`, so
  toggling from elsewhere leaves the checkbox stale; `A.barks` builds four
  pitches and `voices.js` only indexes three.

## The three districts that are still samples

Study, Ideas and Projects have real rooms now, but their apps are still the
static `sample()` rows in `src/districts/index.js`. Each room reads
`DISTRICTS.<id>.items` and subscribes, so a real app that exposes `items` drives
the furniture with no change to the room. The `add-district` skill
(`.claude/skills/add-district/`) covers the rest.

## Tests

The suite passes. Gaps worth filling: Ctrl/⌘+S in the layout editor (needs
`page.route` to stub `/__plaza/layout`, which only exists in dev, and
`markSaved` mutates the baseline for the rest of the page's life, so it wants
its own test); opening ToDos onto a `startTab`; the Upcoming empty state, the
one empty state never asserted; and the new arrow-key tablist behaviour.

One thing to know when writing a room test: what **E** does is worked out in the
frame loop, and at `?lowpower` a frame is 83 ms, so pressing `e` straight after
`standAt()` uses the previous action. Wait for the prompt first.
