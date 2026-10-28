// Development-only helper. Not requested by index.html; uses the repo's Playwright.
const { chromium } = require('../../../web/node_modules/playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.MARKET_CHROMIUM || 'C:/Users/Thomas/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe',
    args: process.env.MARKET_SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.env.MARKET_ANGLE ? [`--use-angle=${process.env.MARKET_ANGLE}`] : [],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5188');
    await page.waitForFunction(() => window.market?.ready || !document.getElementById('error').hidden, null, { timeout: 60000 });
    await page.evaluate(() => window.market?.setView('overview'));
    await page.waitForTimeout(1800);
    console.log(JSON.stringify({ errors, stats: await page.evaluate(() => window.market?.stats()), error: await page.locator('#error').innerText() }));
    await page.screenshot({ path: path.join(__dirname, '../screenshots/01-first-pass.png') });
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
