import { test, expect, openDistrict } from './fixtures.js';

test('the plaza loads with signs, dock and a rendered scene', async ({ plaza: page }) => {
  await expect(page).toHaveTitle('Plaza');
  await expect(page.locator('#dock button .name')).toHaveText(['ToDos', 'Finance', 'Study', 'Ideas', 'Projects', 'People']);
  await expect(page.locator('#labels .label')).toHaveCount(6);
  await expect(page.locator('#labels .label.pz-d-todo')).toContainText('All clear');
  await expect(page.locator('#greeting-line')).toContainText('Nothing due today.');

  // the canvas actually got a WebGL context and drew something
  const drawn = await page.locator('#scene').evaluate((c) => c.width > 0 && c.height > 0);
  expect(drawn).toBe(true);
});

// The ground underfoot: every stone walk has to start on the ring around the
// fountain and end on the raised tile its building stands on, touching it
// without running into it.
test('the walks join the fountain to every building', async ({ plaza: page }) => {
  const ground = await page.evaluate(() => {
    const p = window.__plaza;
    const corners = (c) => {
      const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0);
      return [[c.hw, c.hd], [-c.hw, c.hd], [-c.hw, -c.hd], [c.hw, -c.hd]]
        .map(([lx, lz]) => [c.x + lx * cs + lz * sn, c.z - lx * sn + lz * cs]);
    };
    // how far two turned boxes are apart; negative means they overlap
    const gap = (a, b) => {
      let apart = -Infinity;
      for (const [P, Q] of [[corners(a), corners(b)], [corners(b), corners(a)]]) {
        for (let i = 0; i < 4; i++) {
          const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % 4];
          const len = Math.hypot(x1 - x0, z1 - z0), nx = (z1 - z0) / len, nz = (x0 - x1) / len;
          const near = Math.max(...P.map(([x, z]) => x * nx + z * nz));
          const far = Math.min(...Q.map(([x, z]) => x * nx + z * nz));
          apart = Math.max(apart, far - near);
        }
      }
      return apart;
    };
    // the walks and their landings, as the ground they cover
    const paving = [];
    // me is the avatar's controller; me.body is what stands in the scene
    p.me.body.parent.traverse((o) => {
      if (!o.isMesh || !o.name.startsWith('walk')) return;
      o.geometry.computeBoundingBox();
      const { min, max } = o.geometry.boundingBox;
      const cs = Math.cos(o.rotation.y), sn = Math.sin(o.rotation.y);
      const lx = (min.x + max.x) / 2, lz = (min.z + max.z) / 2;
      paving.push({
        walk: o.name === 'walk', top: +max.y.toFixed(3), inner: +Math.hypot(max.x, min.z).toFixed(3),
        x: o.position.x + lx * cs + lz * sn, z: o.position.z - lx * sn + lz * cs,
        hw: (max.x - min.x) / 2, hd: (max.z - min.z) / 2, rot: o.rotation.y,
      });
    });
    // the box each building stands in, found by the building standing in it
    const holds = (c, x, z) => {
      const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0), dx = x - c.x, dz = z - c.z;
      return Math.abs(dx * cs - dz * sn) < c.hw && Math.abs(dx * sn + dz * cs) < c.hd;
    };
    const yards = ['todo', 'finance', 'study', 'ideas', 'projects', 'people'].map((id) => {
      const at = p.piece(`plaza.${id}`).now;
      const box = p.me.colliders.find((c) => c.hw != null && holds(c, at.x, at.z));
      return { id, touch: box ? +Math.min(...paving.map((w) => gap(w, box))).toFixed(3) : null };
    });
    return { walks: paving.filter((w) => w.walk), yards };
  });
  // nine walks: three streets, and one out to each of the six buildings
  expect(ground.walks).toHaveLength(9);
  for (const w of ground.walks) {
    expect(w.inner, 'a walk starts on the ring').toBeCloseTo(9.6, 2);
    expect(w.top, 'a walk is as high as the ring').toBeCloseTo(0.1, 3);
  }
  for (const { id, touch } of ground.yards) {
    expect(touch, `the walk at ${id} runs into its yard`).toBeGreaterThan(-0.01);
    expect(touch, `the walk at ${id} stops short of its yard`).toBeLessThan(0.01);
  }
});

test('you can stand at every door', async ({ plaza: page }) => {
  const pushed = await page.evaluate(() => {
    const p = window.__plaza;
    return ['todo', 'finance', 'study', 'ideas', 'projects', 'people'].map((id) => {
      const [x, , z] = p.door(id);
      p.me.position.set(x, 0, z);
      p.me.collide();
      return { id, moved: +Math.hypot(p.me.position.x - x, p.me.position.z - z).toFixed(3) };
    }).filter((d) => d.moved > 0);
  });
  expect(pushed, 'doors you get pushed away from').toEqual([]);
});

test('number keys jump to districts and Esc goes back', async ({ plaza: page }) => {
  await page.keyboard.press('2');
  await expect(page.locator('#panel .pz-panel-tag')).toHaveText('Finance');
  await expect(page.locator('body')).toHaveClass(/app-open/);
  await expect(page.locator('#dock button.is-active')).toContainText('Finance');

  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/app-open/);
});

test('the close button closes the card', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'Study');
  await expect(panel.locator('.pz-panel-title')).toHaveText('Reading list');
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
});

test('districts without their app yet show sample data', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'Projects');
  await expect(panel.locator('.pz-panel-title')).toHaveText('On the workbench');
  await expect(panel).toContainText('The real Projects app moves in here next.');
});

test('day/night and wobble toggles', async ({ plaza: page }) => {
  const theme = page.locator('#toggle-theme');
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(theme).toHaveText('Day');
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');

  const wobble = page.locator('#toggle-wobble');
  await wobble.click();
  await expect(wobble).toHaveAttribute('aria-pressed', 'false');
});
