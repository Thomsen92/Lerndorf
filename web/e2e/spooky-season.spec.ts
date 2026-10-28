// Package S4: ticket → welcome → quiz → wrong answer with hint → all ten → 150 XP and tier 5,
// with the local Edge-TTS clips and on tablet and phone sizes without horizontal scrolling.
import { test, expect, type Page } from '@playwright/test';
test.setTimeout(120000);

const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('spooky quiz from the ticket to 150 XP', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const clips: number[] = [];
  page.on('response', (r) => {
    if (r.url().endsWith('.mp3')) clips.push(r.status());
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/dev/spooky-quiz.html');
  await page.waitForFunction(
    () => (window as unknown as { spookyHarness?: { ready: boolean } }).spookyHarness?.ready,
  );
  await page.locator('.season-world-ticket').click();
  await expect(page.getByRole('heading', { name: 'Welcome to Season I – Halloween!' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('spooky-welcome.png') });
  await page.locator('[data-open-quiz]').click();
  await expect(page.getByText('Question 1 of 10')).toBeVisible();
  await page.screenshot({ path: info.outputPath('spooky-question.png') });

  const solution = (id: string) =>
    page.evaluate(
      (q) =>
        (window as unknown as { spookyHarness: { solution(id: string): string } }).spookyHarness.solution(q),
      id,
    );
  const ids = [
    'odd-characters',
    'odd-animals',
    'scarier-than',
    'biggest-pumpkin',
    'british-american-sweets',
    'british-american-colour',
    'listen-trick-or-treat',
    'listen-happy-halloween',
    'listen-dressing-up',
    'listen-sweets',
  ];
  for (const [i, id] of ids.entries()) {
    await expect(page.getByText(`Question ${i + 1} of 10`)).toBeVisible();
    const right = await solution(id);
    if (i === 0) {
      await page.locator('.spooky-option', { hasText: 'ghost' }).click();
      await expect(page.locator('.spooky-status')).toContainText('Hint: You can ride one of these.');
      await page.screenshot({ path: info.outputPath('spooky-hint.png') });
    }
    if (id.startsWith('listen')) {
      await expect(page.locator('.spooky-play')).toBeVisible();
      await page.locator('.spooky-play').click();
      if (id === 'listen-trick-or-treat') {
        await page.setViewportSize({ width: 390, height: 844 });
        expect(await noSideScroll(page)).toBe(true);
        await page.screenshot({ path: info.outputPath('spooky-listening-phone.png') });
        await page.setViewportSize({ width: 1024, height: 768 });
        expect(await noSideScroll(page)).toBe(true);
        await page.setViewportSize({ width: 768, height: 1024 });
      }
    }
    await page.locator('.spooky-option', { hasText: right }).click();
    await expect(page.locator('.spooky-status')).toContainText(
      i === 9 ? 'Correct! +60 XP' : 'Correct! +10 XP',
    );
    if (i === 9) {
      // the last answer pops up the big „Success!“ with confetti (the fanfare plays with it)
      await expect(page.locator('.celebration.spooky .celebration-title')).toHaveText('Success!');
      await page.waitForTimeout(900);
      await page.screenshot({ path: info.outputPath('spooky-success.png') });
    }
    await page.locator('.spooky-next').click();
  }
  await expect(page.getByText('150 XP earned · Tier 5 reached')).toBeVisible();
  await page.screenshot({ path: info.outputPath('spooky-done.png') });
  await page.locator('[data-open-pass]').click();
  await expect(page.locator('#pass')).toHaveText('LearnPass opened');
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
  await expect(page.locator('.season-world-ticket')).toBeFocused();
  expect(clips.length).toBeGreaterThanOrEqual(4);
  expect(clips.every((s) => s === 200 || s === 206 || s === 304)).toBe(true);
  expect(errors).toEqual([]);
});

test('a planned season keeps the quiz locked', async ({ page }) => {
  await page.goto('/dev/spooky-quiz.html?state=upcoming');
  await page.locator('.season-world-ticket').click();
  await expect(page.locator('[data-open-quiz]')).toBeDisabled();
});
