/**
 * Color helpers.
 *
 * @packageDocumentation
 */

import { clamp } from './math';

/**
 * Lightens or darkens a `#rrggbb` color by adding `amount` to each channel.
 *
 * @param hex - Color in `#rrggbb` form.
 * @param amount - Value added to each channel (negative darkens), clamped to 0..255.
 * @returns A CSS `rgb(r,g,b)` string.
 */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amount, 0, 255);
  const g = clamp(((n >> 8) & 255) + amount, 0, 255);
  const b = clamp((n & 255) + amount, 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
