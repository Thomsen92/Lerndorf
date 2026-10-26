// First-login tutorial, whole flow with the real 3D village and a fake Supabase (dev/tutorial.html),
// at tablet size. One screenshot per step goes to test-results/tutorial/ (set SHOTS_DIR to change).
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = process.env.SHOTS_DIR ?? 'test-results/tutorial';
mkdirSync(SHOTS, { recursive: true });

for (const width of [1180, 820, 390, 320]) {
  test(`compact navigation ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 820 ? 1180 : 844 });
    await page.goto('/dev/tutorial.html?step=done&char=girl');
    const nav = page.getByRole('navigation', { name: 'Hauptmenü' });
    await expect(nav.locator('.nav-btn')).toHaveCount(2);
    await expect(page.locator('#toMarket, .dorf-actions, [data-area="dorf"]')).toHaveCount(0);
    for (const button of await nav.locator('.nav-btn').all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await expect(button.locator('svg')).toBeVisible();
    }
    const avatar = (await nav.locator('.avatar-badge').boundingBox())!;
    const house = (await nav.getByRole('button', { name: 'Mein Haus', exact: true }).boundingBox())!;
    expect(avatar.x).toBeGreaterThan(house.x + house.width);
    expect(avatar.x + avatar.width).toBeLessThanOrEqual(width);
    expect(Math.abs(avatar.y + avatar.height / 2 - house.y - house.height / 2)).toBeLessThan(2);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--nav-left').trim())).toBe('0px');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--nav-bottom').trim())).toBe('0px');
    await page.screenshot({ path: join(SHOTS, `nav-${width}.png`) });
    await nav.getByRole('button', { name: 'Mein Haus', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bauen', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Zurück', exact: true }).click();
    await nav.getByRole('button', { name: /^Aufgaben/ }).click();
    await expect(page.getByRole('button', { name: 'Schließen', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(nav).toBeVisible();
  });
}

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 820, height: 1180 },
])
  test(`tutorial ${viewport.width}: figure, ride, messages, quiz, buy, place, dance, daily quests`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const shot = (name: string) => page.screenshot({ path: join(SHOTS, `${viewport.width}-${name}.png`) });

    await page.goto('/dev/tutorial.html');
    await page.locator('.character-choice').first().waitFor({ timeout: 30_000 });
    await shot('01-figure-picker');
    await page.locator('.character-choice').nth(1).click();

    // Sir Byte greets at the market, then accompanies the pupil to the ruin.
    for (const [i, line] of [
      "Hello! I'm Sir Byte.",
      'Welcome to Lerndorf, your class village!',
      'Ready when you are.',
    ].entries()) {
      await expect(page.locator('.byte-world-bubble')).toContainText(line, { timeout: 60_000 });
      await shot(`02-market-byte-${i}`);
      await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    }
    await expect(page.locator('.byte-world-bubble')).toContainText('Oh no, your house is a ruin!', {
      timeout: 30_000,
    });
    await expect(page.locator('.speech-bubble--sad')).toBeVisible();
    await page.waitForTimeout(800);
    await shot('02-camera-end-sad-bubble');
    for (let i = 0; i < 3; i++) {
      await shot(`03-byte-explanation-${i}`);
      await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    }

    // Three direct-tap questions, including a wrong answer and retry.
    await page.locator('.tutorial-quiz h2').waitFor();
    await expect(page.locator('.tutorial-quiz input, .tutorial-quiz select, #check')).toHaveCount(0);
    await shot('04-quiz-1');
    await page.getByRole('button', { name: 'mouse', exact: true }).click();
    await expect(page.getByText('Leider falsch', { exact: false })).toBeVisible();
    await shot('05-quiz-1-wrong-hint');
    await page.getByRole('button', { name: 'house', exact: true }).click();
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Frage 2 von 3' })).toBeVisible();
    await shot('06-quiz-2-buttons');
    await page.getByRole('button', { name: 'is', exact: true }).click();
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Frage 3 von 3' })).toBeVisible();
    await page.locator('[data-listen]').waitFor();
    await shot('07-quiz-3-listening');
    await page.getByRole('button', { name: 'your new neighbour', exact: true }).click();
    await expect(page.getByText('Super, alles richtig', { exact: false })).toBeVisible();
    await shot('10-quiz-done');
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();

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
    await expect(page.locator('.byte-world-bubble')).toContainText("Now let's do your Daily Quests!", {
      timeout: 30_000,
    });
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
  await page.goto('/dev/tutorial.html?step=place&answered=3&char=girl');
  await page.locator('.build-bar--guided [data-item]').click();
  await page.getByRole('button', { name: 'Haus hinstellen' }).click();
  await page.getByRole('heading', { name: 'Level 2!', exact: true }).waitFor({ timeout: 30_000 });
  await expect(page.locator('.avatar-badge')).toHaveAttribute('aria-label', /Level 2/);
  await page.getByRole('button', { name: 'Truhe öffnen', exact: true }).click();
  await expect(page.getByText('+30 Münzen', { exact: true })).toBeVisible();
  await expect(page.locator('.avatar-badge')).toHaveAttribute('aria-label', /30 Münzen/);
  await expect(page.locator('.quest-rule')).toHaveCount(0);
  await page
    .getByRole('dialog', { name: 'Level 2!', exact: true })
    .getByRole('button', { name: 'Weiter', exact: true })
    .click();
  await expect(page.locator('.quest-rule')).toBeVisible();
});
