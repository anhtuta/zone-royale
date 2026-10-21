/**
 * The 2D camera: a viewport rectangle in world space.
 *
 * @packageDocumentation
 */

import { lerp } from '../utils/math';

/** Something the camera can follow. */
export interface CameraTarget {
  /** World X. */
  x: number;
  /** World Y. */
  y: number;
}

/** A viewport into the world. `x`/`y` is the world position of the screen's top-left corner. */
export class Camera {
  /** World X of the left screen edge. */
  x = 0;
  /** World Y of the top screen edge. */
  y = 0;
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;

  /**
   * Creates a camera.
   *
   * @param width - Viewport width in CSS pixels.
   * @param height - Viewport height in CSS pixels.
   */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Updates the viewport size (on window resize).
   *
   * @param width - New width.
   * @param height - New height.
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * Snaps the camera so `target` is in the centre of the screen.
   *
   * @param target - Point to centre on.
   */
  centerOn(target: CameraTarget): void {
    this.x = target.x - this.width / 2;
    this.y = target.y - this.height / 2;
  }

  /**
   * Smoothly moves the camera towards centring `target` (exponential-ish follow).
   *
   * @param target - Point to follow.
   * @param dt - Frame time in seconds.
   */
  follow(target: CameraTarget, dt: number): void {
    const k = Math.min(1, dt * 10);
    this.x = lerp(this.x, target.x - this.width / 2, k);
    this.y = lerp(this.y, target.y - this.height / 2, k);
  }

  /**
   * Visibility test used to cull off-screen drawing.
   *
   * @param x - World X of the object's centre.
   * @param y - World Y of the object's centre.
   * @param r - Object's bounding radius.
   * @returns `true` if any part of the object may be on screen.
   */
  inView(x: number, y: number, r: number): boolean {
    return (
      x + r > this.x &&
      x - r < this.x + this.width &&
      y + r > this.y &&
      y - r < this.y + this.height
    );
  }

  /**
   * Converts a screen-space point to world space.
   *
   * @param sx - Screen X in CSS pixels.
   * @param sy - Screen Y in CSS pixels.
   * @returns The world-space point.
   */
  screenToWorld(sx: number, sy: number): CameraTarget {
    return { x: sx + this.x, y: sy + this.y };
  }
}
