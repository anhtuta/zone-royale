/**
 * Player-facing feedback: toast messages and kill-feed lines.
 *
 * @packageDocumentation
 */

import { KILLFEED_MAX } from '../config/constants';
import type { World } from '../core/world';
import type { KillFeedEntry } from '../entities/effects';

/** How long a toast stays on screen, in seconds. */
export const TOAST_DURATION = 2.5;

/**
 * Shows a centre-screen toast, replacing any current one.
 *
 * @param world - The game world.
 * @param text - Message text.
 * @param duration - Seconds to show it for.
 */
export function showMessage(world: World, text: string, duration = TOAST_DURATION): void {
  world.message = { text, t: duration };
}

/**
 * Appends a kill-feed line, dropping the oldest once there are more than {@link KILLFEED_MAX}.
 *
 * @param world - The game world.
 * @param entry - Line to add.
 */
export function pushFeed(world: World, entry: KillFeedEntry): void {
  world.killfeed.push(entry);
  if (world.killfeed.length > KILLFEED_MAX) world.killfeed.shift();
}

/**
 * Appends a system line (shown in purple with a warning sign) for 5 seconds.
 *
 * @param world - The game world.
 * @param text - Message text.
 */
export function pushSystemFeed(world: World, text: string): void {
  pushFeed(world, { sys: text, t: 5 });
}
