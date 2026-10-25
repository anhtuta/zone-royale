import { describe, expect, it } from 'vitest';
import { treeSpriteBounds } from '../src/render/treeRenderer';

describe('treeSpriteBounds', () => {
  it('procedural bounds extend below side clumps (vr = 1.55 × r)', () => {
    const r = 24;
    const vr = r * 1.55;
    const y = 1000;
    const b = treeSpriteBounds({ t: 'tree', x: 500, y, r, vr, variant: 0, shade: 0 });
    const sideClumpBottom = y + vr * 0.592;
    expect(b.bottom).toBeGreaterThanOrEqual(sideClumpBottom);
    expect(b.bottom).toBeGreaterThan(y + r * 0.48);
  });
});
