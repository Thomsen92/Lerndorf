import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
test.use({ storageState: { cookies: [], origins: [] } });
test.setTimeout(60000);
test('English is the default; settings switch and remember both languages', async ({ page }) => {
  await page.goto('/dev/wardrobe.html?house');
  await expect(page.getByRole('button', { name: 'Wardrobe', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Deutsch', exact: true }).click(),
  ]);
  await expect(page.getByRole('button', { name: 'Kleiderschrank', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  expect(await page.evaluate(() => localStorage.getItem('lerndorf.language'))).toBe('de');
  await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'English', exact: true }).click(),
  ]);
  await expect(page.getByRole('button', { name: 'Wardrobe', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Wardrobe', exact: true })).toBeVisible();
});
test('saved outfit IDs survive a language switch and English labels are used', async ({ page }) => {
  await page.goto('/dev/wardrobe.html?house');
  await page.getByRole('button', { name: 'Wardrobe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.locator('[data-tab=extras]').click();
  await page.locator('[data-item=avatar_boy_gold_chain]').click();
  await expect(page.locator('[data-item=avatar_boy_gold_chain]')).toHaveAttribute('aria-pressed', 'true');
  mkdirSync('test-results/languages', { recursive: true });
  await page.screenshot({ path: 'test-results/languages/wardrobe-en.png' });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('wardrobe-demo'))).toContain(
    'avatar_boy_gold_chain',
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Deutsch', exact: true }).click(),
  ]);
  await page.getByRole('button', { name: 'Kleiderschrank', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fertig', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.locator('[data-tab=extras]').click();
  await expect(page.locator('[data-item=avatar_boy_gold_chain]')).toHaveAttribute('aria-pressed', 'true', {
    timeout: 30000,
  });
  await expect(page.getByRole('button', { name: 'Fertig', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'test-results/languages/wardrobe-de.png' });
});
test('English profile and tutorial controls keep learning data intact', async ({ page }) => {
  await page.goto('/dev/profile.html?view=profil');
  await expect(page.getByRole('heading', { name: 'My Profile', exact: true })).toBeVisible();
  await expect(page.locator('.profile-today strong')).toHaveText('2 of 3');
  await page.screenshot({ path: 'test-results/languages/profile-en.png' });
  await page.goto('/dev/tutorial.html?step=quiz&answered=0&char=boy');
  await expect(page.getByRole('heading', { name: 'Question 1 of 3', exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator('.tutorial-prompt')).toHaveText("What is 'Haus' in English?");
  await page.screenshot({ path: 'test-results/languages/tutorial-en.png' });
});
