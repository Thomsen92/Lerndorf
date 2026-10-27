import { tr } from '../i18n';
import * as T from 'three';
import { instantiate, loadCharacter, type CharacterKind } from './character';
import { configurePreviewRenderer } from './itemPreview';
import { createWardrobeRoom } from './wardrobeRoom';
import { AvatarCustomizer } from '../avatars/customizer';
import type { AvatarLook } from '../avatars/look';
import { createWardrobeIdle } from './wardrobeIdle';
import { bindWardrobeGestures } from './wardrobeGestures';
export interface WardrobeStage {
  applyLook(look: AvatarLook): Promise<void>;
  rotateBy(angle: number): void;
  zoomBy?(factor: number): void;
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
  gl.domElement.setAttribute('aria-label', tr('Deine Figur. Ziehen zum Drehen, zwei Finger zum Zoomen.'));
  gl.domElement.tabIndex = 0;
  host.append(gl.domElement);
  let room: Awaited<ReturnType<typeof createWardrobeRoom>> | undefined,
    customizer: AvatarCustomizer | undefined,
    closed = false;
  let completeDispose: (() => void) | undefined;
  let releaseGestures = () => {};
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
    const idle = createWardrobeIdle(figure.root);
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
        'uniform sampler2D map;uniform vec2 step;varying vec2 uv0;void main(){vec4 c=texture2D(map,uv0)*.4;c+=(texture2D(map,uv0+vec2(step.x,0.))+texture2D(map,uv0-vec2(step.x,0.))+texture2D(map,uv0+vec2(0.,step.y))+texture2D(map,uv0-vec2(0.,step.y)))*.15;float l=dot(c.rgb,vec3(.2126,.7152,.0722));c.rgb=mix(c.rgb,vec3(l),.10);gl_FragColor=c;}',
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), shader);
    quadScene.add(quad);
    scene.background = blurred.texture;
    const render = () => {
      if (!closed && !document.hidden) gl.render(scene, camera);
    };
    let zoom = 1,
      gesturing = false;
    const frameFigure = () => {
      camera.zoom = zoom;
      camera.lookAt(0, 0.74 + ((zoom - 1) / 1.4) * 0.55, 0);
      camera.updateProjectionMatrix();
    };
    const zoomBy = (factor: number) => {
      if (!Number.isFinite(factor) || factor <= 0) return;
      zoom = Math.max(1, Math.min(2.4, zoom * factor));
      frameFigure();
      render();
    };
    const resize = () => {
      const w = Math.max(1, host.clientWidth),
        h = Math.max(1, host.clientHeight);
      gl.setSize(w, h);
      camera.aspect = w / h;
      camera.position.set(0, 1.03, Math.max(3.9, 3.2 / camera.aspect));
      frameFigure();
      const roomCamera = camera.clone();
      roomCamera.zoom = 1;
      roomCamera.position.set(0.25, 1.25, 4.9);
      roomCamera.lookAt(-0.2, 1, -0.5);
      roomCamera.updateProjectionMatrix();
      const rw = Math.min(1280, Math.round(w * gl.getPixelRatio())),
        rh = Math.max(1, Math.round((rw * h) / w));
      rt.setSize(rw, rh);
      blurred.setSize(rw, rh);
      gl.setRenderTarget(rt);
      gl.render(room!.scene, roomCamera);
      shader.uniforms.step.value.set(0.55 / rw, 0.55 / rh);
      gl.setRenderTarget(blurred);
      gl.render(quadScene, quadCamera);
      gl.setRenderTarget(null);
      render();
    };
    const gestures = bindWardrobeGestures(gl.domElement, {
      rotate: (angle) => {
        figure.root.rotation.y += angle;
        render();
      },
      zoom: zoomBy,
      active: (on) => {
        gesturing = on;
      },
    });
    releaseGestures = () => gestures.dispose();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        figure.root.rotation.y += e.key === 'ArrowLeft' ? -0.25 : 0.25;
        render();
      }
      if (e.key === '+' || e.key === '=' || e.key === '-') {
        e.preventDefault();
        zoomBy(e.key === '-' ? 1 / 1.2 : 1.2);
      }
    };
    gl.domElement.addEventListener('keydown', key);
    let frameId = 0,
      lastFrame = 0;
    const animate = (now: number) => {
      if (closed || document.hidden) return;
      frameId = requestAnimationFrame(animate);
      if (now - lastFrame < 1000 / 30) return;
      lastFrame = now;
      idle(now / 1000, !gesturing);
      render();
    };
    const visibility = () => {
      cancelAnimationFrame(frameId);
      if (!document.hidden && !closed) {
        lastFrame = 0;
        if (!opts.reducedMotion) frameId = requestAnimationFrame(animate);
        render();
      }
    };
    document.addEventListener('visibilitychange', visibility);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    if (!opts.reducedMotion) frameId = requestAnimationFrame(animate);
    const handle: WardrobeStage = {
      async applyLook(look) {
        await customizer!.applyLook(look);
        render();
      },
      rotateBy(angle) {
        figure.root.rotation.y += angle;
        render();
      },
      zoomBy,
      resetView() {
        figure.root.rotation.y = 0.12;
        zoom = 1;
        frameFigure();
        render();
      },
      dispose() {
        if (closed) return;
        closed = true;
        gestures.dispose();
        opts.signal?.removeEventListener('abort', abort);
        observer.disconnect();
        cancelAnimationFrame(frameId);
        document.removeEventListener('visibilitychange', visibility);
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
    releaseGestures();
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
