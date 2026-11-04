import { test, expect, standAt, prompt } from './fixtures.js';

const state = (page) => page.evaluate(() => window.__plaza.state());
// the slips the date stamp has left in the tray on the counter
const slips = (page) => page.evaluate(() => {
  let n = 0;
  window.__plaza.room().scene.traverse((o) => { if (o.userData.slip) n++; });
  return n;
});
const bubble = (page) => page.locator('.speech:not(.is-hidden)');

async function enterLibrary(page) {
  await standAt(page, await page.evaluate(() => window.__plaza.door('study')));
  await expect(prompt(page)).toContainText('Enter Study');
  await page.keyboard.press('e');
  await expect(page.locator('body')).toHaveClass(/in-room/);
  // let the ink wipe finish, so what you press lands on the room
  await page.waitForFunction(() => !window.__plaza.state().transitioning);
  expect((await state(page)).room).toBe('study');
}

test('your reading list is on the table, and the table opens it', async ({ plaza: page }) => {
  await enterLibrary(page);
  // you come in with nothing under your nose
  expect((await state(page)).action).toBe(null);

  await standAt(page, [-1, 0, 1.6]); // at the long reading table
  await expect(prompt(page)).toContainText('Look over your reading list');
  await page.keyboard.press('e');
  const card = page.locator('#panel');
  await expect(card.locator('.pz-panel-tag')).toHaveText('Study');
  await expect(card.locator('.pz-panel-title')).toHaveText('Reading list');
  await expect(card.locator('.row')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();

  await standAt(page, [0, 0, 4.4]); // the doormat, just inside the door
  await expect(prompt(page)).toContainText('Back to the plaza');
  await page.keyboard.press('e');
  await expect(page.locator('body')).not.toHaveClass(/in-room/);
});

test('the catalogue opens the list too, and the date stamp only stamps paper', async ({ plaza: page }) => {
  await enterLibrary(page);

  await standAt(page, [0, 0, -3.5]); // in front of the card catalogue
  await expect(prompt(page)).toContainText('Search the card catalogue');
  await page.keyboard.press('e');
  await expect(page.locator('#panel .pz-panel-title')).toHaveText('Reading list');
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();

  // the stamp is not an app: it leaves a slip in the tray and nothing else
  expect(await slips(page)).toBe(0);
  await standAt(page, [4.8, 0, 2.6]); // the end of the counter
  await expect(prompt(page)).toContainText('Press the date stamp');
  await page.keyboard.press('e');
  await expect.poll(() => slips(page)).toBe(1);
  await expect(page.locator('#overlay')).toBeHidden();
});

test('the librarian says what you are in the middle of, and when she is back', async ({ plaza: page }) => {
  await enterLibrary(page);
  await page.evaluate(() => window.__plaza.clock(10.5)); // mid-morning: the library is open

  await standAt(page, [-0.65, 0, -2.6]); // on the floor she paces, in front of the stacks
  await expect(bubble(page)).toContainText(/Cloud Computing|TCC draft|cards still standing/);

  await page.evaluate(() => window.__plaza.clock(3)); // small hours: she has gone home
  await expect(bubble(page)).toContainText('The library is closed. We open at 9:00.');
});
