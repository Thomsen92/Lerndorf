/**
 * Logs the pupil out after a period without interaction (SPEC §4: 15 minutes).
 * Any pointer, key or touch event restarts the countdown.
 */
export const AUTO_LOGOUT_MS = 15 * 60 * 1000;

export class AutoLogout {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly timeoutMs: number,
    private readonly onTimeout: () => void,
  ) {}

  /** Starts or restarts the countdown. */
  touch(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.onTimeout();
    }, this.timeoutMs);
  }

  /** Stops the countdown, e.g. after a manual logout. */
  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  get running(): boolean {
    return this.timer !== null;
  }
}
