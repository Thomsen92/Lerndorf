import * as THREE from 'three';
import { MAX_SIZE, type SlotKind } from '../world/plotPlan';

export const PLACE_SECONDS = 0.6,
  REMOVE_SECONDS = 0.4,
  PUFF_SECONDS = 0.5,
  MAX_PUFFS = 8;
const clamp = (t: number): number => Math.max(0, Math.min(1, t));
export function popScale(t: number): number {
  const x = clamp(t / PLACE_SECONDS) - 1;
  return 1 + 3.2 * x * x * x + 2.2 * x * x;
}
export function shrinkPose(t: number): { scale: number; yaw: number } {
  const x = clamp(t / REMOVE_SECONDS);
  return { scale: 1 - x, yaw: 0.6 * x };
}
export interface Puff {
  x: number;
  y: number;
  z: number;
  scale: number;
}
export function puffLayout(count: number, radius: number, t: number): Puff[] {
  const n = Math.min(MAX_PUFFS, Math.max(0, Math.floor(count)));
  const x = clamp(t / PUFF_SECONDS);
  return Array.from({ length: n }, (_, i) => {
    const angle = (i * Math.PI * 2) / n;
    return {
      x: Math.cos(angle) * radius * (0.4 + 0.6 * x),
      z: Math.sin(angle) * radius * (0.4 + 0.6 * x),
      y: 0.2 + 0.6 * x,
      scale: radius * (0.35 + 0.5 * x),
    };
  });
}
export function puffOpacity(t: number): number {
  return 0.9 * (1 - clamp(t / PUFF_SECONDS));
}

/** Owns only the smoke resources; plot models keep their shared geometries and materials. */
export class BuildFx {
  private readonly group = new THREE.Group();
  private readonly smoke: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private effect: {
    obj: THREE.Object3D;
    remove: boolean;
    time: number;
    radius: number;
    scale: THREE.Vector3;
    yaw: number;
    centre: THREE.Vector3;
  } | null = null;
  private readonly dummy = new THREE.Object3D();
  constructor(
    scene: THREE.Scene,
    private readonly opts: { texture: THREE.Texture | null; reducedMotion: () => boolean },
  ) {
    this.smoke = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: opts.texture, transparent: true, depthWrite: false }),
      MAX_PUFFS,
    );
    this.smoke.frustumCulled = false;
    this.smoke.visible = false;
    scene.add(this.group, this.smoke);
  }
  get busy(): boolean {
    return this.effect !== null;
  }
  place(obj: THREE.Object3D, kind: SlotKind): void {
    this.start(obj, kind, false);
  }
  remove(obj: THREE.Object3D, kind: SlotKind): void {
    this.start(obj, kind, true);
  }
  private start(obj: THREE.Object3D, kind: SlotKind, remove: boolean): void {
    this.clear();
    if (this.opts.reducedMotion()) {
      if (remove) obj.removeFromParent();
      return;
    }
    const centre = obj.getWorldPosition(new THREE.Vector3());
    if (remove) this.group.attach(obj);
    this.effect = {
      obj,
      remove,
      time: 0,
      radius: (remove ? 0.3 : 0.45) * Math.max(MAX_SIZE[kind].w, MAX_SIZE[kind].d),
      scale: obj.scale.clone(),
      yaw: obj.rotation.y,
      centre,
    };
    if (!remove) obj.scale.setScalar(0);
    this.smoke.count = remove ? 6 : MAX_PUFFS;
    this.smoke.visible = this.opts.texture !== null;
    this.smoke.material.opacity = 0;
  }
  update(dt: number, camera: THREE.Camera): void {
    const e = this.effect;
    if (!e) return;
    if (this.opts.reducedMotion()) {
      this.clear();
      return;
    }
    e.time += Math.max(0, dt);
    const pose = shrinkPose(e.time);
    e.obj.scale.copy(e.scale).multiplyScalar(e.remove ? pose.scale : popScale(e.time));
    if (e.remove) {
      e.obj.rotation.y = e.yaw + pose.yaw;
      if (e.time >= REMOVE_SECONDS) e.obj.removeFromParent();
    }
    const quaternion = camera.getWorldQuaternion(new THREE.Quaternion());
    puffLayout(this.smoke.count, e.radius, e.time).forEach((p, i) => {
      this.dummy.position.copy(e.centre).add(new THREE.Vector3(p.x, p.y, p.z));
      this.dummy.quaternion.copy(quaternion);
      this.dummy.scale.setScalar(p.scale);
      this.dummy.updateMatrix();
      this.smoke.setMatrixAt(i, this.dummy.matrix);
    });
    this.smoke.instanceMatrix.needsUpdate = true;
    this.smoke.material.opacity = puffOpacity(e.time);
    this.smoke.visible = this.opts.texture !== null && e.time < PUFF_SECONDS;
    if (e.time >= Math.max(PUFF_SECONDS, e.remove ? REMOVE_SECONDS : PLACE_SECONDS)) this.clear();
  }
  clear(): void {
    const e = this.effect;
    if (e) {
      if (e.remove) e.obj.removeFromParent();
      else e.obj.scale.copy(e.scale);
    }
    this.effect = null;
    this.smoke.visible = false;
  }
  dispose(): void {
    this.clear();
    this.group.removeFromParent();
    this.smoke.removeFromParent();
    this.smoke.geometry.dispose();
    this.smoke.material.dispose();
    this.smoke.dispose();
  }
}
export function loadPuffTexture(onError?: () => void): THREE.Texture {
  return new THREE.TextureLoader().load(
    import.meta.env.BASE_URL + 'assets/kenney/fx/puff.png',
    undefined,
    undefined,
    onError,
  );
}
