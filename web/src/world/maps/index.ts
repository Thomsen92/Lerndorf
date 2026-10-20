/**
 * Map templates (SPEC §10.1). A template fixes the river, the main lanes, the plaza, the quest
 * board direction, the benches and the landmarks. The seed only varies plots, trees and details.
 */
import type { Point2 } from '../geometry';
import { TAL } from './tal';
import { FLUSS_MITTE } from './fluss_mitte';
import { BACH_NORDEN } from './bach_norden';
import { WORLD_SCALE } from '../constants';

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

/** A template stretched by WORLD_SCALE (rivers, lanes, plaza and landmarks move apart). */
function scaled(map: MapDef, k: number): MapDef {
  const pt = (p: Point2): Point2 => ({ x: p.x * k, z: p.z * k });
  const plaza = pt(map.plaza);
  // lane points at the plaza keep their distance to it (the plaza does not grow), so the lanes still
  // end at its edge
  const lanePt = (p: Point2): Point2 => {
    const dx = p.x - map.plaza.x;
    const dz = p.z - map.plaza.z;
    const d = Math.hypot(dx, dz);
    if (d >= 14) return pt(p);
    const t = Math.max(0, (d - 11) / 3); // 0 at the plaza edge, 1 from 14 m on
    const f = 1 + (k - 1) * t;
    return { x: plaza.x + dx * f, z: plaza.z + dz * f };
  };
  return {
    ...map,
    plaza,
    river: map.river.map(pt),
    lanes: map.lanes.map((lane) => lane.map(lanePt)),
    landmarks: map.landmarks.map((l) => ({ ...l, x: l.x * k, z: l.z * k })),
  };
}

export const MAPS: Record<string, MapDef> = {
  [TAL.id]: scaled(TAL, WORLD_SCALE),
  [FLUSS_MITTE.id]: scaled(FLUSS_MITTE, WORLD_SCALE),
  [BACH_NORDEN.id]: scaled(BACH_NORDEN, WORLD_SCALE),
};

export const MAP_IDS = Object.keys(MAPS);

/** The map with this id. Unknown ids fall back to 'tal' (the first template). */
export function getMap(id: string): MapDef {
  return MAPS[id] ?? MAPS[TAL.id];
}
