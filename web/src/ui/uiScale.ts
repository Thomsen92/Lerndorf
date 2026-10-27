export type UiScale = 'xs' | 's' | 'm' | 'l';
export const UI_SCALE_KEY = 'lerndorf.uiScale';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStore(): Store | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** Mini (for desktop screens), small, medium (default, a little smaller than the old layout) or large interface. */
export function readUiScale(from: Store | null = defaultStore()): UiScale {
  try {
    const saved = from?.getItem(UI_SCALE_KEY);
    if (saved === 'xs' || saved === 's' || saved === 'm' || saved === 'l') return saved;
  } catch {
    /* Shared tablets may block storage. */
  }
  return 'm';
}

export function applyUiScale(scale: UiScale = readUiScale()): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.ui = scale;
}

export function setUiScale(scale: UiScale): void {
  try {
    localStorage.setItem(UI_SCALE_KEY, scale);
  } catch {
    /* The applied attribute still works for this page. */
  }
  applyUiScale(scale);
}
