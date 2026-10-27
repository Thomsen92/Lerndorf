// Regression: inspect actual jet vertices, not just a clock or unrelated flames.
const { chromium } = require('../../../web/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const { centerPulseAt } = await import(pathToFileURL(path.join(__dirname, '../fountain.js')).href);
  assert.ok(centerPulseAt(.09).active && centerPulseAt(.64).active && centerPulseAt(1.26).active, 'Short-short-long burst rhythm');
  assert.equal(centerPulseAt(2.1).active, false, 'Quiet gap before the loop repeats');
  assert.ok(Math.abs(centerPulseAt(.09).height - centerPulseAt(2.89).height) < 1e-8, 'Burst repeats after 2.8 seconds');
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:/Users/Thomas/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe', args: ['--use-angle=d3d11'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, reducedMotion: 'no-preference' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5188/');
    await page.waitForFunction(() => window.market?.ready);
    const a = await page.evaluate(() => window.market.motionSnapshot().fountain.jet);
    await page.waitForTimeout(650);
    const b = await page.evaluate(() => window.market.motionSnapshot().fountain.jet);
    const displacement = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    console.log(`Actual jet vertex displacement: ${displacement.toFixed(5)} m`);
    assert.ok(displacement > .015, 'Jet geometry must visibly move; a changing clock/reflection is insufficient');
    const bursts = [];
    for (let i = 0; i < 27; i++) {
      bursts.push(await page.evaluate(() => window.market.motionSnapshot().fountain.centerJet));
      await page.waitForTimeout(110);
    }
    assert.ok(bursts.some(b => b.visible && b.height > 1.5) && bursts.some(b => !b.visible), 'Actual central jet must burst upwards and pause');
    await page.locator('#less-motion').check();
    await page.waitForFunction(() => window.market.motionSnapshot().fountain.time === 0);
    const still = await page.evaluate(() => JSON.stringify(window.market.motionSnapshot().fountain.jet));
    await page.waitForTimeout(650);
    assert.equal(await page.evaluate(() => JSON.stringify(window.market.motionSnapshot().fountain.jet)), still, 'Reduced motion freezes the jet geometry');
    assert.equal(errors.length, 0, errors.join('\n'));
    const stats = await page.evaluate(() => window.market.stats());
    assert.ok(stats.maxCalls < 150 && stats.maxTriangles < 150000);
    const result = { success: true, displacement, centralBursts: true, reducedMotionFreezesJets: true, errors, stats };
    fs.writeFileSync(path.join(__dirname, '../screenshots/fountain-motion.json'), JSON.stringify(result, null, 2) + '\n');
    console.log('PASS actual jet movement, reduced motion, browser errors and render budget');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
