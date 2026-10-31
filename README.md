# Plaza

A personal life app shaped like a small hand-drawn town square. Each building on the plaza is a district of life (ToDos, Finance, Study, Ideas, and later Projects and People), and walking into one opens that district's app.

The look is ink on paper: dense line-art details in the spirit of Hidden Folks, on shaded 3D dioramas like TOEM. Color is rare and appears only as small stamps where a district speaks. The full visual language lives in the Plaza design system.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Test it

End-to-end tests drive the real app in Chromium with [Playwright](https://playwright.dev). They build the app, serve it with `vite preview` and click through the plaza and the ToDos district.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # headless
npm run test:e2e:ui               # watch and debug in Playwright's UI
```

Tests live in `e2e/`. Each one starts from an empty browser (no saved tasks) and fails on any page error. Headless Chromium has no GPU, so the scene is software-rendered: tests open the app with `?lowpower` (smaller shadow map, no MSAA) and run one at a time. CI runs them on every pull request (`.github/workflows/e2e.yml`) and keeps the HTML report as an artifact.

## Controls

- **WASD / arrow keys** or **click the ground** to walk
- **Click a building**, or stand at its door and press **E**, to walk inside
- Inside, walk up to the room's board, counter or table and press **E** to open that district's app; stand on the doormat and press **E** to leave
- **1–6** open a district's app right away, **Esc** closes it
- **Drag** to look around, **scroll** to zoom out over the town
- **V** switches to first person: the mouse looks around (click to capture it, **Esc** frees it), and a click does what **E** does

## How it's built

Three.js with Vite, no framework yet.

| File | What it does |
|---|---|
| `src/ink.js` | The ink look: stepped gray shading and the hand-drawn outline pass |
| `src/textures.js` | Line-art textures (bricks, shingles, paving…) drawn on canvas at load |
| `src/world.js` | The plaza: buildings, props, folks |
| `src/town.js` | Everything outside: the endless town, mountains, clouds, birds |
| `src/interiors.js` | The rooms inside each building |
| `src/avatar.js` | You: walking, collisions, doors |
| `src/districts/` | Each district's app (`todos.js` is the first real one) |
| `src/store.js` | Saving district data on this computer |
| `src/models.js` | Swapping code-built objects for Blockbench models (see `public/models/README.md`) |
| `src/main.js` | Camera, first person, labels, entering rooms, input |
