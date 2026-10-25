import { describe, expect, it } from 'vitest';
import {
  DECOR_COUNT,
  HOUSE_COUNT,
  MAPGEN_REFERENCE_SIZE,
  mapGenCounts,
  ROCK_COUNT,
  TREE_COUNT,
} from '../src/world/mapgen';

describe('mapGenCounts', () => {
  it('matches base constants at the reference map size', () => {
    expect(mapGenCounts(MAPGEN_REFERENCE_SIZE)).toEqual({
      houses: HOUSE_COUNT,
      rocks: ROCK_COUNT,
      trees: TREE_COUNT,
      decor: DECOR_COUNT,
      houseGap: 160,
    });
  });

  it('scales with map area', () => {
    expect(mapGenCounts(10000)).toEqual({
      houses: HOUSE_COUNT * 4,
      rocks: ROCK_COUNT * 4,
      trees: TREE_COUNT * 4,
      decor: DECOR_COUNT * 4,
      houseGap: 320,
    });
  });

  it('keeps at least one house on very small maps', () => {
    expect(mapGenCounts(1000).houses).toBeGreaterThanOrEqual(1);
  });
});
