# Models

Drop hand-made models here (exported from Blockbench as **glTF binary, `.glb`**) and list them in `manifest.json`. A listed model replaces the code-built object with the same name everywhere it appears in Plaza, and gets the ink look (stepped shading and outlines) automatically.

```json
{
  "models": {
    "bench": "bench.glb",
    "lamp": { "file": "street-lamp.glb", "scale": 1, "rotateY": 0 }
  }
}
```

Reload the page after adding a model. Remove its line from the manifest to go back to the code version.

## Names you can replace today

Every name has a starter project in [`/blockbench`](../../blockbench), blocked out from the shapes Plaza draws in code, at the right scale and facing. Start from those rather than an empty file.

| Name | Where it appears | Notes |
|---|---|---|
| `bench` | Benches around the fountain, by the library and the notice board | Folks sit on the seat at 0.5 m (8 px) |
| `lamp` | Street lamps on the plaza | Name the part that should light up at night **`glow`**; the pool of light stays |
| `planter` | Flower planters | |
| `cafe-table` | The two café tables with umbrellas and stools | The steam over the cup stays |
| `stall` | The fruit stall | The swinging "Fresh fruit" sign stays |
| `bike` | Bikes by the trees | |
| `noticeboard` | The notice board on the plaza | |
| `mailbox` | The mailbox | |
| `crate` | Crates on the construction lots | |
| `cat` | Both plaza cats | Still trots after you; a model's tail won't wag |
| `tree-pine` | Pine trees on the plaza | Still sways in the wind |
| `tree-round` | Round trees on the plaza and potted plants indoors | Still sways in the wind |
| `desk` | The desk in the town hall office | |
| `chair` | Chairs in the interiors | |
| `bookshelf` | Shelves in the library | |

The town's hundreds of houses and trees outside the plaza, the folks and the buildings are still drawn in code.

## Making a model in Blockbench

1. Open the starter, for example `blockbench/bench.bbmodel` (File → Open Model).
2. Reshape it. Its elements are named after their parts (`seat`, `back`, `leg_left`…).
3. Paint it in the Plaza style: white or light gray surfaces with black ink detail lines. Leave shading out, because Plaza adds it. Use a district's stamp color only for one small accent.
4. Save the project (keep the `.bbmodel` in `/blockbench` for later edits).
5. Export with **File → Export → Export glTF Model**, binary (`.glb`), into this folder.
6. Add it to `manifest.json` and reload Plaza.

Rules the starters already follow, for models made from scratch:

- **Scale:** 16 pixels (one Blockbench block) = 1 meter in Plaza. A bench seat sits 7–8 px off the ground; a door is about 26 px tall.
- **Origin:** the model's base at the center of the grid, standing on the ground.
- **Facing:** the front faces **south** in Blockbench (toward +Z).

To regenerate the starters (it overwrites them): `node tools/make-bbmodels.mjs`.
