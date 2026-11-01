import { test, expect, openDistrict, standAt, prompt, expectReward } from './fixtures.js';

const state = (page) => page.evaluate(() => window.__plaza.state());
const inRoom = (page) => expect(page.locator('body')).toHaveClass(/in-room/);
const notes = (page) => page.evaluate(() => window.__plaza.room().boards[0].notes.children.filter((n) => n.userData.task).length);

async function enterHall(page) {
  await standAt(page, await page.evaluate(() => window.__plaza.door('todo')));
  await expect(prompt(page)).toContainText('Enter ToDos');
  await page.keyboard.press('e');
  await inRoom(page);
}

test('walk into the town hall at its door and out by the doormat', async ({ plaza: page }) => {
  await enterHall(page);
  expect((await state(page)).room).toBe('todo');

  await standAt(page, [0, 0, 4.4]); // the doormat, just inside the door
  await expect(prompt(page)).toContainText('Back to the plaza');
  await page.keyboard.press('e');
  await expect(page.locator('body')).not.toHaveClass(/in-room/);
  expect((await state(page)).room).toBe(null);
});

test('the clerk types up a task and pins it to the board', async ({ plaza: page }) => {
  await enterHall(page);
  expect(await notes(page)).toBe(0);

  await standAt(page, [2.2, 0, 1.95]); // in front of the clerk's desk
  await expect(prompt(page)).toContainText('Ask the clerk to type a task');
  await page.keyboard.press('e');
  const card = page.locator('#panel');
  await expect(card.locator('.pz-panel-title')).toHaveText("The clerk's typewriter");
  await card.getByLabel('Task').fill('Water the plants');
  await card.getByRole('button', { name: 'Type it and pin it' }).click();

  await expectReward(page, 'Pinned!');
  await expect(page.locator('#overlay')).toBeHidden();
  await expect.poll(() => notes(page)).toBe(1);
  await expect(page.locator('#greeting-line')).toContainText('1 thing needs you today.');
});

test('tear a note off the board to finish its task', async ({ plaza: page }) => {
  // add a task in the ToDos app, then go and find its note on the board
  const app = await openDistrict(page, 'ToDos');
  await app.getByLabel('New task').fill('Call the plumber');
  await app.getByRole('button', { name: 'Add' }).click();
  await app.getByRole('button', { name: 'Close' }).click();
  await enterHall(page);
  await expect.poll(() => notes(page)).toBe(1);

  const at = await page.evaluate(() => {
    const note = window.__plaza.room().boards[0].notes.children.find((n) => n.userData.task);
    return window.__plaza.screenPos(note);
  });
  await page.mouse.click(at.x, at.y);
  const card = page.locator('#panel');
  await expect(card.locator('.pz-panel-title')).toHaveText('A note on the board');
  await expect(card.locator('.paper-note')).toContainText('Call the plumber');

  await card.getByRole('button', { name: 'Tear it off: done!' }).click();
  await expectReward(page, 'Task done!');
  // the note crumples into a ball and flies into the bin, then the task is done
  await expect.poll(() => notes(page)).toBe(0);
  await expect(page.locator('#greeting-line')).toContainText('Nothing due today.');
});

test('a building without an inside yet opens its card instead', async ({ plaza: page }) => {
  await standAt(page, await page.evaluate(() => window.__plaza.door('projects')));
  await expect(prompt(page)).toContainText('Enter Projects');
  await page.keyboard.press('e');
  await expect(page.locator('#panel .pz-panel-tag')).toHaveText('Projects');
  await expect(page.locator('#panel .pz-panel-title')).toHaveText('On the workbench');
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();
});

test('V switches to first person and F opens the finds', async ({ plaza: page }) => {
  await page.keyboard.press('v');
  await expect(page.locator('body')).toHaveClass(/first-person/);
  await expect(page.locator('#toggle-view')).toHaveText('Third person');
  await page.keyboard.press('v');
  await expect(page.locator('body')).not.toHaveClass(/first-person/);

  await page.keyboard.press('f');
  await expect(page.locator('#panel .pz-panel-title')).toHaveText('Little things');
  await expect(page.locator('#finds-btn')).toHaveText(/Finds 0\/\d+/);
  await page.keyboard.press('f');
  await expect(page.locator('#overlay')).toBeHidden();
});
