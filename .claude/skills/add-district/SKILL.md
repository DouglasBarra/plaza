---
name: add-district
description: Make one of Plaza's districts real, or add a new one. Use when turning a sample district (Study in the library, Ideas in the lighthouse workshop, Projects at the Works) into a working app, connecting a district to an outside service or MCP server, giving a building an interior, station or a folk you can talk to, or adding a seventh building. Also use for "build the Study app", "connect Projects to GitHub", "make the library real".
---

# Adding or making a district real

A district is one area of life: a building on the plaza, a room inside it, and an app that opens in the card. All six buildings already stand. ToDos, Finance and People are real. Study, Ideas and Projects are `sample()` placeholders in `src/districts/index.js`. Making a district real touches several layers. Do them in this order and stop after each one to check it in the browser.

Read `CLAUDE.md` first (the look, secrets, confirm-before-change), and read the real district closest to the new one:
- **Plaza's own data** (tasks, notes, a reading list): `src/districts/todos.js`, which saves with `createStore`.
- **Data from an outside service over MCP**: `src/districts/people.js` + `server/people.js` (read live, nothing copied) or `src/districts/finance.js` + `server/finance.js` (synced into SQLite on demand).

## 1. Decide with the user first

Ask before building:
- What the app is for, and the three or four things it shows. Look at the sample's rows in `src/districts/index.js`: they are what the user imagined.
- Where the data lives: Plaza only, or an outside service. If outside, which one, and whether it's an MCP server (remote with OAuth, or local like Beeper), a plain API, or a local file.
- What the app may change, if anything. Every change needs a button press.

## 2. The app: `src/districts/<id>.js`

Export one object with the shape documented at the top of `src/districts/index.js`:

```js
export const study = {
  id: 'study', name: 'Study', key: '3', title: 'Reading list',
  summary() { return { status: 'Chapter 4 · 40%', count: 0 }; }, // the building's sign
  subscribe(fn) { /* call fn when summary() would change */ return () => {}; },
  mount(el, ctx) { /* draw into el */ return () => { /* clean up */ }; },
  api: { /* functions other parts call: weather, chat proposals, the room */ },
};
```

- Keep the `id`, `key` and `name` the sample had: the dock, the building (`src/plaza/index.js`, `buildings.js`), the washes and the stamp color in `src/kit.js` all use the id.
- Replace the `sample({...})` entry in `DISTRICTS` with the import.
- Plaza's own data: `createStore('plaza.<id>.v1', initial)`. Bump the version only with a migration from the old key.
- Escape everything put into `innerHTML` (copy the `esc` helper).
- `summary().status` is a short line on the sign, in the user's terms ("3 chapters to go"), and `count` is what needs them now.
- Draw every state: loading, server not running (`{ offline: true }`), not connected yet (with numbered steps to connect, like People's Beeper steps), empty, and an error from the service.
- CSS goes in `src/style.css` under a new two-letter prefix (`st-` Study, `id-` Ideas, `pj-` Projects), built from the existing tokens (`--ink`, `--surface`, `--space-*`, `--font-hand`, `--font-mono`, `--stroke-ink`, `--radius-m`). The district's color shows only as a small stamp, never as a background.

## 3. The server side (only for outside data): `server/<id>.js`

- Export a function `(db, ports) => handle`, where `handle(req, res, url, port)` returns true when it answered. Add it to the `districts` array in `server/index.js`.
- Routes live under `/api/<id>`: `GET /api/<id>` (what the app shows), `GET /api/<id>/login` and `POST /api/<id>/logout`, `GET /api/oauth/<name>/callback`, and one route per action.
- MCP servers: `mcpConnection(db, { name, url, scope, ports })` from `server/mcp.js`. It keeps the tokens in the `secrets` table. Ask for the narrowest scope that does the job.
- Settings come from environment variables with a sensible default (`<NAME>_URL`), read from `.env`.
- Synced data that is too big or too private for a store gets its own table in `server/db.js`, like `bank`. It never goes through `/api/stores`.
- Count the outside calls a sync makes. Paid or limited services sync when the user presses Sync, not on a timer.

## 4. The room: `src/interiors/`

Study and Ideas already have rooms (`library.js`, `workshop.js`). Projects and People don't: without an entry in `INTERIORS` (`src/interiors/index.js`), entering only frames the building (`visitLot` in `src/app/rooms.js`).

- A room builder is `(scene, rand, lights) => ({ cutaway, colliders, station | stations, speakers? })`. Start from `shell()` in `common.js` and the furniture in `src/decor.js`.
- `station: { point, label }` is where E opens the app. Several stations (`stations: [...]`) can open tabs (`tab`), another app (`app`) or run something (`use`).
- Show the district's data in the room, the way the town hall pins tasks to the board and the bank's vault shows your balance: the room should change when the data does.
- Real sizes, inked materials, stamp color only where the district speaks.
- Things the user may want to move go through `piece()` / `placeable()` from `src/layout.js`.

## 5. A folk to talk to (optional)

- Add a persona to `PERSONAS` in `server/claude.js` and a speaker in the room's return value: `speakers: [{ object, height, range, level, text, persona, name }]`.
- Give Claude read tools for the district's data in `TOOLS` and `run()`. A change is a proposal tool: add it to `TOOLS` with `strict: true`, and add how to ask and carry it out to `ACTIONS` in `src/ui/chat.js`, where the page makes the change through the district's `api` after the user's yes.
- Update the `SYSTEM` prompt's list of what each building holds.
- If the folk keeps hours, add them to `HOURS` in `src/plaza/routines.js` and a `commute()`.

## 6. Tests and docs

- Add `e2e/<id>.spec.js` using `e2e/fixtures.js`: open the district from the dock (`openDistrict`), walk into its room (`standAt(page, await page.evaluate(() => window.__plaza.door('<id>')))`), use the station. Tests have no server, so the app must show its offline state cleanly, and no console errors.
- Run `npm run test:e2e:changed`, then check it yourself in the browser with the `plaza` launch configuration.
- Update the README: the intro if the district's purpose changed, a "Connect …" section for an outside service (steps, what it can and can't do, environment variables), the controls, and the "How it's built" table.
