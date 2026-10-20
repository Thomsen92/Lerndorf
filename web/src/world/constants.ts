/**
 * Fixed sizes shared by all map templates. The shape of each valley lives in world/maps/.
 */

/**
 * Scale of the whole valley. The templates in world/maps/ are drawn at scale 1 (a 130 m map);
 * getMap() multiplies them by this factor, so the 34 plots of 12.4 x 12.4 m (world/plotPlan.ts) fit.
 */
export const WORLD_SCALE = 1.65;

export const MAP_SIZE = Math.round(130 * WORLD_SCALE);
export const PLAZA_RADIUS = 8;
/** The valley wall: plots and paths stay inside this radius (plus a small allowance). */
export const VALLEY_RADIUS = Math.round(52 * WORLD_SCALE);

/** Height of the river surface (LOOK §4). Bridges keep their deck ends above it. */
export const WATER_LEVEL = -0.55;
/** Lowest deck height at a bridge end: half a metre above the water. */
export const BRIDGE_MIN_END = WATER_LEVEL + 0.5;
