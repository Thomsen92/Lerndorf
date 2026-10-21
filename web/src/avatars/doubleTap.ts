/** Tells a single tap from a double tap on the same figure (second tap within `windowMs`). */
export type TapKind = 'single' | 'double';

export function createDoubleTap(windowMs = 350): (id: string, nowMs: number) => TapKind {
  let lastId: string | null = null;
  let lastAt = -Infinity;
  return (id, nowMs) => {
    const double = id === lastId && nowMs - lastAt <= windowMs;
    // after a double tap the next tap starts fresh
    lastId = double ? null : id;
    lastAt = nowMs;
    return double ? 'double' : 'single';
  };
}
