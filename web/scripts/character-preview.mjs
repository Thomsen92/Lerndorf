// Render the current standard boy selection image and verify the real animated asset.
// Requires the local Vite server on port 5175; no remote services.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('test-results/standard-boy', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 320 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5175/dev/character.html?char=boy');
  await page.waitForFunction(() => window.characterPreview?.ready);
  const metrics = await page.evaluate(() => ({
    height: window.characterPreview.height,
    bottom: window.characterPreview.bottom,
  }));
  if (Math.abs(metrics.height - 1.64) > 0.02) throw Error('Incorrect figure height');
  await page.locator('canvas').screenshot({ path: 'public/assets/characters/boy.png', omitBackground: true });
  for (const [pose, time] of [
    ['walk', 0.3],
    ['catwalk', 1],
    ['celebrate', 0.65],
  ]) {
    const size = await page.evaluate(
      ([pose, time]) => window.characterPreview.pose(pose, time),
      [pose, time],
    );
    if (!size.every(Number.isFinite)) throw Error('Invalid animated bounds');
    await page
      .locator('canvas')
      .screenshot({ path: `test-results/standard-boy/${pose}.png`, omitBackground: true });
  }
  const portrait = await page.evaluate(() => window.characterPreview.portrait());
  writeFileSync('test-results/standard-boy/portrait.png', Buffer.from(portrait.split(',')[1], 'base64'));
  if (errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify({ metrics, poses: ['walk', 'catwalk', 'celebrate'], portrait: true, errors }));
} finally {
  await browser.close();
}
