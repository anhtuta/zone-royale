/**
 * The `requestAnimationFrame` game loop.
 *
 * @packageDocumentation
 */

import { MAX_FRAME_DT } from '../config/constants';

/**
 * Converts two frame timestamps into a clamped step size.
 *
 * @param now - Current timestamp in ms.
 * @param last - Previous timestamp in ms.
 * @returns Seconds elapsed, capped at {@link MAX_FRAME_DT}.
 */
export function frameDelta(now: number, last: number): number {
  return Math.min(MAX_FRAME_DT, (now - last) / 1000);
}

/**
 * Starts an endless animation-frame loop.
 *
 * @param frame - Called every frame with the step in seconds and the timestamp.
 * @returns A function that stops the loop.
 */
export function startLoop(frame: (dt: number, now: number) => void): () => void {
  let last = performance.now();
  let handle = 0;
  /**
   * One animation frame.
   *
   * @param now - Frame timestamp from the browser.
   */
  const tick = (now: number): void => {
    const dt = frameDelta(now, last);
    last = now;
    frame(dt, now);
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(handle);
}
