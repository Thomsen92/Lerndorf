// Spelling Bee (teacher, 28.10.2026): screenshots of start, round and result in the local harness,
// and the beehive at the market in the real village. Images go to test-results/spelling-bee/.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SHOTS = 'test-results/spelling-bee';
mkdirSync(SHOTS, { recursive: true });
test.setTimeout(120000);

async function tap(page: Page, word: string): Promise<void> {
  for (const c of word) await page.locator(`.bee-cell[data-letter="${c}"]`).click({ force: true });
  await page.locator('[data-enter]').click({ force: true });
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
]) {
  test(`start, round and result at ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize(viewport);
    await page.goto('/dev/spelling-bee.html');
    await expect(page.locator('[data-start]')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/start-${viewport.width}.png` });
    await page.locator('[data-start]').click();
    await expect(page.locator('.bee-cell')).toHaveCount(7);
    // the first round is the practice round: help words and a glowing next letter
    await expect(page.locator('.bee-help b')).toHaveCount(2);
    await expect(page.locator('.bee-cell.glow')).toHaveCount(1);
    await page.locator('.bee-cell.glow').click({ force: true });
    await page.screenshot({ path: `${SHOTS}/practice-${viewport.width}.png` });
    await page.locator('[data-delete]').click({ force: true });
    const words = await page.evaluate(
      () => (window as unknown as { beeDev: { words: string[] } }).beeDev.words,
    );
    const goldenWord = await page.evaluate(
      () => (window as unknown as { beeDev: { golden: string } }).beeDev.golden,
    );
    for (const w of words.filter((x) => x !== goldenWord).slice(0, 5)) await tap(page, w);
    await page.keyboard.type('ab');
    await page.keyboard.press('Enter');
    // the golden word counts double
    await tap(page, goldenWord);
    await expect(page.locator('.bee-found li.golden')).toHaveText(goldenWord);
    await expect(page.locator('.bee-found li')).toHaveCount(6);
    await page.screenshot({ path: `${SHOTS}/round-${viewport.width}.png` });
    await page.locator('[data-stop]').click();
    await expect(page.getByText(/Münzen/).first()).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/result-${viewport.width}.png` });
    await page.locator('[data-board-tab="total"]').click();
    await expect(page.locator('[data-board-panel="total"]')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/board-total-${viewport.width}.png` });
    expect(errors).toEqual([]);
  });
}

test('the beehive stands at the market and opens the Spelling Bee', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dev/tutorial.html?step=done&char=girl&wait=0');
  const shortcut = page.getByRole('button', { name: 'Zu Sir Byte und der Questtafel', exact: true });
  await expect(shortcut).toBeVisible({ timeout: 60000 });
  await shortcut.click();
  const cue = page.locator('.honey');
  // wait until the camera has arrived at the board, then the hive sign must be on screen too
  await expect(page.locator('.quest-board-cue:not(.honey):not(.spooky)')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/market.png` });
  await expect(cue).toBeVisible();
  await cue.click();
  await expect(page.locator('.bee-overlay')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/market-open.png` });
});
