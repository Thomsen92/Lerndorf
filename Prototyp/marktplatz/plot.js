import * as T from './vendor/three.module.js';

export function createExamplePlot(scene, { cube, beam, asset, label, materials, pools, glowPositions }) {
  const center = { x: -24, z: -15 }, halfWidth = 5.4, halfDepth = 4.6;
  const bounds = { minX: center.x - halfWidth, maxX: center.x + halfWidth, minZ: center.z - halfDepth, maxZ: center.z + halfDepth };
  const decorations = [];
  const grass = new T.MeshStandardMaterial({ color: '#5c754d', roughness: 1, flatShading: true });
  const border = new T.MeshStandardMaterial({ color: '#8a7963', roughness: 1, flatShading: true });
  cube(center.x, -.035, center.z, halfWidth * 2, .14, halfDepth * 2, grass);
  // The public verge and path carry all seasonal objects. The grass is clear.
  for (const x of [bounds.minX - .8, bounds.maxX + .8]) cube(x, -.045, center.z, 1.5, .08, halfDepth * 2 + 3, border);
  for (const z of [bounds.minZ - .8, bounds.maxZ + .8]) cube(center.x, -.045, z, halfWidth * 2 + 3, .08, 1.5, border);

  function fencePost(x, z) {
    cube(x, .46, z, .13, .92, .13, materials.wood);
    cube(x, .95, z, .19, .07, .19, materials.trim);
  }
  for (let i = 0; i <= 10; i++) {
    const x = bounds.minX + i / 10 * halfWidth * 2;
    fencePost(x, bounds.minZ);
    if (Math.abs(x - center.x) > .95) fencePost(x, bounds.maxZ);
  }
  for (let i = 1; i < 9; i++) {
    const z = bounds.minZ + i / 9 * halfDepth * 2;
    fencePost(bounds.minX, z); fencePost(bounds.maxX, z);
  }
  cube(center.x, .55, bounds.minZ, halfWidth * 2, .1, .08, materials.wood);
  for (const x of [bounds.minX, bounds.maxX]) cube(x, .55, center.z, .08, .1, halfDepth * 2, materials.wood);
  for (const side of [-1, 1]) {
    const length = halfWidth - .95, x = center.x + side * (.95 + length / 2);
    cube(x, .55, bounds.maxZ, length, .1, .08, materials.wood);
    fencePost(center.x + side * .95, bounds.maxZ);
  }

  function pumpkin(x, z, height, rotation = .45) {
    asset('carved', x, z, height, rotation, .03);
    decorations.push({ kind: 'pumpkin', x, z });
  }
  function lamp(x, z, height = 2.1) {
    beam([x, 0, z], [x, height, z], .065, materials.darkwood);
    cube(x, height + .20, z, .30, .38, .30, materials.warm);
    cube(x, height + .44, z, .45, .10, .45, materials.iron);
    cube(x, height - .02, z, .40, .08, .40, materials.iron);
    glowPositions.push([x, height + .20, z]); pools.push([x, .012, z, 5.3]);
    decorations.push({ kind: 'lamp', x, z });
  }
  for (const side of [-1, 1]) {
    lamp(center.x + side * 1.35, bounds.maxZ + .68);
    lamp(center.x + side * (halfWidth + .8), bounds.minZ - .8, 1.65);
    lamp(center.x + side * (halfWidth + .8), bounds.maxZ + .8, 1.65);
    pumpkin(center.x + side * (halfWidth + .65), center.z - 1.8, .72);
    pumpkin(center.x + side * (halfWidth + .75), center.z + 1.7, .46);
    pumpkin(center.x + side * 2.3, bounds.maxZ + .65, .8);
    pumpkin(center.x + side * 3.35, bounds.maxZ + .75, .42);
  }
  label('Example plot', center.x - 3.6, 1.1, bounds.maxZ + .7, 2.6, .6);
  beam([center.x - 3.6, 0, bounds.maxZ + .67], [center.x - 3.6, 1.4, bounds.maxZ + .67], .07);

  const route = new T.CatmullRomCurve3([
    new T.Vector3(center.x, -.035, bounds.maxZ + 1), new T.Vector3(-23.5, -.035, -6.8),
    new T.Vector3(-19, -.035, -5), new T.Vector3(-11, -.035, -3),
  ]);
  const a = new T.Vector3(), b = new T.Vector3();
  const routePoints = route.getPoints(30);
  for (let i = 0; i < 30; i++) {
    route.getPoint(i / 30, a); route.getPoint((i + 1) / 30, b);
    cube((a.x + b.x) / 2, -.025, (a.z + b.z) / 2, 1.65, .07, a.distanceTo(b) + .06, materials.paving, Math.atan2(b.x - a.x, b.z - a.z));
  }
  pumpkin(center.x - 1.35, -6.8, .5); pumpkin(center.x + 1.35, -6.8, .58);
  const entranceLight = new T.PointLight('#ffad64', 13, 10, 1.6);
  entranceLight.position.set(center.x, 2.2, bounds.maxZ + 1.0); scene.add(entranceLight);
  return {
    center, bounds, decorations,
    reserve(x, z) {
      return x > bounds.minX - 2 && x < bounds.maxX + 2 && z > bounds.minZ - 2 && z < bounds.maxZ + 3
        || routePoints.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < 2.3 ** 2);
    },
    details: () => ({ center: { ...center }, bounds: { ...bounds }, buildAreaClear: true, decorations: decorations.map(d => ({ ...d })) }),
  };
}
