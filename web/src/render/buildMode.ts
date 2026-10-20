/**
 * Build mode on the pupil's own plot (SPEC §12, docs/ASSET_VERTRAG.md). The plot has seven fixed
 * slots: house, garage, car pedestal and four decoration pedestals. The pupil taps a slot, picks one
 * of the own items that fits it and sets it; decorations can be turned in quarter turns, the car and
 * the decorations can be taken away again. The server checks every step (place_in_slot, clear_slot).
 */
import * as THREE from 'three';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plot } from '../world/layout';
import { ROTATIONS, SLOTS, rectCentre, slotAt, type SlotDef, type SlotId } from '../world/plotPlan';
import {
  clearSlot,
  loadBuildState,
  placeInSlot,
  shownItem,
  type BuildState,
  type SlotMap,
} from '../api/build';

const LIFT = 0.2;
const SLOT_COLOUR: Record<SlotDef['kind'], string> = {
  house: '#9ab8ff',
  garage: '#9ab8ff',
  car: '#ffb86b',
  deco: '#7bd389',
};

export interface BuildModeOptions {
  scene: THREE.Scene;
  plot: Plot;
  supabase: SupabaseClient;
  uid: string;
  /** The own slots changed: the village shows the new state. */
  onSlots?: (slots: SlotMap) => void;
  /** The pupil pressed "Fertig". */
  onDone?: () => void;
}

export class BuildMode {
  private readonly group = new THREE.Group();
  private readonly bar: HTMLDivElement;
  private state: BuildState | null = null;
  private slot: SlotDef | null = null;
  private chosen: string | null = null;
  private active = false;

  constructor(private readonly opts: BuildModeOptions) {
    this.bar = document.createElement('div');
    this.bar.className = 'build-bar';
    this.bar.hidden = true;
    document.body.appendChild(this.bar);
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Enters build mode: loads the state and outlines the slots. */
  async enter(): Promise<string | null> {
    const res = await loadBuildState(this.opts.supabase, this.opts.uid);
    if (!res.ok) return res.message;
    this.state = res.value;
    this.active = true;
    this.opts.scene.add(this.group);
    this.bar.hidden = false;
    this.redraw();
    return null;
  }

  exit(): void {
    this.active = false;
    this.opts.scene.remove(this.group);
    this.clearGroup();
    this.bar.hidden = true;
    this.bar.innerHTML = '';
    this.slot = null;
    this.chosen = null;
  }

  dispose(): void {
    this.exit();
    this.bar.remove();
  }

  /** Taps in normalised device coordinates. Only the slots of the own plot react. */
  handleTap(ndc: THREE.Vector2, camera: THREE.Camera): void {
    if (!this.state || !this.active) return;
    const local = this.localAt(ndc, camera);
    if (!local) return;
    const slot = slotAt(local.x, local.z);
    if (!slot) return;
    this.slot = slot;
    this.chosen = null;
    this.redraw();
  }

  private localAt(ndc: THREE.Vector2, camera: THREE.Camera): { x: number; z: number } | null {
    const p = this.opts.plot;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(p.h + LIFT));
    const point = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, point)) return null;
    const dx = point.x - p.x;
    const dz = point.z - p.z;
    const c = Math.cos(p.face);
    const s = Math.sin(p.face);
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  private toWorld(lx: number, lz: number, y: number): THREE.Vector3 {
    const p = this.opts.plot;
    const c = Math.cos(p.face);
    const s = Math.sin(p.face);
    return new THREE.Vector3(p.x + lx * c + lz * s, y, p.z - lx * s + lz * c);
  }

  private clearGroup(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose();
    }
  }

  /** Coloured outline plates on the slots; the chosen slot is yellow. */
  private redraw(): void {
    if (!this.state) return;
    this.clearGroup();
    const p = this.opts.plot;
    for (const s of SLOTS) {
      const c = rectCentre(s);
      const selected = this.slot?.id === s.id;
      const mat = new THREE.MeshBasicMaterial({
        color: selected ? '#ffd23f' : SLOT_COLOUR[s.kind],
        transparent: true,
        opacity: selected ? 0.55 : 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(s.w - 0.15, s.d - 0.15), mat);
      plate.rotation.x = -Math.PI / 2;
      plate.rotation.z = p.face;
      plate.position.copy(this.toWorld(c.lx, c.lz, p.h + LIFT));
      plate.renderOrder = 5;
      this.group.add(plate);
    }
    this.renderBar();
  }

  private renderBar(): void {
    if (!this.state) return;
    const st = this.state;
    const slot = this.slot;
    if (!slot) {
      this.bar.innerHTML = `
        <p class="build-info" role="status">Tippe auf einen Platz: Haus, Garage, Auto-Platz oder einen der vier Deko-Plätze.</p>
        <div class="build-actions"><button type="button" id="done">Fertig</button></div>`;
      this.bar.querySelector('#done')?.addEventListener('click', () => this.opts.onDone?.());
      return;
    }
    const current = shownItem(st.slots, slot.id, slot.kind);
    const usedElsewhere = (id: string): number =>
      Object.entries(st.slots).filter(([sid, c]) => sid !== slot.id && c?.itemId === id).length;
    const fitting = st.items.filter((i) => i.kind === slot.kind);
    const canTurn = ROTATIONS[slot.kind].length > 1 && Boolean(st.slots[slot.id]);
    const canClear = (slot.kind === 'deco' || slot.kind === 'car') && Boolean(st.slots[slot.id]);
    const nameOf = (id: string): string => st.items.find((i) => i.id === id)?.nameDe ?? id;

    this.bar.innerHTML = `
      <p class="build-info" role="status"><strong>${escape(slot.nameDe)}</strong>: ${
        current ? `jetzt „${escape(nameOf(current.itemId))}“` : 'noch leer'
      }</p>
      <div class="build-items" role="group" aria-label="Passende Sachen">
        ${
          fitting
            .map((i) => {
              const free = i.owned - usedElsewhere(i.id);
              const here = current?.itemId === i.id;
              return `<button type="button" data-item="${escape(i.id)}" class="${this.chosen === i.id ? 'primary' : ''}" ${
                free <= 0 || here ? 'disabled' : ''
              }>${escape(i.nameDe)}${here ? ' (steht hier)' : free > 1 ? ` (${free})` : ''}</button>`;
            })
            .join('') ||
          `<span>${slot.kind === 'car' ? 'Du hast noch kein Auto.' : 'Du hast dafür noch nichts.'} Im Shop gibt es welche.</span>`
        }
      </div>
      <div class="build-actions">
        <button type="button" id="place" class="primary" ${this.chosen ? '' : 'disabled'}>Setzen</button>
        <button type="button" id="rot" ${canTurn ? '' : 'disabled'}>Drehen</button>
        <button type="button" id="clear" ${canClear ? '' : 'disabled'}>Wegräumen</button>
        <button type="button" id="done">Fertig</button>
      </div>`;

    this.bar.querySelectorAll<HTMLButtonElement>('[data-item]').forEach((b) =>
      b.addEventListener('click', () => {
        this.chosen = b.dataset.item ?? null;
        this.renderBar();
      }),
    );
    this.bar.querySelector('#place')?.addEventListener('click', () => void this.place(slot.id));
    this.bar.querySelector('#rot')?.addEventListener('click', () => void this.turn(slot.id));
    this.bar.querySelector('#clear')?.addEventListener('click', () => void this.clear(slot.id));
    this.bar.querySelector('#done')?.addEventListener('click', () => this.opts.onDone?.());
  }

  private async place(slot: SlotId): Promise<void> {
    if (!this.chosen) return;
    const res = await placeInSlot(this.opts.supabase, this.chosen, slot, 0);
    await this.after(res.ok ? 'Gesetzt.' : res.message, res.ok);
  }

  private async turn(slot: SlotId): Promise<void> {
    const cur = this.state?.slots[slot];
    if (!cur) return;
    const res = await placeInSlot(this.opts.supabase, cur.itemId, slot, (cur.rot + 1) % 4);
    await this.after(res.ok ? 'Gedreht.' : res.message, res.ok);
  }

  private async clear(slot: SlotId): Promise<void> {
    const res = await clearSlot(this.opts.supabase, slot);
    await this.after(res.ok ? 'Weggeräumt. Es ist wieder im Inventar.' : res.message, res.ok);
  }

  private async after(message: string, changed: boolean): Promise<void> {
    if (changed) {
      const res = await loadBuildState(this.opts.supabase, this.opts.uid);
      if (res.ok) {
        this.state = res.value;
        this.opts.onSlots?.(res.value.slots);
      }
      this.chosen = null;
    }
    this.redraw();
    const info = this.bar.querySelector<HTMLParagraphElement>('.build-info');
    if (info) info.textContent = message;
  }
}

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
