import { Object3D, Bone, Mesh, Matrix4, SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { CharacterKind } from '../render/character';
import { avatarCatalog, partById, partUrl, type AvatarPart } from './catalog';
import { normalizeBone, bindClothing } from './clothingBinding';
import { prepareColors } from './materialColors';
import {
  emptyLook,
  validateLook,
  equipInLook,
  type AvatarLook,
  type AvatarSlot,
  type ColorChannel,
} from './look';
const cache = new Map<string, Promise<Object3D>>();
export async function loadPart(part: AvatarPart): Promise<Object3D> {
  let p = cache.get(part.id);
  if (!p) {
    p = new GLTFLoader()
      .loadAsync(partUrl(part))
      .then((g) => g.scene)
      .catch((e) => {
        cache.delete(part.id);
        throw e;
      });
    cache.set(part.id, p);
  }
  return clone(await p);
}
type Staged = { part: AvatarPart; root: Object3D; colors: ReturnType<typeof prepareColors> };
/** Appearance is committed only once every requested asset is available. */
export class AvatarCustomizer {
  private bones = new Map<string, Bone>();
  private initial = new Map<Object3D, boolean>();
  private baseColors: ReturnType<typeof prepareColors>;
  private current: Staged[] = [];
  private look = emptyLook();
  private requested = emptyLook();
  private ticket = 0;
  private disposed = false;
  private detailed = true;
  constructor(
    private root: Object3D,
    private kind: CharacterKind,
    private loader = loadPart,
  ) {
    this.baseColors = prepareColors(root);
    root.traverse((o) => {
      if ((o as Bone).isBone) this.bones.set(normalizeBone(o.name), o as Bone);
    });
    for (const p of avatarCatalog.filter((p) => p.character === kind))
      for (const name of p.showMeshes ?? []) {
        const o = root.getObjectByName(name);
        if (o) o.visible = false;
      }
    root.traverse((o) => this.initial.set(o, o.visible));
  }
  async applyLook(look: AvatarLook): Promise<void> {
    validateLook(
      look,
      this.kind,
      avatarCatalog.map((p) => p.id),
    );
    if (this.disposed) throw Error('Disposed');
    const mine = ++this.ticket;
    this.requested = structuredClone(look);
    const staged: Staged[] = [];
    try {
      const results = await Promise.allSettled(
        look.items.map(async (id) => {
          const part = partById(id)!;
          const root = await this.loader(part);
          const colors = prepareColors(root);
          const entry = { part, root, colors };
          staged.push(entry);
          if (part.binding === 'skinned') bindClothing(root, this.bones);
          else {
            const bone = this.bones.get(normalizeBone(part.bone ?? ''));
            if (!bone) throw Error(`Missing bone ${part.bone}`);
            if (part.attachmentMatrix) root.applyMatrix4(new Matrix4().fromArray(part.attachmentMatrix));
          }
          root.traverse((o) => {
            if ((o as Mesh).isMesh) {
              o.castShadow = true;
              o.frustumCulled = false;
            }
          });
          colors.apply(look);
        }),
      );
      const failure = results.find((r) => r.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } catch (error) {
      this.release(staged);
      if (mine === this.ticket) this.requested = this.getLook();
      throw error;
    }
    if (this.disposed || mine !== this.ticket) {
      this.release(staged);
      return;
    }
    this.release(this.current);
    this.current = staged;
    for (const { part, root } of staged) {
      (part.binding === 'skinned' ? this.root : this.bones.get(normalizeBone(part.bone!))!).add(root);
    }
    this.refreshVisibility();
    this.baseColors.apply(look);
    this.look = structuredClone(look);
    this.root.updateMatrixWorld(true);
  }
  private refreshVisibility(): void {
    for (const [o, visible] of this.initial) o.visible = visible;
    for (const { part, root } of this.current) {
      root.visible = this.detailed;
      if (!this.detailed) continue;
      // Mesh names describe the source base, and may name unrelated meshes on the other base.
      if (part.character !== this.kind) continue;
      for (const name of part.hideMeshes ?? []) {
        const o = this.root.getObjectByName(name);
        if (o) o.visible = false;
      }
      for (const name of part.showMeshes ?? []) {
        const o = this.root.getObjectByName(name);
        if (o) o.visible = true;
      }
    }
  }
  setDetail(enabled: boolean): void {
    if (this.detailed === enabled) return;
    this.detailed = enabled;
    this.refreshVisibility();
  }
  async equip(id: string): Promise<boolean> {
    const next = equipInLook(this.requested, id);
    await this.applyLook(next);
    return this.look.items.includes(id);
  }
  unequip(slot: AvatarSlot): void {
    void this.applyLook({
      ...this.requested,
      items: this.requested.items.filter((id) => partById(id)?.slot !== slot),
    });
  }
  setColor(channel: ColorChannel, color: string | null): void {
    const colors = { ...this.look.colors };
    if (color === null) delete colors[channel];
    else colors[channel] = color;
    const next = { ...this.look, colors };
    validateLook(
      next,
      this.kind,
      avatarCatalog.map((p) => p.id),
    );
    this.look = next;
    this.requested = structuredClone(next);
    this.baseColors.apply(next);
    for (const x of this.current) x.colors.apply(next);
  }
  getLook(): AvatarLook {
    return structuredClone(this.look);
  }
  private release(entries: Staged[]): void {
    for (const x of entries) {
      x.root.removeFromParent();
      x.colors.dispose();
      const skeletons = new Set<SkinnedMesh['skeleton']>();
      x.root.traverse((o) => {
        if ((o as SkinnedMesh).isSkinnedMesh) skeletons.add((o as SkinnedMesh).skeleton);
      });
      for (const s of skeletons) s.dispose();
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ticket++;
    this.release(this.current);
    this.current = [];
    this.baseColors.dispose();
    for (const [o, visible] of this.initial) o.visible = visible;
  }
}
