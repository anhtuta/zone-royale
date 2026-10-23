/**
 * Small, pure numeric helpers.
 *
 * @packageDocumentation
 */

/**
 * Clamps `v` into the inclusive range [`min`, `max`].
 *
 * @param v - Value to clamp.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns `min` if `v` is below it, `max` if above it, otherwise `v`.
 */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Linear interpolation between `a` and `b`.
 *
 * @param a - Start value (returned when `t` is 0).
 * @param b - End value (returned when `t` is 1).
 * @param t - Interpolation factor, usually in [0, 1].
 * @returns `a + (b - a) * t`.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Squared Euclidean distance between two points. Cheaper than {@link dist}
 * and good enough for comparisons.
 *
 * @param ax - X of the first point.
 * @param ay - Y of the first point.
 * @param bx - X of the second point.
 * @param by - Y of the second point.
 * @returns The squared distance.
 */
export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Euclidean distance between two points.
 *
 * @param ax - X of the first point.
 * @param ay - Y of the first point.
 * @param bx - X of the second point.
 * @param by - Y of the second point.
 * @returns The distance.
 */
export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

/**
 * Signed smallest difference from angle `from` to angle `to`, wrapped into
 * [-π, π). Used to turn bots smoothly towards their walking direction.
 *
 * @param from - Current angle in radians.
 * @param to - Desired angle in radians.
 * @returns The signed delta to add to `from`.
 */
export function angleDelta(from: number, to: number): number {
  const tau = Math.PI * 2;
  let d = (to - from) % tau;
  if (d < 0) d += tau;
  if (d > Math.PI) d -= tau;
  return d;
}

/**
 * Formats a duration as `m:ss`, rounding up to the next whole second.
 * Negative inputs are treated as zero.
 *
 * @param seconds - Duration in seconds.
 * @returns For example `"1:05"`.
 */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
