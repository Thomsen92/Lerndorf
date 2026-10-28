import { test, expect, type Page } from '@playwright/test';
test.setTimeout(90000);
const story = (page: Page) => page.locator('.ollie-story');
async function open(page: Page) {
  await page.goto('/dev/ollie-shop.html');
  await page.getByRole('button', { name: /Ollie’s travel story/ }).click();
  await expect(story(page)).toBeVisible();
}
async function skip(page: Page) {
  await story(page).getByRole('button', { name: 'Skip audio', exact: true }).click();
}

test('real narrated gap and acknowledgement, resume and reduced motion', async ({ page }, info) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().includes('/story-voice/')) requests.push(r.url());
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await open(page);
  await story(page).getByRole('button', { name: 'Start my story', exact: true }).click();
  await expect(story(page).locator('.ollie-story-portrait')).toHaveAttribute('data-speaking', 'true');
  expect(requests.some((s) => s.includes('d96fb6be183a408304af90c9'))).toBe(false);
  await skip(page);
  await story(page).getByRole('button', { name: 'backpack', exact: true }).click();
  await expect(story(page).locator('.ollie-story-line')).toContainText('Ah yes, backpack!');
  await expect(story(page).locator('.ollie-story-portrait')).toHaveAttribute('data-speaking', 'true');
  await page.screenshot({ path: info.outputPath('ollie-story-reply-tablet.png') });
  await page.keyboard.press('Escape');
  await expect(story(page)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /Ollie’s travel story/ }).click();
  await expect(story(page).locator('.ollie-story-progress')).toHaveText('2 / 9');
  await expect(story(page).locator('.ollie-story-portrait')).toHaveAttribute('data-speaking', 'true');
  expect(
    await story(page)
      .locator('.ollie-story-portrait')
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe('none');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('nine gaps grant souvenir,50coins,80XP once and the souvenir is placeable', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.evaluate(() => (window as any).__ollie.sound.setEnabled(false));
  await story(page).getByRole('button', { name: 'Start my story', exact: true }).click();
  for (const [i, answer] of [
    'backpack',
    'kangaroo',
    'plane',
    'Liberty',
    'Empire',
    'Park',
    'Bridge',
    'Square',
    'backpack',
  ].entries()) {
    await expect(story(page).locator('.ollie-story-progress')).toHaveText(`${i + 1} / 9`);
    await skip(page);
    if (i === 0) {
      await story(page).getByRole('button', { name: 'handbag', exact: true }).click();
      await skip(page);
      await expect(story(page).locator('.ollie-story-status')).toContainText('two straps');
      await expect(story(page).locator('.ollie-story-line')).toContainText('I grew up in Australia.');
    }
    await story(page).getByRole('button', { name: answer, exact: true }).click();
    await skip(page);
    await story(page)
      .getByRole('button', { name: i === 8 ? 'See my souvenir' : 'Carry on, Ollie', exact: true })
      .click();
  }
  await expect(story(page).locator('.ollie-story-gift')).toBeVisible();
  await expect
    .poll(async () => (await story(page).locator('canvas').screenshot()).length)
    .toBeGreaterThan(4000);
  await page.screenshot({ path: info.outputPath('ollie-story-souvenir-mobile.png') });
  expect(
    await page.evaluate(() => ({
      coins: (window as any).__ollie.coins,
      qty: (window as any).__ollie.owned.reward_ollie_nyc_postcard,
      grants: (window as any).__ollie.story.grants,
      xp: (window as any).__ollie.story.awardedXp,
    })),
  ).toEqual({ coins: 550, qty: 1, grants: 1, xp: 80 });
  await story(page).getByRole('button', { name: 'Go to inventory', exact: true }).click();
  const card = page.locator('[data-item=reward_ollie_nyc_postcard]');
  await expect(card).toBeVisible();
  await card.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Place', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__lastBuild)).toBe('reward_ollie_nyc_postcard');
  await page.evaluate(() => (window as any).__ollie.open());
  await page.getByRole('button', { name: /Ollie’s travel story/ }).click();
  await expect(story(page)).toContainText('You have heard this one!');
  expect(await page.evaluate(() => (window as any).__ollie.story.grants)).toBe(1);
});
