// Boot and the fixed-step loop; ?seed=N, ?shot=NAME and ?debug=1 keep their existing behaviour.
// The key screens are imported first so a source summary reaches them before the large
// simulation and drawing helpers; module evaluation has no side effects beyond definitions.
import { drawHud } from './render/hud.js';
import { drawDraft } from './render/draft.js';
import { drawResults } from './render/results.js';
import { createApp, SCREEN, updateApp, handleActions, dispatch, startRun, pauseGame } from './state.js';
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
import { stageShot } from './shots.js';

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

/** Read-only state probe for tools; getters always reflect the live app. */
window.__game = {
  get state() { return app.screen; },
  get screen() { return app.screen; },
  get wave() { return app.world ? app.world.wave : 0; },
  get hp() { return app.world ? Math.max(0, app.world.warden.hp) : 0; },
  get starseedHp() { return app.world ? Math.max(0, app.world.starseed.hp) : 0; },
  get score() { return app.world ? Math.round(app.world.score.score) : 0; },
  get outcome() { return app.world ? app.world.outcome : null; },
  get difficulty() { return app.difficultyId; },
  get best() { return app.best ? app.best.score : 0; },
  get upgrades() { return app.world ? app.world.upgrades.size : 0; },
  get tutorialStage() { return app.world ? app.world.introHint.stage : 0; },
  get perfectDashes() { return app.world ? app.world.perfectDashes : 0; },
  get pollenCollected() { return app.world ? app.world.pollenCollected : 0; },
  get oath() {
    const oath = app.world ? app.world.oath : null;
    return oath ? { id: oath.id, status: oath.status, progress: oath.progress, wave: oath.wave } : null;
  },
  get draft() {
    return app.draft ? { oathId: app.draft.oathId, focus: app.draft.focus, cards: app.draft.cards.length } : null;
  },
  get focusAction() { return app.focusAction; },
  get oathsCompleted() { return app.world ? app.world.oathsCompleted : 0; },
  get oathBonus() { return app.world ? app.world.oathBonus : 0; },
  get seedDamageTaken() { return app.world ? app.world.seedDamageTaken : 0; },
  get warden() {
    return app.world
      ? { x: app.world.warden.x, y: app.world.warden.y, bloom: app.world.warden.bloom }
      : null;
  },
  get nearestEnemy() {
    if (!app.world) return null;
    let best = null;
    let bestDistance = Infinity;
    for (const enemy of app.world.enemies) {
      if (enemy.dead || enemy.burrowed) continue;
      const distance = (enemy.x - app.world.warden.x) ** 2 + (enemy.y - app.world.warden.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x: enemy.x, y: enemy.y, kind: enemy.kind };
      }
    }
    if (app.world.boss && !app.world.boss.dead) {
      const distance = (app.world.boss.x - app.world.warden.x) ** 2 + (app.world.boss.y - app.world.warden.y) ** 2;
      if (distance < bestDistance) best = { x: app.world.boss.x, y: app.world.boss.y, kind: 'boss' };
    }
    return best;
  },
  get enemies() { return app.world ? app.world.enemies.length : 0; },
  get boss() {
    return app.world && app.world.boss
      ? { name: app.world.boss.name, hp: app.world.boss.hp, maxHp: app.world.boss.maxHp, phase: app.world.boss.phase, state: app.world.boss.state }
      : null;
  },
};

if (debug) {
  window.__debug = {
    start() {
      if (app.screen !== SCREEN.play) startRun(app);
    },
    defeat() {
      if (app.screen !== SCREEN.play || !app.world) startRun(app);
      app.world.warden.hp = 1;
      app.world.lose('warden');
    },
    addScore(amount) {
      if (app.world) app.world.score.score += Number(amount) || 0;
    },
  };
}

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

function runShot() {
  stageShot(shot, app);
  app.pointer = input.pointer;
  requestAnimationFrame(() => {
    drawFrame();
    window.__shotReady = true;
  });
}

if (isShot) runShot();
else runGame();
