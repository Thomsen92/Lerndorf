import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const shots = process.env.GALLERY_OUTPUT_DIR ?? 'test-results/profile-interaction';
mkdirSync(shots, { recursive: true });
for (const viewport of [
  { width: 1180, height: 820 },
  { width: 820, height: 1180 },
  { width: 375, height: 812 },
]) {
  test(`interactive profile ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const shot = async (name: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: join(shots, `${viewport.width}x${viewport.height}-${name}.png`) });
    };
    await page.goto('/dev/profile.html?view=profil');
    await expect(page.getByText('Noch 55 XP bis Level 7')).toBeVisible();
    await expect(page.getByText('So bekommst du XP')).toHaveCount(0);
    await expect(page.getByText('Busy Bee', { exact: true })).toHaveCount(0);
    await expect(page.locator('.loot-chest[data-renderer=webgl]')).toHaveCount(2);
    await page.waitForFunction(() =>
      [...document.querySelectorAll<HTMLCanvasElement>('.chest-hit canvas')].every(
        (c) => c.dataset.ready === 'true',
      ),
    );
    await page.waitForFunction(() =>
      document.querySelector<HTMLImageElement>('.profile-player img')?.src.startsWith('data:image/png'),
    );
    await shot('01-overview');
    const first = page.locator('.chest-hit').first();
    await first.hover();
    await expect(page.locator('.loot-chest').first()).toHaveClass(/loot-chest--hover/);
    await page.waitForTimeout(250);
    await shot('02-chest-hover');
    await first.click();
    await expect(page.locator('.loot-chest').first()).toHaveAttribute('data-state', 'open');
    await expect(page.getByText('+100 Münzen – Super!')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('330 Münzen', { exact: true })).toBeVisible();
    await page.waitForTimeout(800);
    await shot('03-chest-open');
    await page.getByRole('button', { name: 'Sammlung ansehen', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Meine Sammlung' })).toBeVisible();
    await expect(page.locator('.loot-chest')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Busy Bee, ab Level 7', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Gold, ab Level 15', exact: true })).toHaveCount(0);
    await shot('04-collection-titles');
    await page.getByRole('tab', { name: 'Rahmen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Gold, ab Level 15', exact: true })).toBeDisabled();
    await shot('05-collection-frames');
    await page.getByRole('button', { name: 'Holz, wählen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Holz, gewählt', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Zurück zum Profil', exact: true }).click();
    await expect(page.locator('.profile-portrait-button [data-ornament=grain]')).toHaveCount(1);
    await page.waitForFunction(() =>
      [...document.querySelectorAll<HTMLCanvasElement>('.chest-hit canvas')].every(
        (c) => c.dataset.ready === 'true',
      ),
    );
    await expect(page.locator('.loot-chest[data-renderer=webgl]')).toHaveCount(1);
    await shot('06-back-to-profile');
    expect(errors).toEqual([]);
  });
}

test('3D chest waits for server, guards double clicks and supports keyboard and reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dev/profile.html?view=chest&slow=1');
  const object = page.getByRole('button', { name: 'Truhe öffnen', exact: true });
  await object.focus();
  await expect(page.locator('.loot-chest')).toHaveClass(/loot-chest--hover/);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('.loot-chest')).toHaveAttribute('data-state', 'pending');
  await expect(page.getByText('+100 Münzen – Super!')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { profilePreview: { chestCalls: number[] } }).profilePreview.chestCalls,
    ),
  ).toEqual([1]);
  await page.screenshot({ path: join(shots, '07-chest-pending-reduced.png') });
  await expect(page.locator('.loot-chest')).toHaveAttribute('data-state', 'open');
  await expect(page.getByText('+100 Münzen – Super!')).toBeVisible();
  await expect(page.locator('.loot-coins')).toHaveCount(0);
  await page.screenshot({ path: join(shots, '08-chest-open-reduced.png') });
});

test('level-up uses inline 3D chests without opening another dialog', async ({ page }) => {
  await page.goto('/dev/profile.html?view=levelup');
  await expect(page.locator('.chest-hit')).toHaveCount(3);
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLCanvasElement>('.chest-hit canvas')].every(
      (c) => c.dataset.ready === 'true',
    ),
  );
  await page.screenshot({ path: join(shots, '09-levelup-3d.png') });
  await page.locator('.chest-hit').first().click();
  await expect(page.getByText('+100 Münzen – Super!')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('XP reward audio contains decodable sound', async ({ page }) => {
  await page.goto('/dev/profile.html?view=badge');
  const durations = await page.evaluate(async () => {
    const context = new AudioContext();
    try {
      return await Promise.all(
        ['xp', 'levelup', 'chest', 'coins'].map(async (name) => {
          const response = await fetch(`/assets/kenney/fx/${name}.mp3`);
          return (await context.decodeAudioData(await response.arrayBuffer())).duration;
        }),
      );
    } finally {
      await context.close();
    }
  });
  expect(durations.every((duration) => duration > 0.03)).toBe(true);
});
