import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const contract: { items: Array<{ id: string; nameEn: string; price: number }> } = JSON.parse(
  readFileSync(new URL('../../content/shop/ollie-items.json', import.meta.url), 'utf8'),
);

test.setTimeout(90_000);
test.use({ reducedMotion: 'reduce' });

type Fixture = {
  coins: number;
  owned: Record<string, number>;
  buyCalls: string[];
  open(origin?: string): void;
};
const fixture = (page: Page) =>
  page.evaluate(() => {
    const value = (window as unknown as { __ollie: Fixture }).__ollie;
    return { coins: value.coins, owned: value.owned, buyCalls: value.buyCalls };
  });
const item = (page: Page, id: string) => page.locator(`.item-card[data-item="${id}"]`);
const dialog = (page: Page) => page.getByRole('dialog');
async function open(page: Page, query = '') {
  await page.goto(`/dev/ollie-shop.html${query}`);
  await expect(page.locator('.item-area .item-card')).toHaveCount(14);
}
async function details(page: Page, id: string) {
  await item(page, id).click();
  await expect(dialog(page)).toBeVisible();
}
async function buy(page: Page, id: string, price: number) {
  await details(page, id);
  await dialog(page)
    .getByRole('button', { name: `Buy for ${price} coins`, exact: true })
    .click();
  await dialog(page).getByRole('button', { name: 'Yes, buy', exact: true }).click();
  await expect(dialog(page).locator('.status')).toContainText('Bought');
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.item-area .panel').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(
    true,
  );
}

test('all 14 approved items use their real catalogue names, prices and GLB thumbnails', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  for (const entry of contract.items) {
    const card = item(page, entry.id);
    await expect(card.locator('.item-name')).toHaveText(entry.nameEn);
    await expect(card.locator('.item-price')).toHaveText(`${entry.price} coins`);
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('img.item-thumb')).toBeVisible({ timeout: 30_000 });
  }
  await page.locator('[data-kind="house"]').click();
  await expect(page.locator('.item-card')).toHaveCount(4);
  await page.locator('[data-kind="garage"]').click();
  await expect(page.locator('.item-card')).toHaveCount(2);
  await page.locator('[data-kind="car"]').click();
  await expect(page.locator('.item-card')).toHaveCount(0);
  await expect(page.locator('.item-area-status')).toContainText('There are no items in this category yet.');
  expect((await fixture(page)).buyCalls).toEqual([]);
  expect(failures).toEqual([]);
});

test('search, category and saved filters combine and survive Inventory navigation within the session', async ({
  page,
}) => {
  await open(page);
  await page.locator('[data-kind="deco"]').click();
  await page.getByRole('searchbox', { name: 'Search items' }).fill('lantern');
  await expect(page.locator('.item-card')).toHaveCount(1);
  await page.locator('[data-save="shop_evening_lantern"]').click();
  await page.locator('[data-filter="saved"]').click();
  await expect(item(page, 'shop_evening_lantern')).toBeVisible();
  await page.locator('[data-nav="inventar"]').click();
  await page.locator('[data-filter="saved"]').click();
  await expect(page.locator('.item-card')).toHaveCount(1);
  await expect(item(page, 'shop_evening_lantern').locator('.item-count')).toHaveText(
    'Owned: 2 · placed: 0 · available: 2',
  );
  await page.locator('[data-nav="shop"]').click();
  await page.locator('[data-filter="saved"]').click();
  await expect(page.locator('.item-card')).toHaveCount(1);
  expect((await fixture(page)).buyCalls).toEqual([]);
  await page.reload();
  await page.locator('[data-filter="saved"]').click();
  await expect(page.locator('.item-card')).toHaveCount(0);
  await expect(page.locator('.item-area-status')).toContainText('Nothing saved here yet.');
});

test('real GLB detail rotates, confirms once, buys more decoration and offers the existing placement action', async ({
  page,
}, info) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, '?slow=1');
  await details(page, 'shop_evening_lantern');
  const canvas = dialog(page).locator('canvas');
  await expect(canvas).toHaveCount(1);
  await expect.poll(async () => (await canvas.screenshot()).length).toBeGreaterThan(4000);
  const before = await canvas.screenshot();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 110, bounds.y + bounds.height / 2 + 20, { steps: 6 });
  await page.mouse.up();
  const after = await canvas.screenshot();
  expect(before.equals(after)).toBe(false);
  await page.screenshot({ path: info.outputPath('ollie-detail-desktop.png') });
  await dialog(page).getByRole('button', { name: 'Buy for 40 coins', exact: true }).click();
  await expect(dialog(page).locator('.confirm-text')).toContainText('40');
  await dialog(page).getByRole('button', { name: 'Yes, buy', exact: true }).dblclick();
  await expect(dialog(page).locator('.status')).toContainText('460 coins');
  expect(await fixture(page)).toEqual({
    coins: 460,
    owned: { shop_evening_lantern: 3 },
    buyCalls: ['shop_evening_lantern'],
  });
  await dialog(page).getByRole('button', { name: 'Go to inventory', exact: true }).click();
  await expect(item(page, 'shop_evening_lantern').locator('.item-count')).toHaveText(
    'Owned: 3 · placed: 0 · available: 3',
  );
  await expect(item(page, 'shop_evening_lantern').locator('.item-price')).toHaveCount(0);
  await details(page, 'shop_evening_lantern');
  await dialog(page).getByRole('button', { name: 'Place', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __lastBuild?: string }).__lastBuild)).toBe(
    'shop_evening_lantern',
  );
  expect(failures).toEqual([]);
});

test('owned houses remain visible but cannot be purchased twice', async ({ page }) => {
  await open(page);
  await buy(page, 'shop_little_blue_cottage', 140);
  await dialog(page).getByRole('button', { name: 'Go to inventory', exact: true }).click();
  await expect(item(page, 'shop_little_blue_cottage')).toBeVisible();
  await page.locator('[data-nav="shop"]').click();
  await expect(item(page, 'shop_little_blue_cottage').locator('.item-reason')).toHaveText(
    'You already own this.',
  );
  await details(page, 'shop_little_blue_cottage');
  await expect(dialog(page).getByRole('button', { name: 'Buy for 140 coins', exact: true })).toBeDisabled();
  expect((await fixture(page)).buyCalls).toEqual(['shop_little_blue_cottage']);
});

test('teacher-closed shop still permits browsing and Inventory navigation', async ({ page }) => {
  await open(page, '?closed=1');
  await expect(page.locator('.item-area-status')).toContainText('The shop is currently closed.');
  await details(page, 'shop_sunday_bench');
  await expect(dialog(page).getByRole('button', { name: 'Buy for 55 coins', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(item(page, 'shop_sunday_bench')).toBeFocused();
  await page.locator('[data-nav="inventar"]').click();
  await expect(page.locator('.item-card')).toHaveCount(1);
  expect((await fixture(page)).buyCalls).toEqual([]);
});

test('insufficient coins prevent a purchase and leave the balance unchanged', async ({ page }) => {
  await open(page, '?coins=9');
  await details(page, 'shop_apple_of_my_eye');
  await expect(dialog(page).getByRole('button', { name: 'Buy for 10 coins', exact: true })).toBeDisabled();
  await expect(dialog(page).locator('.notice-in')).toContainText('You do not have enough coins.');
  expect((await fixture(page)).coins).toBe(9);
  expect((await fixture(page)).buyCalls).toEqual([]);
});

test('uncertain purchase responses offer inventory verification without a retry or success', async ({
  page,
}) => {
  await open(page, '?uncertain=1');
  await details(page, 'shop_sunday_bench');
  await dialog(page).getByRole('button', { name: 'Buy for 55 coins', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Yes, buy', exact: true }).click();
  await expect(dialog(page).locator('.status')).toContainText('Purchase response uncertain.');
  await expect(dialog(page).getByRole('button', { name: 'Yes, buy', exact: true })).toHaveCount(0);
  await dialog(page).getByRole('button', { name: 'Go to inventory', exact: true }).click();
  await expect(page.locator('.item-card')).toHaveCount(1);
  expect(await fixture(page)).toEqual({
    coins: 500,
    owned: { shop_evening_lantern: 2 },
    buyCalls: ['shop_sunday_bench'],
  });
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  test(`responsive shop and long-name detail at ${viewport.width}px`, async ({ page }, info) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.setViewportSize(viewport);
    await open(page);
    await expect(page.locator('img.item-thumb').first()).toBeVisible({ timeout: 30_000 });
    await noOverflow(page);
    expect(
      await page
        .locator('.item-area-head button')
        .first()
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(48);
    await page.screenshot({ path: info.outputPath(`ollie-shop-${viewport.width}.png`) });
    await details(page, 'shop_support_duck');
    await expect(dialog(page).locator('canvas')).toBeVisible();
    await expect
      .poll(async () => (await dialog(page).locator('canvas').screenshot()).length)
      .toBeGreaterThan(4000);
    expect(await dialog(page).evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(
      await dialog(page)
        .getByRole('button', { name: 'Close', exact: true })
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(48);
    await page.screenshot({ path: info.outputPath(`ollie-detail-${viewport.width}.png`) });
    await page.keyboard.press('Escape');
    await expect(item(page, 'shop_support_duck')).toBeFocused();
    await page.locator('.item-area-close').click();
    await expect(page.locator('.item-area')).toHaveCount(0);
    expect(failures).toEqual([]);
  });
}

test('German switches the same catalogue, search and Ollie dialogue', async ({ page }, info) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await open(page, '?lang=de');
  await expect(item(page, 'shop_support_duck').locator('.item-name')).toHaveText('Wohlfühlente');
  await page.getByRole('searchbox', { name: 'Gegenstände suchen' }).fill('Abendlaterne');
  await expect(page.locator('.item-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sag Hallo', exact: true }).click();
  await page.getByRole('button', { name: 'Wie verdiene ich Münzen?', exact: true }).click();
  await expect(page.locator('.item-area-keeper-line')).toContainText('Übe Englisch');
  await page.screenshot({ path: info.outputPath('ollie-shop-german-768.png') });
});

test('ten shop cycles and twenty real previews release their WebGL contexts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const contexts = new Set<WebGLRenderingContext | WebGL2RenderingContext>();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      const context = Reflect.apply(original, this, args);
      if (context && 'isContextLost' in context) contexts.add(context as WebGLRenderingContext);
      return context;
    } as typeof original;
    Object.assign(window, {
      __liveShopContexts: () => [...contexts].filter((c) => !c.isContextLost()).length,
    });
  });
  await open(page);
  for (let cycle = 0; cycle < 10; cycle++) {
    if (cycle) {
      await page.evaluate(() => (window as unknown as { __ollie: Fixture }).__ollie.open());
      await expect(page.locator('.item-card')).toHaveCount(14);
    }
    for (let n = 0; n < 2; n++) {
      await details(page, contract.items[(cycle * 2 + n) % 14].id);
      await expect(dialog(page).locator('canvas')).toBeVisible();
      await dialog(page).getByRole('button', { name: 'Reset view', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(dialog(page)).toHaveCount(0);
    }
    await page.locator('.item-area-close').click();
    await expect(page.locator('.item-area')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __liveShopContexts: () => number }).__liveShopContexts()),
      )
      .toBe(0);
  }
  expect(errors).toEqual([]);
});

for (const reducedMotion of ['no-preference','reduce'] as const) {
 test.describe(`Ollie speech: ${reducedMotion}`,()=>{
  test.use({reducedMotion});
  test('plays local speech and respects motion, mute and close',async({page},info)=>{
   const errors:string[]=[];const external:string[]=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.url().includes('elevenlabs.io'))external.push(r.url());});
   await page.setViewportSize({width:768,height:1024});
   await open(page);
   await page.getByRole('button',{name:'Say g’day',exact:true}).click();
   const portrait=page.locator('.item-area-portrait');
   await expect(portrait).toHaveAttribute('data-speaking','true');
   if(reducedMotion==='reduce') {
    expect(await portrait.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
   } else {
    const before=await portrait.evaluate(el=>getComputedStyle(el).transform);
    await expect.poll(()=>portrait.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
    await page.screenshot({path:info.outputPath('ollie-speaking-tablet.png')});
    await expect(portrait).toHaveAttribute('data-speaking','false',{timeout:15000});
    const audit=await page.evaluate(async()=>{
     const base='/assets/shopkeeper/voice/';
     const manifest=await fetch(`${base}manifest.json`).then(r=>r.json()) as {clips:Array<{file:string}>};
     const ctx=new AudioContext();const rows=[];
     try {
      for(const clip of manifest.clips){
       const bytes=await fetch(base+clip.file).then(r=>r.arrayBuffer());
       const decoded=await ctx.decodeAudioData(bytes);const samples=decoded.getChannelData(0);
       let peak=0,power=0;for(const sample of samples){peak=Math.max(peak,Math.abs(sample));power+=sample*sample;}
       rows.push({file:clip.file,duration:decoded.duration,peak,rms:Math.sqrt(power/samples.length)});
      }
     }finally{await ctx.close();}
     return rows;
    });
    expect(audit).toHaveLength(12);
    for(const clip of audit){expect(clip.duration).toBeGreaterThan(1);expect(clip.duration).toBeLessThan(15);expect(clip.peak).toBeGreaterThan(.01);expect(clip.rms).toBeGreaterThan(.001);}
    await info.attach('ollie-audio-audit',{body:JSON.stringify(audit,null,2),contentType:'application/json'});
    await page.getByRole('button',{name:'How do I get coins?',exact:true}).click();
    await expect(portrait).toHaveAttribute('data-speaking','true');
   }
   await page.evaluate(()=> (window as unknown as {__ollie:Fixture & {sound:{setEnabled(on:boolean):void}}}).__ollie.sound.setEnabled(false));
   await expect(portrait).toHaveAttribute('data-speaking','false');
   await page.locator('.item-area-close').click();
   expect(errors).toEqual([]);expect(external).toEqual([]);
  });
 });
}
