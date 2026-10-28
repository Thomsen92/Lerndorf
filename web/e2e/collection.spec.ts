// "My Almanac" (28.10.2026): the book opens, chapters by rarity, dark undiscovered cards, a card's
// own spread with one 3D preview at a time, clean Escape order, and the card reveal of the LearnPass.
import { test, expect } from '@playwright/test';
test.setTimeout(120000);

test('almanac book: chapters, dark undiscovered cards, card spread and one 3D preview', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev/collection.html');
  await expect(page.locator('.almanac-book')).toBeVisible();
  await expect(page.locator('.almanac-ribbon')).toHaveCount(4);
  await expect(page.getByText('5 von 50 Karten entdeckt')).toBeVisible();
  await page.waitForTimeout(1200); // the cover has swung open
  await page.screenshot({ path: info.outputPath('almanac-open.png') });

  // undiscovered cards are dark and cannot be opened
  const locked = page.locator('.almanac-card.locked').first();
  await expect(locked).toBeDisabled();
  await expect(locked.locator('img')).toHaveCount(0);

  await page.locator('.almanac-card[data-card-id="night-light"]').click();
  await expect(page.getByText('TWINKLE', { exact: false }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('almanac-card.png') });
  const open3d = page.getByRole('button', { name: 'In 3D ansehen' });
  await open3d.click();
  await expect(page.locator('.card-preview-canvas')).toBeVisible();
  await page.waitForFunction(
    () => document.querySelector<HTMLElement>('.card-preview-status')?.hidden === true,
    null,
    { timeout: 30000 },
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('.card-preview')).toHaveCount(0);
  await expect(open3d).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.almanac')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (window as unknown as { collectionDev: { open(): void } }).collectionDev.open());
  await page.locator('.almanac-ribbon.epic').click();
  await page.screenshot({ path: info.outputPath('almanac-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('a drawn card: dark mystery, then it turns over and leads to the almanac', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev/collection.html?reveal=bat-cat');
  await expect(page.getByText('Eine Karte wird gezogen …')).toBeVisible();
  await page.screenshot({ path: info.outputPath('reveal-mystery.png') });
  await expect(page.getByText('Neu entdeckt!')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: info.outputPath('reveal-card.png') });
  await page.getByRole('button', { name: 'Zum Almanach' }).click();
  await expect(page.locator('.almanac-book')).toBeVisible();
  expect(errors).toEqual([]);
});
