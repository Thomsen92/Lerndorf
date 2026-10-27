/**
 * Decides whether a pointer gesture is a tap: exactly one pointer was down for the whole gesture,
 * it moved at most `maxMove` px and was not cancelled. A pinch or a drag is never a tap.
 */
export interface TapDetector {
  /** A primary pointer starts a fresh gesture: stale ids from lost events are dropped. */
  down(id: number, x: number, y: number, isPrimary?: boolean): void;
  move(id: number, x: number, y: number): void;
  /** Forgets a pointer whose up event ended elsewhere (window level); never counts as a tap. */
  release(id: number): void;
  /** Returns true when the finished gesture counts as a tap. */
  up(id: number, x: number, y: number): boolean;
  cancel(id: number): void;
}

export function createTapDetector(maxMove = 8): TapDetector {
  const active = new Set<number>();
  let startId = -1;
  let start = { x: 0, y: 0 };
  let tainted = false;
  return {
    down(id, x, y, isPrimary = false) {
      if (isPrimary) {
        active.clear();
        tainted = false;
      }
      active.add(id);
      if (active.size > 1) {
        tainted = true;
        return;
      }
      startId = id;
      start = { x, y };
      tainted = false;
    },
    move(id, x, y) {
      if (active.has(id) && id === startId && Math.hypot(x - start.x, y - start.y) > maxMove) tainted = true;
    },
    up(id, x, y) {
      const had = active.delete(id);
      const tap = had && !tainted && id === startId && Math.hypot(x - start.x, y - start.y) <= maxMove;
      if (active.size === 0) tainted = false;
      return tap;
    },
    release(id) {
      active.delete(id);
      if (active.size === 0) tainted = false;
    },
    cancel(id) {
      active.delete(id);
      tainted = true;
      if (active.size === 0) {
        tainted = false;
        startId = -1;
      }
    },
  };
}
