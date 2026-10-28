import type { ModalHandle } from './dialog';
import type { NavArea } from './gameNav';

/** Shared handle of the non-modal areas (shop, inventory, task board, later build and house menu). */
export interface AreaHandle {
  /** Removes the area. Does not call the area's own onClose callback. */
  close(): void;
}

/** Areas in which the camera stays on the own house. */
export const HOUSE_AREAS: ReadonlySet<NavArea> = new Set<NavArea>([
  'haus',
  'bauen',
  'shop',
  'inventar',
  'kleiderschrank',
]);

export interface AreaController {
  readonly current: NavArea;
  select(area: NavArea): Promise<void>;
  /** Re-open an area with arguments, e.g. bauen with an item. */
  open(area: NavArea, open: () => Promise<AreaHandle | null>): Promise<void>;
}

export function createAreaController(opts: {
  openers: Partial<Record<Exclude<NavArea, 'dorf'>, () => Promise<AreaHandle | null>>>;
  onChange: (area: NavArea, previous: NavArea) => void;
}): AreaController {
  let current: NavArea = 'dorf';
  let handle: AreaHandle | null = null;
  // a newer request makes an older, still running opener obsolete
  let ticket = 0;

  const open = async (area: NavArea, opener: () => Promise<AreaHandle | null>): Promise<void> => {
    const mine = ++ticket;
    const next = area === 'dorf' ? null : await opener();
    if (mine !== ticket) {
      next?.close();
      return;
    }
    if (area !== 'dorf' && !next) return; // refused (no plot, building closed): stay where we are
    const previous = current;
    const old = handle;
    handle = next;
    current = area;
    // re-opening the same area: the new handle replaces the old one (e.g. build mode is re-entered)
    if (old && !(previous === area && previous !== 'dorf')) old.close();
    if (previous !== area) opts.onChange(area, previous);
  };

  return {
    get current() {
      return current;
    },
    select(area) {
      if (area === current) {
        ticket++; // also cancels a different area that is still opening
        return Promise.resolve();
      }
      return open(
        area,
        area === 'dorf' ? () => Promise.resolve(null) : (opts.openers[area] ?? (() => Promise.resolve(null))),
      );
    },
    open,
  };
}

/** Modals opened from the village glue (settings menu, ledger). Lets logout close them properly. */
export interface ModalTracker {
  track<T extends Pick<ModalHandle, 'close' | 'isOpen'>>(handle: T): T;
  readonly anyOpen: boolean;
  /** Closes every tracked modal (runs their close(), which lifts `inert`) and removes a leftover `inert`. */
  closeAll(): void;
}

export function createModalTracker(): ModalTracker {
  const open = new Set<Pick<ModalHandle, 'close' | 'isOpen'>>();
  return {
    track(handle) {
      open.add(handle);
      return handle;
    },
    get anyOpen() {
      for (const h of open) if (!h.isOpen) open.delete(h);
      return open.size > 0;
    },
    closeAll() {
      for (const h of Array.from(open).reverse()) h.close();
      open.clear();
      releaseInert();
    },
  };
}

/** Safety net for logout: nothing in the document may stay inert, or the login screen is unusable. */
export function releaseInert(): void {
  for (const el of Array.from(document.body.children)) el.removeAttribute('inert');
}
