# Plaza

A personal life app shaped like a small hand-drawn town square. Each building on the plaza is a district of life (ToDos, Finance, Study, Ideas, and later Projects and People), and walking into one opens that district's app.

The look is ink on paper: dense line-art details in the spirit of Hidden Folks, on shaded 3D dioramas like TOEM. Color is rare and appears only as small stamps where a district speaks. The full visual language lives in the Plaza design system.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Controls

- **WASD / arrow keys** or **click the ground** to walk
- **Click a building**, or stand at its door and press **E**, to enter a district
- **1–6** jump straight to a district, **Esc** goes back to the plaza
- **Drag** to look around, **scroll** to zoom out over the town

## How it's built

Three.js with Vite, no framework yet.

| File | What it does |
|---|---|
| `src/ink.js` | The ink look: stepped gray shading and the hand-drawn outline pass |
| `src/textures.js` | Line-art textures (bricks, shingles, paving…) drawn on canvas at load |
| `src/world.js` | The plaza: buildings, props, folks |
| `src/town.js` | Everything outside: the endless town, mountains, clouds, birds |
| `src/avatar.js` | You: walking, collisions, doors |
| `src/main.js` | Camera, labels, district panels, input |
