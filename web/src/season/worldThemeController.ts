import type { WorldThemeState } from '../api/worldTheme';

interface VisibilitySource {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}
export interface WorldThemeController {
  refresh(): Promise<void>;
  dispose(): void;
}
/** Last applied state, so the caller can decide about the season welcome. */
export interface WorldThemeApply {
  (state: WorldThemeState): void;
}

function sameState(a: WorldThemeState | null, b: WorldThemeState): boolean {
  return (
    a !== null &&
    a.classId === b.classId &&
    a.requestedTheme === b.requestedTheme &&
    a.effectiveTheme === b.effectiveTheme &&
    a.seasonId === b.seasonId &&
    a.revision === b.revision
  );
}

/**
 * Class-scoped visual state only. Failed reads retain the last complete scene; at most one
 * request runs at a time and hidden tabs do not poll (plan package 3).
 */
export function createWorldThemeController(opts: {
  classId: string;
  read: () => Promise<WorldThemeState>;
  apply: WorldThemeApply;
  visibility?: VisibilitySource;
  intervalMs?: number;
}): WorldThemeController {
  const visibility = opts.visibility ?? document;
  let disposed = false,
    inFlight: Promise<void> | null = null,
    state: WorldThemeState | null = null;
  async function refresh(): Promise<void> {
    if (disposed || visibility.hidden) return;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const next = await opts.read();
        if (disposed || next.classId !== opts.classId) return;
        if (!sameState(state, next)) {
          opts.apply(next);
          state = next;
        }
      } catch {
        // A missing migration or a short network error must not break login or replace a world.
      }
    })();
    try {
      await inFlight;
    } finally {
      inFlight = null;
    }
  }
  const onVisible = () => {
    if (!visibility.hidden) void refresh();
  };
  visibility.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(() => {
    void refresh();
  }, opts.intervalMs ?? 30000);
  return {
    refresh,
    dispose() {
      disposed = true;
      clearInterval(timer);
      visibility.removeEventListener('visibilitychange', onVisible);
    },
  };
}
