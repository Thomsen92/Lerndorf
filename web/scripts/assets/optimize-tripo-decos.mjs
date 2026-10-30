// Shrinks Tripo-generated GLBs for the shop: static mesh, one baseColor JPEG, meshopt.
// usage: node optimize-tripo-decos.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize, reorder, weld, simplify, textureCompress, prune, dedup, meshopt, getBounds, flatten, join } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { homedir } from 'node:os';
import { statSync } from 'node:fs';

const DL = homedir() + '/Downloads/';
const OUT = process.argv[2] ?? 'out/';
// [source, target, high triangles, lod triangles, high texture px, real height or length in metres (0 = keep)]
const JOBS = [
  ['medieval castle 3d model_Clone1_Clone1 (1).glb', 'medieval-castle', 6000, 1500, 1024, 0],
  ['blue armored exosuit robot 3d model.glb', 'exosuit-robot', 5000, 1500, 1024, 0],
  ['barack obama 3d model.glb', 'obama-statue', 9000, 2000, 1024, 0],
  ['simson motorcycle 3d model_Clone1.glb', 'simson-motorcycle', 9000, 2000, 1024, 2.0],
  ['moped 3d model_Clone1.glb', 'moped', 7000, 1800, 1024, 1.8],
  ['scooter 3d model.glb', 'scooter', 4500, 1500, 1024, 1.7],
  ['fendt tractor 3d model_Clone1.glb', 'fendt-tractor', 8000, 2000, 1024, 4.2],
];
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
});
const countTris = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);

for (const [src, name, hi, lo, tex, metres, fmt = 'jpeg'] of JOBS) {
  for (const [variant, target, px] of [['', hi, tex], ['.lod', lo, 256]]) {
    const doc = await io.read(DL + src);
    const root = doc.getRoot();
    // static: drop skins, joints and weights (the rest pose is the model)
    for (const node of root.listNodes()) node.setSkin(null);
    for (const skin of root.listSkins()) skin.dispose();
    for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
      for (const sem of ['JOINTS_0', 'WEIGHTS_0']) p.setAttribute(sem, null);
    }
    for (const m of root.listMaterials()) {
      m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null);
      m.setMetallicFactor(0); m.setRoughnessFactor(0.85); m.setEmissiveFactor([0, 0, 0]);
      for (const ext of m.listExtensions()) ext.dispose();
    }
    await doc.transform(dequantize());
    await doc.transform(flatten(), dedup());
    await doc.transform(weld({ tolerance: 0.0001 }));
    const before = countTris(doc);
    if (before > target) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: target / before, error: variant ? 0.15 : 0.03, lockBorder: false }));
    await doc.transform(join());
    if (countTris(doc) > target * 1.3) {
      // UV islands pin the normal simplifier (and a 2-million-triangle scan needs a big cut): sloppy fallback
      for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
        const idx = p.getIndices(), pos = p.getAttribute('POSITION');
        const want = Math.max(300, target) * 3;
        if (!idx || idx.getCount() <= want) continue; // small parts stay as they are
        const next = MeshoptSimplifier.simplifySloppy(new Uint32Array(idx.getArray()), new Float32Array(pos.getArray()), 3, null, want, 0.2)[0];
        idx.setArray(new Uint32Array(next));
      }
      await doc.transform(reorder({ encoder: MeshoptEncoder }));
    }
    await doc.transform(textureCompress({ encoder: sharp, targetFormat: fmt, resize: [px, px], quality: 80 }));
    await doc.transform(prune());
    // real-world size in metres (longest side), applied on the scene root
    const scene = root.listScenes()[0];
    let bb = getBounds(scene);
    const size = bb.max.map((v, i) => v - bb.min[i]);
    if (metres > 0) {
      const k = metres / Math.max(...size);
      for (const n of scene.listChildren()) { const s = n.getScale(); n.setScale([s[0] * k, s[1] * k, s[2] * k]); const t = n.getTranslation(); n.setTranslation([t[0] * k, t[1] * k, t[2] * k]); }
      bb = getBounds(scene);
    }
    await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
    const file = `${OUT}${name}${variant}.glb`;
    await io.write(file, doc);
    const d = bb.max.map((v, i) => (v - bb.min[i]).toFixed(2));
    console.log(file, 'tris', before, '->', countTris(doc), 'dims xyz', d.join(' x '), (statSync(file).size / 1024).toFixed(0) + ' KB');
  }
}
