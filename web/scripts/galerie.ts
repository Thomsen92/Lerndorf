// `npm run galerie`: renders the layout gallery (SPEC §10.12) into Konzept/Galerie/<datum>/.
// Starts its own Vite server on port 5174 and stops it again. Writes stats.json with draw calls.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const MAPS = ['tal', 'fluss_mitte', 'bach_norden']; // all templates (SPEC §10.1)
const SEEDS = [11, 23];
const VIEWS = ['overview', 'topdown', 'marketplace', 'plot', 'bridge'];
const PORT = 5174;
// Vite serves everything below the base path of the app (SPEC §17)
const BASE = `http://localhost:${PORT}/Lerndorf/dev/galerie.html`;

const date = new Date().toISOString().slice(0, 10);
const outDirPath = fileURLToPath(new URL(`../../Konzept/Galerie/${date}/`, import.meta.url));
mkdirSync(outDirPath, { recursive: true });

async function waitFor(url: string, timeoutMs: number): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start: ${url}`);
}

const server: ChildProcess = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});

try {
  await waitFor(BASE, 60000);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const stats: Record<string, { total: number; world: number }> = {};
  for (const map of MAPS) {
    for (const seed of SEEDS) {
      for (const view of VIEWS) {
        await page.goto(`${BASE}?map=${map}&seed=${seed}&view=${view}`);
        await page.waitForFunction(
          () => (window as unknown as { galerie?: { ready: boolean } }).galerie?.ready === true,
          null,
          {
            timeout: 60000,
          },
        );
        const key = `${map}_${seed}_${view}`;
        stats[key] = await page.evaluate(() =>
          (
            window as unknown as { galerie: { drawCalls(): { total: number; world: number } } }
          ).galerie.drawCalls(),
        );
        await page.screenshot({ path: join(outDirPath, `${key}.png`) });
      }
    }
  }
  await browser.close();

  writeFileSync(join(outDirPath, 'stats.json'), JSON.stringify(stats, null, 2));
  console.log(`Galerie: ${Object.keys(stats).length} Bilder in Konzept/Galerie/${date}/`);
  console.log(
    Object.entries(stats)
      .map(([k, v]) => `${k}: ${v.total} Draw Calls (Welt ${v.world})`)
      .join('\n'),
  );
  if (errors.length) console.log('Fehler im Browser:', errors.slice(0, 5));
} finally {
  server.kill();
}
