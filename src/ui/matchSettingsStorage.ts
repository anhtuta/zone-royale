/**
 * Persists {@link MatchSettings} in `localStorage`.
 *
 * @packageDocumentation
 */

import {
  DEFAULT_MATCH_SETTINGS,
  normalizeMatchSettings,
  type MatchSettings,
} from '../config/matchSettings';

const STORAGE_KEY = 'zoneRoyale.matchSettings';

/**
 * Reads saved settings, or defaults when missing or invalid.
 *
 * @returns Normalized match settings.
 */
export function loadMatchSettings(): MatchSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MATCH_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MatchSettings>;
    return normalizeMatchSettings(parsed);
  } catch {
    return { ...DEFAULT_MATCH_SETTINGS };
  }
}

/**
 * Writes settings for the next page load and match.
 *
 * @param settings - Values to persist.
 */
export function saveMatchSettings(settings: MatchSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeMatchSettings(settings)));
}
