// Writes starters.json, the starter shapes for blender/plaza.py, from the
// same list the Blockbench starters come from (tools/starters.mjs). Blender's
// Python can't read JavaScript, so the list is handed over as JSON.
//
//   node tools/blender/make-starters.mjs
import { writeFileSync } from 'node:fs';
import { MODELS } from '../starters.mjs';

const out = new URL('./starters.json', import.meta.url);
// one part per line, so a diff shows which part changed
const json = Object.entries(MODELS)
  .map(([name, parts]) => `  ${JSON.stringify(name)}: [\n${parts.map((p) => `    ${JSON.stringify(p)}`).join(',\n')}\n  ]`)
  .join(',\n');
writeFileSync(out, `{\n${json}\n}\n`);
console.log(`Wrote ${Object.keys(MODELS).length} starters to tools/blender/starters.json`);
