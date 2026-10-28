/**
 * The top-level game controller: owns the world, wires input, audio,
 * rendering and the HTML screens together, and drives state transitions
 * (start → playing → dead/won → playing ...).
 *
 * @packageDocumentation
 */

import { renderAttract, renderGame } from '../render/renderer';
import { playerPickup } from '../systems/inventory';
import { buildEndSummary, createMatch, type MatchOutcome } from '../systems/match';
import { startReload, switchSlot } from '../systems/weapons';
import { DEFAULT_MATCH_SETTINGS, type MatchSettings } from '../config/matchSettings';
import { buildMinimapBase } from '../ui/minimap';
import { loadMatchSettings } from '../ui/matchSettingsStorage';
import { matchSettingsBlurb, SettingsModal } from '../ui/settings';
import { Screens } from '../ui/screens';
import { otherSlot } from '../entities/entity';
import { AudioEngine } from './audio';
import { Camera } from './camera';
import { Viewport } from './canvas';
import { Input } from './input';
import type { FrameOverlayStats } from '../ui/hud';
import { nextSmoothedFps } from '../utils/frameStats';
import { startLoop } from './loop';
import { stepWorld } from './simulation';
import type { World } from './world';

/** Read-only debugging / automation handle exposed as `window.__game`. */
export interface GameDebugHandle {
  /** Current phase. */
  readonly state: World['phase'];
  /** The player entity. */
  readonly player: World['player'];
  /** All combatants. */
  readonly entities: World['entities'];
  /** The zone. */
  readonly zone: World['zone'];
  /** Ground loot. */
  readonly loot: World['loot'];
  /**
   * Runs one simulation step with the current input.
   *
   * @param dt - Step in seconds.
   */
  update(dt: number): void;
}

/** The game application. */
export class Game {
  /** Canvas and context. */
  private readonly viewport: Viewport;
  /** Camera shared by every match. */
  private readonly camera: Camera;
  /** Keyboard and mouse. */
  private readonly input = new Input();
  /** Sound effects. */
  private readonly audio = new AudioEngine();
  /** HTML overlays. */
  private readonly screens: Screens;
  /** Current match (a backdrop match while on the start screen). */
  private world: World;
  /** Pre-rendered minimap for the current match. */
  private minimapBase: HTMLCanvasElement;
  /** Map size and player count for the next / current match. */
  private matchSettings: MatchSettings;
  /** Match settings popup. */
  private readonly settingsModal: SettingsModal;
  /** Smoothed FPS for the HUD overlay. */
  private smoothedFps = 60;

  /**
   * Creates the game, generates a backdrop match for the start screen and
   * hooks up input.
   *
   * @param canvas - The game canvas.
   */
  constructor(canvas: HTMLCanvasElement) {
    this.viewport = new Viewport(canvas);
    this.camera = new Camera(this.viewport.width, this.viewport.height);
    this.viewport.onResize((w, h) => this.camera.resize(w, h));
    this.matchSettings = loadMatchSettings();
    this.screens = new Screens(
      () => this.startMatch(),
      () => this.goHome(),
      () => this.exitSpectate(),
    );
    this.settingsModal = new SettingsModal();
    this.settingsModal.onSettingsSaved((s) => {
      this.matchSettings = s;
      this.screens.setStartError(null);
      this.refreshStartBlurb();
      this.refreshBackdrop();
    });
    this.refreshStartBlurb();
    this.world = this.createBackdropWorld();
    this.minimapBase = buildMinimapBase(this.world, this.world.mapSize);
    this.input.attach(canvas, {
      onKeyDown: (k) => this.handleKey(k),
      onWheel: () => this.handleWheel(),
    });
  }

  /** Starts the animation loop. */
  run(): void {
    startLoop((dt, now) => this.frame(dt, now));
  }

  /** Begins a new match (PLAY / PLAY AGAIN / Enter / Space). */
  startMatch(): void {
    if (this.settingsModal.isOpen()) return;
    this.audio.unlock();
    this.matchSettings = loadMatchSettings();
    this.settingsModal.close();
    this.screens.hideAll();
    this.input.mouse.x = this.camera.width / 2 + 100;
    this.input.mouse.y = this.camera.height / 2;
    try {
      this.world = createMatch(this.camera, this.audio, this.matchSettings);
      this.minimapBase = buildMinimapBase(this.world, this.world.mapSize);
      this.screens.setStartError(null);
    } catch (err) {
      console.error(err);
      const { world, recoveredWithDefaults } = this.safeBackdropWorld();
      this.world = world;
      this.minimapBase = buildMinimapBase(this.world, this.world.mapSize);
      this.screens.setStartError(matchStartFailureMessage(recoveredWithDefaults));
      this.screens.showStart();
    }
  }

  /** Start-screen attract mode world (not played). */
  private createBackdropWorld(): World {
    const w = createMatch(this.camera, null, this.matchSettings);
    w.phase = 'start';
    return w;
  }

  /** Backdrop match for menus; falls back to default settings if spawn fails. */
  private safeBackdropWorld(): { world: World; recoveredWithDefaults: boolean } {
    try {
      return { world: this.createBackdropWorld(), recoveredWithDefaults: false };
    } catch {
      const w = createMatch(this.camera, null, DEFAULT_MATCH_SETTINGS);
      w.phase = 'start';
      return { world: w, recoveredWithDefaults: true };
    }
  }

  /** Regenerates the menu backdrop after settings change. */
  private refreshBackdrop(): void {
    if (this.world.phase !== 'start') return;
    this.world = this.createBackdropWorld();
    this.minimapBase = buildMinimapBase(this.world, this.world.mapSize);
  }

  /** Updates the start overlay subtitle from {@link matchSettings}. */
  private refreshStartBlurb(): void {
    this.screens.setStartBlurb(matchSettingsBlurb(this.matchSettings));
  }

  /** Leaves the end screen and returns to the menu (controls + settings). */
  private goHome(): void {
    this.matchSettings = loadMatchSettings();
    this.refreshStartBlurb();
    this.world = this.createBackdropWorld();
    this.minimapBase = buildMinimapBase(this.world, this.world.mapSize);
    this.screens.showStart();
  }

  /**
   * Runs one simulation step with the current input and handles the match ending.
   *
   * @param dt - Step in seconds.
   */
  update(dt: number): void {
    const outcome = stepWorld(this.world, this.input.controls(this.camera), dt);
    if (outcome) this.endMatch(outcome);
  }

  /**
   * One animation frame: simulate while playing, then render.
   *
   * @param dt - Step in seconds.
   * @param now - Frame timestamp in ms.
   */
  private frame(dt: number, now: number): void {
    this.smoothedFps = nextSmoothedFps(this.smoothedFps, dt);
    if (this.world.phase === 'playing') {
      this.update(dt);
      this.syncSpectateUi();
    } else {
      this.screens.hideSpectateBar();
    }
    const frameStats: FrameOverlayStats = {
      fps: this.smoothedFps,
      ...(this.world.phase !== 'start' ? { matchSec: this.world.gameTime } : {}),
    };
    if (this.world.phase === 'start') renderAttract(this.viewport, this.world, now, frameStats);
    else renderGame(this.viewport, this.world, this.minimapBase, this.input.mouse, frameStats);
    this.input.endFrame();
  }

  /**
   * Shows the end screen.
   *
   * @param outcome - How the match ended.
   */
  private endMatch(outcome: MatchOutcome): void {
    this.screens.hideSpectateBar();
    this.screens.showEnd(buildEndSummary(this.world, outcome), outcome === 'won');
  }

  /** Stops spectating and shows the defeat summary while bots may still be fighting. */
  private exitSpectate(): void {
    const w = this.world;
    if (w.phase !== 'playing' || w.player.alive || !w.spectating) return;
    w.spectating = false;
    w.phase = 'dead';
    this.endMatch('dead');
  }

  /** Shows the exit control while the player is eliminated but still spectating. */
  private syncSpectateUi(): void {
    const w = this.world;
    if (!w.player.alive && w.spectating) this.screens.showSpectateBar();
    else this.screens.hideSpectateBar();
  }

  /**
   * Handles discrete key presses: R reload, E pick up (or exit spectate), 1/2/Q
   * switch weapon, Enter/Space start a match from the start or end screen.
   *
   * @param k - Lower-cased key.
   */
  private handleKey(k: string): void {
    const w = this.world;
    const p = w.player;
    if (w.phase === 'playing' && !p.alive && w.spectating && k === 'e') {
      this.exitSpectate();
    } else if (w.phase === 'playing' && p.alive) {
      if (k === 'r') startReload(p);
      else if (k === 'e') playerPickup(w);
      else if (k === '1') switchSlot(p, 0);
      else if (k === '2') switchSlot(p, 1);
      else if (k === 'q') switchSlot(p, otherSlot(p.slot));
    }
    if (
      !this.settingsModal.isOpen() &&
      (w.phase === 'dead' || w.phase === 'won' || w.phase === 'start') &&
      (k === 'enter' || k === ' ')
    ) {
      this.startMatch();
    }
  }

  /** Mouse wheel toggles between the two weapon slots. */
  private handleWheel(): void {
    const p = this.world.player;
    if (this.world.phase === 'playing' && p.alive) switchSlot(p, otherSlot(p.slot));
  }

  /**
   * Creates the `window.__game` handle used by automated browser tests.
   *
   * @returns A live view of the current match.
   */
  debugHandle(): GameDebugHandle {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const game = this;
    return {
      get state() {
        return game.world.phase;
      },
      get player() {
        return game.world.player;
      },
      get entities() {
        return game.world.entities;
      },
      get zone() {
        return game.world.zone;
      },
      get loot() {
        return game.world.loot;
      },
      update: (dt: number) => game.update(dt),
    };
  }
}

/** Start-screen copy when {@link Game.startMatch} cannot create a world. */
function matchStartFailureMessage(recoveredWithDefaults: boolean): string {
  if (recoveredWithDefaults) {
    return (
      'Could not start a match with your current settings. ' +
      'The menu is using the default map and player count. ' +
      'Open Settings and try a smaller lobby or a larger map.'
    );
  }
  return (
    'Could not start a match. Press Play to try again, or open Settings ' +
    'for a smaller player count or larger map.'
  );
}
