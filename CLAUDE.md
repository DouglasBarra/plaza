# Plaza

A personal life app shaped like a hand-drawn town square (three.js + Vite, no framework). Each building is a district of life; walking in opens its app. The README explains what it does and how it's built: read it before a big change.

## The look

- Ink on paper: line art on shaded 3D dioramas, in the spirit of Hidden Folks and TOEM. Shading is stepped gray (`src/ink.js`), outlines are the hand-drawn pass, textures are line art drawn on canvas (`src/textures.js`).
- **Color is rare.** It appears only as small stamps where a district speaks, using that district's color from `src/kit.js` (`stamp.todo`, `stamp.finance`, …). Everything else is `M.white`, `M.planks` and the other inked materials. Never add a colored surface "to make it pop".
- Everything is at real size, in meters. The first-person eye height is 1.7 m.
- Visuals come before speed: the user runs this on a fast Mac, so don't simplify geometry or effects for performance.

## Rules of the code

- **The browser never sees a secret.** API keys and logins (Anthropic, MCP OAuth tokens) live on the server (`server/`), in `.env` or the `secrets` table of `data/plaza.db`. The page only calls `/api/...` on localhost.
- Other services come in through `server/mcp.js` (`mcpConnection`): the user logs in once in the browser, and the server keeps the tokens. Banco (`server/finance.js`) and Beeper (`server/people.js`) are the examples to copy.
- Anything that changes the user's data or the outside world (sending a message, finishing a task) happens only after the user presses a button. Claude in the game (`server/claude.js`) **proposes** changes and the page asks before making them. Plaza never marks chats read and has no way to move money.
- District data that belongs to Plaza is saved with `createStore(key, initial)` from `src/store.js`. Keys look like `plaza.<district>.v1`. Data synced from elsewhere gets its own table in `server/db.js` and never goes out through `/api/stores`.
- Movable things are registered with `piece()` / `placeable()` from `src/layout.js`, and the layout editor saves their spots to `src/layout.json`. Commit that file; don't hand-edit positions it already holds.
- Plain modern JavaScript (ES modules), two-space indents, single quotes. Comments are short sentences in plain English that say what something is or why, the way the existing files do. Each file starts with a comment saying what it is.
- District CSS classes use a short prefix per district (`td-` ToDos, `fi-` Finance, `pe-` People) and the design tokens in `src/style.css` (`--ink`, `--surface`, `--space-*`, `--font-hand`…).

## Running and testing

- `npm run dev` starts Plaza's server with Vite at http://localhost:5173 (the `plaza` entry in `.claude/launch.json`).
- `npm run test:e2e:changed` runs the Playwright specs touched since `main`, quietly. `npm run test:e2e` runs them all. Run the relevant specs before saying a change works.
- Tests open `/?lowpower`, run without the server (empty browser, no saved data) and fail on any console error. `window.__plaza` (`src/app/devtools.js`) lets a test stand somewhere, set the clock or open a room instead of walking there; helpers are in `e2e/fixtures.js`.
- `window.__plaza` exists only in dev and test builds. Never rely on it in app code.

## Commits

Subject in the imperative, plain English, saying what the user gets ("Connect People to WhatsApp and LinkedIn through Beeper Desktop"). A series on one area may start with that area ("Sound: real footsteps"). The body explains what changed and why in short paragraphs. Update the README when a feature, setting or control changes.

## Skills

- `add-district` (`.claude/skills/add-district/`): turning one of the sample districts (Study, Ideas, Projects) into a real one, or adding a new one.
