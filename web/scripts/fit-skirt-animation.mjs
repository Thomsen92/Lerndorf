// The supplied r10 skirt was weighted for a moderate pose: its lower shell stayed 82% on Hips.
// Preserve waist, bind pose and source files; allow the shell to follow walking thighs.
import { readFileSync, writeFileSync } from 'node:fs';
const path = 'public/assets/characters/wardrobe/girl/refinement/pleated-skirt-r10.glb';
const file = readFileSync('../Prototyp/StandardGirlShop/refinement/pleated-skirt-r10.glb'),
  length = file.readUInt32LE(12),
  doc = JSON.parse(file.subarray(20, 20 + length)),
  bin = Buffer.from(file.subarray(28 + length));
const joints = doc.skins[0].joints.map((i) => doc.nodes[i].name);
function address(id, i, k) {
  const a = doc.accessors[id],
    v = doc.bufferViews[a.bufferView],
    width = a.componentType === 5126 ? 4 : a.componentType === 5123 ? 2 : 1,
    n = { VEC3: 3, VEC4: 4 }[a.type];
  return (v.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * (v.byteStride ?? width * n) + k * width;
}
let changed = 0;
for (const mesh of doc.meshes.filter((m) => m.name.startsWith('CLOTH_pleated-skirt'))) {
  for (const p of mesh.primitives) {
    const a = p.attributes;
    for (let i = 0; i < doc.accessors[a.POSITION].count; i++) {
      const y = bin.readFloatLE(address(a.POSITION, i, 1)),
        t = Math.max(0, Math.min(1, (0.5 - y) / 0.12));
      if (!t) continue;
      const zAt = address(a.POSITION, i, 2),
        z0 = bin.readFloatLE(zAt),
        scale = 1 + 0.18 * t;
      bin.writeFloatLE(z0 * scale, zAt);
      if (a.NORMAL !== undefined) {
        const normal = Array.from({ length: 3 }, (_, k) => bin.readFloatLE(address(a.NORMAL, i, k)));
        const dzdy = y > 0.38 && y < 0.5 ? (-0.18 * z0) / 0.12 : 0;
        normal[1] -= (normal[2] * dzdy) / scale;
        normal[2] /= scale;
        const length = Math.hypot(...normal);
        for (let k = 0; k < 3; k++) bin.writeFloatLE(normal[k] / length, address(a.NORMAL, i, k));
      }
      const weight = Array.from({ length: 4 }, (_, k) => bin.readFloatLE(address(a.WEIGHTS_0, i, k)));
      const names = Array.from({ length: 4 }, (_, k) => {
        const at = address(a.JOINTS_0, i, k);
        return joints[
          doc.accessors[a.JOINTS_0].componentType === 5123 ? bin.readUInt16LE(at) : bin.readUInt8(at)
        ];
      });
      const hip = names.findIndex((n) => /Hips$/.test(n)),
        legs = names.map((n, k) => (/UpLeg$/.test(n) ? k : -1)).filter((k) => k >= 0);
      if (hip < 0) throw Error('Missing hip weight');
      if (legs.length !== 2) continue;
      const sum = legs.reduce((n, k) => n + weight[k], 0);
      if (sum <= 0) continue;
      const desired = Math.max(sum, 0.78 * t);
      for (const k of legs) weight[k] = (weight[k] / sum) * desired;
      weight[hip] = 1 - desired;
      for (let k = 0; k < 4; k++) bin.writeFloatLE(weight[k], address(a.WEIGHTS_0, i, k));
      changed++;
    }
  }
}
for (const mesh of doc.meshes)
  for (const p of mesh.primitives) {
    const id = p.attributes.POSITION,
      a = doc.accessors[id];
    a.min = [Infinity, Infinity, Infinity];
    a.max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < a.count; i++)
      for (let k = 0; k < 3; k++) {
        const v = bin.readFloatLE(address(id, i, k));
        a.min[k] = Math.min(a.min[k], v);
        a.max[k] = Math.max(a.max[k], v);
      }
  }
let text = Buffer.from(JSON.stringify(doc));
text = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 32)]);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + text.length + bin.length, 8);
header.writeUInt32LE(text.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const bh = Buffer.alloc(8);
bh.writeUInt32LE(bin.length);
bh.writeUInt32LE(0x004e4942, 4);
writeFileSync(path, Buffer.concat([header, text, bh, bin]));
console.log(
  JSON.stringify({
    verticesAdjusted: changed,
    restGeometry: 'waist unchanged; lower shell depth clearance up to 18%',
    source: 'unchanged',
  }),
);
