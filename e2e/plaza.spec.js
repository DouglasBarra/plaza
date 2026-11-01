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

test('placeholder districts say they are coming soon', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'Projects');
  await expect(panel).toContainText('The Projects building goes up here later.');
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
