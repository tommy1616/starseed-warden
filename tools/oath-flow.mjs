// Real-browser proof of the Garden Oath flow: play wave 1 with genuine input until the wave
// clears, then take an oath and a Bloom through the real draft UI. The mouse pass clicks the
// oath button and a card; the keyboard pass reaches the same oath with arrows and Enter. No
// internal state is written by this tool, so a pass means the shipped screen machine worked.
import { mkdirSync, writeFileSync } from 'node:fs';
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
const EVIDENCE = process.env.MAKEFUN_EVIDENCE_DIR ?? '/checks';
const URL = 'http://127.0.0.1:PORT/?debug=1&seed=7&difficulty=warden';
const checks = [];

function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
}

const key = (type, k, code, vk) => ({
  type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 0,
});

async function press(cdp, k, code, vk) {
  await cdp.send('Input.dispatchKeyEvent', key('rawKeyDown', k, code, vk));
  await delay(45);
  await cdp.send('Input.dispatchKeyEvent', key('keyUp', k, code, vk));
  await delay(70);
}

async function mouse(cdp, type, x, y, buttons = 0) {
  await cdp.send('Input.dispatchMouseEvent', {
    type,
    x: Math.round(Math.max(0, Math.min(1279, x))),
    y: Math.round(Math.max(0, Math.min(719, y))),
    button: type === 'mouseMoved' ? 'none' : 'left',
    buttons,
    clickCount: type === 'mouseMoved' ? 0 : 1,
  });
}

async function click(cdp, x, y) {
  await mouse(cdp, 'mouseMoved', x, y, 0);
  await mouse(cdp, 'mousePressed', x, y, 1);
  await delay(50);
  await mouse(cdp, 'mouseReleased', x, y, 0);
  await delay(160);
}

async function capture(cdp, name) {
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true,
    clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 },
  });
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, name), Buffer.from(shot.data, 'base64'));
}

/** Click Play and clear wave 1 by aiming and firing at the nearest Hollow creature. */
async function reachDraft(cdp) {
  await waitFor(cdp, 'window.__game && window.__game.state === "title"', 20000, 'title');
  await click(cdp, 640, 383);
  await waitFor(cdp, 'window.__game.state === "play"', 8000, 'play');
  await mouse(cdp, 'mousePressed', 640, 420, 1);
  const started = Date.now();
  let lastDash = 0;
  let lastBloom = 0;
  let outcome = 'timeout';
  while (Date.now() - started < 150000) {
    const snap = await evaluate(cdp, '({state: window.__game.state, enemy: window.__game.nearestEnemy, warden: window.__game.warden, hp: window.__game.hp, seed: window.__game.starseedHp, wave: window.__game.wave})');
    if (snap.state === 'draft') { outcome = 'draft'; break; }
    if (snap.state === 'results') { outcome = 'defeat'; break; }
    const now = Date.now();
    if (snap.enemy) await mouse(cdp, 'mouseMoved', snap.enemy.x, snap.enemy.y, 1);
    else if (snap.warden) await mouse(cdp, 'mouseMoved', snap.warden.x, snap.warden.y - 120, 1);
    if (now - lastDash > 2400) {
      await press(cdp, ' ', 'Space', 32);
      lastDash = now;
    }
    if (now - lastBloom > 3200) {
      await press(cdp, 'e', 'KeyE', 69);
      lastBloom = now;
    }
    await delay(60);
  }
  await mouse(cdp, 'mouseReleased', 640, 420, 0);
  return outcome;
}

async function main() {
  const { server, port } = await startStaticServer(join(ROOT, 'game'));
  const chrome = await launchChrome();
  let cdp = null;
  try {
    cdp = await Cdp.connect(await chrome.pageSocketUrl());
    await openPage(cdp);
    const errors = collectPageErrors(cdp);
    const url = URL.replace('PORT', String(port));

    // ---- mouse pass -------------------------------------------------------
    await cdp.send('Page.navigate', { url });
    const mouseOutcome = await reachDraft(cdp);
    check('real wave-1 clear opens the draft (mouse run)', mouseOutcome === 'draft', mouseOutcome);
    const frames = await evaluate(cdp, 'new Promise((done) => { let n = 0; const t0 = performance.now(); const tick = () => { n += 1; if (performance.now() - t0 > 1000) done(n); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })');
    console.log(`INFO  ${frames} animation frames in one second`);
    const opened = await evaluate(cdp, '({oath: window.__game.oath, draft: window.__game.draft, focus: window.__game.focusAction})');
    check('draft starts with Quiet Garden and three cards',
      opened.draft && opened.draft.oathId === 'none' && opened.draft.cards === 3, JSON.stringify(opened.draft));
    check('draft focus starts on the first card', opened.focus === 'card:0', opened.focus);

    await click(cdp, 496, 622); // Unbroken Shell button (second of four)
    const mouseSelected = await waitFor(cdp, 'window.__game.draft && window.__game.draft.oathId === "guard"', 5000, 'mouse oath selection');
    const pickedMouse = await evaluate(cdp, '({draft: window.__game.draft, focus: window.__game.focusAction, state: window.__game.state})');
    check('clicking Unbroken Shell selects it and keeps the draft open',
      mouseSelected && pickedMouse.state === 'draft' && pickedMouse.draft.oathId === 'guard', JSON.stringify(pickedMouse));
    check('clicking an oath returns focus to the first card', pickedMouse.focus === 'card:0', pickedMouse.focus);
    await capture(cdp, 'oath-flow-draft-mouse.png');

    await click(cdp, 640, 380); // second card
    await waitFor(cdp, 'window.__game.state === "play" && window.__game.wave === 2', 8000, 'wave 2');
    const startedMouse = await evaluate(cdp, '({wave: window.__game.wave, oath: window.__game.oath, focus: window.__game.focusAction})');
    check('clicking a card starts wave 2 with the chosen oath',
      startedMouse.wave === 2 && startedMouse.oath && startedMouse.oath.id === 'guard' && startedMouse.oath.wave === 2,
      JSON.stringify(startedMouse));
    check('play focus is restored after the draft', startedMouse.focus === 'play', startedMouse.focus);

    // ---- keyboard pass ----------------------------------------------------
    await cdp.send('Page.navigate', { url });
    const keyOutcome = await reachDraft(cdp);
    check('real wave-1 clear opens the draft (keyboard run)', keyOutcome === 'draft', keyOutcome);
    await press(cdp, 'ArrowLeft', 'ArrowLeft', 37);
    const wrapped = await waitFor(cdp, 'window.__game.focusAction === "oath:harvest"', 5000, 'left wrap');
    check('ArrowLeft wraps to the last oath', wrapped, await evaluate(cdp, 'window.__game.focusAction'));
    await press(cdp, 'ArrowRight', 'ArrowRight', 39);
    const back = await waitFor(cdp, 'window.__game.focusAction === "card:0"', 5000, 'right wrap');
    check('ArrowRight returns to the first card', back, await evaluate(cdp, 'window.__game.focusAction'));
    const expected = ['card:1', 'card:2', 'oath:none', 'oath:guard'];
    let reachedGuard = true;
    for (const target of expected) {
      await press(cdp, 'ArrowRight', 'ArrowRight', 39);
      reachedGuard = (await waitFor(cdp, `window.__game.focusAction === ${JSON.stringify(target)}`, 5000, target)) && reachedGuard;
    }
    check('four ArrowRights reach Unbroken Shell', reachedGuard, await evaluate(cdp, 'window.__game.focusAction'));
    await press(cdp, 'Enter', 'Enter', 13);
    const selectedOk = await waitFor(cdp, 'window.__game.draft && window.__game.draft.oathId === "guard" && window.__game.focusAction === "card:0"', 5000, 'keyboard oath selection');
    const selected = await evaluate(cdp, '({draft: window.__game.draft, focus: window.__game.focusAction, state: window.__game.state})');
    check('Enter on the focused oath selects it and hands focus to card 1',
      selectedOk && selected.state === 'draft' && selected.draft.oathId === 'guard' && selected.focus === 'card:0', JSON.stringify(selected));
    await capture(cdp, 'oath-flow-draft-keyboard.png');
    await press(cdp, 'Enter', 'Enter', 13);
    await waitFor(cdp, 'window.__game.state === "play" && window.__game.wave === 2', 8000, 'wave 2 keyboard');
    const startedKey = await evaluate(cdp, '({wave: window.__game.wave, oath: window.__game.oath})');
    check('Enter on a card starts wave 2 with the oath',
      startedKey.wave === 2 && startedKey.oath && startedKey.oath.id === 'guard', JSON.stringify(startedKey));

    if (errors.length > 0) {
      console.error('\npage errors:');
      for (const error of errors) console.error(`  - ${error}`);
      check('no page console errors', false, `${errors.length} error(s)`);
    } else {
      check('no page console errors', true);
    }
  } finally {
    cdp?.close();
    await chrome.close();
    await new Promise((done) => server.close(done));
  }
  const failed = checks.filter((entry) => !entry.ok);
  console.log('\n--- oath flow summary ---');
  for (const entry of checks) console.log(`${entry.ok ? 'PASS' : 'FAIL'}  ${entry.name}${entry.detail ? ` - ${entry.detail}` : ''}`);
  console.log(`\noath-flow: ${failed.length === 0 ? 'PASS' : 'FAIL'}`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`oath-flow: FAIL - ${error.message}`);
  process.exitCode = 1;
});
