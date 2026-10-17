/**
 * Behaviour of the villagers (SPEC §11): they walk on the paths, pick goals, sit on benches,
 * wait at the fountain or the board and greet each other. Pure logic, no rendering.
 * The player cannot steer them.
 */
import type { Rng } from '../world/rng';
import type { WalkGraph } from '../world/layout';
import { shortestPath } from '../world/walk';

export type Action =
  | { kind: 'walk'; path: number[] }
  | { kind: 'sit'; seconds: number }
  | { kind: 'idle'; seconds: number; reason: 'fountain' | 'board' | 'pause' };

/** Fixed English greetings (SPEC §11: only these words, nothing typed by pupils). */
export const GREETINGS = ['Hi!', 'Hello!', 'Hey!', 'Good morning!', 'How are you?'] as const;

/**
 * Chooses the next action for a villager standing on node `from`.
 * Weights: wander 50 %, bench 20 %, fountain 10 %, board 10 %, another home 10 %.
 */
export function nextAction(rng: Rng, graph: WalkGraph, from: number): Action {
  const roll = rng();
  let goal: number;
  if (roll < 0.5) {
    goal = pick(rng, graph.wander, from);
  } else if (roll < 0.7) {
    const bench = pick(rng, graph.benches, -1);
    const path = shortestPath(graph, from, bench);
    if (path.length > 0) return { kind: 'walk', path: path.concat() };
    goal = from;
  } else if (roll < 0.8) {
    goal = pick(rng, graph.fountains, -1);
  } else if (roll < 0.9) {
    goal = graph.board;
  } else {
    goal = pick(rng, graph.homes, -1);
  }

  const path = shortestPath(graph, from, goal);
  if (path.length === 0 || goal === from) return pauseAt(rng);
  return { kind: 'walk', path };
}

/** What a villager does after arriving: sit on a bench, wait at fountain or board, or just pause. */
export function arrivalAction(rng: Rng, graph: WalkGraph, node: number): Action {
  const n = graph.nodes[node];
  if (n.tag === 'bench') return { kind: 'sit', seconds: 6 + rng() * 6 };
  if (n.tag === 'fountain') return { kind: 'idle', seconds: 3 + rng() * 3, reason: 'fountain' };
  if (n.tag === 'board') return { kind: 'idle', seconds: 2 + rng() * 2, reason: 'board' };
  return pauseAt(rng);
}

function pauseAt(rng: Rng): Action {
  return { kind: 'idle', seconds: 1 + rng() * 2, reason: 'pause' };
}

function pick(rng: Rng, list: number[], avoid: number): number {
  const candidates = list.filter((n) => n !== avoid);
  if (candidates.length === 0) return avoid;
  return candidates[Math.floor(rng() * candidates.length)];
}

/** Greeting word for an encounter, chosen deterministically from a random roll. */
export function greetingFor(rng: Rng): string {
  return GREETINGS[Math.floor(rng() * GREETINGS.length)];
}

/**
 * Moves along a path of graph nodes at constant speed (world units per second).
 * `position` returns the interpolated 2D point; `done` is true at the last node.
 */
export class Walker {
  private segment = 0;
  private along = 0; // distance travelled on the current segment

  constructor(
    private readonly points: Array<{ x: number; z: number }>,
    private readonly speed: number,
  ) {}

  get done(): boolean {
    return this.segment >= this.points.length - 1;
  }

  /** Advances by `dt` seconds. */
  advance(dt: number): void {
    let budget = this.speed * dt;
    while (budget > 0 && !this.done) {
      const a = this.points[this.segment];
      const b = this.points[this.segment + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6;
      const left = len - this.along;
      if (budget >= left) {
        budget -= left;
        this.segment++;
        this.along = 0;
      } else {
        this.along += budget;
        budget = 0;
      }
    }
  }

  position(): { x: number; z: number; heading: number } {
    const last = this.points.length - 1;
    if (last < 0) return { x: 0, z: 0, heading: 0 };
    if (this.done) {
      const p = this.points[last];
      const prev = this.points[Math.max(0, last - 1)];
      return { x: p.x, z: p.z, heading: Math.atan2(p.x - prev.x, p.z - prev.z) };
    }
    const a = this.points[this.segment];
    const b = this.points[this.segment + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6;
    const t = this.along / len;
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      heading: Math.atan2(b.x - a.x, b.z - a.z),
    };
  }
}
