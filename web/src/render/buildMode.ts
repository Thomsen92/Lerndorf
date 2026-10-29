import { tr, html, msg } from '../i18n';
/**
 * Build mode on the pupil's own plot (SPEC §12, docs/ASSET_VERTRAG.md). The plot has seven fixed
 * slots: house, garage, car pedestal and four decoration pedestals. The pupil taps a slot, picks one
 * of the own items that fits it and sets it; decorations can be turned in quarter turns, the car and
 * the decorations can be taken away again. The server checks every step (place_in_slot, clear_slot).
 */
import * as THREE from 'three';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plot } from '../world/layout';
import {
  ROTATIONS,
  SLOTS,
  rectCentre,
  slotAccepts,
  slotNear,
  slotById,
  type SlotDef,
  type SlotId,
  type SlotKind,
} from '../world/plotPlan';
import { autoSlot, fittingSlots, nextRotation, previewSlots, type Pending } from './buildPreview';
import type { ThumbSource } from './itemThumbs';
import {
  clearSlot,
  loadBuildState,
  placeInSlot,
  shownItem,
  type BuildState,
  type SlotMap,
} from '../api/build';
import { RUIN_ID } from './ruin';
import type { ProgressDelta } from '../api/progress';

const LIFT = 0.2;
const SLOT_COLOUR: Record<SlotDef['kind'], string> = {
  house: '#9ab8ff',
  garage: '#9ab8ff',
  car: '#ffb86b',
  deco: '#7bd389',
};

export interface SlotLook {
  free: boolean;
  selected: boolean;
  dimmed: boolean;
  icon: string | null;
  frame: number;
}
export function slotLook(
  slot: SlotDef,
  slots: SlotMap,
  selected: SlotId | null,
  handOverKind: string | null,
): SlotLook {
  const free = !realItem(slots, slot.id, slot.kind);
  const dimmed = handOverKind !== null && !slotAccepts(slot, handOverKind);
  return {
    free,
    selected: selected === slot.id,
    dimmed,
    icon: free && !dimmed ? { house: '🏠', garage: '🏠', car: '🚗', deco: '🌷' }[slot.kind] : null,
    frame: selected === slot.id ? 0.3 : 0.12,
  };
}
export function pulseOpacity(t: number, reducedMotion: boolean): number {
  return reducedMotion ? 0.8 : 0.7 + 0.25 * Math.cos((t * Math.PI * 2) / 1.5);
}
export interface BuildFxEvent {
  type: 'place' | 'turn' | 'remove';
  slot: SlotId;
  kind: SlotKind;
}

export interface BuildModeOptions {
  onProgress?: (delta: ProgressDelta) => void;
  scene: THREE.Scene;
  plot: Plot;
  supabase: SupabaseClient;
  uid: string;
  onFx?: (event: BuildFxEvent) => void;
  onShop?: () => void;
  onSheet?: (open: boolean) => void;
  thumbs?: ThumbSource;
  reducedMotion?: () => boolean;
  /** The own slots changed or a preview is shown: the village shows this map. */
  onSlots?: (slots: SlotMap) => void;
  /** The pupil pressed "Fertig". */
  onDone?: () => void;
}

export interface EnterOptions {
  /** Hand-over from the shop or inventory: preview this item right away. */
  itemId?: string;
  slotId?: SlotId;
  /** Guided placement of the first-login tutorial: one item, one slot, nothing else. */
  guided?: GuidedPlacement;
}

export interface GuidedPlacement {
  itemId: string;
  slotId: SlotId;
  /** Saves the placement (tutorial_place_house, not place_in_slot). */
  place: () => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Called once the server confirmed and the plot shows the server state. */
  onPlaced: () => void;
  hint: string;
  button: string;
}

/** What a slot really holds for the bar: the ruin in an empty house slot is no placement. */
function realItem(slots: SlotMap, slot: SlotId, kind: string): ReturnType<typeof shownItem> {
  const c = shownItem(slots, slot, kind);
  return c?.itemId === RUIN_ID ? undefined : c;
}

const PREVIEW_HINT = tr('Vorschau – noch nicht gespeichert');

export class BuildMode {
  private readonly group = new THREE.Group();
  private readonly bar: HTMLDivElement;
  private state: BuildState | null = null;
  private slot: SlotDef | null = null;
  private pending: Pending | null = null;
  /** Item handed over from the shop: slots of other kinds are dimmed. */
  private handOver: string | null = null;
  private message: string | null = null;
  private busy = false;
  private active = false;
  private guided: GuidedPlacement | null = null;
  private sheet = false;
  private readonly icons = new Map<string, THREE.CanvasTexture>();

  constructor(private readonly opts: BuildModeOptions) {
    this.bar = document.createElement('div');
    this.bar.className = 'build-bar';
    this.bar.hidden = true;
    document.body.appendChild(this.bar);
    this.bar.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.sheetOpen) {
        event.preventDefault();
        this.back();
      }
    });
  }

  get isActive(): boolean {
    return this.active;
  }

  get sheetOpen(): boolean {
    return this.active && this.slot !== null && !this.guided;
  }

  private syncSheet(): void {
    const open = this.sheetOpen;
    this.bar.classList.toggle('build-bar--sheet', open);
    if (open !== this.sheet) {
      this.sheet = open;
      this.opts.onSheet?.(open);
    }
  }

  private back(): void {
    if (this.busy) return;
    const id = this.slot?.id;
    this.dropPending();
    this.slot = null;
    this.message = null;
    this.redraw();
    this.bar.querySelector<HTMLButtonElement>(`[data-slot="${id}"]`)?.focus();
  }

  /** Enters build mode: loads the state and outlines the slots. */
  async enter(opts: EnterOptions = {}): Promise<string | null> {
    const res = await loadBuildState(this.opts.supabase, this.opts.uid);
    if (!res.ok) return res.message;
    this.state = res.value;
    this.dropPending();
    this.active = true;
    this.message = null;
    this.slot = null;
    this.handOver = null;
    this.guided = opts.guided ?? null;
    if (this.guided) {
      // the pupil picks the item and confirms; slot preselected, nothing else selectable
      this.handOver = this.guided.itemId;
      this.slot = slotById(this.guided.slotId) ?? null;
    }
    const item = !this.guided && opts.itemId ? res.value.items.find((i) => i.id === opts.itemId) : undefined;
    if (item) {
      this.handOver = item.id;
      const asked = opts.slotId ? slotById(opts.slotId) : undefined;
      const id = asked && slotAccepts(asked, item.kind) ? asked.id : autoSlot(item.kind, res.value.slots);
      this.slot = (id && slotById(id)) || null;
      if (this.slot && this.hasFree(item.id, this.slot.id)) this.pending = { itemId: item.id, rot: 0 };
    }
    if (!item && !this.guided && opts.slotId) this.slot = slotById(opts.slotId) ?? null;
    this.opts.scene.add(this.group);
    this.bar.hidden = false;
    this.showPending();
    this.redraw();
    if (this.sheetOpen) this.bar.querySelector<HTMLElement>('h2')?.focus();
    return null;
  }

  exit(): void {
    this.dropPending();
    this.active = false;
    this.syncSheet();
    this.opts.scene.remove(this.group);
    this.clearGroup();
    this.bar.hidden = true;
    this.bar.innerHTML = '';
    this.slot = null;
    this.handOver = null;
    this.guided = null;
    this.bar.classList.remove('build-bar--guided');
    this.message = null;
  }

  dispose(): void {
    this.exit();
    this.bar.remove();
    for (const texture of this.icons.values()) texture.dispose();
    this.icons.clear();
  }

  /** Taps in normalised device coordinates. Only the slots of the own plot react. */
  handleTap(ndc: THREE.Vector2, camera: THREE.Camera): void {
    if (!this.state || !this.active) return;
    const local = this.localAt(ndc, camera);
    if (!local) return;
    const slot = slotNear(local.x, local.z);
    if (!slot) return;
    if (this.guided && slot.id !== this.guided.slotId) return;
    this.selectSlot(slot);
  }

  private selectSlot(slot: SlotDef): void {
    if (this.busy || !this.state) return;
    if (this.guided && slot.id !== this.guided.slotId) return;
    // guided: tapping the (already chosen) house slot again keeps the preview
    if (this.guided && this.slot?.id === slot.id) return;
    this.dropPending();
    this.slot = slot;
    this.message = null;
    const item = this.handOver && this.state.items.find((i) => i.id === this.handOver);
    if (item && slotAccepts(slot, item.kind) && this.hasFree(item.id, slot.id)) {
      this.pending = { itemId: item.id, rot: 0 };
      this.showPending();
    }
    this.redraw();
    this.bar.querySelector<HTMLElement>('h2')?.focus();
  }

  /** True when a copy of the item is free for this slot (owned minus copies used in other slots). */
  private hasFree(itemId: string, slot: SlotId): boolean {
    const st = this.state;
    const it = st?.items.find((i) => i.id === itemId);
    if (!st || !it) return false;
    const used = Object.entries(st.slots).filter(([sid, c]) => sid !== slot && c?.itemId === itemId).length;
    return it.owned - used > 0;
  }

  /** Shows the pending item on the own plot (preview only). */
  private showPending(): void {
    if (!this.state || !this.slot || !this.pending) return;
    this.opts.onSlots?.(previewSlots(this.state.slots, this.slot.id, this.pending));
  }

  /** Drops an unsaved preview and shows the server state again. */
  private dropPending(): void {
    if (!this.pending) return;
    this.pending = null;
    if (this.state) this.opts.onSlots?.(this.state.slots);
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
      // guided: only the one slot is outlined
      if (this.guided && s.id !== this.guided.slotId) continue;
      const c = rectCentre(s);
      const selected = this.slot?.id === s.id;
      const dimmed = this.handOverKind() !== null && !slotAccepts(s, this.handOverKind() as string);
      const mat = new THREE.MeshBasicMaterial({
        color: selected ? '#ffd23f' : SLOT_COLOUR[s.kind],
        transparent: true,
        opacity: dimmed ? 0.1 : selected ? 0.55 : 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(s.w - 0.15, s.d - 0.15), mat);
      plate.rotation.x = -Math.PI / 2;
      plate.rotation.z = p.face;
      plate.position.copy(this.toWorld(c.lx, c.lz, p.h + LIFT));
      plate.renderOrder = 5;
      this.group.add(plate);
      const look = slotLook(s, this.state.slots, this.slot?.id ?? null, this.handOverKind());
      mat.opacity = look.dimmed ? 0.06 : 0.18;
      const shape = new THREE.Shape();
      const w = s.w / 2,
        d = s.d / 2,
        f = look.frame;
      shape.moveTo(-w, -d);
      shape.lineTo(w, -d);
      shape.lineTo(w, d);
      shape.lineTo(-w, d);
      shape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-w + f, -d + f);
      hole.lineTo(-w + f, d - f);
      hole.lineTo(w - f, d - f);
      hole.lineTo(w - f, -d + f);
      hole.closePath();
      shape.holes.push(hole);
      const frame = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat.clone());
      frame.rotation.copy(plate.rotation);
      frame.position.copy(plate.position);
      frame.position.y += 0.01;
      frame.material.opacity = look.dimmed ? 0.1 : 0.8;
      frame.userData = { slotFrame: s.id, frame: f, pulse: look.free && !look.dimmed };
      frame.renderOrder = 6;
      this.group.add(frame);
      if (look.icon) {
        let texture = this.icons.get(look.icon);
        if (!texture) {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(look.icon, 32, 32);
          }
          texture = new THREE.CanvasTexture(canvas);
          this.icons.set(look.icon, texture);
        }
        const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
        icon.position.copy(this.toWorld(c.lx, c.lz, p.h + 1.2));
        icon.scale.setScalar(0.9);
        icon.userData = { slotIcon: s.id, baseY: icon.position.y };
        this.group.add(icon);
      }
    }
    this.renderBar();
  }

  update(t: number): void {
    if (!this.active) return;
    const reduced = this.opts.reducedMotion?.() ?? false;
    for (const child of this.group.children) {
      if (child.userData.pulse)
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulseOpacity(t, reduced);
      if (child.userData.slotIcon)
        child.position.y = child.userData.baseY + (reduced ? 0 : 0.075 * Math.sin((t * Math.PI * 2) / 1.5));
    }
  }

  private handOverKind(): string | null {
    const item = this.handOver ? this.state?.items.find((i) => i.id === this.handOver) : undefined;
    return item?.kind ?? null;
  }

  private renderBar(): void {
    if (!this.state) return;
    const focused = this.bar.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)
      : null;
    const focusId = focused?.id;
    const focusItem = focused?.dataset.item;
    this.syncSheet();
    if (this.guided) {
      this.renderGuided(this.guided);
      return;
    }
    const st = this.state;
    const slot = this.slot;
    const nameOf = (id: string): string => st.items.find((i) => i.id === id)?.nameDe ?? id;
    // Compact chips (BUG-005): the full names stay in the accessible name, the eye gets short labels,
    // and empty places are dashed with a "+". Tapping a place in the village works as well.
    const short = (id: string): string =>
      ({
        house: tr('Haus'),
        garage: tr('Garage'),
        car: tr('Auto'),
        deco_1: tr('Deko 1'),
        deco_2: tr('Deko 2'),
        deco_3: tr('Deko 3'),
        deco_4: tr('Deko 4'),
      })[id] ?? id;
    const slotList = html`<div class="build-items build-chips" role="group" aria-label="Plätze">
      ${SLOTS.map((s) => {
        const cur = realItem(st.slots, s.id, s.kind);
        const picked = slot?.id === s.id;
        return `<button type="button" data-slot="${s.id}" aria-pressed="${picked}" class="build-chip${picked ? ' primary' : ''}${
          cur ? '' : ' build-chip--empty'
        }"><span class="sr-only"><strong>${escape(s.nameDe)}</strong>: ${cur ? escape(nameOf(cur.itemId)) : 'leer'}</span><span aria-hidden="true">${escape(
          short(s.id),
        )}${cur ? '' : ' +'}</span></button>`;
      }).join('')}
    </div>`;

    if (!slot) {
      this.bar.innerHTML = html` <p class="build-info" role="status">
          ${escape(
            this.message ??
              tr('Tippe im Dorf auf einen Platz oder wähle hier:'),
          )}
        </p>
        ${slotList}
        <div class="build-actions"><button type="button" id="done">Fertig</button></div>`;
      this.wireBar();
      return;
    }
    const pending = this.pending;
    const placed = st.slots[slot.id];
    const current = realItem(st.slots, slot.id, slot.kind);
    const usedElsewhere = (id: string): number =>
      Object.entries(st.slots).filter(([sid, c]) => sid !== slot.id && c?.itemId === id).length;
    const fitting = st.items.filter((i) => i.kind === slot.kind);
    const shown = pending ?? current;
    const canTurn = ROTATIONS[slot.kind].length > 1 && Boolean(pending ?? placed);
    const canClear = (slot.kind === 'deco' || slot.kind === 'car') && Boolean(placed);
    const unchanged = !pending || (current?.itemId === pending.itemId && (current?.rot ?? 0) === pending.rot);
    this.bar.innerHTML = html` <section class="build-sheet" role="region" aria-labelledby="build-slot-title">
      <header>
        <h2 id="build-slot-title" tabindex="-1">${escape(slot.nameDe)}</h2>
        <p class="build-info">
          ${current ? msg`Jetzt: „${escape(nameOf(current.itemId))}“` : tr('Noch leer')}
        </p>
      </header>
      <p class="build-info" role="status">${escape(this.message ?? '')}</p>
      ${pending && !unchanged ? `<p class="build-info">${PREVIEW_HINT} – „${escape(nameOf(pending.itemId))}“</p>` : ''}
      <div class="build-items build-cards" role="group" aria-label="Passende Sachen">
        ${
          fitting
            .map((i) => {
              const free = i.owned - usedElsewhere(i.id);
              const here = current?.itemId === i.id;
              const chosen = shown?.itemId === i.id;
              return `<button type="button" data-item="${escape(i.id)}" aria-pressed="${chosen}" class="${chosen ? 'primary' : ''}" ${
                free <= 0 || this.busy ? 'disabled' : ''
              }><strong>${escape(i.nameDe)}</strong><span class="item-thumb" aria-hidden="true"></span><span>${here ? tr('steht hier') : free > 0 ? msg`frei: ${free}` : tr('alle aufgestellt')}</span></button>`;
            })
            .join('') ||
          html('<p>Du hast dafür noch nichts.</p><button type="button" id="shop">Zum Shop</button>')
        }
      </div>
      <div class="build-actions">
        <button type="button" id="save" class="primary" ${unchanged || this.busy ? 'disabled' : ''}>
          Aufstellen
        </button>
        ${canTurn ? html`<button type="button" id="rot" ${this.busy ? 'disabled' : ''}>Drehen</button>` : ''}
        ${canClear ? html`<button type="button" id="clear" ${this.busy ? 'disabled' : ''}>Wegräumen</button>` : ''}
        <button type="button" id="cancel" ${this.busy ? 'disabled' : ''}>Zurück</button>
      </div>
    </section>`;
    this.wireBar();
    for (const button of this.bar.querySelectorAll<HTMLButtonElement>('[data-item]')) {
      const item = fitting.find((i) => i.id === button.dataset.item);
      const thumb = button.querySelector('.item-thumb');
      if (!item || !thumb) continue;
      thumb.textContent = { house: '🏠', garage: '🏠', car: '🚗', deco: '🌷' }[slot.kind];
      void this.opts
        .thumbs?.({ id: item.id, kind: slot.kind, fits: fittingSlots(item.kind) })
        .then((url) => {
          if (!url || !thumb.isConnected) return;
          const img = document.createElement('img');
          img.src = url;
          img.alt = '';
          thumb.replaceChildren(img);
        })
        .catch(() => undefined);
    }
    const focusTarget = focusId
      ? this.bar.querySelector<HTMLElement>(`#${focusId}`)
      : Array.from(this.bar.querySelectorAll<HTMLButtonElement>('[data-item]')).find(
          (b) => b.dataset.item === focusItem,
        );
    if (focused && focusTarget && !focusTarget.hasAttribute('disabled')) focusTarget.focus();
  }

  /** Tutorial bar: the house slot, the one item and one confirm button, each highlighted in turn. */
  private renderGuided(g: GuidedPlacement): void {
    const st = this.state;
    if (!st) return;
    this.bar.classList.add('build-bar--guided');
    const slot = slotById(g.slotId);
    const item = st.items.find((i) => i.id === g.itemId);
    const chosen = this.pending?.itemId === g.itemId;
    const placed = realItem(st.slots, g.slotId, 'house');
    const placedName = placed ? (st.items.find((i) => i.id === placed.itemId)?.nameDe ?? '') : '';
    const shownName = chosen && item ? item.nameDe : placedName;
    const itemBtn = placed
      ? ''
      : item
        ? `<button type="button" data-item="${escape(item.id)}" aria-pressed="${chosen}" class="${
            chosen ? 'primary' : 'tutorial-highlight'
          }" ${this.busy ? 'disabled' : ''}>${escape(item.nameDe)}</button>`
        : html('<span>Das Haus ist noch nicht im Inventar.</span>');
    this.bar.innerHTML = html` <p class="build-info" role="status">${escape(this.message ?? g.hint)}</p>
      <div class="build-items" role="group" aria-label="Plätze">
        <button type="button" data-slot="${escape(g.slotId)}" aria-pressed="true" class="primary">
          <strong>${escape(slot?.nameDe ?? tr('Haus'))}</strong>: ${shownName ? escape(shownName) : 'leer'}
        </button>
      </div>
      <div class="build-items" role="group" aria-label="Passende Sachen">${itemBtn}</div>
      ${
        placed
          ? ''
          : `<div class="build-actions">
        <button type="button" id="save" class="primary${chosen && !this.busy ? ' tutorial-highlight' : ''}" ${
          chosen && !this.busy ? '' : 'disabled'
        }>${escape(g.button)}</button>
      </div>`
      }`;
    this.wireBar();
  }

  private wireBar(): void {
    this.bar.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach((b) =>
      b.addEventListener('click', () => {
        const s = slotById(b.dataset.slot ?? '');
        if (s) this.selectSlot(s);
      }),
    );
    this.bar
      .querySelectorAll<HTMLButtonElement>('[data-item]')
      .forEach((b) => b.addEventListener('click', () => this.choose(b.dataset.item ?? '')));
    this.bar.querySelector('#save')?.addEventListener('click', () => void this.save());
    this.bar.querySelector('#rot')?.addEventListener('click', () => this.turn());
    this.bar.querySelector('#cancel')?.addEventListener('click', () => this.back());
    this.bar.querySelector('#shop')?.addEventListener('click', () => this.opts.onShop?.());
    this.bar.querySelector('#clear')?.addEventListener('click', () => void this.clear());
    this.bar.querySelector('#done')?.addEventListener('click', () => this.opts.onDone?.());
  }

  /** Picks an item for the chosen slot: shown as preview, not saved. */
  private choose(itemId: string): void {
    if (this.busy || !this.slot || !this.state) return;
    const placed = this.state.slots[this.slot.id];
    this.pending = { itemId, rot: placed?.itemId === itemId ? placed.rot : 0 };
    this.message = null;
    this.showPending();
    this.renderBar();
  }

  /** Turns the preview only; turning a placed item starts a preview of it. */
  private turn(): void {
    if (this.busy || !this.slot || !this.state) return;
    const base = this.pending ?? this.state.slots[this.slot.id];
    if (!base) return;
    this.pending = { itemId: base.itemId, rot: nextRotation(this.slot.kind, base.rot) };
    this.message = null;
    this.showPending();
    this.renderBar();
  }

  private async save(): Promise<void> {
    const slot = this.slot;
    const pending = this.pending;
    if (this.busy || !slot || !pending) return;
    const type = this.state?.slots[slot.id]?.itemId === pending.itemId ? 'turn' : 'place';
    this.busy = true;
    this.renderBar();
    const guided = this.guided;
    let res: { ok: true } | { ok: false; message: string };
    try {
      if (guided) res = await guided.place();
      else {
        const placed = await placeInSlot(this.opts.supabase, pending.itemId, slot.id, pending.rot);
        res = placed;
        if (placed.ok && placed.value !== true && placed.value.progress)
          this.opts.onProgress?.(placed.value.progress);
      }
    } catch (err) {
      console.error('placing failed', err);
      res = { ok: false, message: tr('Das hat leider nicht geklappt. Bitte noch einmal versuchen.') };
    }
    await this.after(
      res.ok
        ? guided
          ? tr('Dein Haus steht!')
          : type === 'turn'
            ? tr('Gedreht.')
            : tr('Aufgestellt!')
        : res.message,
      res.ok,
      { type, slot: slot.id, kind: slot.kind },
      pending,
    );
    if (res.ok && guided) guided.onPlaced();
  }

  private async clear(): Promise<void> {
    const slot = this.slot;
    if (this.busy || !slot) return;
    this.busy = true;
    this.renderBar();
    let res: { ok: true } | { ok: false; message: string };
    try {
      res = await clearSlot(this.opts.supabase, slot.id);
    } catch {
      res = { ok: false, message: tr('Das hat leider nicht geklappt. Bitte noch einmal versuchen.') };
    }
    await this.after(
      res.ok ? tr('Weggeräumt. Es ist wieder im Inventar.') : res.message,
      res.ok,
      { type: 'remove', slot: slot.id, kind: slot.kind },
      null,
    );
  }

  /** After an RPC: on success reload the server state and drop the preview; on error keep the preview. */
  private async after(
    message: string,
    changed: boolean,
    event: BuildFxEvent,
    confirmed: Pending | null,
  ): Promise<void> {
    if (changed) {
      const beforeSlots = this.state?.slots;
      const hadPreview = this.pending !== null;
      // Retain the confirmed RPC result even when the subsequent read fails.
      if (this.state) {
        const slots = { ...this.state.slots };
        if (confirmed) slots[event.slot] = confirmed;
        else delete slots[event.slot];
        this.state = { ...this.state, slots };
      }
      try {
        const res = await loadBuildState(this.opts.supabase, this.opts.uid);
        if (res.ok) this.state = res.value;
      } catch {
        /* The successful RPC remains authoritative. */
      }
      this.pending = null;
      this.handOver = null;
      this.busy = false;
      if (this.active && event.type === 'remove') {
        // Remove the saved item, even if a different item was being previewed in its place.
        if (hadPreview && beforeSlots) this.opts.onSlots?.(beforeSlots);
        this.opts.onFx?.(event);
      }
      // Also when the pupil left meanwhile: the plot must show the server state (bar stays closed).
      this.opts.onSlots?.(this.state?.slots ?? {});
      if (!this.active) return;
      if (event.type !== 'remove') this.opts.onFx?.(event);
      this.message = message;
      this.redraw();
      return;
    }
    this.busy = false;
    if (!this.active) return;
    this.message = message;
    this.renderBar();
  }
}

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
