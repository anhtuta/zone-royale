/**
 * The `requestAnimationFrame` game loop.
 *
 * @packageDocumentation
 */

import { MAX_FRAME_DT } from '../config/constants';

/**
 * Converts two frame timestamps into elapsed seconds (uncapped).
 *
 * @param now - Current timestamp in ms.
 * @param last - Previous timestamp in ms.
 * @returns Seconds elapsed since `last`.
 */
export function rawFrameDelta(now: number, last: number): number {
  return Math.max(0, (now - last) / 1000);
}

/**
 * Converts two frame timestamps into a clamped step size.
 *
 * @param now - Current timestamp in ms.
 * @param last - Previous timestamp in ms.
 * @returns Seconds elapsed, capped at {@link MAX_FRAME_DT}.
 */
export function frameDelta(now: number, last: number): number {
  return Math.min(MAX_FRAME_DT, rawFrameDelta(now, last));
}

/**
 * Starts an endless animation-frame loop.
 *
 * @param frame - Called every frame with simulation `dt`, uncapped `frameInterval`, and `now`.
 * @returns A function that stops the loop.
 */
export function startLoop(
  frame: (dt: number, frameInterval: number, now: number) => void,
): () => void {
  let last = performance.now();
  let handle = 0;
  /**
   * One animation frame.
   *
   * @param now - Frame timestamp from the browser.
   */
  const tick = (now: number): void => {
    const frameInterval = rawFrameDelta(now, last);
    const dt = Math.min(MAX_FRAME_DT, frameInterval);
    last = now;
    frame(dt, frameInterval, now);
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(handle);
}
