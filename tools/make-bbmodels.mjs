// Writes a starter Blockbench project (.bbmodel) for every swappable object,
// blocked out from the same boxes Plaza builds in code, at the right scale
// (16 px = 1 m), standing on the ground at the origin, front facing south.
// Open one in Blockbench, refine it, paint it, then export it as .glb into
// public/models/ and list it in public/models/manifest.json.
//
//   node tools/make-bbmodels.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { MODELS } from './starters.mjs';

const px = (m) => Math.round(m * 16 * 100) / 100;
const FACES = ['north', 'east', 'south', 'west', 'up', 'down'];

function element(b) {
  const e = {
    name: b.name,
    box_uv: false, rescale: false, locked: false, light_emission: 0, render_order: 'default', allow_mirror_modeling: true,
    from: [px(b.x - b.w / 2), px(b.y - b.h / 2), px(b.z - b.d / 2)],
    to: [px(b.x + b.w / 2), px(b.y + b.h / 2), px(b.z + b.d / 2)],
    autouv: 1, color: 0,
    origin: [px(b.x), px(b.y), px(b.z)],
    faces: Object.fromEntries(FACES.map((f) => [f, { uv: [0, 0, 16, 16], texture: null }])),
    type: 'cube',
    uuid: randomUUID(),
  };
  if (b.rot) e.rotation = b.rot;
  return e;
}

mkdirSync('blockbench', { recursive: true });
for (const [name, boxes] of Object.entries(MODELS)) {
  const elements = boxes.map(element);
  const project = {
    meta: { format_version: '4.10', model_format: 'free', box_uv: false },
    name,
    model_identifier: '',
    visible_box: [1, 1, 0],
    variable_placeholders: '',
    variable_placeholder_buttons: [],
    timeline_setups: [],
    unhandled_root_fields: {},
    resolution: { width: 64, height: 64 },
    elements,
    outliner: elements.map((e) => e.uuid),
    textures: [],
  };
  writeFileSync(`blockbench/${name}.bbmodel`, JSON.stringify(project, null, 2));
}
console.log(`Wrote ${Object.keys(MODELS).length} starter models to blockbench/`);
