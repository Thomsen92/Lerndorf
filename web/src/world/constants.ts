/**
 * Fixed sizes shared by all map templates. The shape of each valley lives in world/maps/.
 */

/**
 * Scale of the whole valley. The templates in world/maps/ are drawn at scale 1 (a 130 m map);
 * getMap() multiplies them by this factor, so the 34 plots of 12.4 x 12.4 m (world/plotPlan.ts) fit.
 */
export const WORLD_SCALE = 1.65;

export const MAP_SIZE = Math.round(130 * WORLD_SCALE);
/**
 * Angle of the Halloween stand from the quest board (rad) and its distance from the plaza centre. Learning
 * side (board, bee hive) and market side (stalls, Ollie, Halloween stand) are kept apart on purpose
 * (teacher, 29.10.2026, UX-002): the stand sits behind the last stall instead of next to the board.
 */
export const HALLOWEEN_STAND_ANGLE = 4.4;
/**
 * The quest board stands at the edge of the plaza (teacher, 29.10.2026: it used to stand at 4.4 m
 * near the fountain); pupils walk up to it from the plaza side, at BOARD_APPROACH_RADIUS.
 */
export const BOARD_RADIUS = 7.0;
export const BOARD_APPROACH_RADIUS = 5.4;
export const HALLOWEEN_STAND_RADIUS = 7.6;
export const PLAZA_RADIUS = 8;
/** The valley wall: plots and paths stay inside this radius (plus a small allowance). */
export const VALLEY_RADIUS = Math.round(52 * WORLD_SCALE);

/** Height of the river surface (LOOK §4). Bridges keep their deck ends above it. */
export const WATER_LEVEL = -0.55;
/** Lowest deck height at a bridge end: half a metre above the water. */
export const BRIDGE_MIN_END = WATER_LEVEL + 0.5;
