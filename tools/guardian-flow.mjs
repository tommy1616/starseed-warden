// Published-build proof of the three guardian starts: mouse and keyboard selection, real
// wave-1 play into the draft and the next wave, restart with no residue, and a short injected
// boss fight (explicitly not a full clear). Every check runs against the served game/ bytes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Cdp, collectPageErrors, delay, evaluate, launchChrome, openPage, startStaticServer, waitFor,
} from './browser.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE = process.env.MAKEFUN_EVIDENCE_DIR ?? '/checks';
const URL = 'http://127.0.0.1:PORT/?debug=1&seed=7&difficulty=warden';
const checks = [];
const key = (type, k, code, vk) => ({ type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 0 });

function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
}

async function press(cdp, k, code, vk) {
  await cdp.send('Input.dispatchKeyEvent', key('rawKeyDown', k, code, vk));
  await delay(45);
  await cdp.send('Input.dispatchKeyEvent', key('keyUp', k, code, vk));
  await delay(80);
}

async function hold(cdp, k, code, vk) {
  await cdp.send('Input.dispatchKeyEvent', key('rawKeyDown', k, code, vk));
}

async function release(cdp, k, code, vk) {
  await cdp.send('Input.dispatchKeyEvent', key('keyUp', k, code, vk));
}

async function mouse(cdp, type, x, y, buttons = 0) {
  await cdp.send('Input.dispatchMouseEvent', {
    type, x: Math.round(x), y: Math.round(y),
    button: type === 'mouseMoved' ? 'none' : 'left', buttons,
    clickCount: type === 'mouseMoved' ? 0 : 1,
  });
}

async function click(cdp, x, y) {
  await mouse(cdp, 'mouseMoved', x, y, 0);
  await mouse(cdp, 'mousePressed', x, y, 1);
  await delay(55);
  await mouse(cdp, 'mouseReleased', x, y, 0);
  await delay(180);
}

async function capture(cdp, name) {
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 },
  });
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, name), Buffer.from(shot.data, 'base64'));
}

const GUARDIAN_X = { seedshot: 366, petal: 640, bloom: 914 };
const EXPECTED_HP = { seedshot: 100, petal: 85, bloom: 90 };
const EXPECTED_LEVELS = {
  seedshot: {}, petal: { orbit: 2 }, bloom: { bloomCharge: 1, bloomPower: 1 },
};

async function title(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, 'window.__game && window.__game.state === "title"', 20000, 'title');
  await delay(300);
}

async function chooseMouse(cdp, id, captureTitle = false) {
  await click(cdp, GUARDIAN_X[id], 527);
  await waitFor(cdp, `window.__game.guardian === ${JSON.stringify(id)}`, 5000, `${id} selected`);
  if (captureTitle) await capture(cdp, 'paths-title-guardians.png');
}

async function start(cdp) {
  await click(cdp, 640, 383);
  await waitFor(cdp, 'window.__game.state === "play"', 8000, 'play');
}

/** Play the current wave with real input until the draft or a defeat. */
async function clearWave(cdp) {
  await mouse(cdp, 'mousePressed', 640, 420, 1);
  const started = Date.now();
  let lastDash = 0;
  let lastBloom = 0;
  let outcome = 'timeout';
  while (Date.now() - started < 180000) {
    const snap = await evaluate(cdp, '({state: window.__game.state, enemy: window.__game.nearestEnemy, warden: window.__game.warden, hp: window.__game.hp, wave: window.__game.wave})');
    if (snap.state === 'draft') { outcome = 'draft'; break; }
    if (snap.state === 'results') { outcome = 'defeat'; break; }
    const now = Date.now();
    if (snap.enemy) await mouse(cdp, 'mouseMoved', snap.enemy.x, snap.enemy.y, 1);
    else if (snap.warden) await mouse(cdp, 'mouseMoved', snap.warden.x, snap.warden.y - 120, 1);
    if (now - lastDash > 2400) { await press(cdp, ' ', 'Space', 32); lastDash = now; }
    if (now - lastBloom > 3200) { await press(cdp, 'e', 'KeyE', 69); lastBloom = now; }
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

    // Mouse selection of every guardian and its starting kit.
    for (const id of ['seedshot', 'petal', 'bloom']) {
      await title(cdp, url);
      await chooseMouse(cdp, id, id === 'petal');
      await start(cdp);
      const started = await evaluate(cdp, '({guardian: window.__game.guardian, maxHp: window.__game.wardenMaxHp, levels: window.__game.upgradeLevels, screen: window.__game.state})');
      check(`mouse: ${id} starts with its guardian and HP`,
        started.screen === 'play' && started.guardian === id && started.maxHp === EXPECTED_HP[id], JSON.stringify(started));
      check(`mouse: ${id} starting cards are real drafted cards`,
        JSON.stringify(started.levels) === JSON.stringify(EXPECTED_LEVELS[id]), JSON.stringify(started.levels));
    }

    // Keyboard selection: two downs from Play, Enter, back up to Play, Enter.
    await title(cdp, url);
    await press(cdp, 'ArrowDown', 'ArrowDown', 40);
    await waitFor(cdp, 'window.__game.focusAction === "guardian:seedshot"', 5000, 'keyboard seedshot focus');
    await press(cdp, 'ArrowDown', 'ArrowDown', 40);
    const focus = await waitFor(cdp, 'window.__game.focusAction === "guardian:petal"', 5000, 'keyboard guardian focus');
    check('keyboard: arrows reach the Petal Dancer', focus, await evaluate(cdp, 'window.__game.focusAction'));
    await press(cdp, 'Enter', 'Enter', 13);
    const selected = await waitFor(cdp, 'window.__game.guardian === "petal"', 5000, 'keyboard select');
    check('keyboard: Enter selects the guardian', selected, await evaluate(cdp, 'window.__game.guardian'));
    await waitFor(cdp, 'window.__game.focusAction === "guardian:petal"', 5000, 'keyboard selected focus');
    await press(cdp, 'ArrowUp', 'ArrowUp', 38);
    await waitFor(cdp, 'window.__game.focusAction === "guardian:seedshot"', 5000, 'keyboard up');
    await press(cdp, 'ArrowUp', 'ArrowUp', 38);
    await waitFor(cdp, 'window.__game.focusAction === "play"', 5000, 'keyboard play focus');
    await press(cdp, 'Enter', 'Enter', 13);
    await waitFor(cdp, 'window.__game.state === "play"', 8000, 'keyboard start');
    const keyStarted = await evaluate(cdp, '({guardian: window.__game.guardian, maxHp: window.__game.wardenMaxHp})');
    check('keyboard: Play starts the chosen guardian', keyStarted.guardian === 'petal' && keyStarted.maxHp === 85, JSON.stringify(keyStarted));

    // Difficulty stays independent of the guardian.
    await title(cdp, url);
    await chooseMouse(cdp, 'petal');
    await press(cdp, '3', 'Digit3', 51);
    await waitFor(cdp, 'window.__game.difficulty === "eclipse"', 5000, 'eclipse');
    await start(cdp);
    const diff = await evaluate(cdp, '({difficulty: window.__game.difficulty, guardian: window.__game.guardian, maxHp: window.__game.wardenMaxHp})');
    check('difficulty 3 keeps the chosen guardian', diff.difficulty === 'eclipse' && diff.guardian === 'petal' && diff.maxHp === 85, JSON.stringify(diff));

    // Real wave 1 -> draft -> wave 2 with the petal build, then restart without residue.
    await title(cdp, url);
    await chooseMouse(cdp, 'petal');
    await start(cdp);
    const waveOutcome = await clearWave(cdp);
    check('real wave 1 clears into the draft (petal)', waveOutcome === 'draft', waveOutcome);
    const draft = await evaluate(cdp, '({draft: window.__game.draft, guardian: window.__game.guardian, levels: window.__game.upgradeLevels, maxHp: window.__game.wardenMaxHp})');
    check('draft shows the guardian kit and three cards',
      draft.draft && draft.draft.cards === 3 && draft.guardian === 'petal' && draft.levels.orbit === 2 && draft.maxHp === 85, JSON.stringify(draft));
    await capture(cdp, 'paths-draft-petal.png');
    await click(cdp, 640, 380);
    await waitFor(cdp, 'window.__game.state === "play" && window.__game.wave === 2', 8000, 'wave 2');
    const wave2 = await evaluate(cdp, '({guardian: window.__game.guardian, levels: window.__game.upgradeLevels, maxHp: window.__game.wardenMaxHp, wave: window.__game.wave})');
    check('wave 2 keeps the guardian and adds the drafted card',
      wave2.wave === 2 && wave2.guardian === 'petal' && wave2.levels.orbit >= 2 && Object.values(wave2.levels).reduce((a, b) => a + b, 0) === 3, JSON.stringify(wave2));

    await evaluate(cdp, 'window.__debug.defeat()');
    await waitFor(cdp, 'window.__game.state === "results"', 12000, 'results');
    await press(cdp, 'Enter', 'Enter', 13);
    await waitFor(cdp, 'window.__game.state === "play" && window.__game.wave === 1', 8000, 'restart');
    const restarted = await evaluate(cdp, '({guardian: window.__game.guardian, levels: window.__game.upgradeLevels, maxHp: window.__game.wardenMaxHp})');
    check('restart keeps the guardian but applies its kit once',
      restarted.guardian === 'petal' && restarted.levels.orbit === 2
      && Object.values(restarted.levels).reduce((a, b) => a + b, 0) === 2 && restarted.maxHp === 85, JSON.stringify(restarted));

    // Published-page boss run: the page starts from an injected wave-12 Crown (and the debug
    // hook's 500 HP for a rendering/input probe); every later phase comes from normal input and
    // the page's own fixed-step loop. This is not the full fixed-step evidence, which lives in
    // paths-boss-sim.mjs. We drive it long enough to see a phase and, if it happens, the results.
    await title(cdp, url);
    await chooseMouse(cdp, 'seedshot');
    await press(cdp, '1', 'Digit1', 49);
    await waitFor(cdp, 'window.__game.difficulty === "sprout"', 5000, 'sprout');
    await start(cdp);
    await evaluate(cdp, 'window.__debug.boss()');
    await waitFor(cdp, 'window.__game.boss !== null', 5000, 'injected boss');
    const bossStart = await evaluate(cdp, 'window.__game.boss');
    console.log(`INFO  page boss probe starts at wave 12 with injected full Crown, guardian seedshot (debug hook keeps 500 Warden HP); full fight evidence is paths-boss-sim.mjs`);
    await mouse(cdp, 'mousePressed', 640, 300, 1);
    await hold(cdp, 'a', 'KeyA', 65);
    let moveKey = 'a';
    let lastDash = 0;
    let lastBloom = 0;
    let lastSwap = 0;
    let lastPhase = bossStart.phase;
    let phase3 = false;
    const bossStarted = Date.now();
    let endState = 'play';
    while (Date.now() - bossStarted < 180000) {
      const snap = await evaluate(cdp, '({state: window.__game.state, enemy: window.__game.nearestEnemy, boss: window.__game.boss, hp: window.__game.hp})');
      if (snap.state === 'results') { endState = 'results'; break; }
      const now = Date.now();
      if (snap.enemy) await mouse(cdp, 'mouseMoved', snap.enemy.x, snap.enemy.y, 1);
      if (snap.boss && snap.boss.phase !== lastPhase) {
        lastPhase = snap.boss.phase;
        console.log(`INFO  page boss phase ${lastPhase} at ${((now - bossStarted) / 1000).toFixed(1)}s real`);
      }
      if (snap.boss && snap.boss.phase >= 3 && !phase3) {
        phase3 = true;
        await capture(cdp, 'paths-boss-phase3.png');
      }
      if (now - lastSwap > 1600) {
        await release(cdp, moveKey, `Key${moveKey.toUpperCase()}`, moveKey.toUpperCase().charCodeAt(0));
        moveKey = moveKey === 'a' ? 'd' : 'a';
        await hold(cdp, moveKey, `Key${moveKey.toUpperCase()}`, moveKey.toUpperCase().charCodeAt(0));
        lastSwap = now;
      }
      if (now - lastDash > 2400) { await press(cdp, ' ', 'Space', 32); lastDash = now; }
      if (now - lastBloom > 3200) { await press(cdp, 'e', 'KeyE', 69); lastBloom = now; }
      await delay(70);
    }
    await release(cdp, moveKey, `Key${moveKey.toUpperCase()}`, moveKey.toUpperCase().charCodeAt(0));
    await mouse(cdp, 'mouseReleased', 640, 300, 0);
    let pageBoss = await evaluate(cdp, '({state: window.__game.state, outcome: window.__game.outcome, boss: window.__game.boss, phase3: window.__game.boss ? window.__game.boss.phase >= 3 : null})');
    if (pageBoss.state === 'play' && pageBoss.outcome) {
      await waitFor(cdp, 'window.__game.state === "results"', 15000, 'boss terminal results');
      pageBoss = await evaluate(cdp, '({state: window.__game.state, outcome: window.__game.outcome, boss: window.__game.boss, phase3: window.__game.boss ? window.__game.boss.phase >= 3 : null})');
    }
    check('published page renders the boss and takes real input damage',
      pageBoss.boss === null || pageBoss.boss.hp < bossStart.hp || pageBoss.state === 'results', JSON.stringify(pageBoss));
    check('published page reaches phase 2 and a terminal result or phase 3',
      lastPhase >= 2 && (pageBoss.state === 'results' || pageBoss.phase3 === true || phase3), JSON.stringify(pageBoss));
    if (pageBoss.state === 'results') {
      await capture(cdp, 'paths-boss-results.png');
      check('published page boss terminal has an outcome', pageBoss.outcome === 'victory' || pageBoss.outcome === 'defeat', String(pageBoss.outcome));
      await press(cdp, 'Enter', 'Enter', 13);
      await waitFor(cdp, 'window.__game.state === "play" && window.__game.wave === 1', 8000, 'boss restart');
      const bossRestart = await evaluate(cdp, '({wave: window.__game.wave, guardian: window.__game.guardian, levels: window.__game.upgradeLevels, maxHp: window.__game.wardenMaxHp, boss: window.__game.boss})');
      check('published page restarts after the boss terminal without residue',
        bossRestart.wave === 1 && bossRestart.guardian === 'seedshot'
        && Object.keys(bossRestart.levels).length === 0 && bossRestart.maxHp === 100 && bossRestart.boss === null, JSON.stringify(bossRestart));
    } else {
      console.log(`INFO  page boss probe stopped at ${endState} with phase ${lastPhase}; phase3/terminal is covered by paths-boss-sim.mjs`);
    }

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
  console.log('\n--- guardian flow summary ---');
  for (const entry of checks) console.log(`${entry.ok ? 'PASS' : 'FAIL'}  ${entry.name}${entry.detail ? ` - ${entry.detail}` : ''}`);
  console.log(`\nguardian-flow: ${failed.length === 0 ? 'PASS' : 'FAIL'}`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`guardian-flow: FAIL - ${error.message}`);
  process.exitCode = 1;
});
