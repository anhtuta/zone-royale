import { describe, expect, it } from 'vitest';
import { treeSpriteDef } from '../src/config/obstacleSprites';
import { treeSpriteBounds, treeSpriteDrawRect } from '../src/render/treeRenderer';

describe('treeSpriteDrawRect', () => {
  it('anchors sprite bottom at the foot with per-variant heightMul', () => {
    const r = 24;
    const vr = r * 1.55;
    const tree = { t: 'tree' as const, x: 120, y: 400, r, vr, variant: 3, shade: 0 };
    const def = treeSpriteDef(3);
    const aspect = 0.8;
    const { left, top, w, h } = treeSpriteDrawRect(tree, aspect);
    expect(left + w / 2).toBeCloseTo(tree.x);
    expect(top + h).toBeCloseTo(tree.y);
    expect(h).toBeCloseTo(vr * def.heightMul);
    expect(w).toBeCloseTo(h * aspect);
  });
});

describe('treeSpriteBounds', () => {
  it('procedural bounds extend below side clumps (foot at y)', () => {
    const r = 24;
    const vr = r * 1.55;
    const y = 1000;
    const b = treeSpriteBounds({ t: 'tree', x: 500, y, r, vr, variant: 0, shade: 0 });
    const sideClumpBottom = y + vr * 0.592;
    expect(b.bottom).toBeGreaterThanOrEqual(sideClumpBottom);
    expect(b.bottom).toBeGreaterThan(y + r * 0.48);
  });
});
