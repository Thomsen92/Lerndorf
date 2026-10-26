import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const parts = JSON.parse(readFileSync('../content/avatar/wardrobe.json')).items;
const dir = 'test-results/wardrobe/animation';
mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 320, height: 320 } }),
  errors = [];
p.on('pageerror', (e) => errors.push(e.message));
try {
  for (const kind of ['boy', 'girl']) {
    await p.goto(`http://localhost:5175/dev/character.html?char=${kind}`);
    await p.waitForFunction(() => window.characterPreview?.ready);
    for (const item of parts.filter((i) => i.character === kind)) {
      await p.evaluate(async (id) => window.characterPreview.look({ items: [id], colors: {} }), item.id);
      for (const [pose, time, angle] of [
        ['walk', 0.45, 0],
        ['celebrate', 0.75, Math.PI],
      ]) {
        const bounds = await p.evaluate(
          ([pose, time, angle]) => {
            const size = window.characterPreview.pose(pose, time);
            window.characterPreview.view(angle);
            return size;
          },
          [pose, time, angle],
        );
        if (!bounds.every(Number.isFinite)) throw Error('Invalid animated bounds');
        await p.locator('canvas').screenshot({ path: `${dir}/${item.id}-${pose}.png`, omitBackground: true });
      }
    }
    const items =
      kind === 'boy'
        ? parts.filter((i) => i.character === kind).map((i) => i.id)
        : [
            'avatar_girl_daisy_bucket',
            'avatar_girl_heart_pop',
            'avatar_girl_starpack',
            'avatar_girl_candy_orbit',
            'avatar_girl_bloom',
            'avatar_girl_slim_jeans',
          ];
    const outfits =
      kind === 'boy'
        ? [['boy', items]]
        : [
            ['girl-jeans', items],
            [
              'girl-skirt',
              items.map((id) => (id === 'avatar_girl_slim_jeans' ? 'avatar_girl_pleated_skirt' : id)),
            ],
          ];
    for (const [label, outfit] of outfits) {
      await p.evaluate(async (items) => window.characterPreview.look({ items, colors: {} }), outfit);
      for (const pose of kind === 'girl'
        ? ['walk', 'catwalk', 'celebrate', 'celebrate2']
        : ['walk', 'catwalk', 'celebrate'])
        for (let frame = 0; frame < 8; frame++) {
          const duration = await p.evaluate((pose) => window.characterPreview.duration(pose), pose),
            time = (duration * frame) / 8;
          await p.evaluate(
            ([pose, time]) => {
              window.characterPreview.pose(pose, time);
              window.characterPreview.view(0.4);
            },
            [pose, time],
          );
          await p
            .locator('canvas')
            .screenshot({ path: `${dir}/${label}-cycle-${pose}-${frame}.png`, omitBackground: true });
        }
    }
    const portrait = await p.evaluate(() => window.characterPreview.portrait());
    writeFileSync(`${dir}/${kind}-portrait.png`, Buffer.from(portrait.split(',')[1], 'base64'));
  }
  if (errors.length) throw Error(errors.join('\n'));
  console.log(
    JSON.stringify({
      parts: parts.length,
      individualFrames: 32,
      combinationFrames: 88,
      portraits: 2,
      errors,
    }),
  );
} finally {
  await b.close();
}
