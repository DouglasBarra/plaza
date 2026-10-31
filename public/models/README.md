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

## Names you can replace today

| Name | Where it appears |
|---|---|
| `bench` | Benches around the fountain and on the plaza edges |
| `lamp` | Street lamps on the plaza |
| `planter` | Flower planters |
| `desk` | The desk in the town hall office |
| `chair` | Chairs in the interiors |
| `bookshelf` | Shelves in the library |

## Making a model in Blockbench

- Use a **Generic Model** project.
- **Scale:** 16 pixels (one Blockbench block) = 1 meter in Plaza. A bench seat sits about 7 px off the ground; a door is about 32 px tall.
- **Origin:** put the model's base at the center of the grid, standing on the ground.
- **Facing:** the front of the model faces **south** in Blockbench (toward +Z).
- **Textures:** paint in the Plaza style: white or light gray surfaces with black ink detail lines. Leave shading out; Plaza adds it. Use a district's stamp color only for one small accent.
- Export with **File → Export → Export glTF Model**, binary (`.glb`), into this folder.
