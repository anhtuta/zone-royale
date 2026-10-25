import { describe, expect, it, vi } from 'vitest';
import {
  drawSoftGroundShadow,
  GROUND_SHADOW_CENTER_ALPHA,
  GROUND_SHADOW_CORE_STOP,
} from '../src/render/draw';

describe('drawSoftGroundShadow', () => {
  it('builds a radial gradient and restores context', () => {
    const stops: Array<{ pos: number; color: string }> = [];
    const gradient = {
      addColorStop: (pos: number, color: string) => {
        stops.push({ pos, color });
      },
    };
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      createRadialGradient: vi.fn(() => gradient),
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    drawSoftGroundShadow(ctx, 10, 20, 30, 12);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.translate).toHaveBeenCalledWith(10, 20);
    expect(ctx.scale).toHaveBeenCalledWith(30, 12);
    expect(stops[0]?.color).toContain(String(GROUND_SHADOW_CENTER_ALPHA));
    expect(stops.some((s) => s.pos === GROUND_SHADOW_CORE_STOP)).toBe(true);
    expect(stops[stops.length - 1]?.color).toBe('rgba(0,0,0,0)');
  });

  it('skips zero radii', () => {
    const ctx = { save: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D;
    drawSoftGroundShadow(ctx, 0, 0, 0, 5);
    expect(ctx.save).not.toHaveBeenCalled();
  });
});
