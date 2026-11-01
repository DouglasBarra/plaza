import { test as base, expect } from '@playwright/test';

// Every test gets a fresh browser context (so empty localStorage) and fails
// if the page logs an error or throws, which catches broken WebGL/shader code.
export const test = base.extend({
  pageErrors: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      // Google Fonts may be unreachable offline/in CI; that's not our bug
      if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.location().url + m.text())) errors.push(m.text());
    });
    await use(errors);
    expect(errors, 'page errors').toEqual([]);
  },
  plaza: async ({ page, pageErrors }, use) => {
    void pageErrors;
    // remember every "Task done!" burst: one only shows for a moment, which a
    // slow (software-rendered) frame can swallow whole
    await page.addInitScript(() => {
      window.__rewards = [];
      addEventListener('DOMContentLoaded', () => new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('reward')) window.__rewards.push(n.textContent.trim());
      }).observe(document.body, { childList: true }));
    });
    await page.goto('/?lowpower');
    await expect(page.locator('#dock button')).toHaveCount(6);
    await page.waitForFunction(() => window.__plaza);
    // the first frames compile every shader, which is slow without a GPU;
    // let them finish so the test's timings start from a running plaza
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await use(page);
  },
});

export { expect };

// Open a district from the dock and wait for its panel.
export async function openDistrict(page, name) {
  await page.locator('#dock button', { hasText: name }).click();
  const panel = page.locator('#panel');
  await expect(panel.locator('.pz-panel-tag')).toHaveText(name);
  return panel;
}

// Put you somewhere (x, y, z in meters), as if you'd walked there.
export async function standAt(page, [x, y, z]) {
  await page.evaluate(([x, y, z]) => { const me = window.__plaza.me; me.goal = null; me.position.set(x, y, z); }, [x, y, z]);
}

// The "E …" prompt over your head, once you stand somewhere it applies.
export const prompt = (page) => page.locator('#labels .prompt:not(.is-hidden)');

// Has the "…!" burst (reward) with this text been shown since the page loaded?
export async function expectReward(page, text) {
  await expect.poll(() => page.evaluate(() => window.__rewards), { message: `a "${text}" burst` }).toContain(text);
}
