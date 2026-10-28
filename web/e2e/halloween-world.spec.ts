import { test, expect } from '@playwright/test';
test.setTimeout(120000);
test('same village switches back without accumulating layers and frames tablet views', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(
    '/dev/season-world.html?theme=halloween&map=tal&seed=11&view=marketplace&static=1&reduced=1',
  );
  await page.waitForFunction(() => window.galerie?.ready, null, { timeout: 60000 });
  expect(await page.evaluate(() => window.galerie.sceneState().layerCount)).toBe(1);
  // Normal meshes remain resident while hidden. Warm both views before comparing GPU allocations.
  await page.evaluate(() => window.galerie.setTheme('normal'));
  await page.evaluate(() => window.galerie.setTheme('halloween'));
  const first = await page.evaluate(() => window.galerie.appearanceCost());
  await page.screenshot({ path: info.outputPath('halloween-market.png') });
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.galerie.setTheme('normal'));
    expect(await page.evaluate(() => window.galerie.sceneState().layerCount)).toBe(0);
    await page.evaluate(() => window.galerie.setTheme('halloween'));
    expect(await page.evaluate(() => window.galerie.sceneState().layerCount)).toBe(1);
  }
  const last = await page.evaluate(() => window.galerie.appearanceCost());
  expect(last.geometries).toBeLessThanOrEqual(first.geometries + 1);
  expect(last.textures).toBeLessThanOrEqual(first.textures + 1);
  expect(await page.evaluate(() => window.galerie.sceneState().failures)).toEqual([]);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.getByRole('button', { name: 'Grundstück', exact: true }).click();
  await page.screenshot({ path: info.outputPath('halloween-plot-portrait.png') });
  await page.getByRole('button', { name: 'Normal', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.galerie.theme())).toBe('normal');
  await page.screenshot({ path: info.outputPath('normal-restored.png') });
  expect(errors).toEqual([]);
  await info.attach('render-stats', {
    body: JSON.stringify({ first, last }),
    contentType: 'application/json',
  });
});
test('teacher world switch persists independently for each class in the real teacher page', async ({
  page,
}, info) => {
  await page.goto('/dev/teacher.html#8a/dorf');
  const form = page.locator('#worldThemeForm');
  await expect(form).toBeVisible();
  await form.locator('select').selectOption('halloween');
  await form.getByRole('button', { name: 'Weltstimmung speichern' }).click();
  await expect(page.locator('#worldThemeStatus')).toContainText('Halloween');
  await page.screenshot({ path: info.outputPath('teacher-world-switch.png') });
  await page.goto('/dev/teacher.html#8b/dorf');
  await expect(page.locator('#worldThemeForm select')).toHaveValue('normal');
  await page.goto('/dev/teacher.html#8a/dorf');
  await expect(page.locator('#worldThemeForm select')).toHaveValue('halloween');
});
