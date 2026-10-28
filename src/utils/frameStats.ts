/**
 * Smoothed frame-rate sampling for the HUD overlay.
 *
 * @packageDocumentation
 */

/** Blend weight for the previous FPS sample (higher = smoother). */
export const FPS_SMOOTHING = 0.9;

/**
 * Exponential moving average of frames per second.
 *
 * @param prev - Previous smoothed value.
 * @param dt - Frame step in seconds (use the uncapped rAF interval, not simulation `dt`).
 * @returns Updated FPS estimate.
 */
export function nextSmoothedFps(prev: number, dt: number): number {
  if (dt <= 0) return prev;
  const instant = Math.min(999, 1 / dt);
  return prev * FPS_SMOOTHING + instant * (1 - FPS_SMOOTHING);
}
