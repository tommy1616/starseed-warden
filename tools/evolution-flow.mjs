// Published-build proof of the guardian-evolution fork: real waves to wave 5, both directions
// for all three guardians, mouse and keyboard selection, the effect actually on the record, a
// wave-5 fight after the pick, and no second fork later in the run.
// Waves are cleared with the ?debug=1 hook so the run reaches the fork in seconds; the clear,
// draft, evolve and next-wave hand-offs are the game's own flow.
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
  await delay(90);
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
  await delay(200);
}

async function capture(cdp, name) {
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 },
  });
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, name), Buffer.from(shot.data, 'base64'));
}

const GUARDIAN_X = { seedshot: 366, petal: 640, bloom: 914 };
const CARD_CLICK = { x: 334, y: 382 };
const CHOICE_CLICK = [442, 838];
const EXPECTED_IDS = {
  seedshot: ['longdraw', 'twinnock'],
  petal: ['guardring', 'closecut'],
  bloom: ['sporeward', 'burstcrown'],
};
const EXPECTED_EFFECT = {
  longdraw: { pierce: 2, dartSpeed: 1.35, fireInterval: 1.15 },
  twinnock: { extraDarts: 1, dartDamage: 0.85, fireInterval: 0.95 },
  guardring: { orbitRadius: 74, orbitDamage: 0.8 },
  closecut: { orbitRadius: 46, orbitDamage: 1.45 },
  sporeward: { bloomSlow: 2.4, bloomSlowFactor: 0.45, bloomDamage: 0.85, bloomRadius: 0.9 },
  burstcrown: { bloomDamage: 1.55, bloomRadius: 0.8 },
};

async function title(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, 'window.__game && window.__game.state === "title"', 20000, 'title');
  await delay(250);
}

/** Enter on results, with one retry: a key that lands mid-transition can be missed. */
async function restartFromResults(cdp) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await press(cdp, 'Enter', 'Enter', 13);
    await delay(600);
    const state = await evaluate(cdp, '({state: window.__game.state, wave: window.__game.wave, darts: window.__game.darts})');
    if (state.state === 'play' && state.wave === 1) return true;
  }
  throw new Error('restart from results did not reach wave 1');
}

async function chooseGuardian(cdp, id) {
  await click(cdp, GUARDIAN_X[id], 527);
  await waitFor(cdp, `window.__game.guardian === ${JSON.stringify(id)}`, 5000, `${id} selected`);
}

async function start(cdp) {
  await click(cdp, 640, 383);
  await waitFor(cdp, 'window.__game.state === "play"', 8000, 'play');
}

/** Clear waves 1-4 through the real flow, stopping on the fork screen. */
async function reachFork(cdp, guardian) {
  for (let wave = 1; wave <= 4; wave += 1) {
    await evaluate(cdp, 'window.__debug.clearWave()');
    await waitFor(cdp, 'window.__game.state === "draft"', 15000, `draft after wave ${wave}`);
    await click(cdp, CARD_CLICK.x, CARD_CLICK.y);
    if (wave < 4) {
      await waitFor(cdp, `window.__game.state === "play" && window.__game.wave === ${wave + 1}`, 15000, `wave ${wave + 1}`);
    } else {
      await waitFor(cdp, 'window.__game.state === "evolve"', 15000, 'evolution fork');
    }
  }
  const screen = await evaluate(cdp, '({screen: window.__game.state, wave: window.__game.wave, fork: window.__game.evolutionScreen, evolution: window.__game.evolution})');
  check(`${guardian}: real waves 1-4 land on the wave-5 fork`, screen.screen === 'evolve' && screen.wave === 5, JSON.stringify(screen));
  check(`${guardian}: the fork lists its own two directions`,
    JSON.stringify(screen.fork?.ids) === JSON.stringify(EXPECTED_IDS[guardian]), JSON.stringify(screen.fork?.ids));
  return screen;
}

/** Fight the live wave for a few seconds with real mouse/keyboard input. */
async function fight(cdp, seconds, captureSpec = null) {
  await mouse(cdp, 'mousePressed', 640, 420, 1);
  const started = Date.now();
  let lastDash = 0;
  let lastBloom = 0;
  let shot = false;
  while (Date.now() - started < seconds * 1000) {
    const snap = await evaluate(cdp, '({state: window.__game.state, enemy: window.__game.nearestEnemy, warden: window.__game.warden, enemies: window.__game.enemies, wave: window.__game.wave, darts: window.__game.darts})');
    if (snap.state !== 'play') break;
    const now = Date.now();
    if (snap.enemy) await mouse(cdp, 'mouseMoved', snap.enemy.x, snap.enemy.y, 1);
    else if (snap.warden) await mouse(cdp, 'mouseMoved', snap.warden.x + 40, snap.warden.y - 100, 1);
    if (now - lastDash > 2400) { await press(cdp, ' ', 'Space', 32); lastDash = now; }
    if (now - lastBloom > 3200) { await press(cdp, 'e', 'KeyE', 69); lastBloom = now; }
    if (captureSpec && !shot) {
      let ready = false;
      if (captureSpec.when === 'contact' && snap.enemy && snap.warden) {
        ready = Math.hypot(snap.enemy.x - snap.warden.x, snap.enemy.y - snap.warden.y) < 120
          || (now - started > 4500 && snap.enemies > 0);
      } else if (captureSpec.when === 'default') {
        ready = now - started > 1400 && snap.enemies > 0;
      } else if (captureSpec.when === 'darts') {
        ready = now - started > 2200 && snap.darts >= (captureSpec.min ?? 4);
      }
      if (ready) {
        shot = true;
        await capture(cdp, captureSpec.name);
      }
    }
    await delay(60);
  }
  await mouse(cdp, 'mouseReleased', 640, 420, 0);
  return evaluate(cdp, '({state: window.__game.state, wave: window.__game.wave, enemies: window.__game.enemies, hp: window.__game.hp, evolution: window.__game.evolution})');
}

async function runFork(cdp, url, guardian, direction, viaKeyboard, captureName = null, fightCapture = null) {  await title(cdp, url);
  await chooseGuardian(cdp, guardian);
  await start(cdp);
  await reachFork(cdp, guardian);
  const expected = EXPECTED_IDS[guardian][direction];
  const label = `${guardian}/${expected}`;

  if (captureName) await capture(cdp, captureName);

  if (viaKeyboard) {
    // Focus starts on the left card; arrows move between the two, Enter confirms.
    if (direction === 1) await press(cdp, 'ArrowRight', 'ArrowRight', 39);
    const focus = await waitFor(cdp, `window.__game.evolutionScreen && window.__game.evolutionScreen.focus === ${direction}`, 5000, 'keyboard focus');
    check(`${label}: arrows move the fork focus`, Boolean(focus), String(direction));
    await press(cdp, 'Enter', 'Enter', 13);
  } else {
    await click(cdp, CHOICE_CLICK[direction], 374);
  }

  await waitFor(cdp, 'window.__game.state === "play" && window.__game.wave === 5', 10000, 'wave 5 after the pick');
  const picked = await evaluate(cdp, '({wave: window.__game.wave, evolution: window.__game.evolution, guardian: window.__game.guardian})');
  check(`${label}: the pick is applied and play resumes at wave 5`,
    picked.wave === 5 && picked.guardian === guardian && picked.evolution?.id === expected, JSON.stringify(picked.evolution));
  const effectOk = Object.entries(EXPECTED_EFFECT[expected])
    .every(([name, value]) => Math.abs(picked.evolution?.[name] - value) < 1e-6);
  check(`${label}: the recorded effect matches the card`, effectOk, JSON.stringify(picked.evolution));

  const rivals = EXPECTED_IDS[guardian].filter((id) => id !== expected);
  const rivalEffect = EXPECTED_EFFECT[rivals[0]];
  const rivalLeaked = Object.entries(rivalEffect)
    .some(([name, value]) => name !== 'fireInterval' && Math.abs(picked.evolution?.[name] - value) < 1e-6 && !(name in EXPECTED_EFFECT[expected]));
  check(`${label}: the other direction's numbers are not present`, !rivalLeaked, JSON.stringify(rivals));

  const afterFight = await fight(cdp, 8, fightCapture);
  check(`${label}: wave 5 keeps taking real input after the pick`,
    afterFight.wave === 5 && afterFight.evolution?.id === expected, JSON.stringify({ wave: afterFight.wave, enemies: afterFight.enemies, hp: afterFight.hp }));

  // Finish wave 5 and take the wave-6 draft: no second fork, no re-apply.
  await evaluate(cdp, 'window.__debug.clearWave()');
  await waitFor(cdp, 'window.__game.state === "draft"', 15000, 'draft after wave 5');
  await click(cdp, CARD_CLICK.x, CARD_CLICK.y);
  await waitFor(cdp, 'window.__game.state === "play" && window.__game.wave === 6', 15000, 'wave 6');
  const later = await evaluate(cdp, '({state: window.__game.state, wave: window.__game.wave, fork: window.__game.evolutionScreen, evolution: window.__game.evolution})');
  check(`${label}: no second fork at wave 6 and nothing re-applied`,
    later.state === 'play' && later.wave === 6 && later.fork === null && later.evolution?.id === expected, JSON.stringify(later.evolution));

  // Restart: the next run starts clean and can evolve again.
  await evaluate(cdp, 'window.__debug.defeat()');
  await waitFor(cdp, 'window.__game.state === "results"', 12000, 'results');
  await restartFromResults(cdp);
  const restarted = await evaluate(cdp, '({wave: window.__game.wave, evolution: window.__game.evolution, guardian: window.__game.guardian})');
  check(`${label}: restart clears the evolution`,
    restarted.wave === 1 && restarted.evolution === null && restarted.guardian === guardian, JSON.stringify(restarted));
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

    // Both directions for all three guardians; the first of each pair by mouse, the second by
    // keyboard, so the screen's mouse and keyboard routes are both exercised.
    await runFork(cdp, url, 'seedshot', 0, false, null, { name: 'evolution-seedshot-longdraw.png', when: 'default' });
    await runFork(cdp, url, 'seedshot', 1, true, null, { name: 'evolution-seedshot-twinnock.png', when: 'darts', min: 5 });
    await runFork(cdp, url, 'petal', 0, false, 'evolution-petal.png', { name: 'evolution-petal-ring.png', when: 'contact' });
    await runFork(cdp, url, 'petal', 1, true, null, { name: 'evolution-petal-closecut.png', when: 'contact' });
    await runFork(cdp, url, 'bloom', 0, false, 'evolution-bloom.png', { name: 'evolution-bloom-ward.png', when: 'default' });
    await runFork(cdp, url, 'bloom', 1, true, null, { name: 'evolution-bloom-burst.png', when: 'default' });

    // The fork is one per run, but the title screen still offers the standard start.
    await title(cdp, url);
    await chooseGuardian(cdp, 'seedshot');
    const pre = await evaluate(cdp, '({evolution: window.__game.evolution, screen: window.__game.state})');
    check('a fresh title screen starts with no evolution', pre.evolution === null && pre.screen === 'title', JSON.stringify(pre));

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
  console.log('\n--- evolution flow summary ---');
  for (const entry of checks) console.log(`${entry.ok ? 'PASS' : 'FAIL'}  ${entry.name}${entry.detail ? ` - ${entry.detail}` : ''}`);
  console.log(`\nevolution-flow: ${failed.length === 0 ? 'PASS' : 'FAIL'}`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`evolution-flow: FAIL - ${error.message}`);
  process.exitCode = 1;
});
