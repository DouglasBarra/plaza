import { test, expect, standAt, prompt } from './fixtures.js';

const state = (page) => page.evaluate(() => window.__plaza.state());
const inRoom = (page) => expect(page.locator('body')).toHaveClass(/in-room/);
const bubble = (page) => page.locator('.speech');

// In at the sliding door, with the shop's own hours on the clock (the
// foreman and the machines keep 7.30 to 5).
async function enterWorks(page, hour = 10) {
  await standAt(page, await page.evaluate(() => window.__plaza.door('projects')));
  await expect(prompt(page)).toContainText('Enter Projects');
  await page.keyboard.press('e');
  await inRoom(page);
  await page.waitForFunction(() => !window.__plaza.state().transitioning);
  await page.evaluate((h) => window.__plaza.clock(h), hour);
}

test('walk into the Works, look over a bay and out by the doormat', async ({ plaza: page }) => {
  await enterWorks(page);
  expect((await state(page)).room).toBe('projects');

  // a bay per project, in the order the Projects card lists them: the first
  // is out on the trestles in the middle of the floor
  await standAt(page, [-1.2, 0, 0.2]);
  await expect(prompt(page)).toContainText('Plaza, this app');
  await page.keyboard.press('e');
  await expect(page.locator('#panel .pz-panel-tag')).toHaveText('Projects');
  await expect(page.locator('#panel .pz-panel-title')).toHaveText('On the workbench');
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();

  // the finished one is off its bench, under a sheet, and up on the done shelf
  await standAt(page, [4.45, 0, 2.3]);
  await expect(prompt(page)).toContainText('Look under the dust sheet');
  await standAt(page, [1.05, 0, -3.55]);
  await expect(prompt(page)).toContainText('Look over what is finished');

  await standAt(page, [0, 0, 4.4]);
  await expect(prompt(page)).toContainText('Back to the plaza');
  await page.keyboard.press('e');
  await expect(page.locator('body')).not.toHaveClass(/in-room/);
  expect((await state(page)).room).toBe(null);
});

test('the foreman says what is on the benches, and goes home at the end of the day', async ({ plaza: page }) => {
  await enterWorks(page);
  await standAt(page, [1.8, 0, 1.4]);
  await expect(bubble(page)).toContainText('Three on the go');
  await expect(bubble(page)).toContainText('Plaza, this app');

  // after hours the shop is shut and the benches are quiet
  await page.evaluate(() => window.__plaza.clock(22));
  await expect(bubble(page)).toContainText('The Works is shut');
});

test('throw the line shaft in and out of gear', async ({ plaza: page }) => {
  await enterWorks(page);
  // the belts run while the shop is open, so the lever takes them out
  await standAt(page, [2.4, 0, -1.15]);
  await expect(prompt(page)).toContainText('Take the line shaft out of gear');
  await page.keyboard.press('e');
  await expect(prompt(page)).toContainText('Throw the line shaft into gear');
  // nothing of yours changed: no card opened
  await expect(page.locator('#overlay')).toBeHidden();
});
