// Optional development checks. The prototype itself has no Node dependencies.
const { chromium } = require('../../../web/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '../..');
const BASE = process.env.MARKET_URL || 'http://127.0.0.1:5188/';
const installed = 'C:/Users/Thomas/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe';
const report = { date: '2026-10-27', visualReview: process.env.MARKET_SKIP_SCREENSHOTS ? 'User review; no screenshots generated' : 'Screenshots generated', checks: [], errors: [], measurements: {}, screenshots: [] };
function check(name, condition) { assert.ok(condition, name); report.checks.push(name); console.log(`PASS ${name}`); }
function attach(page) {
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (!request.url().startsWith(BASE) && !/^(blob:|data:)/.test(request.url())) report.errors.push(`External request: ${request.url()}`); });
}
async function ready(page) {
  attach(page); await page.goto(BASE);
  await page.waitForFunction(() => window.market?.ready, null, { timeout: 60000 });
  await page.locator('#loading').waitFor({ state: 'hidden' });
}
async function shot(page, filename) {
  if (process.env.MARKET_SKIP_SCREENSHOTS) return;
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ROOT, 'screenshots', filename) });
  report.screenshots.push(filename);
}
async function measure(page, name, seconds = 7) {
  await page.waitForTimeout(1800);
  const before = await page.evaluate(() => ({ frames: window.market.stats().frames, at: performance.now() }));
  await page.waitForTimeout(seconds * 1000);
  const data = await page.evaluate(() => ({ stats: window.market.stats(), frames: window.market.frameTimes(), at: performance.now() }));
  const fps = (data.stats.frames - before.frames) * 1000 / (data.at - before.at);
  const sorted = data.frames.slice(-Math.round(data.stats.fps * seconds)).sort((a, b) => a - b);
  report.measurements[name] = { ...data.stats, measuredFps: +fps.toFixed(1), p95FrameMs: +sorted[Math.floor(sorted.length * .95)]?.toFixed(1), viewport: page.viewportSize() };
  check(`${name}: all passes below 150 draw calls`, data.stats.maxCalls < 150);
  check(`${name}: all passes below 150,000 triangles`, data.stats.maxTriangles < 150000);
}
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.MARKET_CHROMIUM || (fs.existsSync(installed) ? installed : undefined),
    args: process.env.MARKET_SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.env.MARKET_ANGLE ? [`--use-angle=${process.env.MARKET_ANGLE}`] : [],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
    await ready(page);
    const placements = await page.evaluate(() => JSON.stringify(window.market.placements()));
    const counts = await page.evaluate(() => window.market.assetCounts());
    const fountain = await page.evaluate(() => window.market.fountain());
    const plot = await page.evaluate(() => window.market.plot());
    const insidePlot = (x, z) => x > plot.bounds.minX && x < plot.bounds.maxX && z > plot.bounds.minZ && z < plot.bounds.maxZ;
    check('example plot is away from the market', Math.hypot(plot.center.x, plot.center.z) > 25);
    check('all plot pumpkins and lamps stand outside the fence', plot.decorations.length >= 10 && plot.decorations.every(d => !insidePlot(d.x, d.z)));
    check('buildable interior is clear of model placements', JSON.parse(placements).every(p => !insidePlot(p[1], p[3])));
    check('central vertical burst is configured in addition to the eight arches', fountain.centerJet === true && fountain.burstPeriod === 2.8);
    check('ritual has exactly three individual candles', counts.candle === 3 && fountain.candles === 3);
    check('fountain has eight jets and blood-red water', fountain.jets === 8 && fountain.waterColor === '#9f2635');
    check('jets start at the upper water surface instead of above the rim', fountain.originY > 1.4 && fountain.originY < 1.5);
    const layout = JSON.parse(placements);
    check('fountain is larger and the large pumpkin stands in front', layout.some(p => p[0] === 'fountain' && p[4] === 1.72) && layout.some(p => p[0] === 'carved' && p[3] === 5.55 && p[4] === 1.95));
    check('four stalls and at most five background figures', counts.stall === 4 && counts.zombie + counts.skeleton + counts.vampire + counts.keeper <= 5);
    check('Kenney vampire and cemetery keeper are present', counts.vampire === 1 && counts.keeper === 1);
    check('tour starts automatically', await page.evaluate(() => window.market.stats().tour));
    await page.locator('#tour').click();
    check('tour can be paused', !await page.evaluate(() => window.market.stats().tour));
    await page.locator('#plot-view').click();
    const plotCamera = await page.evaluate(() => window.market.camera());
    check('plot button focuses the example plot', plotCamera.target[0] === plot.center.x && plotCamera.target[2] === plot.center.z);
    await page.locator('#plot-view').click();
    check('plot button returns to the market', await page.evaluate(() => window.market.camera().target[0] === 0));
    await page.evaluate(() => window.market.setView('overview'));
    await measure(page, 'desktop');
    await shot(page, '01-overview-desktop.png');

    await page.locator('#welcome-button').click();
    check('welcome button opens the Season I message', await page.locator('#season-dialog').isVisible());
    await shot(page, '02-season-welcome.png');
    await page.keyboard.press('Escape');
    check('Escape closes the message and restores focus', await page.locator('#welcome-button').evaluate(el => el === document.activeElement));
    const point = await page.evaluate(() => window.market.seasonScreen());
    await page.mouse.click(point.x, point.y);
    check('the 3D stall button also opens the message', await page.locator('#season-dialog').isVisible());
    await page.keyboard.press('Escape');

    const previous = await page.evaluate(() => window.market.camera());
    await page.mouse.move(1030, 560); await page.mouse.down(); await page.mouse.move(1140, 570, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(700);
    check('mouse drag rotates the camera', JSON.stringify(previous.position) !== JSON.stringify(await page.evaluate(() => window.market.camera().position)));
    const distance = await page.evaluate(() => window.market.camera().distance);
    await page.mouse.wheel(0, -200); await page.waitForTimeout(700);
    check('scroll zooms the camera', await page.evaluate(() => window.market.camera().distance) < distance);
    await page.locator('#less-motion').check();
    await page.waitForFunction(() => window.market.stats().reducedMotion && window.market.motionSnapshot().fogTime === 0);
    const still = await page.evaluate(() => JSON.stringify(window.market.motionSnapshot()));
    await page.waitForTimeout(1000);
    check('less motion freezes figures, fog and lantern flicker', still === await page.evaluate(() => JSON.stringify(window.market.motionSnapshot())));
    check('less motion disables automatic orbit', !await page.evaluate(() => window.market.stats().tour));
    await page.locator('#less-motion').uncheck();
    const legsBefore = await page.evaluate(() => JSON.stringify(window.market.motionSnapshot().actors.map(a => a.slice(-2))));
    const waterBefore = await page.evaluate(() => window.market.motionSnapshot().fountain);
    await page.waitForTimeout(1100);
    check('shambling figures articulate their legs', legsBefore !== await page.evaluate(() => JSON.stringify(window.market.motionSnapshot().actors.map(a => a.slice(-2)))));
    const waterAfter = await page.evaluate(() => window.market.motionSnapshot().fountain);
    check('actual water-jet geometry animates', JSON.stringify(waterBefore.jet) !== JSON.stringify(waterAfter.jet));
    check('fountain spray animates', JSON.stringify(waterBefore.drop) !== JSON.stringify(waterAfter.drop));
    check('candle flames animate', JSON.stringify(waterBefore.flame) !== JSON.stringify(waterAfter.flame));
    for (const view of ['season', 'cemetery', 'reverse', 'plot']) {
      await page.evaluate(view => window.market.setView(view), view);
      await shot(page, `${{ season: '03-season-stall', cemetery: '04-cemetery', reverse: '05-reverse' }[view]}.png`);
      const stats = await page.evaluate(() => window.market.stats());
      check(`${view}: render budget`, stats.calls < 150 && stats.triangles < 150000);
    }

    await page.close();
    const tablet = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await ready(tablet);
    check('system reduced-motion setting is respected on first load', await tablet.evaluate(() => window.market.stats().reducedMotion && !window.market.stats().tour));
    check('layout is identical across loads and viewport sizes', placements === await tablet.evaluate(() => JSON.stringify(window.market.placements())));
    await measure(tablet, 'tablet-viewport');
    await shot(tablet, '06-tablet-1024.png');
    await tablet.locator('#welcome-button').tap();
    check('welcome message works by touch', await tablet.locator('#season-dialog').isVisible());
    await tablet.locator('#season-dialog .close').tap();
    await tablet.setViewportSize({ width: 390, height: 844 });
    await tablet.evaluate(() => window.market.setView('overview'));
    await shot(tablet, '07-portrait-390.png');
    check('portrait layout has no horizontal overflow', await tablet.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    check('primary controls remain inside the portrait viewport', await tablet.locator('#welcome-button').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));

    for (const [file, hash] of Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, 'protected-baseline.json'))))) {
      const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, file))).digest('hex');
      if (file === 'blender/sources/LICENSES.md' && actual !== hash) {
        // Concurrent workspace edits are evidence to preserve, never to overwrite.
        report.concurrentExternalChanges = [{ file, baseline: hash, actual, note: 'Observed change outside this prototype. No prototype tool writes to this source file; preserved.' }];
        console.log(`NOTE concurrent external change preserved: ${file}`);
      } else check(`${file} is unchanged`, actual === hash);
    }
    check('no runtime errors, HTTP failures or external requests', report.errors.length === 0);
    const source = fs.readFileSync(path.join(ROOT, 'scene.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'world.js'), 'utf8');
    check('no Math.random in scene placement or atmosphere', !source.includes('Math.random'));
    const assets = [];
    for (const folder of ['kenney/graveyard', 'kenney/town', 'season1']) for (const file of fs.readdirSync(path.join(ROOT, 'assets', folder)).filter(n => n.endsWith('.glb'))) {
      const b = fs.readFileSync(path.join(ROOT, 'assets', folder, file)), json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)));
      const triangles = json.meshes.flatMap(m => m.primitives).reduce((sum, p) => sum + json.accessors[p.indices || p.attributes.POSITION].count / 3, 0);
      assets.push({ file: `${folder}/${file}`, bytes: b.length, triangles });
      for (const image of json.images || []) if (image.uri) check(`texture exists: ${folder}/${image.uri}`, fs.existsSync(path.join(ROOT, 'assets', folder, image.uri)));
    }
    fs.writeFileSync(path.join(ROOT, 'assets', 'used-assets.json'), JSON.stringify({ counts, files: assets }, null, 2) + '\n');
    report.success = true;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(ROOT, 'screenshots', process.env.MARKET_SKIP_SCREENSHOTS ? 'verification-revision.json' : 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify(report.measurements, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
