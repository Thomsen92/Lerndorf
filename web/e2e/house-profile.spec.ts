import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
test.setTimeout(90000);
for (const viewport of [
  { width: 1180, height: 820 },
  { width: 390, height: 844 },
])
  test(`medals and visitor profile ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/dev/awards.html?lang=en');
    await expect(page.locator('[data-art=rank-shield]')).toHaveCount(7);
    await expect(page.locator('[data-art=rank-frame]')).toHaveCount(7);
    mkdirSync('test-results/public-profile', { recursive: true });
    await page.screenshot({
      path: `test-results/public-profile/awards-${viewport.width}.png`,
      fullPage: true,
    });
    await page.locator('[data-level="12"]').click();
    await expect(page.locator('.visitor-profile h3')).toHaveText('Lea');
    await expect(page.locator('.visitor-title')).toHaveText('Grammar Explorer');
    await expect(page.locator('.visitor-title .title-plaque')).toHaveAttribute('data-rank', 'silver');
    await expect(page.locator('.visitor-stats')).toContainText('6 days');
    const box = (await page.locator('.visitor-modal .panel').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    await page.locator('.visitor-modal .panel').evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
    });
    await page.screenshot({ path: `test-results/public-profile/visitor-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('.visitor-modal')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

test('title collection and equipped title fit a narrow touch screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/profile.html?view=profil&lang=en');
  await expect(page.locator('.profile-current-title .title-plaque')).toHaveAttribute('data-rank', 'bronze');
  await page.screenshot({ path: 'test-results/public-profile/own-title-390.png' });
  await page.locator('.profile-current-title').click();
  await expect(page.locator('.collection-grid--titles .title-plaque')).toHaveCount(13);
  const overflowing = await page
    .locator('.collection-grid--titles .title-plaque')
    .evaluateAll((els) => els.some((el) => el.scrollWidth > el.clientWidth + 1));
  expect(overflowing).toBe(false);
  await page.screenshot({ path: 'test-results/public-profile/title-collection-390.png' });
});
test('house cards open a classmate profile and preserve the own house action', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev/tutorial.html?step=done&char=girl&wait=0&lang=en');
  const own = page.locator('.house-card--own');
  await expect(own).toBeVisible({ timeout: 60000 });
  await expect(own.locator('strong')).toHaveText('Fuchs');
  const foreign = page.locator('.house-card:not(.house-card--own):visible').first();
  await page.mouse.move(850, 450);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(250, 450, { steps: 20 });
  await page.mouse.up({ button: 'right' });
  for (let i = 0; i < 3 && !(await foreign.count()); i++) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await expect(foreign).toBeVisible();
  const nickname = await foreign.locator('strong').innerText();
  await foreign.click();
  await expect(page.locator('.visitor-profile h3')).toHaveText(nickname);
  await page.screenshot({ path: 'test-results/public-profile/village-visitor.png' });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(foreign).toBeFocused();
  await page.screenshot({ path: 'test-results/public-profile/house-cards.png' });
  await page.getByRole('button', { name: 'Back to your house', exact: true }).click();
  await own.click();
  await expect(page.getByRole('heading', { name: 'My House', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
