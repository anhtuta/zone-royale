/**
 * Entry point: boots the game on the `#c` canvas.
 *
 * @packageDocumentation
 */

import './styles/main.css';
import { Game, type GameDebugHandle } from './core/game';
import { loadCombatantSprites } from './render/spriteAssets';
import { loadTreeSprite } from './render/treeRenderer';

declare global {
  /** Globals added by the game. */
  interface Window {
    /** Debug / automation handle (used by `scripts/e2e.mjs`). */
    __game?: GameDebugHandle;
  }
}

const canvas = document.getElementById('c');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #c canvas');
void loadCombatantSprites();
void loadTreeSprite();
const game = new Game(canvas);
game.run();
window.__game = game.debugHandle();
