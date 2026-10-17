/**
 * Map templates (SPEC §10.1). A template fixes the river, the main lanes, the plaza, the quest
 * board direction, the benches and the landmarks. The seed only varies plots, trees and details.
 */
import type { Point2 } from '../geometry';
import { TAL } from './tal';
import { FLUSS_MITTE } from './fluss_mitte';
import { BACH_NORDEN } from './bach_norden';

export interface Landmark {
  /** Kind of landmark (SPEC §10.6): viewpoint, footbridge, mill, orchard, hut. */
  kind: 'aussicht' | 'steg' | 'muehle' | 'obstwiese' | 'waldhuette';
  x: number;
  z: number;
}

export interface MapDef {
  id: string;
  name: string;
  /** Plaza centre. */
  plaza: Point2;
  /** River control points (centripetal Catmull-Rom spline through them). */
  river: Point2[];
  /** Main lanes. Each lane is a list of control points; lane ends touch the plaza or a landmark. */
  lanes: Point2[][];
  /** Angle of the quest board around the plaza centre. */
  boardAngle: number;
  /** Angles of the four benches around the plaza. */
  benchAngles: number[];
  landmarks: Landmark[];
}

export const MAPS: Record<string, MapDef> = {
  [TAL.id]: TAL,
  [FLUSS_MITTE.id]: FLUSS_MITTE,
  [BACH_NORDEN.id]: BACH_NORDEN,
};

export const MAP_IDS = Object.keys(MAPS);

/** The map with this id. Unknown ids fall back to 'tal' (the first template). */
export function getMap(id: string): MapDef {
  return MAPS[id] ?? TAL;
}
