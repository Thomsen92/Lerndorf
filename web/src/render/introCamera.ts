/**
 * Camera paths of the first-login tutorial: village panorama -> market -> own plot (intro),
 * and a closer shot of the figure for the final scene. Pure maths, no random values.
 */
import * as THREE from 'three';
import type { Layout, Plot } from '../world/layout';
import { SLOTS, TUTORIAL_FIGURE_LZ, rectCentre } from '../world/plotPlan';
import type { CameraPose } from './houseCamera';

export type { CameraPose };

export interface CameraPath {
  duration: number;
  at(t: number): CameraPose;
}

const INTRO_SECONDS = 6.5;
const INTRO_REDUCED_SECONDS = 2.5;
const CLOSEUP_SECONDS = 2.5;
const CLOSEUP_REDUCED_SECONDS = 1;

const HOUSE_CENTRE = rectCentre(SLOTS[0]);
/** Where the figure stands, plot-local z (shared with Crowd.placeOwnInFrontOfHouse). */
const FIGURE_LZ = TUTORIAL_FIGURE_LZ;

/** World point of a plot-local offset (same convention as BuildMode.toWorld and houseView). */
function plotPoint(plot: Plot, lx: number, lz: number, y: number): THREE.Vector3 {
  const cos = Math.cos(plot.face);
  const sin = Math.sin(plot.face);
  return new THREE.Vector3(plot.x + lx * cos + lz * sin, y, plot.z - lx * sin + lz * cos);
}

const smooth = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

function lerp(a: CameraPose, b: CameraPose, k: number): CameraPose {
  return { position: a.position.clone().lerp(b.position, k), target: a.target.clone().lerp(b.target, k) };
}

/** Final intro station: looks at the house slot centre from the street side, about 11 m away, low enough to frame the figure in front of the ruin. */
function finalPose(plot: Plot): CameraPose {
  const target = plotPoint(plot, HOUSE_CENTRE.lx, HOUSE_CENTRE.lz, plot.h + 1.5);
  const position = plotPoint(plot, HOUSE_CENTRE.lx, HOUSE_CENTRE.lz + 10.5, plot.h + 5);
  return { position, target };
}

function pathOf(duration: number, curve: (u: number) => CameraPose): CameraPath {
  return { duration, at: (t) => curve(smooth(t / duration)) };
}

/** Intro: panorama -> market -> own plot, 5-8 s; with reduced motion only a short move from a far view. */
export function introPath(layout: Layout, plotIndex: number, reducedMotion: boolean): CameraPath {
  const plot = layout.plots[plotIndex];
  const end = finalPose(plot);
  if (reducedMotion) {
    const start: CameraPose = { position: plotPoint(plot, 0, 55, plot.h + 30), target: end.target.clone() };
    return pathOf(INTRO_REDUCED_SECONDS, (u) => lerp(start, end, u));
  }
  // flat direction from the plot to the plaza; the panorama lies behind the plaza as seen from the plot
  const dir = new THREE.Vector3(layout.plaza.x - plot.x, 0, layout.plaza.z - plot.z);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
  dir.normalize();
  const plaza = new THREE.Vector3(layout.plaza.x, layout.plazaHeight, layout.plaza.z);
  const panorama: CameraPose = {
    position: plaza.clone().addScaledVector(dir, 55).setY(layout.plazaHeight + 45),
    target: plaza.clone(),
  };
  const market: CameraPose = {
    position: plaza.clone().addScaledVector(dir, -16).setY(layout.plazaHeight + 12),
    target: plaza.clone().setY(layout.plazaHeight + 1),
  };
  const stations = [panorama, market, end];
  const pos = new THREE.CatmullRomCurve3(stations.map((s) => s.position), false, 'centripetal');
  const tgt = new THREE.CatmullRomCurve3(stations.map((s) => s.target), false, 'centripetal');
  return pathOf(INTRO_SECONDS, (u) => ({ position: pos.getPoint(u), target: tgt.getPoint(u) }));
}

/** Final scene: from the intro end pose to a closer shot of the figure (2.5 s, 1 s with reduced motion). */
export function closeUpPath(layout: Layout, plotIndex: number, reducedMotion: boolean): CameraPath {
  const plot = layout.plots[plotIndex];
  const from = finalPose(plot);
  const to: CameraPose = {
    position: plotPoint(plot, HOUSE_CENTRE.lx + 1, FIGURE_LZ + 4.5, plot.h + 2.8),
    target: plotPoint(plot, HOUSE_CENTRE.lx, FIGURE_LZ, plot.h + 1.2),
  };
  return pathOf(reducedMotion ? CLOSEUP_REDUCED_SECONDS : CLOSEUP_SECONDS, (u) => lerp(from, to, u));
}
