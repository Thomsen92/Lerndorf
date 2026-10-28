// Package 6 acceptance: cover, 50 cards, filters, detail, 3D preview and clean Escape order.
import { test, expect } from '@playwright/test';
test.setTimeout(120000);

test('almanach opens the card detail and one 3D preview at a time', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev/collection.html');
  await expect(page.locator('.collection-cover-image')).toBeVisible();
  await page.screenshot({ path: info.outputPath('collection-cover.png') });
  await page.getByRole('button', { name: 'Almanach öffnen' }).click();
  await expect(page.locator('.collection-card')).toHaveCount(50);
  await page.screenshot({ path: info.outputPath('collection-grid.png') });

  await page.locator('input[type=search]').fill('The Star');
  await page.locator('.collection-card').first().click();
  await expect(page.getByText('Classic verse')).toBeVisible();
  const open3d = page.getByRole('button', { name: 'In 3D ansehen' });
  await open3d.click();
  await expect(page.locator('.card-preview-canvas')).toBeVisible();
  await page.waitForFunction(
    () => document.querySelector<HTMLElement>('.card-preview-status')?.hidden === true,
    null,
    { timeout: 30000 },
  );
  await page.screenshot({ path: info.outputPath('collection-card-3d.png') });
  await page.keyboard.press('Escape');
  await expect(page.locator('.card-preview')).toHaveCount(0);
  await expect(page.getByText('Classic verse')).toBeVisible();
  await expect(open3d).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.collection-view')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (window as unknown as { collectionDev: { open(): void } }).collectionDev.open());
  await page.getByRole('button', { name: 'Almanach öffnen' }).click();
  await page.screenshot({ path: info.outputPath('collection-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
