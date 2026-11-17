// The fixed-step simulation: player, creatures, shots, pickups, wave director and run hand-offs.
import { ARENA, FEEL, FIELD, PLAYER, STARSEED, STEP } from './config.js';
import { createRng } from './rng.js';
import { createCamera, updateCamera } from './camera.js';
import { createParticles, updateParticles, burst, addRing } from './particles.js';
import { createScore, tickScore, awardWaveClear, awardBossKill, awardVictory } from './scoring.js';
import { updatePlayer } from './player.js';
import { updateStarseed } from './starseed.js';
import { makeEnemy, spawnPoint, updateEnemies, resetEnemyIds } from './enemies.js';
import { createBoss, updateBoss } from './bosses.js';
import { updateDarts, updateBullets, updateHazards, offscreenCull } from './projectiles.js';
import { resolveDarts, resolveBullets, resolveBodies, damageEnemy, damageInRadius, hurtWarden, hurtStarseed } from './combat.js';
import { dropPollen, updatePickups } from './pickups.js';
import { buildWave, TOTAL_WAVES, biomeIndexForWave, waveTitle, BOSS_NAMES } from './waves.js';
import { beginOath, updateOath, settleOath } from './oaths.js';
import { applyGuardian } from './guardians.js';

function createDecor(rng) {
  const fireflies = [];
  for (let i = 0; i < 56; i += 1) {
    fireflies.push({
      x: rng.range(20, FIELD.width - 20),
      y: rng.range(70, FIELD.height - 24),
      phase: rng.next() * Math.PI * 2,
      pace: 0.25 + rng.next() * 0.55,
      drift: 8 + rng.next() * 22,
      size: 1.2 + rng.next() * 2.2,
      warm: rng.chance(0.3),
    });
  }
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: rng.range(0, FIELD.width),
      y: rng.range(0, FIELD.height * 0.62),
      size: 0.5 + rng.next() * 1.4,
      phase: rng.next() * Math.PI * 2,
      twinkle: 0.3 + rng.next() * 0.7,
    });
  }
  const grass = [];
  for (let i = 0; i < 90; i += 1) {
    grass.push({
      x: rng.range(-10, FIELD.width + 10),
      base: rng.range(FIELD.height - 86, FIELD.height + 16),
      height: 16 + rng.next() * 52,
      lean: -10 + rng.next() * 20,
      phase: rng.next() * Math.PI * 2,
      shade: rng.next(),
    });
  }
  const hills = [];
  for (let i = 0; i < 16; i += 1) {
    hills.push({
      x: rng.range(-80, FIELD.width + 80),
      width: 130 + rng.next() * 230,
      height: 50 + rng.next() * 130,
      phase: rng.next() * Math.PI * 2,
      depth: rng.next(),
    });
  }
  const motes = [];
  for (let i = 0; i < 24; i += 1) {
    motes.push({ x: rng.range(0, FIELD.width), y: rng.range(80, FIELD.height), phase: rng.next() * 6.28, size: 2 + rng.next() * 5, speed: 0.3 + rng.next() * 0.8 });
  }
  return { fireflies, stars, grass, hills, motes };
}

function makeWarden() {
  return {
    x: FIELD.width / 2,
    y: 572,
    r: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    invulnerable: 1.2,
    hitFlash: 0,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: 0,
    perfectArmed: false,
    dashStartHp: PLAYER.maxHp,
    dashCount: 0,
    bloom: 0,
    bloomLock: 0,
    aimAngle: -Math.PI / 2,
    aimX: FIELD.width / 2,
    aimY: 240,
    walkPhase: 0,
    thornTimer: 0,
    orbitAngle: 0,
    recoil: 0,
    dartDamage: PLAYER.dartDamage,
    dartRadius: PLAYER.dartRadius,
    pierce: 0,
    homing: 0,
    frost: 0,
    chain: 0,
    ricochet: 0,
    critChance: 0,
  };
}

function makeStarseed(difficulty) {
  const maxHp = Math.round(STARSEED.maxHp * (difficulty.seedHp ?? 1));
  return {
    x: STARSEED.x,
    y: STARSEED.y,
    r: STARSEED.radius,
    hp: maxHp,
    maxHp,
    shield: 0,
    shieldMax: 0,
    shieldTimer: 5,
    shieldInterval: STARSEED.shieldInterval,
    hurtFlash: 0,
    shieldFlash: 0,
    pulse: 0,
  };
}

function createMods() {
  return {
    multishot: 0, pierce: 0, rapid: 0, heavy: 0, homing: 0, orbit: 0, thorn: 0,
    dashTrail: 0, lifesteal: 0, regrow: 0, shield: 0, magnet: 0, crit: 0,
    ricochet: 0, frost: 0, chain: 0, vitality: 0, bloomCharge: 0, bloomPower: 0,
    swift: 0, flit: 0, linger: 0, satchel: 0,
  };
}

export function createWorld(options) {
  const rng = createRng(options.seed);
  resetEnemyIds();
  const world = {
    seed: options.seed >>> 0,
    rng,
    difficulty: options.difficulty,
    audio: options.audio ?? null,
    time: 0,
    runTime: 0,
    wave: 1,
    phase: 'idle',
    bannerTimer: 0,
    bannerMax: FEEL.banner,
    bannerText: '',
    clearTimer: 0,
    clearBonus: 0,
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 1,
    pendingBoss: null,
    boss: null,
    warden: makeWarden(),
    starseed: makeStarseed(options.difficulty),
    enemies: [],
    darts: [],
    bullets: [],
    hazards: [],
    pickups: [],
    trails: [],
    lingerRings: [],
    particles: createParticles(),
    camera: createCamera(),
    score: createScore(),
    mods: createMods(),
    upgrades: new Map(),
    decor: createDecor(rng),
    outcome: null,
    lostReason: null,
    requestDraft: false,
    requestResults: null,
    endTimer: 0,
    petalTimer: 0,
    bloomWasFull: false,
    perfectDashes: 0,
    pollenCollected: 0,
    seedDamageTaken: 0,
    oathsCompleted: 0,
    oathBonus: 0,
    oath: null,
    oathNotice: null,
    guardian: null,
    startingUpgrades: 0,
    biomeIndex: 0,
    hurtFlash: 0,
    introHint: {
      stage: 0, stageTime: 0, alpha: 1,
      moved: false, fired: false, dashed: false, collected: false,
      dashBase: 0, pollenBase: 0,
    },
  };

  world.hurtWarden = (amount, sx, sy, kind) => hurtWarden(world, amount, sx, sy, kind);
  world.hurtStarseed = (amount) => hurtStarseed(world, amount);
  world.damageEnemy = (enemy, amount, opts) => damageEnemy(world, enemy, amount, opts);
  world.damageInRadius = (x, y, radius, amount, opts) => damageInRadius(world, x, y, radius, amount, opts);
  world.dropPollen = (x, y, count, elite) => dropPollen(world, x, y, count, elite);
  world.spawnEnemy = (kind, x, y, elite) => {
    const enemy = makeEnemy(world, kind, x, y, elite);
    world.enemies.push(enemy);
    return enemy;
  };

  world.lose = (reason) => {
    if (world.outcome) return;
    world.outcome = 'defeat';
    world.lostReason = reason;
    world.endTimer = 1.5;
    world.phase = 'over';
    world.requestDraft = false;
    const point = reason === 'seed' ? world.starseed : world.warden;
    burst(world.particles, world.rng, point.x, point.y, '#ff5b4a', 46, { speed: 330, life: 1.4, size: 4 });
    addRing(world.particles, point.x, point.y, 20, 300, 'rgba(255,91,74,0.8)', 1.1, 7);
    world.camera.shake = Math.max(world.camera.shake, 18);
    world.camera.flash = Math.max(world.camera.flash, 0.85);
    world.camera.flashColor = 'rgba(255,91,74,1)';
    world.audio?.play('defeat');
    if (world.audio) world.audio.setScene(world.biomeIndex, false);
  };

  function startWave(wave) {
    world.wave = wave;
    world.phase = 'banner';
    world.bannerTimer = FEEL.banner;
    world.bannerMax = FEEL.banner;
    world.bannerText = waveTitle(wave);
    world.biomeIndex = biomeIndexForWave(wave);
    world.clearBonus = 0;
    world.spawnQueue = [];
    world.spawnTimer = 0;
    world.pendingBoss = null;
    const director = buildWave(wave, world.difficulty, world.rng);
    world.spawnQueue = director.spawns;
    world.spawnInterval = director.interval;
    world.spawnTimer = 0.35;
    world.pendingBoss = director.boss;
    world.audio?.play('wave');
    if (world.audio) world.audio.setScene(world.biomeIndex, Boolean(director.boss));
    if (director.boss) world.bannerText = `Wave ${wave}: ${BOSS_NAMES[director.boss]}`;
  }

  function beginWaveClear() {
    if (world.phase !== 'active') return;
    world.phase = 'clearing';
    world.clearTimer = FEEL.waveClearPause;
    const fraction = Math.max(0, world.starseed.hp / world.starseed.maxHp);
    world.clearBonus = awardWaveClear(world.score, world.wave, fraction, world.difficulty);
    settleOath(world);
    world.spawnQueue = [];
    world.bullets.length = 0;
    world.hazards.length = 0;
    addRing(world.particles, world.starseed.x, world.starseed.y, world.starseed.r, 260, 'rgba(126,232,255,0.7)', 1, 5);
    burst(world.particles, world.rng, world.starseed.x, world.starseed.y, '#ffd76a', 26, { speed: 200, life: 1.1, size: 3.4 });
    world.audio?.play('wave');
    if (world.audio) world.audio.setScene(world.biomeIndex, false);
  }

  function finishVictory() {
    awardVictory(world.score, world.difficulty);
    world.outcome = 'victory';
    world.endTimer = 1.4;
    world.phase = 'over';
    burst(world.particles, world.rng, world.starseed.x, world.starseed.y, '#ffd76a', 80, { speed: 380, life: 1.8, size: 4.5 });
    burst(world.particles, world.rng, world.starseed.x, world.starseed.y, '#b6ffe6', 50, { speed: 280, life: 1.6, size: 4 });
    addRing(world.particles, world.starseed.x, world.starseed.y, 20, 480, 'rgba(255,215,106,0.9)', 1.4, 9);
    world.camera.flash = Math.max(world.camera.flash, 0.8);
    world.camera.flashColor = 'rgba(255,235,170,1)';
    world.audio?.play('victory');
    if (world.audio) world.audio.setScene(world.biomeIndex, false);
  }

  world.bossCleared = (boss) => {
    if (!world.boss || world.boss !== boss) return;
    boss.dead = true;
    world.boss = null;
    const points = awardBossKill(world.score, world.difficulty, world.wave);
    burst(world.particles, world.rng, boss.x, boss.y, boss.color, 60, { speed: 390, life: 1.5, size: 5 });
    burst(world.particles, world.rng, boss.x, boss.y, '#ffd76a', 30, { speed: 290, life: 1.3, size: 4 });
    addRing(world.particles, boss.x, boss.y, 20, 380, 'rgba(255,215,106,0.9)', 1.1, 8);
    world.camera.shake = Math.max(world.camera.shake, 20);
    world.camera.flash = Math.max(world.camera.flash, 0.8);
    world.camera.flashColor = 'rgba(255,235,170,1)';
    world.camera.hitStop = Math.max(world.camera.hitStop, 0.12);
    world.audio?.play('kill');
    world.dropPollen(boss.x, boss.y, 16, true);
    for (const enemy of world.enemies) {
      if (enemy.dead) continue;
      enemy.dead = true;
      burst(world.particles, world.rng, enemy.x, enemy.y, enemy.color, 8, { speed: 140, life: 0.6, size: 3 });
      world.dropPollen(enemy.x, enemy.y, 1, false);
    }
    world.enemies.length = 0;
    world.spawnQueue = [];
    world.bullets.length = 0;
    world.hazards.length = 0;
    if (world.wave >= TOTAL_WAVES) {
      settleOath(world);
      world.phase = 'clearing';
      world.clearTimer = FEEL.waveClearPause + 0.35;
      world.clearBonus = points;
    } else {
      beginWaveClear();
    }
  };

  world.nextWave = (oathId = 'none') => {
    world.requestDraft = false;
    world.warden.hp = Math.min(world.warden.maxHp, world.warden.hp + 8);
    world.starseed.hp = Math.min(world.starseed.maxHp, world.starseed.hp + 6);
    startWave(world.wave + 1);
    beginOath(world, oathId);
  };

  world.startRun = (guardianId = 'seedshot') => {
    world.wave = 1;
    world.runTime = 0;
    startWave(1);
    beginOath(world, 'none');
    applyGuardian(world, guardianId);
  };

  function updateIntroHint(dt, control) {
    const hint = world.introHint;
    if (!hint) return;
    if (world.wave !== 1) {
      hint.alpha = 0;
      return;
    }
    hint.stageTime += dt;
    if (hint.stageTime >= 0.55) {
      const moving = control ? Math.hypot(control.moveX ?? 0, control.moveY ?? 0) > 0.15 : false;
      if (hint.stage === 0 && moving) {
        hint.moved = true;
        hint.stage = 1;
        hint.stageTime = 0;
      } else if (hint.stage === 1 && control?.firing) {
        hint.fired = true;
        hint.stage = 2;
        hint.stageTime = 0;
        hint.dashBase = world.warden.dashCount;
      } else if (hint.stage === 2 && world.warden.dashCount > hint.dashBase) {
        hint.dashed = true;
        hint.stage = 3;
        hint.stageTime = 0;
        hint.pollenBase = world.pollenCollected;
      } else if (hint.stage === 3 && world.pollenCollected > hint.pollenBase) {
        hint.collected = true;
        hint.stage = 4;
        hint.stageTime = 0;
      }
    }
    // Each prompt waits for its own action, but never gates the run. It lingers a beat
    // after the last step and then fades; a stalled player still gets it out of the way.
    if (hint.stage >= 4) {
      if (hint.stageTime > 2.8) hint.alpha = Math.max(0, hint.alpha - dt * 1.3);
    } else if (world.runTime > 36) {
      hint.alpha = Math.max(0, hint.alpha - dt * 0.9);
    }
  }

  function directSpawns(dt) {
    if (world.spawnQueue.length === 0) return;
    world.spawnTimer -= dt;
    if (world.spawnTimer > 0) return;
    world.spawnTimer = world.spawnInterval;
    const description = world.spawnQueue.shift();
    if (!description) return;
    const point = spawnPoint(world);
    world.spawnEnemy(description.kind, point.x, point.y, description.elite);
  }

  function checkWaveState() {
    if (world.phase !== 'active') return;
    if (world.pendingBoss) return;
    // A boss wave ends only when the boss itself falls (bossCleared sets the clearing phase).
    if (world.boss) return;
    if (world.spawnQueue.length === 0 && world.enemies.length === 0) beginWaveClear();
  }

  function stepEffects(dt) {
    updateParticles(world.particles, dt);
    updateCamera(world.camera, dt);
  }

  world.step = (dt, control) => {
    world.time += dt;
    tickScore(world.score, dt);
    if (world.oathNotice) {
      world.oathNotice.timer -= dt;
      if (world.oathNotice.timer <= 0) world.oathNotice = null;
    }

    if (world.outcome) {
      stepEffects(dt);
      if (world.endTimer > 0) {
        world.endTimer -= dt;
        if (world.endTimer <= 0) world.requestResults = world.outcome;
      }
      return;
    }

    // A hit-stop freezes the next step; camera decay still runs once per step.
    if (world.camera.hitStop > 0) {
      updateParticles(world.particles, dt);
      updateCamera(world.camera, dt);
      world.camera.hitStop = Math.max(0, world.camera.hitStop - dt);
      if (world.camera.hitStop <= 1e-9) world.camera.hitStop = 0;
      return;
    }

    if (world.phase === 'banner') {
      world.runTime += dt;
      updateIntroHint(dt, control);
      updatePlayer(world, dt, control);
      updateDarts(world, dt);
      updateStarseed(world, dt);
      updatePickups(world, dt);
      stepEffects(dt);
      world.bannerTimer -= dt;
      if (world.bannerTimer <= 0) {
        world.phase = 'active';
        if (world.pendingBoss) {
          createBoss(world, world.pendingBoss);
          world.pendingBoss = null;
        }
      }
      return;
    }

    if (world.phase === 'clearing') {
      world.runTime += dt;
      updatePlayer(world, dt, control);
      updateDarts(world, dt);
      updateStarseed(world, dt);
      updateEnemies(world, dt);
      updateBullets(world, dt);
      updateHazards(world, dt);
      updatePickups(world, dt);
      stepEffects(dt);
      world.clearTimer -= dt;
      if (world.clearTimer <= 0) {
        if (world.wave >= TOTAL_WAVES) finishVictory();
        else world.requestDraft = true;
      }
      return;
    }

    if (world.phase !== 'active') return;

    world.runTime += dt;
    updateIntroHint(dt, control);
    directSpawns(dt);
    updatePlayer(world, dt, control);
    updateStarseed(world, dt);
    updateEnemies(world, dt);
    updateBoss(world, dt);
    updateDarts(world, dt);
    updateBullets(world, dt);
    updateHazards(world, dt);
    resolveDarts(world);
    resolveBullets(world);
    resolveBodies(world);
    updatePickups(world, dt);
    offscreenCull(world.bullets);
    updateOath(world);
    stepEffects(dt);
    checkWaveState();
  };

  return world;
}

export { STEP, ARENA };
