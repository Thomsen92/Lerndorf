// DEEPSEEK_WHATS_INSIDE_3D: tap a chest item → large 3D view of the real model; Escape closes the
// view first, then the list; tablet and phone sizes without horizontal scrolling.
import { test, expect, type Page } from '@playwright/test';
test.setTimeout(180000);

const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function openItem(page: Page, name: string) {
  await page.getByRole('button', { name: `View ${name} in 3D` }).click();
  await expect(page.locator('.item3d')).toBeVisible();
  await page.waitForFunction(
    () => document.querySelector<HTMLElement>('.item3d-status')?.hidden === true,
    null,
    {
      timeout: 60000,
    },
  );
}

test('chest items open a large rotatable 3D view', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/dev/learnpass-ui.html?still=1');
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready);
  await page.getByText("What's inside?").click();
  await expect(page.locator('.inside-item')).toHaveCount(28);
  await expect(page.locator('.inside-box img').first()).toBeVisible({ timeout: 60000 });
  expect(await noSideScroll(page)).toBe(true);
  // every tile stays inside the dialog
  const overflow = await page.evaluate(() => {
    const dialog = document.querySelector('.inside-dialog')!.getBoundingClientRect();
    return [...document.querySelectorAll('.inside-item')].filter(
      (el) => el.getBoundingClientRect().right > dialog.right + 1,
    ).length;
  });
  expect(overflow).toBe(0);
  await page.screenshot({ path: info.outputPath('inside-list.png') });

  await openItem(page, 'Warlock');
  await page.screenshot({ path: info.outputPath('inside-warlock-tablet.png') });
  // drag to turn and wheel to zoom must not close or break the view
  const stage = page.locator('.item3d-canvas');
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.mouse.wheel(0, -300);
  await page.locator('.item3d-reset').click();
  await expect(page.locator('.item3d')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.item3d')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View Warlock in 3D' })).toBeFocused();
  await expect(page.locator('.inside-overlay')).toHaveCount(1);

  await page.setViewportSize({ width: 1024, height: 768 });
  await openItem(page, 'Haunted house');
  expect(await noSideScroll(page)).toBe(true);
  await page.screenshot({ path: info.outputPath('inside-house-landscape.png') });
  await page.locator('.item3d-back').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await openItem(page, 'Pickup truck');
  expect(await noSideScroll(page)).toBe(true);
  await page.screenshot({ path: info.outputPath('inside-truck-phone.png') });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.inside-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
});
