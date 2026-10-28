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
  /** Button shown while spectating after elimination. */
  private readonly spectateBar = byId('spectateBar');
  /** Shown when a match fails to start (spawn / setup). */
  private readonly startError = byId('startError');

  /**
   * Wires the PLAY and PLAY AGAIN buttons.
   *
   * @param onPlay - Called when either play-again button is clicked.
   * @param onHome - Returns to the start screen from the end overlay.
   * @param onExitSpectate - Leaves spectate mode and opens the defeat summary.
   */
  constructor(onPlay: () => void, onHome: () => void, onExitSpectate: () => void) {
    byId('startBtn').addEventListener('click', onPlay);
    byId('restartBtn').addEventListener('click', onPlay);
    byId('homeBtn').addEventListener('click', onHome);
    byId('exitSpectateBtn').addEventListener('click', onExitSpectate);
  }

  /** Updates the start screen subtitle (HTML from `matchSettingsBlurb`). */
  setStartBlurb(html: string): void {
    byId('startSub').innerHTML = html;
  }

  /**
   * Shows or clears a user-visible error on the start screen.
   *
   * @param message - Plain text to display, or `null` to hide.
   */
  setStartError(message: string | null): void {
    if (message) {
      this.startError.textContent = message;
      this.startError.classList.remove('hidden');
    } else {
      this.startError.textContent = '';
      this.startError.classList.add('hidden');
    }
  }

  /** Hides both overlays (a match is starting). */
  hideAll(): void {
    this.start.classList.add('hidden');
    this.end.classList.add('hidden');
    this.hideSpectateBar();
  }

  /** Shows the start screen and hides the end overlay. */
  showStart(): void {
    this.end.classList.add('hidden');
    this.start.classList.remove('hidden');
    this.hideSpectateBar();
  }

  /** Shows the exit control while the player spectates after elimination. */
  showSpectateBar(): void {
    this.spectateBar.classList.remove('hidden');
  }

  /** Hides the spectate controls. */
  hideSpectateBar(): void {
    this.spectateBar.classList.add('hidden');
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
