/**
 * The HTML overlay screens (start and end), defined in `index.html`.
 *
 * @packageDocumentation
 */

import type { EndSummary } from '../systems/match';

/**
 * Looks up a required element by id.
 *
 * @param id - Element id.
 * @returns The element.
 * @throws If the element is missing from the page.
 */
function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error('Missing element #' + id);
  return el;
}

/** Controller for the start and end overlays. */
export class Screens {
  /** Start screen overlay. */
  private readonly start = byId('startScreen');
  /** End screen overlay. */
  private readonly end = byId('endScreen');

  /**
   * Wires the PLAY and PLAY AGAIN buttons.
   *
   * @param onPlay - Called when either button is clicked.
   */
  constructor(onPlay: () => void) {
    byId('startBtn').addEventListener('click', onPlay);
    byId('restartBtn').addEventListener('click', onPlay);
  }

  /** Hides both overlays (a match is starting). */
  hideAll(): void {
    this.start.classList.add('hidden');
    this.end.classList.add('hidden');
  }

  /**
   * Fills in and shows the end screen.
   *
   * @param summary - Texts to display.
   * @param win - Whether the player won (gold title) or lost (red title).
   */
  showEnd(summary: EndSummary, win: boolean): void {
    const title = byId('endTitle');
    title.textContent = summary.title;
    title.className = win ? 'win' : 'lose';
    byId('endSub').textContent = summary.subtitle;
    byId('stPlace').textContent = summary.place;
    byId('stKills').textContent = summary.kills;
    byId('stDmg').textContent = summary.damage;
    byId('stTime').textContent = summary.time;
    this.end.classList.remove('hidden');
  }
}
