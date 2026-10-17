// Smoke tests on the built app. No Supabase is configured in CI for this run,
// so the tests check what must work without a backend: pages load, no uncaught errors,
// and nothing of the village shows before a login.
import { test, expect } from '@playwright/test';

test('pupil page loads without uncaught errors and shows no village before login', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/Lerndorf/');
  // Without configuration the page shows a message, with configuration the login form.
  const body = page.locator('#app');
  await expect(body).not.toBeEmpty();
  await expect(page.locator('canvas')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('teacher page loads and shows a message or the login form', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/Lerndorf/lehrer/');
  await expect(page.locator('#app')).not.toBeEmpty();
  expect(errors).toEqual([]);
});
