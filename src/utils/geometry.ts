/**
 * Pure segment-vs-shape intersection tests used for bullets and line of sight.
 *
 * All functions return the parametric position `t` ∈ [0, 1] of the first hit
 * along the segment from (x1, y1) to (x2, y2), or `-1` when there is no hit.
 *
 * @packageDocumentation
 */

/**
 * Intersects a segment with a circle.
 *
 * @param x1 - Segment start X.
 * @param y1 - Segment start Y.
 * @param x2 - Segment end X.
 * @param y2 - Segment end Y.
 * @param cx - Circle centre X.
 * @param cy - Circle centre Y.
 * @param r - Circle radius.
 * @returns `0` if the start point is already inside, the first-hit `t`, or `-1`.
 */
export function segmentCircle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return -1;
  const b = 2 * (fx * dx + fy * dy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
}

/**
 * Intersects a segment with an axis-aligned rectangle (slab method).
 *
 * @param x1 - Segment start X.
 * @param y1 - Segment start Y.
 * @param x2 - Segment end X.
 * @param y2 - Segment end Y.
 * @param rx - Rectangle left.
 * @param ry - Rectangle top.
 * @param rw - Rectangle width.
 * @param rh - Rectangle height.
 * @returns The entry `t` (0 if the start is inside), or `-1`.
 */
export function segmentRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): number {
  let tmin = 0;
  let tmax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rx || x1 > rx + rw) return -1;
  } else {
    let t1 = (rx - x1) / dx;
    let t2 = (rx + rw - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < ry || y1 > ry + rh) return -1;
  } else {
    let t1 = (ry - y1) / dy;
    let t2 = (ry + rh - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin;
}
