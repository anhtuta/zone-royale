// End-to-end smoke test: serves the production build from dist/, plays it in
// headless Chromium with simulated keyboard + mouse input, fails on any console
// error, and saves a gameplay screenshot to docs/screenshot.png.
//
// Usage: pnpm build && pnpm e2e
// Env:   CHROME_PATH=/path/to/chrome (default: /usr/bin/google-chrome, then Playwright's bundled browser)
//        SCREENSHOT=path.png         (default: docs/screenshot.png)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const root = resolve('dist');
const screenshotPath = resolve(process.env.SCREENSHOT ?? 'docs/screenshot.png');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
  '.png': 'image/png',
};

if (!existsSync(join(root, 'index.html'))) {
  console.error('dist/index.html not found - run `pnpm build` first');
  process.exit(1);
}

// Serve dist/ under a sub-path to prove the build works with base './' (like GitHub Pages).
const BASE = '/zone-royale/';
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(BASE)) {
      res.writeHead(404).end();
      return;
    }
    let p = normalize(join(root, decodeURIComponent(url.pathname.slice(BASE.length))));
    if (!p.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(p).catch(() => null))?.isDirectory()) p = join(p, 'index.html');
    const body = await readFile(p);
    res
      .writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const pageUrl = `http://127.0.0.1:${port}${BASE}`;

const executablePath =
  process.env.CHROME_PATH ??
  (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const browser = await chromium.launch({
  executablePath,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`);
});

const check = (cond, msg) => {
  if (!cond) throw new Error('Assertion failed: ' + msg);
  console.log('  ok -', msg);
};

try {
  console.log('Opening', pageUrl);
  await page.goto(pageUrl);
  await page.waitForTimeout(500);
  check((await page.evaluate(() => window.__game?.state)) === 'start', 'start screen shown');
  check(await page.isVisible('#startScreen'), 'start overlay visible');

  await page.click('#startBtn');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.__game.state)) === 'playing', 'PLAY starts a match');
  check(
    (await page.evaluate(() => window.__game.entities.length)) === 20,
    '20 combatants (1 player + 19 bots)',
  );

  const fps = await page.evaluate(
    () =>
      new Promise((r) => {
        let n = 0;
        const t0 = performance.now();
        const f = () => {
          n++;
          if (performance.now() - t0 < 2000) requestAnimationFrame(f);
          else r(n / 2);
        };
        requestAnimationFrame(f);
      }),
  );
  console.log('  fps ~', fps);

  // --- movement with WASD ---
  const before = await page.evaluate(() => ({
    x: window.__game.player.x,
    y: window.__game.player.y,
  }));
  await page.mouse.move(900, 300);
  await page.keyboard.down('d');
  await page.waitForTimeout(600);
  await page.keyboard.up('d');
  await page.keyboard.down('s');
  await page.waitForTimeout(400);
  await page.keyboard.up('s');
  const after = await page.evaluate(() => ({
    x: window.__game.player.x,
    y: window.__game.player.y,
  }));
  check(Math.hypot(after.x - before.x, after.y - before.y) > 40, 'player moves with WASD');

  // --- shooting with the mouse ---
  const magBefore = await page.evaluate(() => window.__game.player.weapons[0].mag);
  await page.mouse.click(1000, 360);
  await page.waitForTimeout(100);
  const magAfter = await page.evaluate(() => window.__game.player.weapons[0].mag);
  check(magAfter === magBefore - 1, 'left click fires the pistol');

  // --- reload with R ---
  await page.keyboard.press('r');
  await page.waitForTimeout(1300);
  check(
    (await page.evaluate(() => window.__game.player.weapons[0].mag)) === 12,
    'R reloads the magazine',
  );

  // --- pick up a weapon with E ---
  await page.evaluate(() => {
    const g = window.__game;
    const it = g.loot.find((l) => l.kind === 'weapon' && l.type !== 'pistol');
    g.player.x = it.x;
    g.player.y = it.y + 5;
    window.__wanted = it.type;
  });
  await page.waitForTimeout(100);
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  const picked = await page.evaluate(() => [
    window.__wanted,
    window.__game.player.weapons.map((w) => w && w.type),
  ]);
  check(picked[1].includes(picked[0]), `E picks up a weapon (${picked[0]})`);
  await page.keyboard.press('q');
  await page.waitForTimeout(50);
  check((await page.evaluate(() => window.__game.player.slot)) === 0, 'Q switches weapon slot');
  await page.keyboard.press('2');

  // --- set up a busy scene for the screenshot ---
  await page.evaluate(() => {
    const g = window.__game;
    const p = g.player;
    const it = g.loot.find((l) => l.kind === 'weapon');
    p.x = it.x + 40;
    p.y = it.y + 40;
    let k = 0;
    for (const e of g.entities) {
      if (!e.isPlayer && e.alive && k < 3) {
        e.x = p.x + 250 + k * 90;
        e.y = p.y - 120 + k * 110;
        k++;
      }
    }
    g.zone.r = Math.hypot(p.x - g.zone.x, p.y - g.zone.y) + 250;
  });
  await page.waitForTimeout(1500);
  await page.mouse.move(1000, 250);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(250);
  await page.screenshot({ path: screenshotPath });
  console.log('  screenshot ->', screenshotPath);

  // --- fast-forward a whole match ---
  const sim = await page.evaluate(() => {
    const g = window.__game;
    let steps = 0;
    while (g.state === 'playing' && steps < 60 * 400) {
      g.update(1 / 60);
      steps++;
    }
    return {
      state: g.state,
      simSec: Math.round(steps / 60),
      alive: g.entities.filter((e) => e.alive).length,
      phase: g.zone.phase,
    };
  });
  console.log('  simulated match:', JSON.stringify(sim));
  check(sim.state === 'won' || sim.state === 'dead', 'match reaches an end state');
  await page.waitForTimeout(200);
  check(await page.isVisible('#endScreen'), 'end screen visible');

  await page.click('#restartBtn');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.__game.state)) === 'playing', 'PLAY AGAIN restarts');

  check(
    errors.length === 0,
    'no console errors' + (errors.length ? ':\n' + errors.join('\n') : ''),
  );
  console.log('E2E PASSED');
} catch (e) {
  console.error(e.message);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
