/**
 * Build mode on the pupil's own plot (SPEC §12). Only the own plot is offered: the grid is drawn
 * on it, taps outside it do nothing, and the server checks every placement against the own plot.
 * Green cells can take the chosen item, red cells cannot. Placeholder models (boxes).
 */
import * as THREE from 'three';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plot } from '../world/layout';
import { canPlace, cellCentre, cellsOf, footprintFor, placementAt, type GridSize } from '../build/grid';
import {
  loadBuildState,
  placeItem,
  removePlacement,
  type BuildItem,
  type BuildState,
  type MyPlacement,
} from '../api/build';

const CELL = 0.92;
const LIFT = 0.12;

export interface BuildModeOptions {
  scene: THREE.Scene;
  plot: Plot;
  supabase: SupabaseClient;
  uid: string;
  /** Called after a change, so the HUD and the camera can react. */
  onChange?: () => void;
}

function colourOf(id: string): THREE.Color {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return new THREE.Color().setHSL((h % 360) / 360, 0.55, 0.6);
}

export class BuildMode {
  private readonly group = new THREE.Group();
  private readonly bar: HTMLDivElement;
  private state: BuildState | null = null;
  private selectedItem: string | null = null;
  private rot = 0;
  private cell: { x: number; z: number } | null = null;
  private selectedPlacement: number | null = null;
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

  /** Enters build mode: loads the state, draws the grid and the own decorations. */
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

  /** Leaves build mode and removes everything it drew. */
  exit(): void {
    this.active = false;
    this.opts.scene.remove(this.group);
    this.clearGroup();
    this.bar.hidden = true;
    this.bar.innerHTML = '';
    this.selectedItem = null;
    this.cell = null;
    this.selectedPlacement = null;
  }

  dispose(): void {
    this.exit();
    this.bar.remove();
  }

  /** Taps are given in normalised device coordinates (-1 to 1). Only the own plot reacts. */
  handleTap(ndc: THREE.Vector2, camera: THREE.Camera): void {
    if (!this.state || !this.active) return;
    const cell = this.cellAt(ndc, camera);
    if (!cell) return;
    const { x, z } = cell;
    const hit = placementAt(this.state.placements, x, z);
    this.cell = { x, z };
    this.selectedPlacement = hit ? hit.id : null;
    this.redraw();
  }

  private grid(): GridSize {
    return this.state?.grid ?? { cols: 7, rows: 6 };
  }

  /** Converts a tap into a cell of the own plot, or null if the tap is outside the plot. */
  private cellAt(ndc: THREE.Vector2, camera: THREE.Camera): { x: number; z: number } | null {
    const p = this.opts.plot;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(p.h + LIFT));
    const point = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, point)) return null;
    // world -> plot-local (inverse of the rotation the village uses for plots)
    const dx = point.x - p.x;
    const dz = point.z - p.z;
    const c = Math.cos(p.face);
    const s = Math.sin(p.face);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    const g = this.grid();
    const x = Math.round(lx + (g.cols - 1) / 2);
    const z = Math.round(lz + (g.rows - 1) / 2);
    if (x < 0 || z < 0 || x >= g.cols || z >= g.rows) return null;
    return { x, z };
  }

  /** World position of a local plot point. */
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

  private redraw(): void {
    if (!this.state) return;
    this.clearGroup();
    const g = this.grid();
    const p = this.opts.plot;

    // the grid: green free, red blocked; preview colour for the chosen item
    const preview = this.previewCheck();
    for (let x = 0; x < g.cols; x++) {
      for (let z = 0; z < g.rows; z++) {
        const { lx, lz } = cellCentre(x, z, g);
        const blocked = this.isHouse(x, z);
        const ok = preview ? preview.cells.get(`${x},${z}`) : undefined;
        const colour = blocked ? '#b8566b' : ok === false ? '#e06c75' : ok === true ? '#7bd389' : '#c9d9ff';
        const mat = new THREE.MeshBasicMaterial({
          color: colour,
          transparent: true,
          opacity: blocked ? 0.35 : 0.45,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const cellMesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL), mat);
        cellMesh.rotation.x = -Math.PI / 2;
        cellMesh.rotation.z = -p.face;
        cellMesh.position.copy(this.toWorld(lx, lz, p.h + LIFT));
        cellMesh.renderOrder = 5;
        this.group.add(cellMesh);
      }
    }

    const placed = this.state.placements;
    // the own decorations
    for (const pl of placed) {
      const cells = cellsOf(pl);
      const xs = cells.map((c) => cellCentre(c.x, c.z, g).lx);
      const zs = cells.map((c) => cellCentre(c.x, c.z, g).lz);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(pl.w * CELL * 0.9, 0.7, pl.d * CELL * 0.9),
        new THREE.MeshStandardMaterial({
          color: colourOf(this.itemOf(pl)),
          roughness: 0.8,
          emissive: this.selectedPlacement === pl.id ? '#ffd23f' : '#000000',
          emissiveIntensity: this.selectedPlacement === pl.id ? 0.35 : 0,
        }),
      );
      box.position.copy(this.toWorld(cx, cz, p.h + 0.35));
      box.rotation.y = p.face;
      box.castShadow = true;
      this.group.add(box);
    }

    this.renderBar();
  }

  private isHouse(x: number, z: number): boolean {
    const g = this.grid();
    return z < 2 || (x === Math.floor(g.cols / 2) && z === g.rows - 1);
  }

  private itemOf(pl: MyPlacement): string {
    return pl.itemId;
  }

  /** For the chosen item and rotation: which cells can take it (true/false per cell). */
  private previewCheck(): { cells: Map<string, boolean> } | null {
    if (!this.state || !this.selectedItem || !this.cell) return null;
    const item = this.state.items.find((i) => i.id === this.selectedItem);
    if (!item) return null;
    const fp = footprintFor(item.footprint, this.rot);
    const placed = this.state.placements;
    const cells = new Map<string, boolean>();
    const g = this.grid();
    for (let x = 0; x < g.cols; x++) {
      for (let z = 0; z < g.rows; z++) {
        const r = canPlace(x, z, fp, g, placed);
        cells.set(`${x},${z}`, r.ok);
      }
    }
    return { cells };
  }

  private renderBar(): void {
    if (!this.state) return;
    const items: BuildItem[] = this.state.items;
    const used = (id: string): number => this.state!.placements.filter((p) => p.itemId === id).length;
    const selectedPl = this.state.placements.find((p) => p.id === this.selectedPlacement);
    const cellOk =
      this.cell && this.selectedItem
        ? canPlace(
            this.cell.x,
            this.cell.z,
            footprintFor(
              items.find((i) => i.id === this.selectedItem)?.footprint ?? { w: 1, d: 1 },
              this.rot,
            ),
            this.grid(),
            this.state.placements,
          )
        : null;

    this.bar.innerHTML = `
      <div class="build-items" role="group" aria-label="Sachen">
        ${
          items
            .map((i) => {
              const free = i.owned - used(i.id);
              return `<button type="button" data-item="${i.id}" class="${this.selectedItem === i.id ? 'primary' : ''}" ${
                free <= 0 ? 'disabled' : ''
              }>${escape(i.nameDe)} (${free})</button>`;
            })
            .join('') || '<span>Du hast noch keine Deko. Im Shop gibt es welche.</span>'
        }
      </div>
      <p class="build-info" role="status">${
        cellOk === null
          ? 'Sache wählen, dann auf das Grundstück tippen.'
          : cellOk.ok
            ? 'Hier passt es. „Setzen“ drücken.'
            : escape(cellOk.reason)
      }</p>
      <div class="build-actions">
        <button type="button" id="rot">Drehen</button>
        <button type="button" id="place" class="primary" ${
          this.selectedItem && cellOk?.ok ? '' : 'disabled'
        }>Setzen</button>
        <button type="button" id="remove" ${selectedPl ? '' : 'disabled'}>Entfernen</button>
        <button type="button" id="done">Fertig</button>
      </div>`;

    this.bar.querySelectorAll<HTMLButtonElement>('[data-item]').forEach((b) =>
      b.addEventListener('click', () => {
        this.selectedItem = b.dataset.item ?? null;
        this.selectedPlacement = null;
        this.redraw();
      }),
    );
    this.bar.querySelector('#rot')?.addEventListener('click', () => {
      this.rot = (this.rot + 1) % 4;
      this.redraw();
    });
    this.bar.querySelector('#place')?.addEventListener('click', () => void this.place());
    this.bar.querySelector('#remove')?.addEventListener('click', () => void this.remove());
    this.bar.querySelector('#done')?.addEventListener('click', () => this.opts.onChange?.());
  }

  private async place(): Promise<void> {
    if (!this.selectedItem || !this.cell) return;
    const res = await placeItem(this.opts.supabase, this.selectedItem, this.cell.x, this.cell.z, this.rot);
    this.notify(res.ok ? 'Gesetzt.' : res.message);
    if (res.ok) await this.reload();
  }

  private async remove(): Promise<void> {
    if (this.selectedPlacement === null) return;
    const res = await removePlacement(this.opts.supabase, this.selectedPlacement);
    this.notify(res.ok ? 'Entfernt. Die Sache ist wieder im Inventar.' : res.message);
    this.selectedPlacement = null;
    if (res.ok) await this.reload();
  }

  private async reload(): Promise<void> {
    const res = await loadBuildState(this.opts.supabase, this.opts.uid);
    if (res.ok) this.state = res.value;
    this.cell = null;
    this.redraw();
    this.opts.onChange?.();
  }

  private notify(text: string): void {
    const info = this.bar.querySelector<HTMLParagraphElement>('.build-info');
    if (info) info.textContent = text;
  }
}

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
