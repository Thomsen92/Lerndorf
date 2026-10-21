/** Inventory area: everything the pupil owns (starter items included), grouped by category. */
import type { AreaHandle } from './areas';
import { openItemArea, type ItemAreaOptions } from './shopView';

export function openInventory(opts: Omit<ItemAreaOptions, 'onOpenInventory'>): AreaHandle {
  return openItemArea('inventar', { ...opts, onOpenInventory: () => undefined });
}
