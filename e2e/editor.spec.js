import { test, expect } from './fixtures.js';

// The layout editor ships in development and in the tests' build only.
const piece = (page, id) => page.evaluate((id) => window.__plaza.piece(id), id);
const screenPosOf = (page, id) => page.evaluate((id) => {
  let found;
  window.__plaza.room().scene.traverse((o) => { if (o.userData.layoutId === id) found = o; });
  return window.__plaza.screenPos(found);
}, id);

test('the layout editor moves a piece, and its collider comes along', async ({ plaza: page }) => {
  await page.evaluate(() => window.__plaza.enterBuilding('todo'));
  await expect(page.locator('body')).toHaveClass(/in-room/);

  await page.keyboard.press('`');
  await expect(page.locator('body')).toHaveClass(/editing/);
  const panel = page.locator('.layout-editor');
  await expect(panel).toBeVisible();

  // click the tall clock to select it (aim at its case, above the floor)
  const at = await screenPosOf(page, 'hall.clock');
  await page.mouse.click(at.x, at.y - 30);
  await expect(panel.locator('.le-id')).toHaveText('hall.clock');

  const before = await piece(page, 'hall.clock');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press(']');
  await expect(panel.locator('.le-id')).toContainText('moved');
  const after = await piece(page, 'hall.clock');
  expect(after.now.x).toBeCloseTo(before.now.x - 0.2, 5);
  expect(after.now.rotY).toBeCloseTo(before.now.rotY - Math.PI / 12, 5);
  // the clock's collider stands where the clock does now
  expect(after.followers[0].x).toBeCloseTo(after.now.x, 5);
  expect(after.followers[0].z).toBeCloseTo(after.now.z, 5);

  // the game ignores keys while editing: E doesn't use anything, arrows don't walk
  expect((await page.evaluate(() => window.__plaza.state())).room).toBe('todo');

  // R puts it back where the code has it
  await page.keyboard.press('r');
  const reset = await piece(page, 'hall.clock');
  expect(reset.now).toEqual(reset.home);
  expect(reset.followers[0].x).toBeCloseTo(before.followers[0].x, 5);

  // Esc lets go of the piece, then leaves the editor
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/editing/);
});
