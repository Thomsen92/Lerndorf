/**
 * Pure helpers for the build preview: the pupil tries an item on a slot before saving it.
 * Nothing here talks to the server; the saved state stays untouched.
 */
import type { SlotContent, SlotMap } from '../api/build';
import { ROTATIONS, SLOTS, slotAccepts, type SlotId, type SlotKind } from '../world/plotPlan';

/** An item shown on the chosen slot but not saved yet. */
export interface Pending {
  itemId: string;
  rot: number;
}

/** The saved slots with the pending item shown on `slot`. Returns a new object. */
export function previewSlots(saved: SlotMap, slot: SlotId, pending: Pending | null): SlotMap {
  const out: SlotMap = { ...saved };
  if (pending) {
    const content: SlotContent = { itemId: pending.itemId, rot: pending.rot };
    out[slot] = content;
  }
  return out;
}

/** Next allowed rotation of the slot kind (cycles; an unknown rotation restarts at the first). */
export function nextRotation(kind: SlotKind, rot: number): number {
  const list = ROTATIONS[kind];
  const idx = list.indexOf(rot);
  return list[(idx + 1) % list.length];
}

/** Slots that accept an item of this catalogue kind. */
export function fittingSlots(itemKind: string): SlotId[] {
  return SLOTS.filter((s) => slotAccepts(s, itemKind)).map((s) => s.id);
}

/** The slot to pre-select for a hand-over: the only fitting slot, else the first free fitting slot, else null. */
export function autoSlot(itemKind: string, saved: SlotMap): SlotId | null {
  const fit = fittingSlots(itemKind);
  if (fit.length === 0) return null;
  if (fit.length === 1) return fit[0];
  return fit.find((id) => !saved[id]) ?? null;
}
