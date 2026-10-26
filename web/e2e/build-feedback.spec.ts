import { test, expect, type Page } from '@playwright/test';
const openBuild = async (page: Page, query = '') => {
  await page.goto(`/dev/build.html${query}`);
  await page.getByRole('button', { name: 'Mein Haus', exact: true }).click();
  await page.getByRole('button', { name: 'Bauen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fertig', exact: true })).toBeVisible();
  await page.waitForTimeout(800);
};
for (const viewport of [
  { width: 1180, height: 820 },
  { width: 820, height: 1180 },
]) {
  test(`building feedback ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const shot = async (name: string) => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: `test-results/build-feedback/${viewport.width}-${name}.png` });
    };
    await openBuild(page);
    await shot('01-slots');
    await page.getByRole('button', { name: 'Deko-Platz 2: leer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Deko-Platz 2' })).toBeFocused();
    await shot('02-sheet');
    await page.getByRole('button', { name: /Katzenschild/ }).click();
    await shot('03-preview');
    await page.evaluate(() => { (window as unknown as { __captureFxAt: number | null }).__captureFxAt = 0.25; });
    await page.getByRole('button', { name: 'Aufstellen', exact: true }).click();
    await expect(page.locator('.build-bar').getByRole('status')).toContainText('Aufgestellt!');
    await page.waitForFunction(() => (window as unknown as { __fxTime: number }).__fxTime >= 0.25);
    await shot('04-pop-smoke');
    await page.evaluate(() => {
      (window as unknown as { __captureFxAt: number | null }).__captureFxAt = null;
    });
    await page.waitForFunction(() => !(window as unknown as { __fxBusy: boolean }).__fxBusy);
    await shot('05-placed');
    await page.evaluate(() => { (window as unknown as { __captureFxAt: number | null }).__captureFxAt = 0.2; });
    await page.getByRole('button', { name: 'Wegräumen', exact: true }).click();
    await page.waitForFunction(() => (window as unknown as { __fxTime: number }).__fxTime >= 0.2);
    await shot('06-shrink');
    await page.getByRole('button', { name: 'Mein Haus', exact: true }).click();
    await page.getByRole('button', { name: 'Zurück', exact: true }).click();
    await page.waitForFunction(() => !(window as unknown as { __fxBusy: boolean }).__fxBusy);
    await page.evaluate(() => {
      (window as unknown as { __captureFxAt: number | null }).__captureFxAt = null;
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Mein Haus', exact: true }).click();
    await page.getByRole('button', { name: 'Bauen', exact: true }).click();
    await page.getByRole('button', { name: 'Deko-Platz 2: leer', exact: true }).click();
    await page.getByRole('button', { name: /Katzenschild/ }).click();
    await page.getByRole('button', { name: 'Aufstellen', exact: true }).click();
    await expect(page.locator('.build-bar').getByRole('status')).toContainText('Aufgestellt!');
    await shot('07-reduced');
    await openBuild(page, '?fail=place_in_slot');
    await page.getByRole('button', { name: 'Deko-Platz 2: leer', exact: true }).click();
    await page.getByRole('button', { name: /Katzenschild/ }).click();
    await page.getByRole('button', { name: 'Aufstellen', exact: true }).click();
    await expect(page.locator('.build-bar').getByRole('status')).toContainText(
      'Das Bauen ist gerade geschlossen.',
    );
    expect(await page.evaluate(() => (window as unknown as { __fxCount: number }).__fxCount)).toBe(0);
    expect(errors).toEqual([]);
  });
}
