import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const manifest = JSON.parse(readFileSync('../content/avatar/wardrobe.json')),
  ids = new Set();
const report = [];
function parse(path) {
  const b = readFileSync(path),
    n = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + n));
}
for (const kind of ['boy', 'girl']) {
  const root = resolve(`public/assets/characters/wardrobe/${kind}`),
    cat = JSON.parse(readFileSync(resolve(root, 'catalog.json'))),
    base = parse(resolve(root, 'character.glb'));
  if (base.skins[0].joints.length !== 65 || !base.animations?.length) throw Error('Missing animated rig');
  let bytes = statSync(resolve(root, 'character.glb')).size;
  const parts = [];
  for (const p of cat.items) {
    if (ids.has(p.id)) throw Error('Duplicate id');
    ids.add(p.id);
    if (!manifest.items.some((i) => i.id === p.id)) throw Error('Manifest mismatch');
    for (const key of ['url', 'thumbnail']) {
      const file = resolve(root, p[key]);
      if (relative(root, file).startsWith('..') || !existsSync(file)) throw Error(`Invalid path ${p[key]}`);
    }
    for (const id of p.conflicts)
      if (!manifest.items.some((i) => i.id === id)) throw Error('Missing conflict');
    if (p.binding !== 'skinned' && p.attachmentMatrix?.length !== 16) throw Error('Invalid attachment');
    const j = parse(resolve(root, p.url)),
      triangles = j.meshes.reduce(
        (sum, m) =>
          sum +
          m.primitives.reduce(
            (n, p) =>
              n +
              (p.indices === undefined
                ? j.accessors[p.attributes.POSITION].count
                : j.accessors[p.indices].count) /
                3,
            0,
          ),
        0,
      );
    const size = statSync(resolve(root, p.url)).size;
    bytes += size;
    parts.push({ id: p.id, triangles, bytes: size });
  }
  report.push({
    kind,
    baseBytes: statSync(resolve(root, 'character.glb')).size,
    baseTriangles: base.meshes.reduce(
      (sum, m) =>
        sum +
        m.primitives.reduce(
          (n, p) =>
            n +
            (p.indices === undefined
              ? base.accessors[p.attributes.POSITION].count
              : base.accessors[p.indices].count) /
              3,
          0,
        ),
      0,
    ),
    allPartsAndBaseBytes: bytes,
    clips: base.animations.map((a) => a.name),
    parts,
  });
}
const room = ['wardrobe', 'rug'].map((n) => ({
  name: n,
  bytes: statSync(`public/assets/wardrobe/${n}.glb`).size,
}));
writeFileSync(
  '../content/avatar/delivery-audit.json',
  JSON.stringify({ characters: report, room }, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    parts: ids.size,
    characters: report.map((r) => ({ kind: r.kind, base: r.baseBytes, total: r.allPartsAndBaseBytes })),
    room,
  }),
);
