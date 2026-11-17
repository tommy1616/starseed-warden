// Deterministic ?shot= scenes: build a real world, run the fixed step with an autopilot, leave one frame.
import { STEP } from './config.js';
import { createWorld } from './world.js';
import { createBoss } from './bosses.js';
import { openDraft, pickDraft, endRun, SCREEN } from './state.js';
import { upgradeById, takeUpgrade } from './upgrades.js';
import { bulletRing, spawnHazard } from './projectiles.js';
import { addRing, burst } from './particles.js';

function nearestEnemy(world) {
  // Prefer the creature most likely to reach the Starseed; wisp-eaters are urgent.
  let best = null;
  let bestScore = Infinity;
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    const toSeed = Math.hypot(enemy.x - world.starseed.x, enemy.y - world.starseed.y);
    const toWarden = Math.hypot(enemy.x - world.warden.x, enemy.y - world.warden.y);
    const urgency = enemy.kind === 'wispEater' ? -36 : 0;
    const score = toSeed + toWarden * 0.22 + urgency;
    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  if (world.boss && !world.boss.dead) {
    const toSeed = Math.hypot(world.boss.x - world.starseed.x, world.boss.y - world.starseed.y);
    const toWarden = Math.hypot(world.boss.x - world.warden.x, world.boss.y - world.warden.y);
    // Tempting to tunnel the boss, but a minion chewing the Starseed must come first.
    const bossScore = toSeed + toWarden * 0.22 + 70;
    if (!best || bossScore < bestScore) best = world.boss;
  }
  return best;
}

function nearestBullet(world) {
  let best = null;
  let bestDistance = 90 * 90;
  for (const bullet of world.bullets) {
    const distance = (bullet.x - world.warden.x) ** 2 + (bullet.y - world.warden.y) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = bullet;
    }
  }
  return best;
}

/** A simple pilot: guard the Starseed, keep away from crowds and shots, fire, Bloom on crowds. */
export function autopilot(world) {
  const warden = world.warden;
  const seed = world.starseed;
  const target = nearestEnemy(world);
  let mx = 0;
  let my = 0;

  const seedDx = seed.x - warden.x;
  const seedDy = seed.y - warden.y;
  const seedDistance = Math.hypot(seedDx, seedDy) || 1;
  if (seedDistance > 190) {
    mx += (seedDx / seedDistance) * 1.7;
    my += (seedDy / seedDistance) * 1.7;
  } else if (seedDistance < 110) {
    mx -= (seedDx / seedDistance) * 0.9;
    my -= (seedDy / seedDistance) * 0.9;
  } else {
    mx += (-seedDy / seedDistance) * 0.45;
    my += (seedDx / seedDistance) * 0.45;
  }

  let crowd = 0;
  let seedThreats = 0;
  let nearest = Infinity;
  for (const enemy of world.enemies) {
    if (enemy.dead || enemy.burrowed) continue;
    const dx = warden.x - enemy.x;
    const dy = warden.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    nearest = Math.min(nearest, distance);
    if (distance < 150) {
      const weight = (1 - distance / 150) * 2.2;
      mx += (dx / distance) * weight;
      my += (dy / distance) * weight;
    }
    const toSeed = Math.hypot(enemy.x - seed.x, enemy.y - seed.y);
    if (toSeed < 220) seedThreats += 1;
    if (distance < 190) crowd += 1;
  }
  if (world.boss && !world.boss.dead) {
    const dx = warden.x - world.boss.x;
    const dy = warden.y - world.boss.y;
    const distance = Math.hypot(dx, dy) || 1;
    nearest = Math.min(nearest, distance);
    if (distance < 200) {
      const weight = (1 - distance / 200) * 2.4;
      mx += (dx / distance) * weight;
      my += (dy / distance) * weight;
    }
    if (Math.hypot(world.boss.x - seed.x, world.boss.y - seed.y) < 280) seedThreats += 2;
  }
  const bullet = nearestBullet(world);
  if (bullet) {
    const dx = warden.x - bullet.x;
    const dy = warden.y - bullet.y;
    const distance = Math.hypot(dx, dy) || 1;
    mx += (dx / distance) * 2;
    my += (dy / distance) * 2;
  }

  if (warden.x < 90) mx += 1.2;
  if (warden.x > 1190) mx -= 1.2;
  if (warden.y < 150) my += 1.2;
  if (warden.y > 660) my -= 1.2;

  const length = Math.hypot(mx, my);
  if (length > 0.001) {
    mx /= length;
    my /= length;
  } else {
    mx = Math.cos(world.time * 0.7) * 0.4;
    my = Math.sin(world.time * 0.7) * 0.4;
  }

  return {
    moveX: mx,
    moveY: my,
    aimX: target ? target.x : seed.x,
    aimY: target ? target.y : seed.y - 120,
    firing: Boolean(target),
    dash: nearest < 86 || Boolean(bullet),
    bloom: warden.bloom >= 100 && (crowd > 0 || seedThreats > 1),
  };
}

export function forceClear(world) {
  world.spawnQueue.length = 0;
  for (const enemy of world.enemies) {
    enemy.burrowed = false;
    enemy.dead = false;
  }
  world.damageInRadius(world.starseed.x, world.starseed.y, 1200, 9999, { silent: true });
  for (const enemy of world.enemies) enemy.dead = true;
  if (world.boss) world.bossCleared(world.boss);
}

function cardsFromIds(ids) {
  return ids.map((id) => upgradeById(id)).filter(Boolean);
}

function applyCards(world, ids) {
  for (const id of ids) {
    const card = upgradeById(id);
    if (card) takeUpgrade(world, card);
  }
}

export function stepWorld(app, seconds, options = {}) {
  const world = app.world;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.outcome || world.requestDraft) break;
    world.step(STEP, options.control ? options.control(world) : autopilot(world));
    if (options.keepAlive && i % 24 === 0) {
      world.starseed.hp = world.starseed.maxHp;
      world.warden.hp = world.warden.maxHp;
    }
  }
}

function runToDraftOrResult(app, limitSeconds = 75) {
  const world = app.world;
  let elapsed = 0;
  while (elapsed < limitSeconds) {
    if (world.outcome) return 'outcome';
    if (world.requestDraft) return 'draft';
    world.step(STEP, autopilot(world));
    elapsed += STEP;
    // The screenshot pilot is not a great defender of a static seed; keep the scene going so
    // it can reach the wave it is meant to photograph.
    if (Math.floor(elapsed * 60) % 24 === 0) {
      world.starseed.hp = world.starseed.maxHp;
      world.warden.hp = world.warden.maxHp;
    }
  }
  forceClear(world);
  for (let i = 0; i < 240; i += 1) {
    if (world.outcome) return 'outcome';
    if (world.requestDraft) return 'draft';
    world.step(STEP, autopilot(world));
  }
  return world.outcome ?? 'stall';
}

function prepareWorld(app) {
  app.world = createWorld({ seed: app.seed, difficulty: app.difficulty, audio: null });
  app.screen = SCREEN.play;
  app.world.startRun();
  return app.world;
}

function takeScriptedDraft(app, ids) {
  openDraft(app, cardsFromIds(ids));
  pickDraft(app, 0);
  app.world.starseed.hp = app.world.starseed.maxHp;
  app.world.warden.hp = app.world.warden.maxHp;
}

/** Play the early waves with a fixed pick per wave, leaving the world at the target wave. */
function advanceToWave(app, targetWave, picks) {
  let guard = 0;
  while (app.world.wave < targetWave && guard < 14) {
    const reason = runToDraftOrResult(app, 80);
    if (reason === 'outcome') return false;
    const pick = picks[(app.world.wave - 1) % picks.length];
    takeScriptedDraft(app, pick);
    guard += 1;
  }
  return app.world.wave >= targetWave;
}

function dressPlayScene(world) {
  world.phase = 'active';
  world.bannerTimer = 0;
  world.pendingBoss = null;
  world.spawnQueue.length = 0;
  world.spawnQueue = [];
  if (world.enemies.length < 8) {
    const spots = [
      ['inkling', 420, 250], ['inkling', 860, 240], ['spitter', 300, 470],
      ['splitter', 960, 470], ['wispEater', 760, 250], ['inkling', 520, 190],
      ['shade', 1020, 330], ['spitter', 210, 340],
    ];
    for (const [kind, x, y] of spots) {
      const enemy = world.spawnEnemy(kind, x, y, kind === 'splitter');
      if (enemy) enemy.slowTimer = 0;
    }
  }
  bulletRing(world, 640, 300, 10, 130, { radius: 6, damage: 4, color: '#ff87e0', kind: 'spore', life: 4 });
  bulletRing(world, 300, 300, 6, 110, { radius: 6, damage: 4, color: '#c77bff', kind: 'thorn', life: 4 });
  burst(world.particles, world.rng, 640, 420, '#b6ffe6', 20, { speed: 160, life: 0.9, size: 3 });
  world.score.combo = Math.max(world.score.combo, 14);
  world.score.comboTimer = 2.2;
  world.camera.shake = Math.max(world.camera.shake, 2.5);
}

function stagePlay(app) {
  prepareWorld(app);
  const picks = [
    ['spread'], ['rapid'], ['pierce'], ['crit'], ['magnet'],
  ];
  const reached = advanceToWave(app, 6, picks);
  const world = app.world;
  if (!reached) {
    world.wave = 6;
    world.biomeIndex = 1;
    world.phase = 'active';
    world.spawnQueue = [];
    world.enemies = [];
    world.boss = null;
    world.pendingBoss = null;
    world.outcome = null;
    world.requestResults = null;
    world.lostReason = null;
    world.camera.flash = 0;
    world.camera.hitStop = 0;
    world.starseed.hp = world.starseed.maxHp;
    world.warden.hp = world.warden.maxHp;
  }
  applyCards(world, ['vitality', 'homing']);
  world.warden.bloom = 72;
  stepWorld(app, 7.5, { keepAlive: true });
  world.outcome = null;
  world.requestResults = null;
  world.lostReason = null;
  world.phase = 'active';
  world.starseed.hp = world.starseed.maxHp;
  world.warden.hp = world.warden.maxHp;
  world.camera.flash = 0;
  world.camera.hitStop = 0;
  dressPlayScene(world);
  stepWorld(app, 0.35, { keepAlive: true });
  world.starseed.hp = world.starseed.maxHp;
  world.warden.hp = world.warden.maxHp;
  world.camera.flash = 0;
  world.camera.shake = Math.max(world.camera.shake, 2.5);
  world.warden.bloom = 100;
  world.score.combo = Math.max(world.score.combo, 16);
  world.score.comboTimer = 2.3;
  world.score.shots = Math.max(world.score.shots, 512);
  world.score.hits = Math.max(world.score.hits, 388);
  world.score.comboBest = Math.max(world.score.comboBest, 24);
  world.runTime = Math.max(world.runTime, 168);
  app.screen = SCREEN.play;
  app.screenTime = 2;
}

function stageDraft(app) {
  prepareWorld(app);
  const picks = [['rapid'], ['pierce'], ['homing'], ['frost'], ['vitality']];
  const reached = advanceToWave(app, 6, picks);
  if (!reached) {
    app.world.wave = 6;
    app.world.phase = 'clearing';
  }
  app.world.phase = 'clearing';
  app.world.wave = 5;
  app.world.biomeIndex = 1;
  app.world.spawnQueue = [];
  app.world.bullets.length = 0;
  app.world.hazards.length = 0;
  openDraft(app, cardsFromIds(['spread', 'thorn', 'magnet']));
  app.draft.time = 1.2;
  app.draft.focus = 0;
  app.screen = SCREEN.draft;
  app.screenTime = 0.9;
  app.focusAction = 'card:0';
}

function stageBoss(app) {
  prepareWorld(app);
  applyCards(app.world, [
    'spread', 'rapid', 'pierce', 'crit', 'homing', 'magnet', 'vitality', 'orbit', 'orbit', 'thorn',
  ]);
  const world = app.world;
  world.wave = 12;
  world.biomeIndex = 2;
  world.phase = 'active';
  world.spawnQueue = [];
  world.pendingBoss = null;
  world.bannerTimer = 0;
  world.runTime = 423;

  const boss = createBoss(world, 'crown');
  boss.x = 640;
  boss.y = 238;
  boss.state = 'idle';
  boss.attackTimer = 999;
  boss.hp = boss.maxHp * 0.58;
  boss.phase = 2;
  boss.lastPhase = 2;

  world.darts.length = 0;
  world.bullets.length = 0;
  world.hazards.length = 0;
  world.enemies.length = 0;
  world.pickups.length = 0;
  world.warden.x = 640;
  world.warden.y = 584;
  world.warden.hp = world.warden.maxHp;
  world.warden.invulnerable = 0;
  world.warden.bloom = 100;
  world.starseed.hp = world.starseed.maxHp;

  // The Crown opens phase 2 with layered magenta rings that expand across the glade.
  bulletRing(world, boss.x, boss.y, 16, 130, {
    radius: 6, damage: 6, color: '#ff87e0', kind: 'spore', life: 7,
  });
  bulletRing(world, boss.x, boss.y, 10, 85, {
    radius: 7, damage: 5, color: '#ffd0f4', kind: 'spore', life: 7, offset: 0.25,
  });

  const aimX = 658;
  const aimY = 226;
  const aimedFire = () => ({
    moveX: 0, moveY: 0, aimX, aimY, firing: true, dash: false, bloom: false,
  });

  // Real simulation: the Warden fires up at the Crown while the outer rings spread wide.
  stepWorld(app, 1.25, { keepAlive: true, control: aimedFire });
  bulletRing(world, boss.x, boss.y, 8, 170, {
    radius: 6, damage: 6, color: '#ff9bf0', kind: 'spore', life: 7, offset: 0.6,
  });

  // Minions and pollen join only now, so the expanding rings stay legible.
  const minions = [
    ['shade', 392, 330], ['splitter', 882, 330], ['spitter', 300, 472],
    ['thornback', 982, 468], ['inkling', 522, 324], ['wispEater', 792, 500], ['thornback', 732, 602],
  ];
  for (const [kind, x, y] of minions) {
    world.spawnEnemy(kind, x, y, kind === 'splitter');
  }
  world.dropPollen(418, 642, 2, false);
  world.dropPollen(872, 648, 2, false);
  stepWorld(app, 0.55, { keepAlive: true, control: aimedFire });

  // A warning line that has not fired yet: thin, red and pulsing above the arena.
  spawnHazard(world, {
    type: 'beam',
    x: 640, y: 238, x2: 226, y2: 700,
    width: 26, delay: 2.2, life: 0.35,
    damage: 12, target: 'warden', color: '#ff5b4a',
  });

  // Real damage calls create hit sparks and merge the floating numbers on the Crown.
  if (world.boss) {
    world.damageEnemy(world.boss, 14, { crit: false });
    world.damageEnemy(world.boss, 18, { crit: false });
    world.damageEnemy(world.boss, 25, { crit: true });
  }

  const shownBoss = world.boss;
  if (shownBoss) {
    shownBoss.x = 640;
    shownBoss.y = 238;
    shownBoss.state = 'idle';
    shownBoss.attackTimer = 999;
    shownBoss.hp = shownBoss.maxHp * 0.58;
    shownBoss.phase = 2;
    shownBoss.lastPhase = 2;
    shownBoss.hitFlash = 0;
  }

  world.warden.x = 640;
  world.warden.y = 584;
  world.warden.hp = world.warden.maxHp;
  world.warden.invulnerable = 0;
  world.warden.bloom = 100;
  world.warden.aimX = aimX;
  world.warden.aimY = aimY;
  world.warden.aimAngle = Math.atan2(aimY - world.warden.y, aimX - world.warden.x);
  world.starseed.hp = world.starseed.maxHp;

  world.score.score = 38640;
  world.score.kills = 214;
  world.score.eliteKills = 27;
  world.score.bossKills = 0;
  world.score.shots = 824;
  world.score.hits = 651;
  world.score.combo = 21;
  world.score.comboTimer = 2.2;
  world.score.comboBest = 31;
  world.score.pickupScore = 126;
  world.runTime = 423;

  burst(world.particles, world.rng, 640, 238, '#ff9bf0', 16, { speed: 180, life: 0.7, size: 3 });
  addRing(world.particles, 640, 238, 62, 250, 'rgba(255,135,224,0.55)', 0.9, 5);
  world.camera.flash = 0;
  world.camera.hitStop = 0;
  world.camera.shake = Math.max(world.camera.shake, 3.5);
  app.screen = SCREEN.play;
  app.screenTime = 2;
}

function stageVictory(app) {
  prepareWorld(app);
  applyCards(app.world, ['spread', 'rapid', 'pierce', 'crit', 'homing', 'magnet', 'vitality', 'bloomPower']);
  const world = app.world;
  world.wave = 12;
  world.biomeIndex = 2;
  world.phase = 'active';
  world.spawnQueue = [];
  world.pendingBoss = null;
  world.bannerTimer = 0;
  world.runTime = 486;
  world.score.score = 39480;
  world.score.kills = 236;
  world.score.shots = 940;
  world.score.hits = 742;
  world.score.comboBest = 34;
  const boss = createBoss(world, 'crown');
  boss.state = 'idle';
  boss.attackTimer = 999;
  boss.hp = boss.maxHp * 0.04;
  boss.phase = 3;
  boss.lastPhase = 3;
  boss.x = 640;
  boss.y = 220;
  let steps = 0;
  while (!world.requestResults && steps < 1200) {
    world.step(STEP, { moveX: 0, moveY: 0, aimX: boss.x, aimY: boss.y, firing: true, dash: false, bloom: false });
    steps += 1;
  }
  if (!world.requestResults) {
    world.outcome = 'victory';
    world.requestResults = 'victory';
  }
  endRun(app);
  app.screen = SCREEN.results;
  app.screenTime = 2.4;
  app.focusAction = 'again';
}

function stageDefeat(app) {
  prepareWorld(app);
  applyCards(app.world, ['spread', 'rapid', 'frost', 'vitality', 'magnet']);
  const world = app.world;
  world.wave = 6;
  world.biomeIndex = 1;
  world.phase = 'active';
  world.spawnQueue = [];
  world.bannerTimer = 0;
  world.runTime = 214;
  world.score.score = 18420;
  world.score.kills = 104;
  world.score.shots = 452;
  world.score.hits = 318;
  world.score.comboBest = 19;
  world.score.eliteKills = 11;
  world.starseed.hp = world.starseed.maxHp * 0.42;
  world.warden.hp = 1;
  world.lose('warden');
  let steps = 0;
  while (!world.requestResults && steps < 400) {
    world.step(STEP, autopilot(world));
    steps += 1;
  }
  if (!world.requestResults) world.requestResults = 'defeat';
  endRun(app);
  app.screen = SCREEN.results;
  app.screenTime = 2.4;
  app.focusAction = 'again';
}

/**
 * Stage the named scene on `app` and return it. Unknown names fall back to the title, so a
 * malformed URL still paints something sensible.
 */
export function stageShot(name, app) {
  app.shotMode = true;
  app.seed = app.seed >>> 0;
  app.world = null;
  app.draft = null;
  app.results = null;
  app.showHowTo = false;
  app.focusAction = 'play';
  switch (name) {
    case 'play':
      stagePlay(app);
      break;
    case 'draft':
      stageDraft(app);
      break;
    case 'boss':
      stageBoss(app);
      break;
    case 'victory':
      stageVictory(app);
      break;
    case 'defeat':
      stageDefeat(app);
      break;
    case 'title':
    default:
      app.screen = SCREEN.title;
      app.world = null;
      app.titleWorld.time = 4.4;
      app.titleWorld.starseed.pulse = 3;
      app.best = { score: 47280, wave: 11 };
      app.soundOn = true;
      app.screenTime = 4.2;
      app.focusAction = 'play';
      break;
  }
  return app;
}
