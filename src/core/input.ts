/**
 * Keyboard and mouse state, plus translation into {@link PlayerControls}.
 *
 * @packageDocumentation
 */

import type { PlayerControls } from '../systems/player';
import type { Camera } from './camera';

/** Mouse state in screen (CSS pixel) coordinates. */
export interface MouseState {
  /** Screen X. */
  x: number;
  /** Screen Y. */
  y: number;
  /** Left button is held. */
  down: boolean;
  /** Left button was pressed this frame (cleared by {@link Input.endFrame}). */
  clicked: boolean;
}

/** Callbacks for discrete input actions. */
export interface InputHandlers {
  /**
   * Called on every key press with the lower-cased `KeyboardEvent.key`.
   *
   * @param key - Lower-cased key name.
   */
  onKeyDown(key: string): void;
  /** Called when the mouse wheel is turned over the canvas. */
  onWheel(): void;
}

/** Keys whose default browser action (scrolling) is suppressed. */
const PREVENT_DEFAULT_KEYS = new Set([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

/**
 * Converts held keys, the mouse and the camera into per-step controls.
 * WASD and the arrow keys both move.
 *
 * @param keys - Held keys (lower-cased).
 * @param mouse - Mouse state.
 * @param camera - Camera, to convert the cursor into world space.
 * @returns Controls for {@link updatePlayer}.
 */
export function readControls(
  keys: Readonly<Record<string, boolean>>,
  mouse: Readonly<MouseState>,
  camera: Camera,
): PlayerControls {
  let mx = 0;
  let my = 0;
  if (keys['w'] || keys['arrowup']) my -= 1;
  if (keys['s'] || keys['arrowdown']) my += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  const aim = camera.screenToWorld(mouse.x, mouse.y);
  return {
    moveX: mx,
    moveY: my,
    aimX: aim.x,
    aimY: aim.y,
    fireHeld: mouse.down,
    firePressed: mouse.clicked,
  };
}

/** Tracks keyboard and mouse state from DOM events. */
export class Input {
  /** Currently held keys, by lower-cased `KeyboardEvent.key`. */
  readonly keys: Record<string, boolean> = {};
  /** Mouse state. */
  readonly mouse: MouseState = { x: 0, y: 0, down: false, clicked: false };

  /**
   * Registers DOM listeners on `window` and the canvas.
   *
   * @param canvas - Game canvas (clicks and wheel are only captured on it).
   * @param handlers - Action callbacks.
   */
  attach(canvas: HTMLCanvasElement, handlers: InputHandlers): void {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      handlers.onKeyDown(k);
      if (PREVENT_DEFAULT_KEYS.has(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('wheel', () => handlers.onWheel(), { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => this.releaseAll());
  }

  /** Releases every key and the mouse button (e.g. when the window loses focus). */
  releaseAll(): void {
    for (const k in this.keys) this.keys[k] = false;
    this.mouse.down = false;
  }

  /** Clears per-frame edge flags. Call once at the end of every frame. */
  endFrame(): void {
    this.mouse.clicked = false;
  }

  /**
   * Builds controls for the current frame.
   *
   * @param camera - Camera for screen→world conversion.
   * @returns The controls.
   */
  controls(camera: Camera): PlayerControls {
    return readControls(this.keys, this.mouse, camera);
  }
}
