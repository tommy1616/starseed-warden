// Score, combo and run statistics; the HUD and results read this one object.
import { FEEL, SCORE } from './config.js';

export function createScore() {
  return {
    score: 0,
    combo: 0,
    comboBest: 0,
    comboTimer: 0,
    kills: 0,
    eliteKills: 0,
    bossKills: 0,
    shots: 0,
    hits: 0,
    waveBonus: 0,
    seedBonus: 0,
    victoryBonus: 0,
    pickupScore: 0,
  };
}

export function comboMultiplier(score) {
  return 1 + Math.min(2.5, score.combo * 0.06);
}

export function tickScore(score, dt) {
  if (score.comboTimer > 0) {
    score.comboTimer = Math.max(0, score.comboTimer - dt);
    if (score.comboTimer === 0) score.combo = 0;
  }
}

/** A regular enemy died. Returns the points paid. */
export function awardKill(score, kind, elite, difficulty, wave) {
  score.kills += 1;
  score.combo += 1;
  score.comboTimer = FEEL.comboWindow;
  if (score.combo > score.comboBest) score.comboBest = score.combo;
  if (elite) score.eliteKills += 1;
  const base = SCORE.kill[kind] ?? 8;
  const waveScale = 1 + (wave - 1) * 0.035;
  const points = base * (elite ? SCORE.eliteMultiplier : 1) * comboMultiplier(score) * waveScale * difficulty.score;
  score.score += points;
  return points;
}

export function awardBossKill(score, difficulty, wave) {
  score.kills += 1;
  score.bossKills += 1;
  score.combo += 3;
  score.comboTimer = FEEL.comboWindow;
  if (score.combo > score.comboBest) score.comboBest = score.combo;
  const points = (260 + wave * 40) * comboMultiplier(score) * difficulty.score;
  score.score += points;
  return points;
}

export function awardWaveClear(score, wave, seedFraction, difficulty) {
  const bonus = (SCORE.waveClear * wave + Math.round(SCORE.seedBonus * seedFraction)) * difficulty.score;
  score.waveBonus += bonus;
  score.score += bonus;
  return bonus;
}

export function awardVictory(score, difficulty) {
  const bonus = SCORE.victory * difficulty.score;
  score.victoryBonus = bonus;
  score.score += bonus;
  return bonus;
}

export function registerShot(score) {
  score.shots += 1;
}

export function registerHit(score) {
  score.hits += 1;
}

export function accuracy(score) {
  if (score.shots === 0) return 0;
  return Math.min(1, score.hits / score.shots);
}
