import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const shots = process.env.GALLERY_OUTPUT_DIR ?? 'test-results/xp-gallery';
mkdirSync(shots, { recursive: true });
for (const viewport of [
  { width: 1180, height: 820 },
  { width: 820, height: 1180 },
]) {
  test(`XP profile gallery ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const shot = async (name: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({
        path: join(shots, `${viewport.width}x${viewport.height}-${name}.png`),
        fullPage: true,
      });
    };
    const visit = async (view: string) => {
      await page.goto(`/dev/profile.html?view=${view}`);
    };
    await visit('wappen');
    await expect(page.locator('.preview-tier')).toHaveCount(7);
    await page.waitForFunction(
      () => {
        const imgs = [...document.querySelectorAll<HTMLImageElement>('.preview-tier .avatar-portrait img')];
        return (
          imgs.length === 14 &&
          imgs.every((i) => i.src.startsWith('data:image/png') && i.complete && i.naturalWidth > 0)
        );
      },
      null,
      { timeout: 45_000 },
    );
    await shot('00-wappen');
    await visit('badge');
    await expect(
      page.getByRole('button', { name: 'Profil: Fuchs, Level 6, 120 von 175 XP, 230 Münzen' }),
    ).toBeVisible();
    await page.waitForFunction(() =>
      document.querySelector<HTMLImageElement>('.avatar-portrait img')?.src.startsWith('data:image/png'),
    );
    await shot('01-badge');
    await visit('profil');
    await expect(page.getByText('120 / 175 XP bis Level 7')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Busy Bee · ab Level 7' })).toBeDisabled();
    await shot('02-profil');
    await page.getByRole('button', { name: 'Lerndorf Champion · ab Level 30' }).scrollIntoViewIfNeeded();
    await shot('02b-profil-rewards');
    await page.getByRole('heading', { name: 'So bekommst du XP' }).scrollIntoViewIfNeeded();
    await shot('02c-profil-help');
    await visit('levelup');
    await expect(page.getByRole('heading', { name: 'Level 7!' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Truhe öffnen', exact: true })).toHaveCount(3);
    await page.getByRole('button', { name: 'Weiter', exact: true }).scrollIntoViewIfNeeded();
    await shot('03-levelup');
    await visit('chest&slow=1');
    await page.getByRole('button', { name: 'Truhe öffnen', exact: true }).click();
    await expect(page.locator('.chest--wobble')).toBeVisible();
    await expect(page.getByText('+100 Münzen – Super!')).toHaveCount(0);
    await shot('04-chest-wobble');
    await expect(page.getByText('+100 Münzen – Super!')).toBeVisible();
    await shot('05-chest-result');
    await visit('welcome');
    await expect(page.getByText('Stempel für die Woche ab 19.10.: +100 XP')).toBeVisible();
    await shot('06-welcome');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await visit('levelup');
    await expect(page.locator('.xp-confetti')).toHaveCount(0);
    await shot('07-reduced');
    expect(errors).toEqual([]);
  });
}

test('XP reward audio contains decodable sound', async ({ page }) => {
  await page.goto('/dev/profile.html?view=badge');
  const durations = await page.evaluate(async () => {
    const context = new AudioContext();
    try {
      return await Promise.all(
        ['xp', 'levelup', 'chest', 'coins'].map(async (name) => {
          const response = await fetch(`/assets/kenney/fx/${name}.mp3`);
          const audio = await context.decodeAudioData(await response.arrayBuffer());
          return audio.duration;
        }),
      );
    } finally {
      await context.close();
    }
  });
  expect(durations.every((duration) => duration > 0.03)).toBe(true);
});
