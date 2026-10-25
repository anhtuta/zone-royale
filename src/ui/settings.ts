/**
 * Match settings popup (map size and player count).
 *
 * @packageDocumentation
 */

import {
  MAP_SIZE_OPTIONS,
  PLAYER_COUNT_OPTIONS,
  type MatchSettings,
} from '../config/matchSettings';
import { loadMatchSettings, saveMatchSettings } from './matchSettingsStorage';

/** Looks up a required element by id. */
function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error('Missing element #' + id);
  return el as T;
}

/** Controls the settings overlay and persists choices to `localStorage`. */
export class SettingsModal {
  private readonly root = byId<HTMLDivElement>('settingsScreen');
  private readonly mapSelect = byId<HTMLSelectElement>('settingMapSize');
  private readonly playersSelect = byId<HTMLSelectElement>('settingNumPlayers');
  private onSaved: ((settings: MatchSettings) => void) | null = null;

  /** Wires buttons and fills the select options once. */
  constructor() {
    for (const opt of MAP_SIZE_OPTIONS) {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = opt.label + ' (' + opt.value + '²)';
      this.mapSelect.appendChild(o);
    }
    for (const n of PLAYER_COUNT_OPTIONS) {
      const o = document.createElement('option');
      o.value = String(n);
      o.textContent = String(n) + ' players';
      this.playersSelect.appendChild(o);
    }
    byId<HTMLButtonElement>('settingsOpenBtn').addEventListener('click', () => this.open());
    byId<HTMLButtonElement>('settingsCancelBtn').addEventListener('click', () => this.close());
    byId<HTMLButtonElement>('settingsSaveBtn').addEventListener('click', () => this.save());
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
  }

  /**
   * Registers a callback when the user saves new settings.
   *
   * @param fn - Called with normalized settings after save.
   */
  onSettingsSaved(fn: (settings: MatchSettings) => void): void {
    this.onSaved = fn;
  }

  /** Opens the modal with the current stored values. */
  open(): void {
    const s = loadMatchSettings();
    this.mapSelect.value = String(s.mapSize);
    this.playersSelect.value = String(s.numPlayers);
    this.root.classList.remove('hidden');
  }

  /** Closes without saving. */
  close(): void {
    this.root.classList.add('hidden');
  }

  /** Persists the form and notifies listeners. */
  private save(): void {
    const settings: MatchSettings = {
      mapSize: Number(this.mapSelect.value),
      numPlayers: Number(this.playersSelect.value),
    };
    saveMatchSettings(settings);
    this.close();
    this.onSaved?.(loadMatchSettings());
  }
}

/** Escapes text inserted into the start-screen blurb HTML. */
function escapeBlurbHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Start-screen subtitle HTML: player count and map size are wrapped in
 * `blurb-players` / `blurb-map` spans (changeable in settings).
 *
 * @param settings - Current match settings.
 * @returns Safe HTML for `#startSub`.
 */
export function matchSettingsBlurb(settings: MatchSettings): string {
  const mapLabel =
    MAP_SIZE_OPTIONS.find((o) => o.value === settings.mapSize)?.label ?? String(settings.mapSize);
  const players = escapeBlurbHtml(String(settings.numPlayers));
  const map = escapeBlurbHtml(mapLabel.toLowerCase());
  return (
    '<span class="blurb-players">' +
    players +
    '</span> players drop in on a <span class="blurb-map">' +
    map +
    '</span> map. The zone closes in. Only one walks out.'
  );
}
