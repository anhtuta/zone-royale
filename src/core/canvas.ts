/**
 * Canvas setup with high-DPI support.
 *
 * @packageDocumentation
 */

/** A full-window canvas and its drawing context. */
export class Viewport {
  /** The canvas element. */
  readonly canvas: HTMLCanvasElement;
  /** Its 2D context. */
  readonly ctx: CanvasRenderingContext2D;
  /** Width in CSS pixels. */
  width = 0;
  /** Height in CSS pixels. */
  height = 0;
  /** Device pixel ratio used for the backing store (capped at 2). */
  dpr = 1;
  /** Callbacks run after every resize. */
  private readonly listeners: ((w: number, h: number) => void)[] = [];

  /**
   * Wraps a canvas, sizes it to the window and keeps it sized.
   *
   * @param canvas - Canvas element to use.
   */
  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported in this browser');
    this.canvas = canvas;
    this.ctx = ctx;
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /**
   * Registers a resize listener.
   *
   * @param fn - Called with the new CSS width and height.
   */
  onResize(fn: (w: number, h: number) => void): void {
    this.listeners.push(fn);
  }

  /** Matches the canvas to the window size and device pixel ratio. */
  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    for (const fn of this.listeners) fn(this.width, this.height);
  }
}
