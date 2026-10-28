/** Rebuild the approved catalogue from read-only prototype sources. Run from web/ with Node.
 * No credentials, database, installed packages or source edits are involved.
 * Existing low-poly meshes are exported at their authored metre scale, without footprint filling.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const target = path.join(root, 'web/public/assets/shop');
const contract = JSON.parse(await readFile(path.join(root, 'content/shop/ollie-items.json'), 'utf8'));
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Asset export</title>'); return; }
  const file = path.resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream'); res.end(await readFile(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROMIUM_PATH || 'C:/Users/Thomas/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',
});
const page = await browser.newPage();
const audit = [];
try {
  await page.goto(`http://127.0.0.1:${address.port}/`);
  for (const product of contract.items) {
    if (product.source.startsWith('hauswerkstatt/')) {
      const original = path.join(root, 'Prototyp/hauswerkstatt/assets/models', `${product.source.split('/')[1]}.glb`);
      await copyFile(original, path.join(target, product.file));
    } else {
      const bytes = await page.evaluate(async (product) => {
        const { createProduct } = await import('/Prototyp/shop/models.mjs');
        const { GLTFLoader } = await import('/Prototyp/shop/vendor/GLTFLoader.js');
        const { GLTFExporter } = await import('/Prototyp/shop/vendor/GLTFExporter.js');
        const assets = {};
        for (const [id, file] of Object.entries({ lantern: 'town/lantern', barrel: 'survival/barrel', apple: 'food/apple' })) {
          assets[id] = (await new GLTFLoader().loadAsync(`/Prototyp/shop/assets/kenney/${file}.glb`)).scene;
        }
        const model = createProduct(product.source.split('/')[1], assets);
        return Array.from(new Uint8Array(await new GLTFExporter().parseAsync(model, { binary: true })));
      }, product);
      await writeFile(path.join(target, product.file), Buffer.from(bytes));
    }
    const measured = await page.evaluate(async (file) => {
      const T = await import('/Prototyp/shop/vendor/three.module.js');
      const { GLTFLoader } = await import('/Prototyp/shop/vendor/GLTFLoader.js');
      const model = (await new GLTFLoader().loadAsync(`/web/public/assets/shop/${file}`)).scene;
      model.updateMatrixWorld(true);
      const bounds = new T.Box3().setFromObject(model, true);
      const size = bounds.getSize(new T.Vector3());
      let triangles = 0, primitives = 0;
      model.traverse(m => { if (m.isMesh) { triangles += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3; primitives++; } });
      return { size: { w: size.x, h: size.y, d: size.z }, min: bounds.min.toArray(), max: bounds.max.toArray(), triangles, primitives };
    }, product.file);
    const bytes = await readFile(path.join(target, product.file));
    audit.push({ id: product.id, file: product.file, name: product.nameEn, kind: product.kind, price: product.price,
      source: product.source, revision: product.source.startsWith('hauswerkstatt/') ? 'r05' : 'approved-prototype',
      license: 'CC0-1.0', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...measured });
  }
  const manifestPath = path.join(target, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const ownFiles = new Set(audit.map(p => p.file));
  manifest.items = [...manifest.items.filter(p => !ownFiles.has(p.file)), ...audit];
  await writeFile(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
  await writeFile(path.join(target, 'ollie-audit.json'), JSON.stringify({ generator: 'web/scripts/export-ollie-items.mjs',
    note: 'Models retain authored metre scale. Low-poly models use their high template at all distances; no missing LOD requests.', items: audit }, null, 2) + '\n');
  console.log(JSON.stringify(audit.map(({ id, triangles, size }) => ({ id, triangles, size })), null, 2));
  if (process.argv.includes('--preview')) {
    await page.setViewportSize({ width: 1400, height: 1130 });
    await page.evaluate(async (products) => {
      const T = await import('/Prototyp/shop/vendor/three.module.js');
      const { GLTFLoader } = await import('/Prototyp/shop/vendor/GLTFLoader.js');
      document.body.style.cssText = 'margin:0;padding:24px;background:#eff0e5;font:16px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:18px;color:#304841';
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(310, 205);
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      for (const product of products) {
        const model = (await new GLTFLoader().loadAsync(`/web/public/assets/shop/${product.file}`)).scene;
        const scene = new T.Scene(); scene.background = new T.Color('#566381');
        scene.add(new T.HemisphereLight('#a9b8e8', '#3a5a3a', 1.15));
        const sun = new T.DirectionalLight('#ffd2a1', 1.6); sun.position.set(-4, 7, 5); scene.add(sun);
        const box = new T.Box3().setFromObject(model, true), size = box.getSize(new T.Vector3()), centre = box.getCenter(new T.Vector3());
        model.position.sub(centre); scene.add(model);
        const camera = new T.PerspectiveCamera(35, 310 / 205, 0.01, 100);
        const distance = Math.max(size.x, size.y, size.z) * 2.05;
        camera.position.set(distance * 0.68, distance * 0.45, distance); camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        const card = document.createElement('div'); card.style.cssText = 'border-radius:12px;overflow:hidden;background:#fff7e9;box-shadow:0 2px 5px #30484125';
        const img = document.createElement('img'); img.src = renderer.domElement.toDataURL('image/png'); img.style.cssText = 'display:block;width:100%;height:205px;object-fit:cover';
        const title = document.createElement('div'); title.textContent = product.name; title.style.cssText = 'padding:10px 12px 3px;font-weight:bold';
        const caption = document.createElement('div'); caption.textContent = `${product.price} coins · ${product.kind} · ${product.size.w.toFixed(2)} × ${product.size.d.toFixed(2)} × ${product.size.h.toFixed(2)} m`; caption.style.cssText = 'padding:0 12px 12px;font-size:12px';
        card.append(img, title, caption); document.body.append(card);
      }
      renderer.dispose();
    }, audit);
    await page.screenshot({ path: path.join(root, 'content/shop/ollie-contact-sheet.png'), fullPage: true });
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
