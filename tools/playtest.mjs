// Play the game the way a person would and check the whole loop in headless Chrome: click Play,
// move and fire for several seconds, dash, Bloom, confirm the score rose, force a defeat through
// the ?debug=1 hook, confirm the results screen, then press Enter to restart. Prints a PASS/FAIL
// summary and page console errors. Node 22 standard library only.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Cdp,
  collectPageErrors,
  delay,
  evaluate,
  launchChrome,
  openPage,
  startStaticServer,
  waitFor,
} from './browser.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function keyParams(type, key, code, keyCode) {
  return {
    type,
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
    modifiers: 0,
  };
}

async function pressKey(cdp, key, code, keyCode) {
  await cdp.send('Input.dispatchKeyEvent', keyParams('rawKeyDown', key, code, keyCode));
  await delay(40);
  await cdp.send('Input.dispatchKeyEvent', keyParams('keyUp', key, code, keyCode));
}

async function holdKey(cdp, key, code, keyCode) {
  await cdp.send('Input.dispatchKeyEvent', keyParams('rawKeyDown', key, code, keyCode));
}

async function releaseKey(cdp, key, code, keyCode) {
  await cdp.send('Input.dispatchKeyEvent', keyParams('keyUp', key, code, keyCode));
}

async function mouseMove(cdp, x, y, buttons = 0) {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: Math.round(Math.max(0, Math.min(1279, x))),
    y: Math.round(Math.max(0, Math.min(719, y))),
    button: 'none',
    buttons,
  });
}

async function mouseDown(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: Math.round(x),
    y: Math.round(y),
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
}

async function mouseUp(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: Math.round(x),
    y: Math.round(y),
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
}

async function main() {
  const { server, port } = await startStaticServer(join(ROOT, 'game'));
  const chrome = await launchChrome();
  let cdp = null;
  let crashed = null;
  try {
    cdp = await Cdp.connect(await chrome.pageSocketUrl());
    await openPage(cdp);
    const errors = collectPageErrors(cdp);

    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/?debug=1&seed=7` });
    await waitFor(cdp, 'window.__game && window.__game.state === "title"', 20000, 'title screen');
    check('title screen loads', true);
    check('debug hook present', await evaluate(cdp, 'typeof window.__debug.defeat === "function"'));

    await delay(350);
    await mouseMove(cdp, 640, 383);
    await mouseDown(cdp, 640, 383);
    await delay(50);
    await mouseUp(cdp, 640, 383);
    await waitFor(cdp, 'window.__game.state === "play"', 8000, 'play state after Play click');
    check('clicking Play starts a run', true);

    const startScore = await evaluate(cdp, 'window.__game.score');
    const startWave = await evaluate(cdp, 'window.__game.wave');

    await holdKey(cdp, 'd', 'KeyD', 68);
    await mouseDown(cdp, 900, 400);

    let scoreRose = false;
    let maxScore = startScore;
    let angle = 0;
    let dashSent = false;
    let bloomSent = false;
    const started = Date.now();
    while (Date.now() - started < 11000) {
      const target = await evaluate(cdp, 'window.__game.nearestEnemy');
      const warden = await evaluate(cdp, 'window.__game.warden');
      if (target && warden) {
        await mouseMove(cdp, target.x, target.y, 1);
      } else if (warden) {
        angle += 0.4;
        await mouseMove(cdp, warden.x + Math.cos(angle) * 230, warden.y + Math.sin(angle) * 160, 1);
      }
      const elapsed = Date.now() - started;
      if (!dashSent && elapsed > 3200) {
        dashSent = true;
        await pressKey(cdp, ' ', 'Space', 32);
      }
      if (!bloomSent && elapsed > 6400) {
        bloomSent = true;
        await pressKey(cdp, 'e', 'KeyE', 69);
      }
      if (elapsed > 5200) {
        await releaseKey(cdp, 'd', 'KeyD', 68);
        await holdKey(cdp, 'w', 'KeyW', 87);
      }
      const score = await evaluate(cdp, 'window.__game.score');
      if (score > maxScore) maxScore = score;
      if (score > startScore) scoreRose = true;
      const state = await evaluate(cdp, 'window.__game.state');
      if (state !== 'play') break;
      await delay(70);
    }
    await releaseKey(cdp, 'd', 'KeyD', 68);
    await releaseKey(cdp, 'w', 'KeyW', 87);
    await mouseUp(cdp, 900, 400);

    check('score rises while playing', scoreRose, `start ${startScore}, now ${maxScore}`);
    check('dash was triggered', dashSent);
    check('Bloom was triggered', bloomSent);
    check('run still in play after the input burst', (await evaluate(cdp, 'window.__game.state')) === 'play');
    check('wave did not regress', (await evaluate(cdp, 'window.__game.wave')) >= startWave);

    await evaluate(cdp, 'window.__debug.defeat()');
    await waitFor(cdp, 'window.__game.state === "results"', 12000, 'results after forced defeat');
    const outcome = await evaluate(cdp, 'window.__game.outcome');
    check('debug defeat reaches the results screen', outcome === 'defeat', `outcome ${outcome}`);

    await pressKey(cdp, 'Enter', 'Enter', 13);
    await waitFor(cdp, 'window.__game.state === "play" && window.__game.wave === 1', 8000, 'restart with Enter');
    check('Enter on results restarts at wave 1', true);

    if (errors.length > 0) {
      console.error('\npage console errors:');
      for (const error of errors) console.error(`  - ${error}`);
      check('no page console errors', false, `${errors.length} error(s)`);
    } else {
      check('no page console errors', true);
    }
  } catch (error) {
    crashed = error;
    check('playtest completed without throwing', false, error.message);
  } finally {
    cdp?.close();
    await chrome.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }

  const failed = checks.filter((entry) => !entry.ok);
  console.log('\n--- playtest summary ---');
  for (const entry of checks) console.log(`${entry.ok ? 'PASS' : 'FAIL'}  ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`);
  if (crashed) console.log(`\nplaytest: FAIL (${crashed.message})`);
  else console.log(`\nplaytest: ${failed.length === 0 ? 'PASS' : 'FAIL'}`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`playtest: FAIL — ${error.message}`);
  process.exitCode = 1;
});
