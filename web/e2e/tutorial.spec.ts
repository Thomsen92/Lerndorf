// First-login tutorial, whole flow with the real 3D village and a fake Supabase (dev/tutorial.html),
// at tablet size. One screenshot per step goes to test-results/tutorial/ (set SHOTS_DIR to change).
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = process.env.SHOTS_DIR ?? 'test-results/tutorial';
mkdirSync(SHOTS, { recursive: true });

test('tutorial: figure, ride, messages, quiz, buy, place, dance, daily quests', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = (name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

  await page.goto('/dev/tutorial.html');
  await page.locator('.character-choice').first().waitFor({ timeout: 30_000 });
  await shot('01-figure-picker');
  await page.locator('.character-choice').nth(1).click();

  // camera ride ends at the plot: sad bubble over the figure, first message card
  await page.locator('.tutorial-card').waitFor({ timeout: 60_000 });
  await expect(page.locator('.speech-bubble--sad')).toBeVisible();
  await page.waitForTimeout(800);
  await shot('02-camera-end-sad-bubble');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.waitForTimeout(300);
  await shot('03-message-2');
  await page.getByRole('button', { name: 'Weiter' }).click();

  // quiz: five questions, the first one answered wrong once
  await page.locator('.tutorial-quiz h2').waitFor();
  await page.waitForTimeout(300);
  await shot('04-quiz-1');
  await page.locator('input[value="mouse"]').check();
  await page.locator('#check').click();
  await expect(page.getByText('Leider falsch')).toBeVisible();
  await shot('05-quiz-1-wrong-hint');
  await page.locator('input[value="house"]').check();
  await page.locator('#check').click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.locator('#gap').fill('is');
  await shot('06-quiz-2-gap');
  await page.locator('#check').click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.locator('input[value="red"]').check();
  await shot('07-quiz-3');
  await page.locator('#check').click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.locator('select[data-left="dog"]').selectOption('Hund');
  await page.locator('select[data-left="cat"]').selectOption('Katze');
  await page.locator('select[data-left="bird"]').selectOption('Vogel');
  await shot('08-quiz-4-match');
  await page.locator('#check').click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.locator('[data-listen]').waitFor();
  await page.waitForTimeout(1600);
  await shot('09-quiz-5-listening');
  await page.locator('input[value="your new neighbour"]').check();
  await page.locator('#check').click();
  await expect(page.getByText('Super, alles richtig')).toBeVisible();
  await shot('10-quiz-done');
  await page.getByRole('button', { name: 'Weiter' }).click();

  // buy and place the house
  await page.getByRole('button', { name: 'Haus kaufen' }).waitFor();
  await page.waitForTimeout(1500);
  await shot('11-buy-dialog');
  await page.getByRole('button', { name: 'Haus kaufen' }).click();
  await page.locator('.build-bar--guided').waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  await shot('12-place-guided');
  await page.locator('.build-bar [data-item]').click();
  await page.waitForTimeout(800);
  await shot('13-place-preview');
  await page.getByRole('button', { name: 'Haus hinstellen' }).click();
  await page.waitForTimeout(700);
  await shot('14-placed');

  // dance with the happy bubble, then the Daily Quest area opens
  await page.locator('.speech-bubble--happy').waitFor({ timeout: 20_000 });
  await page.waitForTimeout(2600);
  await shot('15-dance-final-bubble');
  await page.getByRole('heading', { name: 'Level 2!', exact: true }).waitFor({ timeout: 30_000 });
  await expect(page.locator('.avatar-badge')).toHaveAttribute('aria-label', /Level 2/);
  await expect(page.locator('.quest-rule')).toHaveCount(0);
  await shot('16-level-2-celebration');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.locator('.quest-rule').waitFor({ timeout: 30_000 });
  await shot('17-daily-quests');

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('resumed placement confirms the XP badge and one chest payment before quests', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/dev/tutorial.html?step=place&answered=5&char=girl');
  await page.locator('.build-bar--guided [data-item]').click();
  await page.getByRole('button', { name: 'Haus hinstellen' }).click();
  await page.getByRole('heading', { name: 'Level 2!', exact: true }).waitFor({ timeout: 30_000 });
  await expect(page.locator('.avatar-badge')).toHaveAttribute('aria-label', /Level 2/);
  await page.getByRole('button', { name: 'Truhe öffnen', exact: true }).click();
  const chest = page.getByRole('dialog', { name: 'Deine Truhe', exact: true });
  await chest.getByRole('button', { name: 'Truhe öffnen', exact: true }).click();
  await expect(page.getByText('+30 Münzen', { exact: true })).toBeVisible();
  await expect(page.locator('.avatar-badge')).toHaveAttribute('aria-label', /30 Münzen/);
  await chest.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('.quest-rule')).toHaveCount(0);
  await page
    .getByRole('dialog', { name: 'Level 2!', exact: true })
    .getByRole('button', { name: 'Weiter', exact: true })
    .click();
  await expect(page.locator('.quest-rule')).toBeVisible();
});
