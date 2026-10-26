import { describe, expect, it } from 'vitest';
import { rockSpriteBounds } from '../src/render/rockRenderer';

describe('rockSpriteBounds', () => {
  it('procedural bounds match collision circle', () => {
    const rock = { t: 'rock' as const, x: 200, y: 300, r: 30, variant: 1, shade: 0 };
    const b = rockSpriteBounds(rock);
    expect(b.left).toBe(170);
    expect(b.right).toBe(230);
    expect(b.top).toBe(270);
    expect(b.bottom).toBe(330);
  });
});
