// Screenshots of the Daily Quest area and the teacher panel (CLAUDE.md: Playwright screenshot
// for UI changes). Runs against the dev-only harness dev/quests.html with a fake Supabase client
// (project "harness" in playwright.config.ts). Set SHOTS_DIR to choose where the PNGs go.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = process.env.SHOTS_DIR ?? 'test-results/shots';
mkdirSync(SHOTS, { recursive: true });

const SIZES = [
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'phone', width: 390, height: 844 },
];

async function openPupil(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev/quests.html?view=pupil&nospeech');
  await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();
  return errors;
}

for (const size of SIZES) {
  test(`daily quests ${size.name}: today, catch-up, listening fallback, wrong answer`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    const errors = await openPupil(page);
    await expect(page.getByRole('heading', { name: 'Nachholen von gestern' })).toBeVisible();
    await expect(page.locator('.quest-card.solved')).toHaveCount(1);

    await page.locator('[data-open="2026-11-09:mon-2"]').click();
    await page.locator('[data-listen]').click();
    const fallback = page.locator('.quest-fallback');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('Dein Gerät kann nicht vorlesen');
    await page.screenshot({ path: join(SHOTS, `quests-${size.name}.png`) });
    // the area scrolls inside its overlay: second picture of the lower part (catch-up quests)
    await page.locator('.overlay').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.screenshot({ path: join(SHOTS, `quests-${size.name}-bottom.png`) });

    await page.locator('.quest-body .choices input[type="radio"]').first().check();
    await page.locator('#check').click();
    const feedback = page.locator('.quest-body .quest-feedback');
    await expect(feedback).toContainText('Leider falsch. Tipp:');
    await feedback.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(SHOTS, `quests-${size.name}-wrong.png`) });

    // no element wider than the viewport
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('teacher daily quests panel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/dev/quests.html?view=teacher');
  await expect(page.getByText('Daily Quests vorhanden bis So 15.11.')).toBeVisible();
  await expect(page.getByText('Ferien, keine Quests.')).toBeVisible();
  await page.screenshot({ path: join(SHOTS, 'teacher-quests.png'), fullPage: true });
  expect(errors).toEqual([]);
});
