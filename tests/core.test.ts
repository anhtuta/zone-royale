import { describe, expect, it } from 'vitest';
import { MAX_FRAME_DT, PLAYER_SPEED } from '../src/config/constants';
import { Camera } from '../src/core/camera';
import { readControls } from '../src/core/input';
import { frameDelta } from '../src/core/loop';
import { IDLE_CONTROLS, playerVelocity, updatePlayer } from '../src/systems/player';
import { soundVolume } from '../src/systems/sound';
import { formatKillFeed } from '../src/ui/killFeed';
import { zonePhaseText, zoneStatusText } from '../src/ui/hud';
import { nextSmoothedFps } from '../src/utils/frameStats';
import { makeWorld } from './helpers';

describe('camera', () => {
  it('centres, follows smoothly and converts coordinates', () => {
    const c = new Camera(800, 600);
    c.centerOn({ x: 1000, y: 1000 });
    expect(c.x).toBe(600);
    expect(c.y).toBe(700);
    c.follow({ x: 1100, y: 1000 }, 0.05);
    expect(c.x).toBeCloseTo(650);
    c.follow({ x: 1100, y: 1000 }, 1);
    expect(c.x).toBe(700);
    expect(c.screenToWorld(10, 20)).toEqual({ x: 710, y: 720 });
  });

  it('culls objects outside the viewport', () => {
    const c = new Camera(800, 600);
    expect(c.inView(400, 300, 0)).toBe(true);
    expect(c.inView(-20, 300, 10)).toBe(false);
    expect(c.inView(-5, 300, 10)).toBe(true);
  });
});

describe('input and loop', () => {
  it('readControls maps WASD/arrows and the mouse into world space', () => {
    const cam = new Camera(800, 600);
    cam.x = 100;
    cam.y = 50;
    const c = readControls(
      { w: true, d: true, arrowleft: true },
      { x: 10, y: 20, down: true, clicked: false },
      cam,
    );
    expect(c).toEqual({
      moveX: 0,
      moveY: -1,
      aimX: 110,
      aimY: 70,
      fireHeld: true,
      firePressed: false,
    });
  });

  it('frameDelta is clamped to avoid huge steps', () => {
    expect(frameDelta(1016, 1000)).toBeCloseTo(0.016);
    expect(frameDelta(5000, 1000)).toBe(MAX_FRAME_DT);
  });
});

describe('player controls', () => {
  it('diagonal movement is not faster', () => {
    const v = playerVelocity(1, 1);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(PLAYER_SPEED);
    expect(playerVelocity(0, 0)).toEqual({ vx: 0, vy: 0 });
  });

  it('aims at the cursor and fires semi-auto only on click', () => {
    const w = makeWorld();
    updatePlayer(w, { ...IDLE_CONTROLS, aimX: w.player.x, aimY: w.player.y + 100, fireHeld: true });
    expect(w.player.angle).toBeCloseTo(Math.PI / 2);
    expect(w.bullets).toHaveLength(0);
    updatePlayer(w, {
      ...IDLE_CONTROLS,
      aimX: w.player.x + 1,
      aimY: w.player.y,
      firePressed: true,
    });
    expect(w.bullets).toHaveLength(1);
  });

  it('automatic weapons fire while the button is held', () => {
    const w = makeWorld();
    w.player.weapons[0] = { type: 'smg', mag: 30 };
    updatePlayer(w, { ...IDLE_CONTROLS, fireHeld: true });
    expect(w.bullets).toHaveLength(1);
  });

  it('walking over ammo collects it automatically', () => {
    const w = makeWorld();
    w.loot.push({ kind: 'ammo', type: 'shells', amount: 10, x: w.player.x + 20, y: w.player.y });
    updatePlayer(w, IDLE_CONTROLS);
    expect(w.player.ammo.shells).toBe(10);
    expect(w.loot).toHaveLength(0);
  });
});

describe('sound attenuation', () => {
  it('is loudest at the listener and silent beyond 1200px', () => {
    expect(soundVolume(0)).toBeCloseTo(1);
    expect(soundVolume(600)).toBeLessThan(soundVolume(100));
    expect(soundVolume(1300)).toBe(0);
  });
});

describe('frame stats', () => {
  it('smooths FPS from frame delta', () => {
    const at60 = nextSmoothedFps(60, 1 / 60);
    expect(at60).toBeGreaterThan(59);
    expect(at60).toBeLessThan(61);
    const faster = nextSmoothedFps(60, 1 / 120);
    expect(faster).toBeGreaterThan(60);
  });
});

describe('HUD text', () => {
  it('formats the zone banner', () => {
    const w = makeWorld();
    expect(zoneStatusText(w.zone)).toBe('Zone closes in 0:45');
    expect(zonePhaseText(w.zone)).toBe('PHASE 1/6  •  1 dmg/s outside');
    w.zone.state = 'shrink';
    w.zone.timer = 12.3;
    expect(zoneStatusText(w.zone)).toBe('Zone shrinking  0:13');
    w.zone.state = 'final';
    expect(zoneStatusText(w.zone)).toBe('Final zone!');
  });

  it('formats kill feed lines', () => {
    expect(
      formatKillFeed({ killer: 'You', victim: 'Rex', weapon: 'SMG', kp: true, vp: false, t: 6 }),
    ).toEqual({
      text: 'You  [SMG]  Rex',
      color: '#fff',
      background: 'rgba(30,90,160,.75)',
    });
    expect(formatKillFeed({ killer: null, victim: 'You', weapon: null, vp: true, t: 6 }).text).toBe(
      'You was consumed by the zone',
    );
    expect(formatKillFeed({ sys: 'The zone is closing in!', t: 5 }).text).toBe(
      '⚠ The zone is closing in!',
    );
  });
});
