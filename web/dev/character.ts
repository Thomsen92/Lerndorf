/** Local asset inspection and reproducible static figure thumbnails. */
import * as THREE from 'three';
import { loadCharacter, instantiate, isCharacterKind } from '../src/render/character';
import { configurePreviewRenderer, createPreviewScene, fitCameraToBox } from '../src/render/itemPreview';
import { createWebGLPortraitRender } from '../src/render/portrait';
const kind = new URLSearchParams(location.search).get('char') ?? 'boy';
if (!isCharacterKind(kind)) throw Error('Unknown figure');
const asset = await loadCharacter(kind);
if (!asset) throw Error('Figure failed to load');
const figure = instantiate(asset),
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
configurePreviewRenderer(renderer);
renderer.setSize(320, 320);
document.body.append(renderer.domElement);
const { scene, camera } = createPreviewScene();
scene.add(figure.root);
figure.walk.play();
figure.mixer.update(0);
figure.root.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(figure.root),
  frame = fitCameraToBox(box, 35, 1, 0.12, 0.06, 0.88);
camera.fov = 35;
camera.aspect = 1;
camera.position.copy(frame.position);
camera.lookAt(frame.target);
camera.updateProjectionMatrix();
figure.root.rotation.y = 0.12;
const render = () => renderer.render(scene, camera);
render();
const preview = {
  ready: true,
  kind,
  height: box.getSize(new THREE.Vector3()).y,
  bottom: box.min.y,
  pose(name: 'walk' | 'catwalk' | 'celebrate', time: number) {
    figure.mixer.stopAllAction();
    const action = name === 'walk' ? figure.walk : name === 'catwalk' ? figure.catwalk : figure.dances[0];
    action.reset().play();
    figure.mixer.setTime(time);
    figure.root.updateMatrixWorld(true);
    render();
    return new THREE.Box3().setFromObject(figure.root).getSize(new THREE.Vector3()).toArray();
  },
  async portrait() {
    const r = createWebGLPortraitRender();
    if (!r) throw Error('No portrait renderer');
    try {
      return await r.render(kind);
    } finally {
      r.dispose();
    }
  },
};
(window as unknown as { characterPreview: typeof preview }).characterPreview = preview;
