# Handoff: pending work

State at handoff: `main` has everything finished in the last session (see `git log`). The session ran out of budget while six helper agents were improving the scenery. Their work is saved, **unreviewed and not merged**, on `wip/*` branches on GitHub. This file is what the next session needs to pick it up. Delete it once everything below is done.

## 0. Quick start (do these in order, one at a time)

Each step: do it, check it, commit, push. Stop and report if a step fails twice.

1. `npm install && npx playwright install chromium && npm run test:e2e`. All 17 must pass.
2. Reproduce the south-entrance crash (section 3) with `npm run dev` and a Playwright script. Fix it if it's real.
3. Merge one branch at a time, in this order: `wip/props`, `wip/foodtruck`, `wip/birds`, `wip/mountains`, `wip/urban`, `wip/fountain`:
   ```bash
   git fetch origin && git merge origin/wip/props
   ```
   - For `wip/fountain`, rebase it onto `main` before merging: `git checkout -b fountain origin/wip/fountain && git rebase main`.
   - Resolve any conflicts by keeping both sides' blocks in `src/plaza/index.js`.
   - Then `npx vite build && npm run test:e2e`, and commit.
4. After merging the fountain and food-truck branches, delete `fountain()`, `cafe()` and `stall()` from `src/plaza/props.js`, plus any imports that become unused.
5. Push to `main`, then delete this file.

Don't run several browsers at once: the machine overloads and crashes. Keep the ink style: white/gray surfaces, black lines, color only as tiny accents.

## 0b. Practical tips (lessons from the last session)

- **Never use `pkill -f <pattern>`.** It matches your own shell command and kills it. Stop servers by port instead: `fuser -k 5173/tcp`.
- **The dev server** runs with `npx vite --port 5180 --strictPort &`. Always open `http://localhost:5180/?lowpower`: rendering is software-only here, and `lowpower` keeps it bearable.
- **The dev handle `window.__plaza`** (`src/app/devtools.js`) has `me.position.set(x,0,z)`, `setView('first'|'third')`, `look(yaw, pitch)` (yaw 0 looks north, which is −z), `door(id)`, `enterBuilding(id)`, `state()`, `piece(id)` and `finds`. The test build (`--mode test`) has it too; real builds don't.
- **Screenshot script** (save as `shot.cjs` outside the repo and run `node shot.cjs out.png "<js>"`):
  ```js
  const { chromium } = require('playwright');
  const [out, js = ''] = process.argv.slice(2);
  (async () => {
    const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    await p.goto('http://localhost:5180/?lowpower');
    await p.waitForFunction(() => window.__plaza);
    if (js) await p.evaluate(js);
    await p.waitForTimeout(3000);
    await p.screenshot({ path: out, timeout: 120000 });
    await b.close();
  })();
  ```
  Look at every screenshot you take before calling something done.
- **Performance:** a frame takes 0.6–2 s in software rendering. Merge or instance repeated geometry, and never add real lights (`PointLight`). Watch the mesh count: the plaza had about 2,300 before the WIP branches.
- **Tests are slow** (about 6 min) and flaky under load. Run them alone, with nothing else rendering. A failure on a brief "burst" means a frame swallowed it; `expectReward` in `e2e/fixtures.js` already handles that.
- **Movable pieces:** anything on the plaza goes through `piece()` / `placeable()` from `src/layout.js` with a collider passed as a follower. Keep the ids stable: `src/layout.json` refers to them.
- **Commit messages:** a short title, then a plain-English body saying what changed and why.
- **Where things live:** the plaza layout is in `src/plaza/index.js`; the buildings in `src/plaza/buildings.js`; the town, mountains and sky in `src/town/`; the game shell in `src/app/`; the HTML overlays in `src/ui/`; the interiors in `src/interiors/`. The README's "How it's built" table has the full map.

## 1. Last commits on `main` not covered by a test run

These were checked in the browser but the end-to-end suite (`npm run test:e2e`) was not run after them:

- `6e12a64` Turn every building to face the middle of the fountain (layout check passed: no overlaps, every door works)
- `f360ffc` Split `town.js` into `src/town/` (streets, mountains, sky); the town renders identically
- `4647d43` Export the line-art canvas helpers from `textures.js`
- `c0174ed` Ignore `.claude/worktrees/`

First thing to do: run `npm run test:e2e` on `main` (all 17 passed before these).

## 2. The six WIP branches

Each one lints clean and builds (`npx vite build`), but was stopped before its own final review, and none was tested together with the others. Review each one's screenshots and behavior, then merge them one at a time. Run the layout check and the e2e suite after merging.

| Branch | Task | Files | Notes |
|---|---|---|---|
| `wip/fountain` | A realistic tiered fountain: notched lip, scalloped water sheets, a crowning jet with spray, ripples, falling water | new `src/plaza/fountain.js`, `src/life.js` (old `fountainWater` removed), the fountain block in `src/plaza/index.js` | **Started from `d237277`**, before "face the fountain" and the town split. Rebase it onto `main` first; its apparent changes to `src/town/`, `README.md` and `src/app/` are only that older base. Was mid-way through a batch of edits when stopped. |
| `wip/props` | Better benches, lamps (lantern head, cap, ladder bar), bikes, notice board and more; new props: district signposts (colored arm tips), map board, bunting, chalk drawings, bins and more | `src/plaza/props.js`, `src/plaza/index.js`, one more `src/` file | Nearly done. After merging, **delete the old `fountain()`, `cafe()` and `stall()` from `props.js`** if the fountain and food-truck branches are merged (they replace them). |
| `wip/foodtruck` | The south-west corner: the fruit stall becomes a small food truck (serving hatch, awning, menu board, string lights, queue) with its own seating | new `src/plaza/foodtruck.js`, the café/stall block in `src/plaza/index.js` | Was doing its last checks. New swappable model name: `food-truck`. Update `public/models/README.md` (the `stall` and `cafe-table` rows) once merged. |
| `wip/birds` | Real bird shapes (bent wings, head, tail), flap-and-glide flight, loose flocks, gulls over the lighthouse; pigeons that walk, peck and take off; better gull/owl/rooster finds | `src/town/sky.js`, `src/plaza/critters.js`, `src/finds.js` (`bird()`), the pigeon line in `src/plaza/index.js` | Was checking sizes: at small screenshot sizes the ink lines swallow the birds; check at 1280x720 or larger. |
| `wip/mountains` | Real ridgelines, layered ranges, snow that follows the terrain, the special mountain's path, cabin, lookout and waterfall | `src/town/mountains.js` | Was optimizing build time (the first, cold build of the mountain geometry is slow). Check triangle count and frame rate against `main`. |
| `wip/urban` | Sidewalks, terraced streets, see-through windows, lit windows at night, street lamps | `src/town/streets.js` and new files under `src/town/` | Was about to start the moving things (cars, vans, cyclists, a tram, pedestrians). **That part is not done.** Check performance carefully: the town has hundreds of buildings. |

Expect merge conflicts in `src/plaza/index.js` (fountain, props, food truck and birds each touch a different block of it) and maybe `src/finds.js`.

## 3. Open issues

- **Possible crash in the views around the south entrance.** While six agents were rendering at once (load ~34 on 4 cores), the browser crashed in views around the south entrance, **on the unchanged code too** (at 640x400, one browser). It may be pure overload, or a real bug. Reproduce it on a quiet machine with the dev handle, for example `__plaza.setView('first'); __plaza.me.position.set(0, 0, 35); __plaza.look(Math.PI, 0)`, and also in third person near `(0, 0, 33)`. If it still crashes, fix it before anything else.
- **Performance:** the default camera is deliberately close and steep (`PLAZA_VIEW.offset` in `src/app/camera.js`). A wide view that shows the whole square made frames much slower in software rendering, because it draws the town out to the horizon. Keep that in mind when merging the urban and mountains work. Measure with the drawcalls tool (below).
- With every building facing the fountain, the library, bank and lighthouse show their backs to the default camera, which looks north from the south. That's expected for a ring of buildings; a camera tweak or a different starting spot could improve the first view.
- Next ideas from earlier sessions: the desktop app (Tauri) so tasks are saved as files instead of browser storage; real apps for the Finance, Study, Ideas, Projects and People districts; the layout editor for walking folks and the other interiors.

## 4. Tools (recreate if the scratchpad is gone)

These lived in the session scratchpad, which won't survive. They're simple Playwright scripts. Chromium is preinstalled; launch it with `--use-angle=swiftshader --enable-unsafe-swiftshader`.

- **Screenshot with setup:** load `/?lowpower`, wait for `window.__plaza`, run setup JS through the dev handle, wait about 3 s, take the screenshot.
- **Layout check:** read `__plaza.me.colliders`, report any pair that overlaps (circles `{x, z, r}` and rotated boxes `{x, z, hw, hd, rot}`), then stand at each `__plaza.door(id)` and confirm `__plaza.state().action` is "Enter …".
- **Drawcalls:** count the meshes under the plaza scene and measure frame times with `requestAnimationFrame`.
- **Lint:** ESLint 9 with `no-undef`, `no-unused-vars` and `import/named`, over `src/`.
- The shared brief given to the agents (art style, performance rules, file ownership) is worth recreating if more agents are used. Key rules: white/light-gray surfaces with black ink and color only as tiny stamp accents; no real lights; merge or instance repeated geometry; one browser at a time.

## 5. Done checklist (before deleting this file)

- [ ] `npm run test:e2e` passes (17 or more tests) on `main`
- [ ] All six `wip/*` branches merged, or dropped with a reason noted in the commit message
- [ ] The overlap check reports no overlaps, and every building door shows its "Enter …" prompt
- [ ] Day and night screenshots of the plaza, the fountain, the food-truck corner and the town look right
- [ ] Mesh count and frame time no worse than about 1.3× the pre-merge numbers
- [ ] `public/models/README.md` updated for new model names (`food-truck`)
- [ ] The README's "How it's built" table lists any new files
- [ ] Old `fountain()`, `cafe()` and `stall()` removed from `src/plaza/props.js`
- [ ] Remote `wip/*` branches deleted: `git push origin --delete wip/props` (and the others)

If you get stuck, merging fewer branches is fine. A working `main` matters more than finishing everything.
