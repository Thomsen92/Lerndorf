import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
const shots = 'test-results/sir-byte';
mkdirSync(shots, { recursive: true });
test('market greeting actually plays the existing ready recording and stops on Weiter', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this),
        start = source.start.bind(source),
        stop = source.stop.bind(source);
      source.start = (...args) => {
        document.body.dataset.byteVoiceStarted = 'true';
        start(...args);
      };
      source.stop = (...args) => {
        document.body.dataset.byteVoiceStopped = 'true';
        stop(...args);
      };
      return source;
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dev/tutorial.html?char=girl');
  await expect(page.locator('.byte-world-bubble')).toContainText("Hello! I'm Sir Byte", { timeout: 60000 });
  await expect(page.locator('.byte-world-bubble')).toContainText('Welcome to your class village!');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('.byte-world-bubble')).toContainText('Ready when you are.');
  await expect(page.locator('body')).toHaveAttribute('data-byte-voice-started', 'true');
  await page.screenshot({ path: `${shots}/greeting-recorded.png` });
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-byte-voice-stopped', 'true');
});

test('fast correct answers vary the praise and use just one recording', async ({ page }) => {
  const files: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/sir-byte/voice/')) files.push(req.url().split('/').pop()!);
  });
  await page.goto('/dev/byte.html');
  await page.locator('[data-open=q1]').click();
  await page.locator('input[value=cat]').check();
  await page.locator('#check').click();
  await expect(page.locator('.byte-bubble')).toContainText('Splendid! Nicely done.');
  await page.locator('[data-open=q2]').click();
  await page.locator('#gap').fill('reads');
  await page.locator('#check').click();
  await expect(page.locator('.byte-bubble')).toContainText("That's right!");
  await page.screenshot({ path: `${shots}/praise-variety.png` });
  await page.locator('[data-open=q3]').click();
  await page.locator('input[value=blue]').check();
  await page.locator('#check').click();
  await expect(page.locator('.byte-bubble')).toContainText('Nice work!');
  await expect(page.locator('.byte-bubble')).toContainText("That's all for today.", { timeout: 10000 });
  expect(files).toEqual(['splendid.mp3']);
});
test('phone tutorial keeps the guide, pupil and next button usable', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dev/tutorial.html?char=girl');
  for (const line of ["Hello! I'm Sir Byte", 'Ready when you are.']) {
    await expect(page.locator('.byte-world-bubble')).toContainText(line, { timeout: 60_000 });
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  }
  await expect(page.locator('.byte-world-bubble')).toContainText(
    "Don't worry. Let's build it up again!",
    { timeout: 30_000 },
  );
  await page.screenshot({ path: `${shots}/phone-tutorial-plot.png` });
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('.tutorial-quiz .byte-stage')).toBeVisible();
  await page.screenshot({ path: `${shots}/phone-tutorial-quiz.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
test('market robot stays within its draw-call and triangle budget on every map', async ({ page }) => {
  test.setTimeout(90_000);
  const stats: Record<string, unknown> = {};
  for (const map of ['tal', 'fluss_mitte', 'bach_norden']) {
    await page.goto(`/dev/galerie.html?view=byte&map=${map}`);
    await page.waitForFunction(() => window.galerie?.ready === true);
    const cost = await page.evaluate(() => ({
      idle: window.galerie.byteCost('idle'),
      celebrate: window.galerie.byteCost('celebrate'),
    }));
    stats[map] = cost;
    expect(cost.idle.calls).toBeGreaterThan(0);
    for (const pose of Object.values(cost)) {
      expect(pose.calls).toBeLessThanOrEqual(24);
      expect(pose.triangles).toBeLessThanOrEqual(27000);
    }
    await page.screenshot({ path: `${shots}/market-${map}.png` });
  }
  writeFileSync(`${shots}/market-budget.json`, JSON.stringify(stats, null, 2));
});
for (const width of [1180, 820, 390])
  test(`Sir Byte quests at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 820 ? 1180 : 844 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/dev/byte.html');
    await expect(page.locator('.byte-stage')).toHaveAttribute('data-renderer', 'webgl');
    await page.waitForFunction(
      () => document.querySelector<HTMLCanvasElement>('.byte-stage canvas')?.dataset.ready === 'true',
    );
    await page.screenshot({ path: `${shots}/${width}-01-quests.png` });
    await page.locator('[data-open=q1]').click();
    await page.locator('input[value=car]').check();
    await page.locator('#check').click();
    await expect(page.locator('.byte-bubble')).toContainText('Nearly. Have another go!');
    await page.screenshot({ path: `${shots}/${width}-02-nearly.png` });
    await page.locator('#check').click();
    await expect(page.locator('.byte-bubble')).toContainText("Take your time. You've got this.");
    await page.locator('input[value=cat]').check();
    await page.locator('#check').click();
    await expect(page.locator('.byte-bubble')).toContainText('Splendid! Nicely done.');
    await page.screenshot({ path: `${shots}/${width}-03-correct.png` });
    await page.locator('[data-open=q2]').click();
    await page.locator('#gap').fill('no');
    await page.locator('#check').click();
    await expect(page.locator('.byte-bubble')).toContainText('Nearly. Have another go!');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(page.locator('.byte-stage')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
test('Sir Byte fallback and all existing voice recordings remain usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'WebGLRenderingContext', { value: undefined });
  });
  await page.goto('/dev/byte.html');
  await expect(page.getByAltText('Sir Byte')).toBeVisible();
  expect(await page.getByAltText('Sir Byte').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(320);
  await page.screenshot({ path: `${shots}/fallback.png` });
  const durations = await page.evaluate(async () => {
    const context = new AudioContext();
    try {
      return await Promise.all(
        ['ready', 'splendid', 'nearly', 'support', 'thinking', 'surprised'].map(async (name) => {
          const res = await fetch(`/assets/sir-byte/voice/${name}.mp3`);
          return (await context.decodeAudioData(await res.arrayBuffer())).duration;
        }),
      );
    } finally {
      await context.close();
    }
  });
  expect(durations.every((d) => d > 0.5 && d < 10)).toBe(true);
});

test('all daily quests finish with encouragement under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/dev/byte.html');
  await page.locator('[data-open=q1]').click();
  await page.locator('input[value=cat]').check();
  await page.locator('#check').click();
  await expect(page.locator('[data-quest=q1]')).toHaveClass(/solved/);
  await page.locator('[data-open=q2]').click();
  await page.locator('#gap').fill('reads');
  await page.locator('#check').click();
  await expect(page.locator('[data-quest=q2]')).toHaveClass(/solved/);
  await page.locator('[data-open=q3]').click();
  await page.locator('input[value=blue]').check();
  await page.locator('#check').click();
  await expect(page.getByText('Alle Quests für heute geschafft!', { exact: true })).toBeVisible();
  await expect(page.locator('.byte-bubble')).toContainText("That's all for today. See you tomorrow!", {
    timeout: 12000,
  });
  await page.screenshot({ path: `${shots}/all-done-reduced.png` });
});

test('recorded voices require a gesture, never overlap, and stop for listening, mute and close', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const live = new Set<AudioBufferSourceNode>();
    const state = { active: 0, max: 0, starts: 0 };
    (window as unknown as { byteAudio: typeof state }).byteAudio = state;
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const node = create.call(this),
        start = node.start.bind(node),
        stop = node.stop.bind(node);
      node.start = (...args) => {
        live.add(node);
        state.active = live.size;
        state.max = Math.max(state.max, live.size);
        state.starts++;
        start(...args);
      };
      node.stop = (...args) => {
        live.delete(node);
        state.active = live.size;
        stop(...args);
      };
      node.addEventListener('ended', () => {
        live.delete(node);
        state.active = live.size;
      });
      return node;
    };
  });
  const audio = () =>
    page.evaluate(
      () => (window as unknown as { byteAudio: { active: number; max: number; starts: number } }).byteAudio,
    );
  await page.goto('/dev/byte.html');
  await expect(page.locator('.byte-stage')).toBeVisible();
  expect((await audio()).starts).toBe(0);
  await page.locator('[data-open=q1]').click();
  await page.locator('input[value=car]').check();
  await page.locator('#check').click();
  await expect.poll(async () => (await audio()).starts).toBe(1);
  await page.locator('#check').click();
  await expect.poll(async () => (await audio()).starts).toBe(2);
  expect((await audio()).max).toBe(1);
  await page.locator('[data-open=q3]').click();
  await page.locator('[data-listen]').click();
  await expect.poll(async () => (await audio()).active).toBe(0);
  await page.locator('input[value=red]').check();
  await page.locator('#check').click();
  await expect.poll(async () => (await audio()).starts).toBe(3);
  await page.evaluate(() => localStorage.setItem('lerndorf.sound', '0'));
  await expect.poll(async () => (await audio()).active).toBe(0);
  await page.evaluate(() => localStorage.setItem('lerndorf.sound', '1'));
  await page.locator('#check').click();
  await expect.poll(async () => (await audio()).starts).toBe(4);
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect.poll(async () => (await audio()).active).toBe(0);
  expect((await audio()).max).toBe(1);
});
