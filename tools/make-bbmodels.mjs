// Writes a starter Blockbench project (.bbmodel) for every swappable object,
// blocked out from the same boxes Plaza builds in code, at the right scale
// (16 px = 1 m), standing on the ground at the origin, front facing south.
// Open one in Blockbench, refine it, paint it, then export it as .glb into
// public/models/ and list it in public/models/manifest.json.
//
//   node tools/make-bbmodels.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// [name, center x, y, z, size w, h, d, rotation (degrees, x/y/z, optional)] in meters
const B = (name, x, y, z, w, h, d, rot) => ({ name, x, y, z, w, h, d, rot });

const MODELS = {
  bench: [
    B('seat', 0, 0.45, 0, 1.5, 0.08, 0.45), B('back', 0, 0.75, -0.22, 1.5, 0.4, 0.06),
    B('leg_left', -0.6, 0.22, 0, 0.08, 0.45, 0.4), B('leg_right', 0.6, 0.22, 0, 0.08, 0.45, 0.4),
  ],
  crate: [
    B('crate', 0, 0.3, 0, 0.6, 0.6, 0.6), B('slat_top', 0, 0.45, 0.31, 0.6, 0.08, 0.02), B('slat_bottom', 0, 0.15, 0.31, 0.6, 0.08, 0.02),
  ],
  lamp: [
    B('base', 0, 0.1, 0, 0.3, 0.2, 0.3), B('post', 0, 1.3, 0, 0.1, 2.4, 0.1),
    B('glow', 0, 2.6, 0, 0.32, 0.4, 0.32), B('cap', 0, 2.84, 0, 0.44, 0.08, 0.44), B('finial', 0, 2.94, 0, 0.18, 0.12, 0.18),
  ],
  mailbox: [B('post', 0, 0.5, 0, 0.1, 1, 0.1), B('box', 0, 1.15, 0, 0.45, 0.35, 0.6), B('flag', 0.25, 1.28, 0.1, 0.03, 0.25, 0.08)],
  noticeboard: [
    B('post_left', -0.9, 0.95, 0, 0.12, 1.9, 0.12), B('post_right', 0.9, 0.95, 0, 0.12, 1.9, 0.12), B('board', 0, 1.3, 0, 2, 1.1, 0.08),
    B('note_1', -0.5, 1.45, 0.06, 0.5, 0.6, 0.02), B('note_2', 0.15, 1.2, 0.06, 0.45, 0.5, 0.02), B('note_3', 0.6, 1.5, 0.06, 0.35, 0.4, 0.02),
  ],
  planter: [
    B('box', 0, 0.3, 0, 1.6, 0.6, 1.6), B('soil', 0, 0.61, 0, 1.5, 0.02, 1.5),
    ...[[-0.4, -0.3], [0.3, -0.4], [0.1, 0.2], [-0.3, 0.45], [0.45, 0.35]].flatMap(([x, z], i) => [
      B(`stem_${i}`, x, 0.8, z, 0.03, 0.35, 0.03), B(`flower_${i}`, x, 1.0, z, 0.16, 0.16, 0.16),
    ]),
  ],
  'cafe-table': [
    B('top', 0, 0.75, 0, 1.0, 0.06, 1.0), B('stem', 0, 0.37, 0, 0.1, 0.72, 0.1), B('pole', 0, 1.5, 0, 0.06, 1.6, 0.06),
    B('umbrella', 0, 2.25, 0, 2.0, 0.15, 2.0), B('umbrella_top', 0, 2.4, 0, 1.2, 0.15, 1.2),
    B('stool_left', -0.85, 0.22, 0, 0.4, 0.45, 0.4), B('stool_right', 0.85, 0.22, 0, 0.4, 0.45, 0.4), B('cup', 0.15, 0.84, 0, 0.12, 0.12, 0.12),
  ],
  stall: [
    B('counter', 0, 0.45, 0, 3, 0.9, 1.2),
    ...[[-1.4, -0.5], [1.4, -0.5], [-1.4, 0.5], [1.4, 0.5]].map(([x, z], i) => B(`post_${i}`, x, 1.1, z, 0.1, 2.2, 0.1)),
    B('roof', 0, 2.25, 0.1, 3.4, 0.08, 1.8, [10, 0, 0]),
    ...[0, 1, 2, 3, 4].map((i) => B(`fruit_crate_${i}`, -1.1 + i * 0.55, 1.05, 0.2, 0.45, 0.3, 0.45)),
  ],
  bike: [
    B('wheel_back', -0.5, 0.35, 0, 0.64, 0.64, 0.06), B('wheel_front', 0.5, 0.35, 0, 0.64, 0.64, 0.06),
    B('frame_top', 0, 0.72, 0, 0.8, 0.05, 0.05), B('frame_down', 0.2, 0.55, 0, 0.6, 0.05, 0.05, [0, 0, -40]),
    B('seat', -0.05, 0.82, 0, 0.25, 0.05, 0.12), B('handlebar', 0.48, 0.95, 0, 0.05, 0.05, 0.4),
  ],
  cat: [
    B('body', 0, 0.2, 0, 0.5, 0.22, 0.2), B('head', 0.3, 0.34, 0, 0.2, 0.2, 0.2),
    B('ear_left', 0.3, 0.48, -0.06, 0.06, 0.1, 0.06), B('ear_right', 0.3, 0.48, 0.06, 0.06, 0.1, 0.06),
    B('tail', -0.32, 0.38, 0, 0.05, 0.35, 0.05, [0, 0, 30]),
    ...[[-0.18, -0.06], [-0.18, 0.06], [0.18, -0.06], [0.18, 0.06]].map(([x, z], i) => B(`leg_${i}`, x, 0.05, z, 0.05, 0.1, 0.05)),
  ],
  'tree-pine': [
    B('trunk', 0, 0.3, 0, 0.25, 0.6, 0.25), B('tier_1', 0, 0.75, 0, 1.8, 0.5, 1.8), B('tier_2', 0, 1.25, 0, 1.4, 0.5, 1.4),
    B('tier_3', 0, 1.75, 0, 1.0, 0.5, 1.0), B('tip', 0, 2.2, 0, 0.5, 0.45, 0.5),
  ],
  'tree-round': [
    B('trunk', 0, 0.5, 0, 0.25, 1.0, 0.25), B('crown', 0, 1.6, 0, 1.5, 1.4, 1.5),
    B('lump_1', 0.5, 1.9, 0.3, 0.7, 0.6, 0.7), B('lump_2', -0.4, 1.4, -0.4, 0.6, 0.6, 0.6),
  ],
  desk: [
    B('top', 0, 0.8, 0, 2.4, 0.1, 1.1), B('side_left', -1.05, 0.38, 0, 0.25, 0.75, 1.0),
    B('side_right', 1.05, 0.38, 0, 0.25, 0.75, 1.0), B('back', 0, 0.45, -0.45, 2.1, 0.6, 0.06),
  ],
  chair: [
    B('seat', 0, 0.48, 0, 0.5, 0.06, 0.5), B('back', 0, 0.8, -0.22, 0.5, 0.6, 0.06),
    ...[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => B(`leg_${i}`, x, 0.23, z, 0.05, 0.46, 0.05)),
  ],
  bookshelf: [
    B('top', 0, 3, 0, 2.2, 0.08, 0.5), B('side_left', -1.1, 1.5, 0, 0.08, 3, 0.5), B('side_right', 1.1, 1.5, 0, 0.08, 3, 0.5),
    B('back', 0, 1.5, -0.25, 2.2, 3, 0.04),
    ...[0, 1, 2, 3].map((s) => B(`shelf_${s}`, 0, 0.1 + s * 0.74, 0, 2.2, 0.05, 0.5)),
  ],
};

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
