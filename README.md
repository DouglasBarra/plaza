# Plaza

A personal life app shaped like a small hand-drawn town square. Each building on the plaza is a district of life (ToDos in the town hall, Finance in the bank, Study in the library, Ideas in the lighthouse workshop, Projects at the Works and People at the post office), and walking into one opens that district's app.

The square is a U open to the south, all at real size: the town hall at its head, the post office and the library down the west side, the Works and the bank down the east, each turned toward the opening, and the lighthouse in the south-east corner. Streets come in from the south, east and west, and stone walks lead from the fountain to every door.

The look is ink on paper: dense line-art details in the spirit of Hidden Folks, on shaded 3D dioramas like TOEM. Color is rare and appears only as small stamps where a district speaks. The full visual language lives in the Plaza design system.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Test it

End-to-end tests drive the real app in Chromium with [Playwright](https://playwright.dev). They build the app, serve it with `vite preview`, and play it: the dock and shortcuts, walking into the town hall, the clerk's typewriter, tearing a note off the board, an empty lot, and the ToDos app itself.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # headless
npm run test:e2e:ui               # watch and debug in Playwright's UI
```

Tests live in `e2e/`. Each one starts from an empty browser (no saved tasks) and fails on any page error. They build with `--mode test`, which keeps the `window.__plaza` dev handle (left out of real builds) so a test can put you at a door or a desk instead of walking there. Headless Chromium has no GPU, so the scene is software-rendered: tests open the app with `?lowpower` (smaller shadow map, no MSAA) and run one at a time. CI runs them on every pull request (`.github/workflows/e2e.yml`) and keeps the HTML report as an artifact.

## Arrange things

In development (`npm run dev`), press <kbd>`</kbd> or click **Layout** (bottom left) for the layout editor. Click a piece of furniture or a building and drag it over the floor, nudge it with the arrow keys (Shift for 50 cm, Alt for 1 cm), turn it with <kbd>[</kbd> <kbd>]</kbd>, raise it with Page Up/Down, and press <kbd>R</kbd> to put it back. Ctrl/⌘+S saves to `src/layout.json`, which the game reads, so commit that file. A piece takes its collider and the spot where you use it along, so you never bump into where it used to be.

A piece is anything registered with `piece()` or `placeable()` from `src/layout.js`; its id (like `hall.clock`) is shown in the editor.

## Controls

- **WASD / arrow keys** or **click the ground** to walk
- **Click a building**, or stand at its door and press **E**, to walk inside
- Inside, walk up to the room's board, counter or table and press **E** to open that district's app; stand on the doormat and press **E** to leave
- **1–6** open a district's app right away, **Esc** closes it
- **Drag** to look around, **scroll** to zoom out over the town
- In the **town hall** (ToDos): hover a note on the board to read it, click it to open it, and tear it off to finish it. Ask the clerk at the desk to type a new task. Take the stairs up for the calendar, what's coming up and the archive
- **V** switches to first person: the mouse looks around (click to capture it, **Esc** frees it), and a click does what **E** does

## How it's built

Three.js with Vite, no framework yet.

| Folder / file | What it does |
|---|---|
| `src/main.js` | Starts the app and runs the frame loop |
| `src/app/` | The game shell: renderer and camera (`engine.js`, `camera.js`), going in and out of buildings (`rooms.js`), the plaza through the windows (`window-view.js`), what's under the pointer (`picking.js`), what E does (`actions.js`), mouse and keys (`input.js`), shared state (`state.js`) and the dev console handle (`devtools.js`) |
| `src/ui/` | Everything drawn in HTML over the scene: the card that districts open in (`card.js`), the town hall's note and typewriter cards (`hall-cards.js`), the finds list, building signs, speech bubbles and the Day/Night and Wobbly lines buttons |
| `src/plaza/` | The plaza: its layout (`index.js`), buildings, props, and animals |
| `src/interiors/` | The rooms inside each building: the bank, library and workshop, and the two-story town hall (`townhall/`: the house itself, each floor's furnishings, task boards and calendar, fireplace and lamps, and the dimensions it shares inside and out) |
| `src/town.js` | Everything outside: the endless town, mountains, clouds, birds |
| `src/ink.js` | The ink look: stepped gray shading and the hand-drawn outline pass |
| `src/textures.js` | Line-art textures (bricks, shingles, paving…) drawn on canvas at load |
| `src/kit.js`, `src/details.js`, `src/decor.js` | Building blocks: materials and shapes, windows, doors and signs, furniture |
| `src/folks.js`, `src/life.js`, `src/finds.js` | Folks and their poses, small motion (smoke, swaying, lamps), the hidden finds |
| `src/avatar.js` | You: walking, collisions, doors |
| `src/districts/` | Each district's app (`todos.js` is the first real one) |
| `src/store.js` | Saving district data on this computer |
| `src/layout.js`, `src/layout.json` | Movable pieces and where the layout editor (`src/app/editor.js`) put them |
| `src/models.js` | Swapping code-built objects for hand-made Blender or Blockbench models (see `public/models/README.md`) |
| `tools/` | Model starters and the Blender script (`tools/blender/plaza.py`) |