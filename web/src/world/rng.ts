/**
 * Seeded pseudo-random generator (Park-Miller minimal standard).
 * The village layout must be identical on every device for the same seed,
 * so the world code never uses Math.random().
 */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  // Park-Miller breaks on 0 and on multiples of its modulus; keep the state in range.
  let state = Math.floor(Math.abs(seed)) % 2147483646 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}
