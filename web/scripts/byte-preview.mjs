// Export the actual integrated model as a small square fallback (no prototype page chrome).
// Start the Vite development server on port 5175 before running this script.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({
    viewport: { width: 1180, height: 844 },
    deviceScaleFactor: 320 / 220,
    reducedMotion: 'reduce',
  });
  await page.goto('http://localhost:5175/dev/byte.html');
  await page.waitForFunction(() => document.querySelector('.byte-stage canvas')?.dataset.ready === 'true');
  await page
    .locator('.byte-stage canvas')
    .screenshot({
      path: fileURLToPath(new URL('../public/assets/sir-byte/preview.png', import.meta.url)),
      omitBackground: true,
    });
} finally {
  await browser.close();
}
