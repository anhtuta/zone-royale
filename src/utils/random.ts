/**
 * Random number helpers with a swappable source so that tests can be
 * deterministic.
 *
 * @packageDocumentation
 */

/** A function returning a uniformly distributed float in [0, 1). */
export type RandomSource = () => number;

let source: RandomSource = Math.random;

/**
 * Replaces the random source used by every helper in this module.
 *
 * @param fn - New source, e.g. {@link createSeededRandom}. Pass `Math.random` to restore the default.
 */
export function setRandomSource(fn: RandomSource): void {
  source = fn;
}

/**
 * Returns a float in [0, 1) from the current source.
 *
 * @returns A random float.
 */
export function random(): number {
  return source();
}

/**
 * Returns a random float in [`min`, `max`).
 *
 * @param min - Inclusive lower bound.
 * @param max - Exclusive upper bound.
 * @returns A random float.
 */
export function rand(min: number, max: number): number {
  return min + source() * (max - min);
}

/**
 * Returns a random integer in [`min`, `max`] (both inclusive).
 *
 * @param min - Inclusive lower bound.
 * @param max - Inclusive upper bound.
 * @returns A random integer.
 */
export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

/**
 * Picks a random element from a non-empty array.
 *
 * @param arr - Array to choose from.
 * @returns One of its elements.
 */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(source() * arr.length)] as T;
}

/**
 * Returns a shuffled copy of `arr`. Uses the same comparator-based shuffle as
 * the original single-file prototype so that the gameplay "feel" is identical.
 *
 * @param arr - Array to shuffle (not modified).
 * @returns A new, shuffled array.
 */
export function shuffled<T>(arr: readonly T[]): T[] {
  return arr.slice().sort(() => source() - 0.5);
}

/**
 * Creates a small, fast deterministic PRNG (mulberry32).
 *
 * @param seed - Any 32-bit integer.
 * @returns A {@link RandomSource} that yields the same sequence for the same seed.
 */
export function createSeededRandom(seed: number): RandomSource {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
