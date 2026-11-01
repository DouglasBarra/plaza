# Plaza

A personal life app shaped like a small hand-drawn town square. Each building on the plaza is a district of life (ToDos in the town hall, Finance in the bank, Study in the library, Ideas in the lighthouse workshop, Projects at the Works and People at the post office), and walking into one opens that district's app.

The square is a U open to the south, all at real size: the town hall at its head, the post office and the library down the west side, the Works and the bank down the east, and the lighthouse in the south-east corner, every one of them facing the fountain. Streets come in from the south, east and west, and stone walks lead from the fountain to every door.

The look is ink on paper: dense line-art details in the spirit of Hidden Folks, on shaded 3D dioramas like TOEM. Color is rare and appears only as small stamps where a district speaks. The full visual language lives in the Plaza design system.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. This starts Plaza's own small server (`server/`), which serves the page through Vite and keeps your data in `data/plaza.db`, a SQLite file on this Mac. To run the built app instead, use `npm start` (http://localhost:4174). Both need Node 22 or later and only listen on this computer.

Your data is the `data/` folder: back it up or copy it to move Plaza to another Mac. Data saved in the browser before the server existed is moved over the first time the page loads with the server running, and the browser keeps a copy of everything as a fallback. Without the server (for example `vite preview`), Plaza still works from that browser copy.

## Connect your banks

The Finance district (the bank) reads your Brazilian bank accounts through [Banco MCP](https://banco.mcp.ai), which uses Open Finance Brasil. It can only read: there's no way to move money from Plaza.

1. Run Plaza (`npm run dev`) and open **Finance** (press <kbd>2</kbd>).
2. **Log in to Banco** takes you to mcp.ai, then back to Plaza.
3. **Connect a bank** opens Banco's page, where you give each bank its Open Finance consent. Then press **Sync**.

Plaza's server does the talking (`server/finance.js`, through `server/mcp.js`): the login is kept in `data/plaza.db` and never reaches the page. It syncs accounts, a year of transactions and card bills into the same file when you press Sync. Every Banco call counts against your mcp.ai plan (the free one has 10 questions), so it doesn't sync on its own; set `FINANCE_SYNC_HOURS` to sync on a timer. Set `BANCO_MCP_URL` to use another Banco address.

## Connect your chats

The People district (the post office) shows your WhatsApp and LinkedIn chats: who's waiting on you, who you talked to lately, and one-on-one chats that have gone quiet for three weeks or more. You can read a chat and answer it from there. It reads them through [Beeper Desktop](https://www.beeper.com), which runs on this Mac and connects to each network.

1. Install Beeper Desktop, add WhatsApp and LinkedIn to it, and turn on **Settings → Developers → Beeper Desktop API**.
2. Run Plaza and open **People** (press <kbd>6</kbd>). **Connect Beeper** asks you to approve Plaza in Beeper, then comes back.

Beeper has to stay open. Plaza's server does the talking (`server/people.js`, through `server/mcp.js`): the login is kept in `data/plaza.db`, the chats stay in Beeper and aren't copied, Plaza never marks a chat read, and it only sends when you press Send. Set `BEEPER_URL` if Beeper's API isn't at `http://localhost:23373`.

## Test it

End-to-end tests drive the real app in Chromium with [Playwright](https://playwright.dev). They build the app, serve it with `vite preview`, and play it: the dock and shortcuts, walking into the town hall, the clerk's typewriter, tearing a note off the board, an empty lot, and the ToDos app itself.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # headless
npm run test:e2e:ui               # watch and debug in Playwright's UI
```

Tests live in `e2e/`. They run without Plaza's server, so each one starts from an empty browser (no saved tasks) and fails on any page error. They build with `--mode test`, which keeps the `window.__plaza` dev handle (left out of real builds) so a test can put you at a door or a desk instead of walking there. Headless Chromium has no GPU, so the scene is software-rendered: tests open the app with `?lowpower` (smaller shadow map, no MSAA) and run one at a time. CI runs them on every pull request (`.github/workflows/e2e.yml`) and keeps the HTML report as an artifact.

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
| `src/plaza/` | The plaza: its layout (`index.js`), buildings, props, the fountain (`fountain.js`), the food truck corner (`foodtruck.js`), and animals (`critters.js`) |
| `src/interiors/` | The rooms inside each building: the library and workshop, the two-story bank (`bank/`: a banking hall with a gallery, where the vault, boards, dials, ticker and ledgers show your Finance data and the courier runs Sync), and the two-story town hall (`townhall/`: the house itself, each floor's furnishings, task boards and calendar, fireplace and lamps, and the dimensions it shares inside and out) |
| `src/town/` | Everything outside the plaza: the streets (`streets.js`, `streetscape.js`), the houses (`houses.js`) with windows you can see into (`windows.js`) and their line art (`art.js`), merged geometry (`bag.js`), chimney smoke and washing (`motion.js`), cars, trams and walkers (`traffic.js`), the mountains (`mountains.js`), clouds and birds (`sky.js`) |
| `src/ink.js` | The ink look: stepped gray shading and the hand-drawn outline pass |
| `src/textures.js` | Line-art textures (bricks, shingles, paving…) drawn on canvas at load |
| `src/kit.js`, `src/details.js`, `src/decor.js` | Building blocks: materials and shapes, windows, doors and signs, furniture |
| `src/folks.js`, `src/life.js`, `src/finds.js` | Folks and their poses, small motion (smoke, swaying, lamps), the hidden finds |
| `src/avatar.js` | You: walking, collisions, doors |
| `src/districts/` | Each district's app: ToDos (`todos.js`), Finance (`finance.js`) and People (`people.js`) are real, the rest show sample data |
| `server/` | Plaza's server on this Mac: serves the page and keeps your data in SQLite (`db.js`), logs in to remote MCP servers (`mcp.js`) syncs your banks from Banco for Finance (`finance.js`) and reads your chats from Beeper for People (`people.js`) |
| `src/store.js` | Saving district data: on the server, with a copy in the browser |
| `src/layout.js`, `src/layout.json` | Movable pieces and where the layout editor (`src/app/editor.js`) put them |
| `src/models.js` | Swapping code-built objects for hand-made Blender or Blockbench models (see `public/models/README.md`) |
| `tools/` | Model starters and the Blender script (`tools/blender/plaza.py`) |