import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
test.setTimeout(90000);
test.use({ hasTouch: true });
test('tablet village camera buttons work and normal village load remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev/tutorial.html?step=done&char=girl&wait=0');
  const tools = page.locator('.camera-tools');
  await expect(tools).toBeVisible({ timeout: 60000 });
  await tools.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  await tools.getByRole('button', { name: 'Verkleinern', exact: true }).click();
  await tools.getByRole('button', { name: 'Zum eigenen Haus', exact: true }).click();
  await expect(page.locator('.stage canvas')).toBeVisible();
  mkdirSync('test-results/tablet', { recursive: true });
  await page.screenshot({ path: 'test-results/tablet/village-camera.png' });
  expect(errors).toEqual([]);
});
test('tablet pinch zoom changes the view and reset restores it without changing the outfit', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 820, height: 1180 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev/wardrobe.html?character=girl');
  await expect(page.getByRole('button', { name: 'Fertig', exact: true })).toBeEnabled({ timeout: 60000 });
  const canvas = page.locator('.wardrobe-stage canvas'),
    before = await canvas.screenshot(),
    box = (await canvas.boundingBox())!;
  const session = await context.newCDPSession(page),
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 40, y, id: 1 },
      { x: x + 40, y, id: 2 },
    ],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 85, y, id: 1 },
      { x: x + 85, y, id: 2 },
    ],
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.getByRole('button', { name: 'Ansicht zurücksetzen', exact: true }).click();
  expect((await canvas.screenshot()).equals(before)).toBe(true);
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  mkdirSync('test-results/tablet', { recursive: true });
  await page.screenshot({ path: 'test-results/tablet/wardrobe-zoom.png' });
  expect(await page.locator('body').getAttribute('data-saved')).toBeNull();
  expect(errors).toEqual([]);
  await session.detach();
});
const ready = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('button', { name: 'Fertig', exact: true })).toBeEnabled({ timeout: 60000 });
};
for (const character of ['boy', 'girl'])
  test(`${character}: one tap, rotation, persistence and return to house`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/dev/wardrobe.html?character=${character}&house`);
    await page.getByRole('button', { name: 'Kleiderschrank', exact: true }).click();
    await ready(page);
    const id = character === 'boy' ? 'avatar_boy_feathered_helmet' : 'avatar_girl_daisy_bucket';
    await page.locator(`[data-item=${id}]`).click();
    await ready(page);
    await expect(page.locator(`[data-item=${id}]`)).toHaveAttribute('aria-pressed', 'true');
    const canvas = page.locator('.wardrobe-stage canvas');
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Nach links drehen' }).click();
    mkdirSync('test-results/wardrobe', { recursive: true });
    await page.screenshot({ path: `test-results/wardrobe/${character}-equipped.png` });
    await page.getByRole('button', { name: 'Fertig', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Kleiderschrank', exact: true })).toBeVisible();
    await expect(canvas).toHaveCount(0);
    expect(await page.locator('body').getAttribute('data-saved')).toContain(id);
    await page.reload();
    await page.getByRole('button', { name: 'Kleiderschrank', exact: true }).click();
    await ready(page);
    await expect(page.locator(`[data-item=${id}]`)).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });
test('buy through existing shop then wear the purchased item', async ({ page }) => {
  await page.goto('/dev/wardrobe.html?empty');
  await ready(page);
  await expect(page.locator('[data-item]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zum Shop', exact: true }).click();
  await page.locator('[data-item=avatar_boy_gold_chain]').click();
  await page.getByRole('button', { name: 'Kaufen für 100 Münzen', exact: true }).click();
  await page.getByRole('button', { name: 'Ja, kaufen', exact: true }).click();
  await page.getByRole('button', { name: 'Zum Kleiderschrank', exact: true }).click();
  await ready(page);
  await expect(page.locator('[data-item=avatar_boy_gold_chain]')).toHaveAttribute('aria-pressed', 'true');
});
test('skinned clothing switches, original returns, and errors keep the draft', async ({ page }) => {
  await page.goto('/dev/wardrobe.html?character=girl&fail');
  await ready(page);
  await page.locator('[data-tab=clothing]').click();
  for (const id of ['avatar_girl_slim_jeans', 'avatar_girl_pleated_skirt']) {
    await page.locator(`[data-item=${id}]`).click();
    await ready(page);
    await expect(page.locator(`[data-item=${id}]`)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.screenshot({ path: 'test-results/wardrobe/girl-skirt.png' });
  await page.getByRole('button', { name: 'Fertig', exact: true }).click();
  await expect(page.locator('.wardrobe-status')).toContainText('nicht gespeichert');
  await expect(page.locator('[data-item=avatar_girl_pleated_skirt]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '← Zurück', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter anziehen', exact: true }).click();
  await page.getByRole('button', { name: 'Originalkleidung', exact: true }).click();
  await ready(page);
});
for (const [w, h] of [
  [1024, 768],
  [768, 1024],
  [820, 1180],
  [390, 844],
])
  test(`touch layout ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/dev/wardrobe.html?character=girl');
    await ready(page);
    await expect(page.getByRole('button', { name: 'Fertig', exact: true })).toBeInViewport();
    await page.locator('[data-tab=colors]').click();
    await page.getByRole('button', { name: 'Haare: #5b3a29', exact: true }).tap();
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/wardrobe/tablet-${w}-${h}.png` });
  });
test('ten room visits release their WebGL contexts', async ({ page }) => {
  await page.addInitScript(() => {
    const seen = new WeakSet<object>(),
      counts = { created: 0, lost: 0 };
    (window as unknown as { contextCounts: typeof counts }).contextCounts = counts;
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: unknown[]) {
      const context = Reflect.apply(get, this, args);
      if (context && String(args[0]).startsWith('webgl') && !seen.has(context)) {
        seen.add(context);
        counts.created++;
        this.addEventListener('webglcontextlost', () => counts.lost++);
      }
      return context;
    } as typeof get;
  });
  await page.goto('/dev/wardrobe.html?house');
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Kleiderschrank', exact: true }).click();
    await ready(page);
    await page.locator('[data-action=back]').click();
    await expect(page.locator('.wardrobe-stage canvas')).toHaveCount(0);
  }
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = (window as unknown as { contextCounts: { created: number; lost: number } }).contextCounts;
        return c.created - c.lost;
      }),
    )
    .toBe(0);
});
