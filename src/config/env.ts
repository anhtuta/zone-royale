/**
 * Build-time flags from Vite (`VITE_*` in `.env`). Values are fixed at `pnpm dev` / `pnpm build`.
 *
 * @packageDocumentation
 */

/**
 * Parses a boolean Vite env string.
 *
 * @param raw - Value from `import.meta.env`.
 * @param defaultValue - Used when unset or empty.
 * @returns Parsed flag.
 */
function envBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === '') return defaultValue;
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * When `true`, obstacles that have bundled art (trees) are drawn with PNG sprites.
 * When `false`, the same obstacles are drawn procedurally on Canvas 2D.
 *
 * Set `VITE_USE_OBSTACLE_IMAGES` in `.env` (see `.env.example`).
 */
export const USE_OBSTACLE_IMAGES = envBool(import.meta.env.VITE_USE_OBSTACLE_IMAGES, false);

/**
 * When `true`, draws gameplay collision outlines over obstacles (debug only).
 *
 * Set `VITE_DEBUG_OBSTACLE_COLLISION` in `.env` (see `.env.example`).
 */
export const DEBUG_OBSTACLE_COLLISION = envBool(
  import.meta.env.VITE_DEBUG_OBSTACLE_COLLISION,
  false,
);
