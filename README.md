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

Your data is the `data/` folder: back it up or copy it to move Plaza to another Mac. Data saved in the browser before the server existed is moved over the first time the page loads with the server running, and the browser keeps a copy of everything as a fallback. Without the server (for example `vite preview`), Plaza still works from that browser copy, and anything you change there is kept: both copies record when they were last written, and the newer one wins the next time the page loads.

## Connect your banks

The Finance district (the bank) reads your Brazilian bank accounts through [Banco MCP](https://banco.mcp.ai), which uses Open Finance Brasil. It can only read: there's no way to move money from Plaza.

1. Run Plaza (`npm run dev`) and open **Finance** (press <kbd>2</kbd>).
2. **Log in to Banco** takes you to mcp.ai, then back to Plaza.
3. **Connect a bank** opens Banco's page, where you give each bank its Open Finance consent. Then press **Sync**.

Plaza's server does the talking (`server/finance.js`, through `server/mcp.js`): the login is kept in `data/plaza.db` and never reaches the page. It syncs accounts, a year of transactions and card bills into the same file when you press Sync. Every Banco call counts against your mcp.ai plan (the free one has 10 questions), so it syncs once right after you log in and then only when you press **Sync**; set `FINANCE_SYNC_HOURS` to also sync on a timer. Set `BANCO_MCP_URL` to use another Banco address.

## Talk to the folks

The town hall's clerk and the bank's teller and manager answer through Claude (`server/claude.js`). Walk up to one and press **T**. They can look up your tasks and your money ("how much did I spend on food this month?"). When you ask for a change ("add a task for Friday"), they propose it and you confirm with a button before anything changes.

It needs an Anthropic API key, kept on the server and never sent to the page. Put it in a `.env` file at the project's root (git ignores it), then restart Plaza:

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
```

Folks keep hours: the clerk works 8 to 6, the bank 9 to 5. Outside them you can still press **T** to leave a note.

## Connect your chats

The People district (the post office) shows your WhatsApp and LinkedIn chats: who's waiting on you, who you talked to lately, and one-on-one chats that have gone quiet for three weeks or more. You can read a chat and answer it from there. It reads them through [Beeper Desktop](https://www.beeper.com), which runs on this Mac and connects to each network.

1. Install Beeper Desktop, add WhatsApp and LinkedIn to it, and turn on **Settings → Developers → Beeper Desktop API**.
2. Run Plaza and open **People** (press <kbd>6</kbd>). **Connect Beeper** asks you to approve Plaza in Beeper, then comes back.

Beeper has to stay open. Plaza's server does the talking (`server/people.js`, through `server/mcp.js`): the login is kept in `data/plaza.db`, the chats stay in Beeper and aren't copied, Plaza never marks a chat read, and it only sends when you press Send. Set `BEEPER_URL` if Beeper's API isn't at `http://localhost:23373`.

## Test it

End-to-end tests drive the real app in Chromium with [Playwright](https://playwright.dev). They build the app, serve it with `vite preview`, and play it: the dock and shortcuts, the walks that join the fountain to every door, walking into each building and using the rooms inside, the clerk's typewriter, tearing a note off the board, and the ToDos app itself. They open the page with `?lowpower`, which draws the scene 12 times a second with smaller shadows; rendering WebGL without a GPU is what makes them heavy.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # headless
npm run test:e2e:ui               # watch and debug in Playwright's UI
npm run test:e2e:quiet            # macOS: on the efficiency cores, so the Mac stays cool (about twice as slow)
npm run test:e2e:changed          # quiet, and only the specs touched since main
```

Tests live in `e2e/`. They run without Plaza's server, so each one starts from an empty browser (no saved tasks) and fails on any page error. They build with `--mode test`, which keeps the `window.__plaza` dev handle (left out of real builds) so a test can put you at a door or a desk instead of walking there. Headless Chromium has no GPU, so the scene is software-rendered: tests open the app with `?lowpower` (smaller shadow map, no MSAA) and run one at a time. CI runs them on every pull request (`.github/workflows/e2e.yml`) and keeps the HTML report as an artifact.

## Arrange things

In development (`npm run dev`), press <kbd>`</kbd> or click **Layout** (top right, next to Night) for the layout editor. Click a piece of furniture or a building and drag it over the floor, nudge it with the arrow keys (Shift for 50 cm, Alt for 1 cm), turn it with <kbd>[</kbd> <kbd>]</kbd>, raise it with Page Up/Down, and press <kbd>R</kbd> to put it back. Ctrl/⌘+S saves to `src/layout.json`, which the game reads, so commit that file. A piece takes its collider and the spot where you use it along, so you never bump into where it used to be.

A piece is anything registered with `piece()` or `placeable()` from `src/layout.js`; its id (like `hall.clock`) is shown in the editor.

## Controls

- **WASD / arrow keys** or **click the ground** to walk
- **Click a building**, or stand at its door and press **E**, to walk inside
- Inside, walk up to the room's board, counter or table and press **E** to open that district's app; stand on the doormat and press **E** to leave
- **1–6** open a district's app right away, and switch between them with one already open; **Esc** closes it
- **Drag** to look around, **scroll** to zoom out over the town
- **T** talks to someone standing near you (see above)
- **C** turns the color washes on and off: a faint watercolor tint at the screen's edges in the color of the district you're in or near
- **M** turns the sound on and off; the **Sound** button opens its volume sliders (ambience and effects)
- **F** opens the finds: the little things hidden around the town, and which ones you've spotted
- **L** turns the wobbly lines on and off: the hand-drawn jitter in the outlines
- **N** turns night on and off
- **V** switches to first person: the mouse looks around (click to capture it, **Esc** frees it), and a click does what **E** does

## Walk inside

Every building is a room you can walk into, and each one shows that district's data as things rather than lists. Each has a station or two — a board, a counter, a bench — that opens the district's app, and most have someone to talk to who keeps their own hours.

- **The town hall** (ToDos): hover a note on the board to read it, click it to open it, and tear it off to finish it. Ask the clerk at the desk to type a new task. The stairs go up to the calendar, what's coming up and the archive.
- **The bank** (Finance): a banking hall two stories high. The vault stands open with as much gold as you have cash, the split-flap board over it shows your cards, a dial per card reads its limit, the ticker prints your latest transactions, and the courier's pneumatic tube fetches news from your banks. Upstairs, a ledger per account and a drawer of statements for every month.
- **The library** (Study): your reading list is the furniture. Each thing you're reading sits on the long table as its own object — a book open at the page you reached with a ribbon on it, a tray holding one card for every flashcard left, a closed book with a slip saying the day it's wanted — and the same list is filed in the card catalogue. The librarian paces the stacks from 9 to 8 and names whatever you left half finished. Press the date stamp at the counter for a slip, or spin the globe by the window.
- **The post office** (People): a sorting office. A hole in the rack on the back wall belongs to everyone you talk to, with their name on the shelf under it, and a letter stands in every hole somebody is waiting in. The scale on the counter weighs the day's post, the wire trays hold what's come in and what's been dealt with, and a dusty shelf in the corner keeps a tied bundle for every chat gone quiet. The postmaster is behind the grille from 8 to 4 and tells you who wrote; the bell at the parcels end asks Beeper for the post again. Without the server the office is simply shut, and the chalk board says why.
- **The lighthouse workshop** (Ideas): the keeper's hut, with the tower built into its corner. Every idea is a note on the wall in its own words and dated, string running from pin to pin, the newest still curling off the cork. The bench has a lighthouse half built on it, and the chalkboard can be rubbed out and drawn again. The spiral stair climbs the tower to the lamp room, where the lens turns on its pedestal, the keeper's log holds the same ideas written up in order, and the clockwork's weight sinks down the well until you wind it back up. The keeper is always in.
- **The Works** (Projects): a brick shop floor under three sawtooth teeth of glass, which drop their north light in bands across the concrete as the day goes by. There's a bay for every project in the order your card lists them, each at its own stage — clamped and half built, or under a dust sheet with the finished piece set aside on the done shelf — and a slate by the door with the lot chalked up. Behind the bays a lathe, a grindstone and a flywheel run off one line shaft, with a lever to throw them in and out of gear, and the forge feeds the smokestack you see from the square. The foreman keeps early hours, 7.30 to 5.

## The plaza lives

- **Weather follows your week:** sunny when you're on top of things, clouds when something's due, a drizzle of hatched ink when tasks are overdue, money runs out faster than it comes in, or a card bill is close, and rain when it's a lot. The line under the greeting says why. Click it for the real weather outside instead (your browser asks for your location once; the forecast comes from [Open-Meteo](https://open-meteo.com), no key needed); click again to go back.
- **A lamplighter** lights the street lamps one by one at dusk.
- **Folks keep hours:** the clerk, the teller and the manager walk in and out of the square at the start and end of their day, and the postman walks his rounds from 8 to 4.
- **Animals:** pigeons scatter as you walk through, a dog follows you for a while, and ducks paddle in the fountain.
- **Going in and out** of a building, an ink blot wipes the screen.

## How it's built

Three.js with Vite, no framework yet.

| Folder / file | What it does |
|---|---|
| `src/main.js` | Starts the app and runs the frame loop |
| `src/sound/` | Sound, drawn in code with Web Audio (all but the dog, a recording in `public/sounds/`): the engine and its buses (`engine.js`), the one-shots like paper, chimes and creatures (`voices.js`), the ambience outside and in each room (`beds.js`), and `sfx()` for the rest of the app (`index.js`) |
| `src/app/` | The game shell: renderer and camera (`engine.js`, `camera.js`), going in and out of buildings (`rooms.js`), the plaza through the windows (`window-view.js`), what's under the pointer (`picking.js`), what E does (`actions.js`), mouse and keys (`input.js`), shared state (`state.js`), the weather (`weather.js`) and the dev console handle (`devtools.js`) |
| `src/ui/` | Everything drawn in HTML over the scene: the card that districts open in (`card.js`), the town hall's note and typewriter cards (`hall-cards.js`), the finds list, building signs, speech bubbles, talking with folks (`chat.js`), the color washes (`washes.js`) and the Day/Night and Wobbly lines buttons |
| `src/plaza/` | The plaza: its layout (`index.js`), buildings, props, the fountain (`fountain.js`), the food truck corner (`foodtruck.js`), animals (`critters.js`, `animals.js`), the lamplighter (`lamplighter.js`) and the folks who keep hours (`routines.js`) |
| `src/interiors/` | The rooms inside each building, one folder each, with what they share in `common.js`: the two-story town hall (`townhall/`: the house itself, each floor's furnishings, task boards and calendar, fireplace and lamps, and the dimensions it shares inside and out), the two-story bank (`bank/`: a banking hall with a gallery, where the vault, boards, dials, ticker and ledgers show your Finance data and the courier runs Sync), the library (`library/`: the stacks, the catalogue and your reading list as objects on the table), the post office (`postoffice/`: the counter, the pigeonhole rack and the trays your chats fill), the Works (`works/`: the sawtooth roof's light, a bay per project and the line shaft), and the lighthouse workshop (`workshop/`: the idea wall, and the stair up to the lamp room in `lamproom.js`) |
| `src/town/` | Everything outside the plaza: the streets (`streets.js`, `streetscape.js`), the houses (`houses.js`) with windows you can see into (`windows.js`) and their line art (`art.js`), merged geometry (`bag.js`), chimney smoke and washing (`motion.js`), cars, trams and walkers (`traffic.js`), the mountains (`mountains.js`), clouds and birds (`sky.js`) |
| `src/ink.js` | The ink look: stepped gray shading and the hand-drawn outline pass |
| `src/textures.js` | Line-art textures (bricks, shingles, paving…) drawn on canvas at load |
| `src/kit.js`, `src/details.js`, `src/decor.js` | Building blocks: materials and shapes, windows, doors and signs, furniture |
| `src/folks.js`, `src/life.js`, `src/finds.js` | Folks and their poses, small motion (smoke, swaying, lamps), the hidden finds |
| `src/avatar.js` | You: walking, collisions, doors |
| `src/districts/` | Each district's app: ToDos (`todos.js`), Finance (`finance.js`) and People (`people.js`) are real, the rest show sample data |
| `server/` | Plaza's server on this Mac: serves the page and keeps your data in SQLite (`db.js`), logs in to remote MCP servers (`mcp.js`), syncs your banks from Banco for Finance (`finance.js`), reads your chats from Beeper for People (`people.js`), and lets the folks answer through Claude (`claude.js`) |
| `src/store.js` | Saving district data: on the server, with a copy in the browser |
| `src/layout.js`, `src/layout.json` | Movable pieces and where the layout editor (`src/app/editor.js`) put them |
| `src/models.js` | Swapping code-built objects for hand-made Blender or Blockbench models (see `public/models/README.md`) |
| `tools/` | Model starters and the Blender script (`tools/blender/plaza.py`) |

## Credits

- The dog's bark is ["Barking of a dog"](https://commons.wikimedia.org/wiki/File:Barking_of_a_dog.ogg) by Amada44, from Wikimedia Commons, under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) (`public/sounds/dog-bark.ogg`, unchanged).
- Every other sound is drawn in code.
