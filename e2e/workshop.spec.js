import { test, expect, standAt, prompt } from './fixtures.js';

const state = (page) => page.evaluate(() => window.__plaza.state());
const inRoom = (page) => expect(page.locator('body')).toHaveClass(/in-room/);
// the notes on the idea wall that are real ideas (the rest is string)
const notes = (page) => page.evaluate(() => window.__plaza.room().boards[0].notes.children.filter((n) => n.userData.idea).map((n) => n.userData.idea.title));

async function enterWorkshop(page) {
  await standAt(page, await page.evaluate(() => window.__plaza.door('ideas')));
  await expect(prompt(page)).toContainText('Enter Ideas');
  await page.keyboard.press('e');
  await inRoom(page);
  // let the ink wipe finish, so what we read is the room and not the fading plaza
  await page.waitForFunction(() => !window.__plaza.state().transitioning);
  expect((await state(page)).room).toBe('ideas');
}

// Put you on the lamp room's floor, which standAt can't do: it's upstairs.
async function standInLampRoom(page, [x, z]) {
  await page.evaluate(([x, z]) => {
    const me = window.__plaza.me;
    me.goal = null;
    me.level = 1;
    me.position.set(x, window.__plaza.room().levels.height, z);
  }, [x, z]);
}

test('every idea is a note on the workshop wall', async ({ plaza: page }) => {
  await enterWorkshop(page);
  // the sample ideas, newest first: one note each, with its own words on it
  expect(await notes(page)).toEqual(['A plaza where my life lives', 'Postcard club with friends', 'Learn to draw like Hidden Folks']);

  await standAt(page, [1.3, 0, -2.9]);
  await expect(prompt(page)).toContainText('Look over the idea wall');
  await page.keyboard.press('e');
  await expect(page.locator('#panel .pz-panel-tag')).toHaveText('Ideas');
  await expect(page.locator('#panel .pz-panel-title')).toHaveText('Idea box');
  await expect(page.locator('#panel')).toContainText('A plaza where my life lives');
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();

  await standAt(page, [0, 0, 4.4]);
  await expect(prompt(page)).toContainText('Back to the plaza');
});

test('the keeper is always in, and says what the newest idea is', async ({ plaza: page }) => {
  await enterWorkshop(page);
  await page.evaluate(() => window.__plaza.clock(3));     // the small hours: she keeps the light
  // stand where she is pacing (she walks up and down in front of the wall)
  const at = await page.evaluate(() => {
    const k = window.__plaza.room().speakers[0].object;
    return [k.position.x, 0, k.position.z + 1.1];
  });
  await standAt(page, at);
  await expect(page.locator('.speech')).toContainText('A plaza where my life lives');
  await expect(page.locator('.speech')).toContainText('Still awake?');
});

test('the bench and the chalkboard are both worth a look', async ({ plaza: page }) => {
  await enterWorkshop(page);
  await standAt(page, [2.6, 0, 0.4]);
  await expect(prompt(page)).toContainText("See what's on the bench");
  await page.keyboard.press('e');
  await expect(page.locator('#panel .pz-panel-title')).toHaveText('Idea box');
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();

  // the chalkboard is a station that changes the room instead of opening a card
  const sketch = () => page.evaluate(() => window.__plaza.room().chalk.kind());
  const before = await sketch();
  await standAt(page, [-4.4, 0, 1.7]);
  await expect(prompt(page)).toContainText('Rub out the chalkboard');
  await page.keyboard.press('e');
  await expect(page.locator('#overlay')).toBeHidden();
  expect(await sketch()).not.toBe(before);
});

test('the stair goes up to the lamp room, and the clockwork can be wound', async ({ plaza: page }) => {
  await enterWorkshop(page);

  // the stair is walkable all the way round: no step on it is a step too big,
  // and it arrives on the lamp room's floor
  const climb = await page.evaluate(() => {
    const r = window.__plaza.room();
    let level = 0, y = 0, biggest = 0;
    for (let i = 0; i <= 300; i++) {
      const th = 0.46 + (i / 300) * (Math.PI * 2 - 0.02);
      const g = r.heightAt(-3.3 + Math.sin(th) * 1.6, -2.3 + Math.cos(th) * 1.6, level);
      biggest = Math.max(biggest, Math.abs(g.y - y));
      y = g.y;
      level = g.level;
    }
    return { y: +y.toFixed(2), level, biggest: +biggest.toFixed(2), height: r.levels.height };
  });
  expect(climb.biggest).toBeLessThan(0.6);
  expect(climb.level).toBe(1);
  expect(climb.y).toBeCloseTo(climb.height, 1);

  // upstairs: the log holds the same ideas, and the lamp's weight winds up
  await standInLampRoom(page, [-2.11, -1.66]);
  await expect(prompt(page)).toContainText("Read the keeper's log");
  await page.keyboard.press('e');
  await expect(page.locator('#panel .pz-panel-title')).toHaveText('Idea box');
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();

  const weight = () => page.evaluate(() => window.__plaza.room().weight());
  const hanging = await weight();
  await standInLampRoom(page, [-3.26, -3.8]);
  await expect(prompt(page)).toContainText('Wind up');
  await page.keyboard.press('e');
  await expect.poll(weight).toBeLessThan(hanging);
});
