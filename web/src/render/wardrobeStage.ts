import * as T from 'three';
import { instantiate, loadCharacter, type CharacterKind } from './character';
import { configurePreviewRenderer } from './itemPreview';
import { createWardrobeRoom } from './wardrobeRoom';
import { AvatarCustomizer } from '../avatars/customizer';
import type { AvatarLook } from '../avatars/look';
export interface WardrobeStage {
  applyLook(look: AvatarLook): Promise<void>;
  rotateBy(angle: number): void;
  resetView(): void;
  dispose(): void;
}
export async function createWardrobeStage(
  host: HTMLElement,
  opts: {
    character: CharacterKind;
    look: AvatarLook;
    reducedMotion?: boolean;
    signal?: AbortSignal;
    maxPixelRatio?: number;
  },
): Promise<WardrobeStage> {
  if (opts.signal?.aborted) throw new DOMException('Closed', 'AbortError');
  const gl = new T.WebGLRenderer({ antialias: true, alpha: false });
  configurePreviewRenderer(gl);
  gl.setPixelRatio(Math.min(devicePixelRatio, opts.maxPixelRatio ?? 1.5, 1.5));
  gl.domElement.setAttribute('aria-label', 'Deine Figur. Zum Drehen nach links oder rechts ziehen.');
  gl.domElement.tabIndex = 0;
  host.append(gl.domElement);
  let room: Awaited<ReturnType<typeof createWardrobeRoom>> | undefined,
    customizer: AvatarCustomizer | undefined,
    closed = false;
  let completeDispose: (() => void) | undefined;
  let releaseFigure = () => {};
  const abort = () => {
    if (completeDispose) completeDispose();
    else {
      closed = true;
      gl.dispose();
      gl.forceContextLoss();
      gl.domElement.remove();
    }
  };
  opts.signal?.addEventListener('abort', abort, { once: true });
  try {
    const [asset, loadedRoom] = await Promise.all([loadCharacter(opts.character), createWardrobeRoom()]);
    room = loadedRoom;
    if (closed) throw new DOMException('Closed', 'AbortError');
    if (!asset) throw Error('Figure unavailable');
    const figure = instantiate(asset);
    releaseFigure = () => {
      figure.mixer.stopAllAction();
      figure.mixer.uncacheRoot(figure.root);
      figure.root.traverse((o) => {
        if ((o as T.SkinnedMesh).isSkinnedMesh) (o as T.SkinnedMesh).skeleton.dispose();
      });
    };
    figure.walk.play();
    figure.mixer.update(0);
    figure.root.rotation.y = 0.12;
    customizer = new AvatarCustomizer(figure.root, opts.character);
    await customizer.applyLook(opts.look);
    if (closed) throw new DOMException('Closed', 'AbortError');
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(32, 1, 0.01, 50);
    scene.add(figure.root);
    scene.add(new T.HemisphereLight('#fff4e4', '#7e756b', 2));
    const light = new T.DirectionalLight('#ffe6cb', 3);
    light.position.set(-3, 4, 5);
    scene.add(light);
    const rim = new T.DirectionalLight('#d2e9ff', 1.1);
    rim.position.set(3, 3, -2);
    scene.add(rim);
    const shadowMat = new T.MeshBasicMaterial({
      color: '#4f4841',
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    });
    const shadow = new T.Mesh(new T.CircleGeometry(0.34, 48), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.y = 0.65;
    shadow.position.y = 0.002;
    scene.add(shadow);
    const rt = new T.WebGLRenderTarget(1, 1),
      blurred = new T.WebGLRenderTarget(1, 1);
    const quadScene = new T.Scene(),
      quadCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const shader = new T.ShaderMaterial({
      uniforms: { map: { value: rt.texture }, step: { value: new T.Vector2() } },
      vertexShader: 'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:
        'uniform sampler2D map;uniform vec2 step;varying vec2 uv0;void main(){vec4 c=texture2D(map,uv0)*.2;for(int i=1;i<=4;i++){c+=(texture2D(map,uv0+step*float(i))+texture2D(map,uv0-step*float(i)))*.1;}gl_FragColor=c;}',
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), shader);
    quadScene.add(quad);
    scene.background = blurred.texture;
    const render = () => {
      if (!closed && !document.hidden) gl.render(scene, camera);
    };
    const resize = () => {
      const w = Math.max(1, host.clientWidth),
        h = Math.max(1, host.clientHeight);
      gl.setSize(w, h);
      camera.aspect = w / h;
      camera.position.set(0, 1.03, Math.max(3.9, 3.2 / camera.aspect));
      camera.lookAt(0, 0.74, 0);
      camera.updateProjectionMatrix();
      const roomCamera = camera.clone();
      roomCamera.position.set(0.25, 1.25, 4.9);
      roomCamera.lookAt(-0.2, 1, -0.5);
      roomCamera.updateProjectionMatrix();
      const rw = Math.min(768, w),
        rh = Math.max(1, Math.round((rw * h) / w));
      rt.setSize(rw, rh);
      blurred.setSize(rw, rh);
      gl.setRenderTarget(rt);
      gl.render(room!.scene, roomCamera);
      shader.uniforms.step.value.set(2.6 / rw, 1.6 / rh);
      gl.setRenderTarget(blurred);
      gl.render(quadScene, quadCamera);
      gl.setRenderTarget(null);
      render();
    };
    let drag: { id: number; x: number } | null = null;
    const down = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      drag = { id: e.pointerId, x: e.clientX };
      gl.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      figure.root.rotation.y += (e.clientX - drag.x) * 0.012;
      drag.x = e.clientX;
      render();
    };
    const up = () => {
      drag = null;
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        figure.root.rotation.y += e.key === 'ArrowLeft' ? -0.25 : 0.25;
        render();
      }
    };
    gl.domElement.addEventListener('pointerdown', down);
    gl.domElement.addEventListener('pointermove', move);
    gl.domElement.addEventListener('pointerup', up);
    gl.domElement.addEventListener('pointercancel', up);
    gl.domElement.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', render);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const handle: WardrobeStage = {
      async applyLook(look) {
        await customizer!.applyLook(look);
        render();
      },
      rotateBy(angle) {
        figure.root.rotation.y += angle;
        render();
      },
      resetView() {
        figure.root.rotation.y = 0.12;
        render();
      },
      dispose() {
        if (closed) return;
        closed = true;
        opts.signal?.removeEventListener('abort', abort);
        observer.disconnect();
        document.removeEventListener('visibilitychange', render);
        customizer!.dispose();
        figure.mixer.stopAllAction();
        figure.mixer.uncacheRoot(figure.root);
        figure.root.traverse((o) => {
          if ((o as T.SkinnedMesh).isSkinnedMesh) (o as T.SkinnedMesh).skeleton.dispose();
        });
        shadow.geometry.dispose();
        shadowMat.dispose();
        quad.geometry.dispose();
        shader.dispose();
        rt.dispose();
        blurred.dispose();
        room!.dispose();
        gl.dispose();
        gl.forceContextLoss();
        gl.domElement.remove();
      },
    };
    completeDispose = () => handle.dispose();
    return handle;
  } catch (error) {
    closed = true;
    customizer?.dispose();
    releaseFigure();
    opts.signal?.removeEventListener('abort', abort);
    room?.dispose();
    gl.dispose();
    gl.forceContextLoss();
    gl.domElement.remove();
    throw error;
  }
}
