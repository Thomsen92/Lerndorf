/**
 * Quality levels (SPEC §16): Auto measures the first seconds and picks High or Low.
 * Low: no shadows, lower pixel density. High: shadows and full pixel density.
 */
export type QualityChoice = 'auto' | 'high' | 'low';
export type QualityLevel = 'high' | 'low';

export interface QualitySettings {
  shadows: boolean;
  maxPixelRatio: number;
}

/** Target frame rate on the oldest school tablet (SPEC §16). */
export const TARGET_FPS = 30;
/** Seconds of measurement before Auto decides. */
export const AUTO_MEASURE_SECONDS = 5;

export function settingsFor(level: QualityLevel): QualitySettings {
  return level === 'high' ? { shadows: true, maxPixelRatio: 2 } : { shadows: false, maxPixelRatio: 1 };
}

/** Auto: average frame rate over the measured frames decides. */
export function decideAuto(frameTimesMs: number[]): QualityLevel {
  if (frameTimesMs.length === 0) return 'low';
  const total = frameTimesMs.reduce((a, b) => a + b, 0);
  const fps = (frameTimesMs.length * 1000) / total;
  return fps >= TARGET_FPS ? 'high' : 'low';
}

/** The level to use right now, given the pupil's choice and the Auto result (if known). */
export function effectiveLevel(choice: QualityChoice, autoResult: QualityLevel | null): QualityLevel {
  if (choice === 'high' || choice === 'low') return choice;
  return autoResult ?? 'high';
}
