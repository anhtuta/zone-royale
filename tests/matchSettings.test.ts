import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MATCH_SETTINGS,
  normalizeMatchSettings,
  numBots,
  zoneStartRadius,
} from '../src/config/matchSettings';
import { matchSettingsBlurb } from '../src/ui/settings';

describe('match settings', () => {
  it('defaults to medium map and 50 players', () => {
    expect(DEFAULT_MATCH_SETTINGS).toEqual({ mapSize: 5000, numPlayers: 50 });
    expect(numBots(DEFAULT_MATCH_SETTINGS)).toBe(49);
  });

  it('normalizes invalid stored values', () => {
    expect(normalizeMatchSettings({ mapSize: 999, numPlayers: 12 })).toEqual(
      DEFAULT_MATCH_SETTINGS,
    );
  });

  it('scales zone start radius with map size', () => {
    expect(zoneStartRadius(1000)).toBe(Math.ceil(500 * Math.SQRT2) + 30);
  });

  it('start blurb highlights players and map for settings', () => {
    const html = matchSettingsBlurb(DEFAULT_MATCH_SETTINGS);
    expect(html).toContain('class="blurb-players">50</span>');
    expect(html).toContain('class="blurb-map">medium</span>');
  });
});
