// Boot, the fixed-step loop and the shot/debug entry points.
// Key screens load first for the source summary; definitions have no side effects.
import { drawHud } from './render/hud.js';
import { drawDraft } from './render/draft.js';
import { drawResults } from './render/results.js';
import { createApp, SCREEN, updateApp, handleActions, dispatch, pauseGame } from './state.js';
import { STEP } from './config.js';
import { seedFromText } from './rng.js';
import { ACTION, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createView } from './render/view.js';
import { drawBackground } from './render/background.js';
import { drawEntities } from './render/entities.js';
import { drawHazards, drawAirEffects, drawReticle, drawLowHealth, drawFlash, drawWaveBanner } from './render/effects.js';
import { drawTitle } from './render/title.js';
import { drawPause } from './render/pause.js';
import { clearButtons, buttonAt } from './ui/buttons.js';
import { runShot } from './shots.js';
import { setUpgradeIconPainter } from './render/icons.js';
import { drawUpgradeIconArt } from './render/icons-art.js';
import { createProbe, createDebug } from './dev-probe.js';

setUpgradeIconPainter(drawUpgradeIconArt);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const debug = params.get('debug') === '1';
const isShot = Boolean(shot);
const seed = seedFromText(params.get('seed'), isShot ? 1 : Math.floor(Math.random() * 4294967296));
const difficultyId = params.get('difficulty') ?? 'warden';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = isShot ? null : createAudio();
const app = createApp({ seed, difficultyId, audio, shotMode: isShot });
app.announce = (message) => {
  if (status) status.textContent = message;
};
const view = createView(canvas);
const input = createInput(canvas, view.toLogical);
app.pointer = input.pointer;

function syncAudioScene() {
  if (!audio || !audio.ready || !app.world || app.screen !== SCREEN.play) return;
  audio.setScene(app.world.biomeIndex, Boolean(app.world.boss));
}

function unlockAudio() {
  if (!audio) return;
  audio.unlock();
  if (app.screen === SCREEN.play && app.world) audio.setScene(app.world.biomeIndex, Boolean(app.world.boss));
  else audio.setScene(0, false);
}
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

window.__game = createProbe(app);
if (debug) window.__debug = createDebug(app);

function controlFromInput(actions, pending) {
  const move = input.movement();
  return {
    moveX: move.x,
    moveY: move.y,
    aimX: input.pointer.x,
    aimY: input.pointer.y,
    firing: input.firing(),
    dash: pending.dash,
    bloom: pending.bloom,
  };
}

function drawPlay(ctx, world) {
  clearButtons(app.ui);
  view.beginFrame(world.camera, world.time);
  drawBackground(ctx, world);
  drawHazards(ctx, world);
  drawEntities(ctx, world);
  drawAirEffects(ctx, world);
  drawReticle(ctx, world);
  drawLowHealth(ctx, world);
  drawFlash(ctx, world.camera);
  drawHud(ctx, world);
  drawWaveBanner(ctx, world);
}

/** The frozen glade behind an overlay screen; the screen module paints only its own UI. */
function drawWorldBackdrop(ctx, app, alpha, options) {
  const world = app.world ?? app.titleWorld;
  if (!world) return;
  drawBackground(ctx, world);
  drawHazards(ctx, world);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawEntities(ctx, world, options);
  drawAirEffects(ctx, world);
  ctx.restore();
}

function drawFrame() {
  const ctx = view.ctx;
  if (app.screen === SCREEN.play && app.world) {
    drawPlay(ctx, app.world);
    return;
  }
  view.beginFrame(null, 0);
  if (app.screen === SCREEN.title) drawTitle(ctx, app);
  else if (app.screen === SCREEN.draft) {
    drawWorldBackdrop(ctx, app, 0.45, { aim: false });
    drawDraft(ctx, app);
  } else if (app.screen === SCREEN.paused) drawPause(ctx, app);
  else if (app.screen === SCREEN.results) {
    drawWorldBackdrop(ctx, app, 0.4, { warden: false, projectiles: false, aim: false });
    drawResults(ctx, app);
  }
}

function handleClicks(clicks) {
  for (const click of clicks) {
    if (click.button !== 0) continue;
    if (app.screen === SCREEN.play) continue;
    const button = buttonAt(app.ui, click.x, click.y);
    if (button && button.action) {
      audio?.play('click');
      dispatch(app, button.action);
    } else if (app.screen === SCREEN.title) {
      audio?.play('click');
    }
  }
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;
  const pending = { dash: false, bloom: false };

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.2, Math.max(0, (now - last) / 1000));
    last = now;

    const actions = input.takeActions();
    const clicks = input.takeClicks();
    handleClicks(clicks);

    if (app.screen === SCREEN.play) {
      handleActions(app, actions);
      if (actions & ACTION.dash) pending.dash = true;
      if (actions & ACTION.bloom) pending.bloom = true;
      if (app.screen !== SCREEN.play) {
        pending.dash = false;
        pending.bloom = false;
      }
    } else {
      handleActions(app, actions);
    }

    updateApp(app, dt);

    if (app.screen === SCREEN.play && app.world) {
      accumulator += dt;
      let guard = 0;
      while (accumulator >= STEP && guard < 12) {
        const control = controlFromInput(actions, pending);
        pending.dash = false;
        pending.bloom = false;
        app.world.step(STEP, control);
        accumulator -= STEP;
        guard += 1;
        if (app.world.requestDraft) break;
      }
      if (guard === 0) accumulator = Math.min(accumulator, STEP * 2);
      updateApp(app, 0);
      syncAudioScene();
    } else {
      accumulator = 0;
    }

    drawFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && app.screen === SCREEN.play) pauseGame(app);
  });

  app.announce('Starseed Warden. Press Enter or click Play. Use WASD to move, the mouse to aim.');
  requestAnimationFrame(frame);
}

if (isShot) runShot(app, shot, drawFrame, input.pointer);
else runGame();
