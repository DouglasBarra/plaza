import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const LAYOUT = fileURLToPath(new URL('./src/layout.json', import.meta.url));

// The layout editor (src/app/editor.js) saves through this, in development
// only: POST /__plaza/layout with the changes writes src/layout.json.
function layoutEditor() {
  return {
    name: 'plaza-layout-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__plaza/layout', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          try {
            const changes = JSON.parse(body);
            if (typeof changes !== 'object' || Array.isArray(changes)) throw new Error('expected an object');
            writeFileSync(LAYOUT, JSON.stringify(changes, null, 2) + '\n');
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ saved: Object.keys(changes).length }));
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e.message || e));
          }
        });
      });
    },
    // the page that saved already shows the new layout: don't reload it
    handleHotUpdate({ file }) {
      if (file === LAYOUT) return [];
    },
  };
}

export default defineConfig({
  plugins: [layoutEditor()],
  // src/store.js waits for the server's data at the top level
  build: { target: 'es2022' },
  // other sessions' worktrees and the database change all the time: don't reload for them
  server: { watch: { ignored: ['**/.claude/**', '**/data/**'] } },
});
