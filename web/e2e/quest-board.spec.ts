import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
test.setTimeout(90000);
for (const viewport of [
  { width: 1180, height: 820 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
])
  test(`Sir Byte shortcut and clickable board ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: viewport.width === 1180 ? 'no-preference' : 'reduce' });
    const errors: string[] = [];
    const boardAudio: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/sir-byte/voice/board.mp3')) boardAudio.push(request.url());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const original = AudioBufferSourceNode.prototype.start;
      (window as Window & { voiceStarts: number }).voiceStarts = 0;
      AudioBufferSourceNode.prototype.start = function (...args: Parameters<AudioBufferSourceNode['start']>) {
        const result = original.apply(this, args);
        (window as Window & { voiceStarts: number }).voiceStarts++;
        return result;
      };
    });
    await page.goto('/dev/tutorial.html?step=done&char=girl&wait=0&lang=en');
    const shortcut = page.getByRole('button', { name: 'Go to Sir Byte and the quest board', exact: true });
    await expect(shortcut).toBeVisible({ timeout: 60000 });
    await shortcut.click();
    const cue = page.getByRole('button', { name: 'Open quest board – daily quests', exact: true });
    await expect(cue).toBeVisible();
    await page.waitForTimeout(1500);
    await expect.poll(() => boardAudio.length, { timeout: 5000 }).toBe(1);
    await expect
      .poll(() => page.evaluate(() => (window as Window & { voiceStarts: number }).voiceStarts))
      .toBeGreaterThan(0);
    const box = await cue.boundingBox();
    expect(box!.x).toBeGreaterThan(0);
    expect(box!.x + box!.width).toBeLessThan(viewport.width);
    mkdirSync('test-results/quest-board', { recursive: true });
    await page.screenshot({ path: `test-results/quest-board/market-${viewport.width}.png` });
    await cue.hover();
    await expect(cue).toHaveClass(/is-highlighted/);
    // Click the actual 3D plank, independently of the floating shortcut.
    const point = await page.evaluate(async ({ width, height }) => {
      const layoutUrl = '/src/world/layout.ts',
        cameraUrl = '/src/render/questBoardCamera.ts',
        threeUrl = '/node_modules/.vite/deps/three.js';
      const { buildLayout } = await import(layoutUrl),
        { questBoardView } = await import(cameraUrl),
        THREE = await import(threeUrl);
      const l = buildLayout(8, 34, 'tal'),
        pose = questBoardView(l, width / height, width < height ? 52 : 38),
        camera = new THREE.PerspectiveCamera(width < height ? 52 : 38, width / height, 0.1, 400);
      camera.position.copy(pose.position);
      camera.lookAt(pose.target);
      camera.updateMatrixWorld();
      const face = Math.atan2(l.plaza.x - l.board.x, l.plaza.z - l.board.z),
        at = new THREE.Vector3(
          l.board.x + Math.sin(face) * 0.2,
          l.plazaHeight + 1.9,
          l.board.z + Math.cos(face) * 0.2,
        ).project(camera);
      return { x: ((at.x + 1) * width) / 2, y: ((1 - at.y) * height) / 2 };
    }, viewport);
    await page.mouse.click(point.x, point.y);
    await expect(page.locator('.quests-area')).toBeVisible();
    await expect(cue).toBeHidden();
    expect(errors).toEqual([]);
  });
