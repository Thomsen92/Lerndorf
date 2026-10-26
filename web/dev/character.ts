/** Local asset inspection and reproducible static figure thumbnails. */
import * as THREE from 'three';
import { loadCharacter, instantiate, isCharacterKind } from '../src/render/character';
import { configurePreviewRenderer, createPreviewScene, fitCameraToBox } from '../src/render/itemPreview';
import { createWebGLPortraitRender } from '../src/render/portrait';
import { AvatarCustomizer } from '../src/avatars/customizer';
import type { AvatarLook } from '../src/avatars/look';
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
const style = new AvatarCustomizer(figure.root, kind);
render();
const preview = {
  ready: true,
  kind,
  height: box.getSize(new THREE.Vector3()).y,
  bottom: box.min.y,
  async look(look: AvatarLook) {
    await style.applyLook(look);
    render();
  },
  view(angle: number) {
    figure.root.rotation.y = angle;
    figure.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(figure.root);
    const fit = fitCameraToBox(bounds, 35, 1, 0.12, 0.06, 0.88);
    camera.position.copy(fit.position);
    camera.lookAt(fit.target);
    camera.updateProjectionMatrix();
    render();
  },
  duration(name: string) {
    return (
      name === 'walk'
        ? figure.walk
        : name === 'catwalk'
          ? figure.catwalk
          : name === 'celebrate2'
            ? figure.dances[1]
            : figure.dances[0]
    ).getClip().duration;
  },
  pose(name: 'walk' | 'catwalk' | 'celebrate' | 'celebrate2', time: number) {
    figure.mixer.stopAllAction();
    const action =
      name === 'walk'
        ? figure.walk
        : name === 'catwalk'
          ? figure.catwalk
          : name === 'celebrate2'
            ? figure.dances[1]
            : figure.dances[0];
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
      return await r.render(kind, style.getLook());
    } finally {
      r.dispose();
    }
  },
};
(window as unknown as { characterPreview: typeof preview }).characterPreview = preview;
