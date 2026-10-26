// Preserve authored mesh/material/skin data and splice only compatible animation accessors.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Matrix4, Vector3, Quaternion } from 'three';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const norm = (s) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();
function glb(path) {
  const b = readFileSync(path),
    len = b.readUInt32LE(12);
  return { j: JSON.parse(b.subarray(20, 20 + len)), bin: b.subarray(28 + len) };
}
function save(path, j, bin) {
  j.buffers = [{ byteLength: bin.length }];
  let a = Buffer.from(JSON.stringify(j));
  a = Buffer.concat([a, Buffer.alloc((4 - (a.length % 4)) % 4, 32)]);
  bin = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const h = Buffer.alloc(20);
  h.writeUInt32LE(0x46546c67);
  h.writeUInt32LE(2, 4);
  h.writeUInt32LE(28 + a.length + bin.length, 8);
  h.writeUInt32LE(a.length, 12);
  h.writeUInt32LE(0x4e4f534a, 16);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  writeFileSync(path, Buffer.concat([h, a, bh, bin]));
}
function world(j) {
  const parents = new Map();
  j.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => parents.set(c, i)));
  const cache = new Map();
  return function at(i) {
    if (cache.has(i)) return cache.get(i);
    const n = j.nodes[i],
      m = n.matrix
        ? new Matrix4().fromArray(n.matrix)
        : new Matrix4().compose(
            new Vector3(...(n.translation ?? [0, 0, 0])),
            new Quaternion(...(n.rotation ?? [0, 0, 0, 1])),
            new Vector3(...(n.scale ?? [1, 1, 1])),
          );
    if (parents.has(i)) m.premultiply(at(parents.get(i)));
    cache.set(i, m);
    return m;
  };
}
const prices = { boy: [120, 80, 100, 180], girl: [80, 60, 70, 60, 40, 100, 100, 30, 70, 40, 120, 120] };
const names = {
  boy: ['Federkappe', 'Sonnenbrille', 'Goldkette', 'Hellebarde'],
  girl: [
    'Stern-Kopfhörer',
    'Katzenohren',
    'Blumenhut',
    'Herzbrille',
    'Stern-Haarclips',
    'Stern-Rucksack',
    'Umhängetasche',
    'Perlenarmband',
    'Blumenkette',
    'Haarschleife',
    'Jeans',
    'Faltenrock',
  ],
};
const manifest = [],
  audits = [];
for (const kind of ['boy', 'girl']) {
  const source = resolve(root, `Prototyp/Standard${kind === 'boy' ? 'Boy' : 'Girl'}Shop`),
    target = resolve(root, `web/public/assets/characters/wardrobe/${kind}`);
  mkdirSync(target, { recursive: true });
  const catalog = JSON.parse(
    readFileSync(resolve(source, kind === 'girl' ? 'refinement/catalog-r10.json' : 'catalog.json')),
  );
  const base = glb(resolve(source, catalog.avatar)),
    donor = glb(resolve(root, `web/public/assets/characters/${kind}.glb`));
  const nodes = new Map(base.j.nodes.map((n, i) => [norm(n.name ?? ''), i]));
  const wb = world(base.j),
    wd = world(donor.j);
  let error = 0;
  for (const i of donor.j.skins[0].joints) {
    const match = nodes.get(norm(donor.j.nodes[i].name));
    if (match === undefined) throw Error('Missing bone');
    const b = wb(match).elements,
      d = wd(i).elements;
    error = Math.max(error, ...b.map((v, k) => Math.abs(v - d[k])));
  }
  if (error > 1e-4) throw Error(`${kind}: incompatible rest matrices ${error}`);
  const inverseMatrices = (g) => {
    const a = g.j.accessors[g.j.skins[0].inverseBindMatrices],
      v = g.j.bufferViews[a.bufferView];
    return new Map(
      g.j.skins[0].joints.map((n, i) => [
        norm(g.j.nodes[n].name),
        Array.from({ length: 16 }, (_, k) =>
          g.bin.readFloatLE((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * 64 + k * 4),
        ),
      ]),
    );
  };
  const targetInverses = inverseMatrices(base);
  let bindError = 0;
  for (const [name, values] of inverseMatrices(donor))
    bindError = Math.max(
      bindError,
      ...values.map((value, k) => Math.abs(value - targetInverses.get(name)[k])),
    );
  if (bindError > 1e-4) throw Error(`${kind}: incompatible inverse bind matrices ${bindError}`);
  const parts = [base.bin],
    views = new Map(),
    accessors = new Map();
  let offset = base.bin.length;
  function accessor(id) {
    if (accessors.has(id)) return accessors.get(id);
    const a = structuredClone(donor.j.accessors[id]);
    if (a.sparse) throw Error('Sparse animation accessor');
    const vi = a.bufferView;
    if (!views.has(vi)) {
      const v = structuredClone(donor.j.bufferViews[vi]);
      const bytes = donor.bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
      const pad = (4 - (offset % 4)) % 4;
      parts.push(Buffer.alloc(pad), bytes);
      offset += pad;
      v.buffer = 0;
      v.byteOffset = offset;
      offset += bytes.length;
      views.set(vi, base.j.bufferViews.length);
      base.j.bufferViews.push(v);
    }
    a.bufferView = views.get(vi);
    accessors.set(id, base.j.accessors.length);
    base.j.accessors.push(a);
    return accessors.get(id);
  }
  base.j.animations = donor.j.animations.map((anim) => ({
    ...anim,
    samplers: anim.samplers.map((s) => ({ ...s, input: accessor(s.input), output: accessor(s.output) })),
    channels: anim.channels.map((c) => {
      const node = nodes.get(norm(donor.j.nodes[c.target.node].name ?? ''));
      if (node === undefined) throw Error(`Missing animated node ${c.target.node}`);
      return { ...c, target: { ...c.target, node } };
    }),
  }));
  save(resolve(target, 'character.glb'), base.j, Buffer.concat(parts));
  catalog.avatar = 'character.glb';
  catalog.revision = '20261026-wardrobe';
  for (const [index, item] of catalog.items.entries()) {
    const runtimeId = item.id,
      id = `avatar_${kind}_${runtimeId.replaceAll('-', '_')}`;
    // The r10 catalogue references thumbnail names that were never exported; use its real front renders.
    if (kind === 'girl' && item.binding === 'skinned')
      item.thumbnail = `refinement/r10-${runtimeId}-front.png`;
    for (const key of ['url', 'thumbnail']) {
      const dest = resolve(target, item[key]);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(resolve(source, item[key]), dest);
    }
    item.runtimeId = runtimeId;
    item.id = id;
    item.character = kind;
    item.name = names[kind][index];
    item.price = prices[kind][index];
    item.conflicts = (item.conflicts ?? []).map((i) => `avatar_${kind}_${i.replaceAll('-', '_')}`);
    manifest.push({ ...item, source: `Prototyp/Standard${kind === 'boy' ? 'Boy' : 'Girl'}Shop/${item.url}` });
  }
  writeFileSync(resolve(target, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  audits.push({
    kind,
    restMatrixError: error,
    inverseBindError: bindError,
    bones: 65,
    clips: base.j.animations.map((a) => a.name),
    baseBytes: readFileSync(resolve(target, 'character.glb')).length,
  });
}
const room = resolve(root, 'web/public/assets/wardrobe');
mkdirSync(room, { recursive: true });
for (const [src, dest] of [
  ['wooden wardrobe 3d model.glb', 'wardrobe.glb'],
  ['round+decorative+rug+3d+model.glb', 'rug.glb'],
])
  copyFileSync(resolve('C:/Users/Thomas/Downloads', src), resolve(room, dest));
mkdirSync(resolve(root, 'content/avatar'), { recursive: true });
writeFileSync(
  resolve(root, 'content/avatar/wardrobe.json'),
  JSON.stringify({ version: 1, items: manifest }, null, 2) + '\n',
);
writeFileSync(resolve(root, 'content/avatar/asset-audit.json'), JSON.stringify(audits, null, 2) + '\n');
console.log(JSON.stringify(audits));
