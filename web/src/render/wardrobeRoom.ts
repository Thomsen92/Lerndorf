import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const assets = new Map<string, Promise<T.Object3D>>();
async function model(name: string): Promise<T.Object3D> {
  let p = assets.get(name);
  if (!p) {
    p = new GLTFLoader()
      .loadAsync(`${import.meta.env.BASE_URL}assets/wardrobe/${name}.glb`)
      .then((g) => g.scene)
      .catch((e) => {
        assets.delete(name);
        throw e;
      });
    assets.set(name, p);
  }
  return (await p).clone(true);
}
function fit(root: T.Object3D, size: number, axis: 'x' | 'y'): void {
  root.updateMatrixWorld(true);
  let b = new T.Box3().setFromObject(root);
  const s = b.getSize(new T.Vector3());
  root.scale.multiplyScalar(size / s[axis]);
  root.updateMatrixWorld(true);
  b = new T.Box3().setFromObject(root);
  const c = b.getCenter(new T.Vector3());
  root.position.sub(new T.Vector3(c.x, b.min.y, c.z));
}
export async function createWardrobeRoom(): Promise<{ scene: T.Scene; dispose(): void }> {
  const scene = new T.Scene();
  scene.background = new T.Color('#d4c7b6');
  scene.add(new T.HemisphereLight('#f8ead5', '#6b635d', 2));
  const sun = new T.DirectionalLight('#ffe0b6', 3);
  sun.position.set(-3, 5, 4);
  scene.add(sun);
  const owned: T.Mesh[] = [];
  const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color, roughness: 0.95 }));
    m.position.set(x, y, z);
    scene.add(m);
    owned.push(m);
    return m;
  };
  box(12, 0.12, 10, '#a78460', 0, -0.07, 0);
  box(12, 5, 0.12, '#c7d0c5', 0, 2.4, -2.6);
  box(0.12, 5, 10, '#a8b8b3', -4.0, 2.4, 0);
  box(12, 0.12, 0.12, '#7b654f', 0, 0.08, -2.48);
  const [wardrobe, rug] = await Promise.all([model('wardrobe'), model('rug')]);
  fit(wardrobe, 2.5, 'y');
  wardrobe.position.add(new T.Vector3(-0.8, 0, -1.2));
  wardrobe.rotation.y = 0.05;
  scene.add(wardrobe);
  fit(rug, 2.35, 'x');
  rug.position.y = 0.01;
  rug.position.z = 0.55;
  scene.add(rug);
  return {
    scene,
    dispose() {
      for (const m of owned) {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
      }
      scene.clear();
    },
  };
}
