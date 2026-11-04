import { test, expect, openDistrict, expectReward } from './fixtures.js';

// Pin the calendar so "today", "overdue" and "tomorrow" are stable.
// Only Date is shifted; timers and animation frames are left alone
// (page.clock slows the WebGL render loop down a lot).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(shiftDate, '2026-03-10T10:00:00');
});

function shiftDate(iso) {
  const RealDate = Date;
  const offset = new RealDate(iso).getTime() - RealDate.now();
  class ShiftedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [RealDate.now() + offset])); }
    static now() { return RealDate.now() + offset; }
  }
  globalThis.Date = ShiftedDate;
}

async function addTask(panel, title, due) {
  await panel.getByLabel('New task').fill(title);
  if (due) await panel.getByLabel('Due date', { exact: true }).fill(due);
  await panel.getByRole('button', { name: 'Add' }).click();
}

const rows = (panel) => panel.locator('.td-row .t');

test('add a task for today and see the plaza react', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'ToDos');
  await expect(panel).toContainText('Nothing due today.');
  await expect(panel.getByLabel('New task')).toBeFocused();

  await addTask(panel, 'Water the plants');
  await expect(rows(panel)).toHaveText(['Water the plants']);
  await expect(panel.locator('.td-row .td-chip')).toHaveText('Today');
  await expect(panel.getByRole('tab', { name: /Today/ })).toContainText('1');

  await expect(page.locator('#labels .label.pz-d-todo')).toContainText('1 due today');
  await expect(page.locator('#greeting-line')).toContainText('1 thing needs you today.');
});

test('typing in the task field does not trigger plaza shortcuts', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'ToDos');
  await panel.getByLabel('New task').pressSequentially('Buy 2 eggs');
  await expect(panel.locator('.pz-panel-tag')).toHaveText('ToDos');
  await expect(panel.getByLabel('New task')).toHaveValue('Buy 2 eggs');
});

test('empty titles are ignored', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'ToDos');
  await addTask(panel, '   ');
  await expect(panel.locator('.td-row')).toHaveCount(0);
});

test('tasks are grouped by due date across tabs', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'ToDos');
  await addTask(panel, 'Pay the fine', '2026-03-01');
  await addTask(panel, 'Call mom', '2026-03-11');
  await addTask(panel, 'Dentist', '2026-04-20');

  // Today tab shows overdue (and today)
  await expect(panel.locator('.td-section')).toHaveText(['Overdue']);
  await expect(rows(panel)).toHaveText(['Pay the fine']);
  await expect(panel.locator('.td-chip.late')).toHaveText('Overdue');
  await expect(page.locator('#labels .label.pz-d-todo')).toContainText('1 overdue');
  await expect(page.locator('#greeting-line')).toContainText('1 task is overdue.');

  await panel.getByRole('tab', { name: /Upcoming/ }).click();
  await expect(rows(panel)).toHaveText(['Call mom', 'Dentist']);
  await expect(panel.locator('.td-chip').first()).toHaveText('Tomorrow');

  // a task added without a date outside the Today tab is "anytime"
  await addTask(panel, 'Learn to juggle');
  await expect(panel.locator('.td-section')).toHaveText(['Coming up', 'Anytime']);
  await expect(panel.locator('.td-chip.empty')).toHaveText('Add date');
});

test('complete, undo, edit, delete and clear tasks', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'ToDos');
  await addTask(panel, 'Write report');
  await addTask(panel, 'Read a book');

  // edit
  await panel.locator('.td-row .t', { hasText: 'Read a book' }).click();
  const edit = panel.getByLabel('Edit task');
  await edit.fill('Read two books');
  await edit.press('Enter');
  await expect(rows(panel)).toHaveText(['Write report', 'Read two books']);

  // escape cancels an edit without leaving the district
  await panel.locator('.td-row .t', { hasText: 'Write report' }).click();
  await panel.getByLabel('Edit task').fill('nope');
  await panel.getByLabel('Edit task').press('Escape');
  await expect(rows(panel)).toHaveText(['Write report', 'Read two books']);
  await expect(page.locator('#overlay')).toBeVisible();

  // complete one
  await panel.getByRole('button', { name: 'Mark done: Write report' }).click();
  await expectReward(page, 'Task done!');
  await expect(rows(panel)).toHaveText(['Read two books']);

  await panel.getByRole('tab', { name: /Done/ }).click();
  await expect(rows(panel)).toHaveText(['Write report']);

  // undo it
  await panel.getByRole('button', { name: 'Mark not done: Write report' }).click();
  await expect(panel).toContainText('Finished tasks land here.');

  // delete
  await panel.getByRole('tab', { name: /Today/ }).click();
  await panel.getByRole('button', { name: 'Delete: Read two books' }).click();
  await expect(rows(panel)).toHaveText(['Write report']);

  // complete and clear
  await panel.getByRole('button', { name: 'Mark done: Write report' }).click();
  await panel.getByRole('tab', { name: /Done/ }).click();
  await panel.getByRole('button', { name: 'Clear done tasks' }).click();
  await expect(panel).toContainText('Finished tasks land here.');
  await expect(page.locator('#labels .label.pz-d-todo')).toContainText('All clear');
});

test('change a task due date from its row, then clear it', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'ToDos');
  await addTask(panel, 'Fix the gate');
  await expect(panel.locator('.td-row .td-chip')).toHaveText('Today');

  // the chip opens the date input hidden beside it: a new date moves the task
  await panel.locator('.td-row .td-date-hidden').fill('2026-03-11');
  await expect(panel).toContainText('Nothing due today.');
  await expect(page.locator('#labels .label.pz-d-todo')).toContainText('1 open');

  await panel.getByRole('tab', { name: /Upcoming/ }).click();
  await expect(panel.locator('.td-section')).toHaveText(['Coming up']);
  await expect(rows(panel)).toHaveText(['Fix the gate']);
  await expect(panel.locator('.td-row .td-chip')).toHaveText('Tomorrow');

  // clearing the date makes it an "anytime" task
  await panel.locator('.td-row .td-date-hidden').fill('');
  await expect(panel.locator('.td-section')).toHaveText(['Anytime']);
  await expect(panel.locator('.td-row .td-chip')).toHaveText('Add date');
});

test('escape leaves the district even from the task field', async ({ plaza: page }) => {
  const panel = await openDistrict(page, 'ToDos');
  await expect(panel.getByLabel('New task')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/app-open/);
});

test('tasks survive a reload', async ({ plaza: page }) => {
  let panel = await openDistrict(page, 'ToDos');
  await addTask(panel, 'Remember me');
  await expect(rows(panel)).toHaveText(['Remember me']);

  await page.reload();
  await expect(page.locator('#labels .label.pz-d-todo')).toContainText('1 due today');
  panel = await openDistrict(page, 'ToDos');
  await expect(rows(panel)).toHaveText(['Remember me']);
});
