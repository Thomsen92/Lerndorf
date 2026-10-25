/** Interactive reward chest. One WebGL context serves every visible chest canvas. */
import * as THREE from 'three';
import { configurePreviewRenderer } from './itemPreview';

export interface ChestModel {
  root: THREE.Group;
  lid: THREE.Group;
}
export type ChestState = 'closed' | 'pending' | 'open';

export function createChestModel(size: 'normal' | 'big'): ChestModel {
  const root = new THREE.Group(),
    lid = new THREE.Group();
  lid.name = 'chest-lid';
  lid.position.set(0, 1.03, -0.65);
  const wood = new THREE.MeshStandardMaterial({
    color: size === 'big' ? '#536491' : '#a96332',
    roughness: 0.8,
    flatShading: true,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: size === 'big' ? '#293b61' : '#633b28',
    roughness: 0.86,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: '#edb754',
    metalness: 0.65,
    roughness: 0.33,
    flatShading: true,
  });
  const inside = new THREE.MeshStandardMaterial({ color: '#332c32', roughness: 1 });
  const box = (
    parent: THREE.Group,
    dimensions: number[],
    position: number[],
    material: THREE.Material,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...(dimensions as [number, number, number])), material);
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  box(root, [2.1, 0.13, 1.4], [0, 0.09, 0], edge);
  const floor = box(root, [1.86, 0.1, 1.15], [0, 0.2, 0], inside);
  floor.name = 'chest-interior';
  for (const z of [-0.62, 0.62]) {
    for (let i = 0; i < 5; i++) box(root, [0.39, 0.88, 0.12], [-0.8 + i * 0.4, 0.59, z], wood);
    for (const x of [-0.68, 0.68]) box(root, [0.13, 0.96, 0.035], [x, 0.57, z * 1.12], gold);
  }
  for (const x of [-0.99, 0.99]) box(root, [0.13, 0.88, 1.25], [x, 0.59, 0], wood);
  const roof = new THREE.CylinderGeometry(0.67, 0.67, 2.1, 16, 1, false, 0, Math.PI);
  roof.rotateZ(Math.PI / 2);
  // The curved shell has no thickness; its inner face is visible when the lid opens.
  const lidWood = wood.clone();
  lidWood.side = THREE.DoubleSide;
  const top = new THREE.Mesh(roof, lidWood);
  top.name = 'chest-lid-shell';
  top.position.z = 0.65;
  top.scale.y = 0.76;
  lid.add(top);
  for (const x of [-0.68, 0.68]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 5, 16, Math.PI), gold);
    hoop.rotation.y = Math.PI / 2;
    hoop.position.set(x, 0, 0.65);
    hoop.scale.y = 0.76;
    lid.add(hoop);
  }
  box(lid, [0.2, 0.3, 0.075], [0, -0.06, 1.34], gold);
  box(root, [0.32, 0.3, 0.1], [0, 0.88, 0.72], gold);
  const keyhole = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), inside);
  keyhole.position.set(0, 0.9, 0.776);
  root.add(keyhole);
  const nailGeo = new THREE.SphereGeometry(0.035, 6, 4);
  for (const z of [-0.715, 0.715])
    for (const x of [-0.68, 0.68])
      for (const y of [0.27, 0.88]) {
        const nail = new THREE.Mesh(nailGeo, gold);
        nail.position.set(x, y, z);
        root.add(nail);
      }
  if (size === 'big') {
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14),
      new THREE.MeshStandardMaterial({
        color: '#8cddf1',
        emissive: '#28638e',
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.3,
      }),
    );
    gem.position.set(0, 0.89, 0.83);
    root.add(gem);
  }
  root.add(lid);
  return { root, lid };
}

export function poseChest(
  model: ChestModel,
  opts: { open: number; hover: boolean; pending: boolean; time: number; reducedMotion: boolean },
): void {
  const motion = !opts.reducedMotion && opts.open === 0;
  const strength = motion ? (opts.pending ? 0.055 : opts.hover ? 0.022 : 0) : 0;
  model.root.rotation.z = Math.sin(opts.time * 29) * strength;
  model.root.rotation.y = Math.sin(opts.time * 23) * strength * 0.7;
  model.root.position.y = strength * Math.abs(Math.sin(opts.time * 20));
  model.lid.rotation.x = -Math.max(0, Math.min(1, opts.open)) * 1.85;
}

export function disposeChestModel(model: ChestModel): void {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  model.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      materials.add(material);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

export interface ChestPreview {
  setState(state: ChestState): void;
  setHovered(hovered: boolean): void;
  dispose(): void;
}
interface RecordView {
  render(time: number, renderer: THREE.WebGLRenderer): boolean;
  lost(): void;
}
const views = new Set<RecordView>();
let shared: THREE.WebGLRenderer | null = null,
  frame = 0;

function schedule(): void {
  if (frame || !shared) return;
  frame = window.requestAnimationFrame((time) => {
    frame = 0;
    if (!shared) return;
    let animate = false;
    for (const view of views) animate = view.render(time, shared) || animate;
    if (animate) schedule();
  });
}

export function createChestPreview(
  canvas: HTMLCanvasElement,
  opts: { size: 'normal' | 'big'; reducedMotion: boolean; onError: () => void },
): ChestPreview | null {
  if (typeof WebGLRenderingContext === 'undefined') return null;
  let context: CanvasRenderingContext2D | null;
  try {
    context = canvas.getContext('2d');
    if (!context) return null;
    if (!shared) {
      shared = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      configurePreviewRenderer(shared);
      shared.setPixelRatio(1);
      const owner = shared;
      shared.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        if (shared === owner) views.forEach((view) => view.lost());
      });
    }
  } catch {
    return null;
  }
  const model = createChestModel(opts.size),
    scene = new THREE.Scene();
  scene.add(model.root, new THREE.HemisphereLight('#e1ebff', '#6b422c', 2));
  const key = new THREE.DirectionalLight('#ffe3b1', 3.5);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#b5d7ff', 2.2);
  rim.position.set(3, 3, -2);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(33, 1.3, 0.1, 30);
  camera.position.set(3.2, 2.7, 4.6);
  camera.lookAt(0, 0.9, 0);
  let state: ChestState = 'closed',
    hover = false,
    openedAt = 0,
    dirty = true,
    disposed = false,
    failed = false;
  const record: RecordView = {
    render(time, renderer) {
      if (disposed || failed) return false;
      const fraction =
        state === 'open' ? (opts.reducedMotion ? 1 : Math.min(1, Math.max(0, (time - openedAt) / 650))) : 0;
      const moving =
        !opts.reducedMotion &&
        (state === 'pending' || (hover && state === 'closed') || (state === 'open' && fraction < 1));
      if (!dirty && !moving) return false;
      if (!canvas.isConnected) return false;
      poseChest(model, {
        open: 1 - (1 - fraction) ** 3,
        hover,
        pending: state === 'pending',
        time: time / 1000,
        reducedMotion: opts.reducedMotion,
      });
      const bounds = canvas.getBoundingClientRect(),
        ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.round((bounds.width || 260) * ratio),
        height = Math.round((bounds.height || 196) * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      context!.clearRect(0, 0, width, height);
      context!.drawImage(renderer.domElement, 0, 0, width, height);
      canvas.dataset.ready = 'true';
      dirty = false;
      return moving;
    },
    lost() {
      failed = true;
      opts.onError();
    },
  };
  views.add(record);
  schedule();
  const observer =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          dirty = true;
          schedule();
        })
      : null;
  observer?.observe(canvas);
  return {
    setState(next) {
      if (disposed) return;
      state = next;
      if (next === 'open') openedAt = performance.now();
      dirty = true;
      schedule();
    },
    setHovered(on) {
      if (disposed) return;
      hover = on;
      dirty = true;
      schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      views.delete(record);
      disposeChestModel(model);
      if (!views.size && shared) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        shared.dispose();
        shared.forceContextLoss();
        shared = null;
      }
    },
  };
}
