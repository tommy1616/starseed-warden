// Read-only state probes for the test tools, plus the ?debug=1 hooks. This is development
// plumbing, not gameplay, so it stays out of the boot module; main installs it after the app.
import { SCREEN, startRun } from './state.js';

export function createProbe(app) {
  return {
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
}

export function createDebug(app) {
  return {
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
