import { test, expect, standAt, prompt } from './fixtures.js';

const state = (page) => page.evaluate(() => window.__plaza.state());
const inRoom = (page) => expect(page.locator('body')).toHaveClass(/in-room/);
const says = (page) => page.evaluate(() => window.__plaza.room().speakers[0].text());
// what the live things are showing: letters standing in the pigeonholes, and
// bundles on the shelf of what nobody has claimed
const showing = (page) => page.evaluate(() => {
  const r = window.__plaza.room();
  return { letters: r.rack.letters.count, bundles: r.shelf.bundles.filter((b) => b.visible).length };
});
const card = (page) => page.locator('#panel');
const closeCard = async (page) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();
};

// Walk in by the door, with the clock set so the counter is open (8 to 4).
async function enterPostOffice(page, hour = 10) {
  await page.evaluate((h) => window.__plaza.clock(h), hour);
  await standAt(page, await page.evaluate(() => window.__plaza.door('people')));
  await expect(prompt(page)).toContainText('Enter People');
  await page.keyboard.press('e');
  await inRoom(page);
  await page.waitForFunction(() => !window.__plaza.state().transitioning);
  expect((await state(page)).room).toBe('people');
}

test('walk into the post office and ask the postmaster for your post', async ({ plaza: page }) => {
  await enterPostOffice(page);

  await standAt(page, [-3.4, 0, 2.7]); // at the counter window
  await expect(prompt(page)).toContainText('Ask the postmaster for your post');
  await page.keyboard.press('e');
  await expect(card(page).locator('.pz-panel-tag')).toHaveText('People');
  // the tests run without Plaza's server, so the office is closed
  await expect(card(page)).toContainText("Plaza's server isn't running");
  await closeCard(page);

  await standAt(page, [0, 0, 4.4]); // the doormat, just inside the door
  await expect(prompt(page)).toContainText('Back to the plaza');
  await page.keyboard.press('e');
  await expect(page.locator('body')).not.toHaveClass(/in-room/);
  expect((await state(page)).room).toBe(null);
});

test('with no server the office is shut, tidy and quiet about it', async ({ plaza: page }) => {
  await enterPostOffice(page);
  // nothing in the pigeonholes and nothing unclaimed, and the postmaster says why
  expect(await showing(page)).toEqual({ letters: 0, bundles: 0 });
  await expect.poll(() => says(page)).toContain("Plaza's server isn't running");

  // out of hours he is simply away, and the office empties
  await page.evaluate(() => window.__plaza.clock(21));
  expect(await says(page)).toBe("The counter is closed. I'm back at 8:00.");
  await page.waitForFunction(() => !window.__plaza.room().speakers[0].object.visible);
});

test('the pigeonholes, the shelf and the bell each do their own thing', async ({ plaza: page }) => {
  await enterPostOffice(page);
  // every station opens People on the tab that matches what you walked up to
  const stations = await page.evaluate(() => window.__plaza.room().stations.map((s) => [s.label, s.app ?? null, s.tab ?? null]));
  expect(stations).toEqual([
    ['Ask the postmaster for your post', 'people', 'waiting'],
    ['Ring the bell for fresh post', null, null],
    ['Look through the pigeonholes', 'people', 'recent'],
    ['Look over the unclaimed shelf', 'people', 'quiet'],
  ]);

  await standAt(page, [-2.4, 0, -3.5]); // in front of the pigeonholes
  await expect(prompt(page)).toContainText('Look through the pigeonholes');
  await page.keyboard.press('e');
  await expect(card(page).locator('.pz-panel-tag')).toHaveText('People');
  await closeCard(page);

  await standAt(page, [3.4, 0, -3.5]); // the shelf of what nobody has claimed
  await expect(prompt(page)).toContainText('Look over the unclaimed shelf');
  await page.keyboard.press('e');
  await expect(card(page).locator('.pz-panel-tag')).toHaveText('People');
  await closeCard(page);

  // the bell asks for the post again; with no server it opens the card instead
  await standAt(page, [-5.4, 0, 2.7]);
  await expect(prompt(page)).toContainText('Ring the bell for fresh post');
  await page.keyboard.press('e');
  await expect(card(page)).toContainText("Plaza's server isn't running");
  await closeCard(page);
});

test('the post fills the holes and the shelf, and a station picks the tab', async ({ plaza: page }) => {
  // stand in for Plaza's server: two chats waiting, one read, two gone quiet
  const day = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const chat = (id, title, unread, last) => ({ id, network: 'whatsapp', title, group: false, unread, muted: false, last, preview: { text: 'tomorrow then', mine: false, sender: null } });
  await page.route('**/api/people', (route) => route.fulfill({
    json: {
      loggedIn: true,
      running: true,
      accounts: [{ id: 'a1', network: 'whatsapp', status: 'connected', me: 'You' }],
      chats: [chat('c1', 'Marina Alves', 2, day(0)), chat('c2', 'Teo', 1, day(0)), chat('c3', 'Dad', 0, day(2))],
      quiet: [chat('c4', 'Beatriz Lima', 0, day(40)), chat('c5', 'Vini', 0, day(60))],
    },
  }));
  // people.js reads /api/people once as it loads and then only every five
  // minutes, so the page has to start again for the stub to be what it reads
  await page.reload();
  await page.waitForFunction(() => window.__plaza);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await enterPostOffice(page);

  // the unclaimed shelf opens People's Quiet lately tab
  await standAt(page, [3.4, 0, -3.5]);
  // wait for the prompt: what E does is worked out in the frame loop, and at
  // ?lowpower a frame is 83 ms, so pressing it right away uses the old action
  await expect(prompt(page)).toContainText('Look over the unclaimed shelf');
  await page.keyboard.press('e');
  await expect(card(page).locator('[role="tab"][aria-selected="true"]')).toContainText('Quiet lately');
  await expect(card(page)).toContainText('Beatriz Lima');
  await closeCard(page);

  // three letters standing in two holes, a bundle for each chat gone quiet
  await expect.poll(() => showing(page)).toEqual({ letters: 3, bundles: 2 });
  expect(await says(page)).toContain('Marina Alves');

  // and the counter opens the Waiting tab
  await standAt(page, [-3.4, 0, 2.7]);
  await expect(prompt(page)).toContainText('Ask the postmaster for your post');
  await page.keyboard.press('e');
  await expect(card(page).locator('[role="tab"][aria-selected="true"]')).toContainText('Waiting');
  await expect(card(page)).toContainText('Teo');
  await closeCard(page);
});
