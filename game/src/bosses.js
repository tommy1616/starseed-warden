// The three biome bosses: the Bramble Matron (vines, charges, thorn rings), the Spore Tyrant
// (spore clouds, split volleys, summons) and the three-phase Withering Crown (bullet rings,
// telegraphed beams, spirals and elites). Each is a bigger enemy with its own attack script;
// combat.js owns what happens when it takes damage or dies.
import { ARENA, FIELD } from './config.js';
import { addArc, addRing, burst } from './particles.js';
import { aimedFan, bulletRing, spawnBullet, spawnHazard, sporeRing } from './projectiles.js';

const TAU = Math.PI * 2;

const BOSS_DEFS = {
  bramble: {
    name: 'Bramble Matron',
    hp: 820,
    r: 52,
    touch: 16,
    seed: 14,
    color: '#a44bf0',
    glow: '#ffb0f4',
  },
  tyrant: {
    name: 'Spore Tyrant',
    hp: 1500,
    r: 58,
    touch: 17,
    seed: 16,
    color: '#b388ff',
    glow: '#e5c9ff',
  },
  crown: {
    name: 'The Withering Crown',
    hp: 2600,
    r: 62,
    touch: 19,
    seed: 18,
    color: '#ff5bd0',
    glow: '#ffe7a8',
  },
};

export function createBoss(world, type) {
  const def = BOSS_DEFS[type] ?? BOSS_DEFS.bramble;
  const hpScale = world.difficulty.hp * (1 + (world.wave - 1) * 0.012);
  const boss = {
    id: `boss-${type}`,
    kind: type,
    type,
    isBoss: true,
    name: def.name,
    x: FIELD.width / 2,
    y: 190,
    r: def.r,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    touchDamage: def.touch * world.difficulty.damage,
    seedDamage: def.seed * world.difficulty.damage * (world.difficulty.seedDamage ?? 1),
    color: def.color,
    glow: def.glow,
    dead: false,
    burrowed: false,
    hitFlash: 0,
    slowTimer: 0,
    slowFactor: 1,
    seedCooldown: 0,
    state: 'enter',
    stateTimer: 1.3,
    attackTimer: 2.2,
    attackIndex: 0,
    fireTimer: 0,
    phase: 1,
    lastPhase: 1,
    spin: 0,
    bob: world.rng.next() * TAU,
  };
  world.boss = boss;
  if (world.audio) world.audio.play('bossRoar');
  burst(world.particles, world.rng, boss.x, boss.y, def.color, 40, { speed: 300, life: 1.0, size: 4 });
  addRing(world.particles, boss.x, boss.y, 10, 260, 'rgba(255,135,224,0.7)', 0.9, 6);
  world.camera.shake = Math.max(world.camera.shake, 12);
  world.camera.flash = Math.max(world.camera.flash, 0.7);
  world.camera.flashColor = 'rgba(180,60,230,1)';
  return boss;
}

function aimAt(world, boss, target) {
  return Math.atan2(target.y - boss.y, target.x - boss.x);
}

function bulletDamage(world, base) {
  return base * world.difficulty.damage;
}

function brambleAttack(world, boss, index) {
  const warden = world.warden;
  if (index % 3 === 0) {
    for (let i = 0; i < 5; i += 1) {
      const angle = world.rng.next() * TAU;
      const distance = i === 0 ? 0 : 50 + world.rng.next() * 120;
      spawnHazard(world, {
        type: 'circle',
        x: warden.x + Math.cos(angle) * distance,
        y: warden.y + Math.sin(angle) * distance,
        radius: 44,
        delay: 0.75 + i * 0.09,
        life: 0.3,
        damage: bulletDamage(world, 12),
        target: 'warden',
        color: '#c77bff',
      });
    }
    world.audio?.play('dash');
  } else if (index % 3 === 1) {
    boss.state = 'windup';
    boss.stateTimer = 0.7;
    boss.angle = aimAt(world, boss, warden);
    addArc(world.particles, boss.x, boss.y, warden.x, warden.y, 'rgba(255,91,74,0.55)', 0.7);
  } else {
    bulletRing(world, boss.x, boss.y, 16, 165, {
      radius: 7,
      damage: bulletDamage(world, 9),
      color: '#d59bff',
      kind: 'thorn',
      life: 4.4,
    });
    const angle = aimAt(world, boss, warden);
    aimedFan(world, boss.x, boss.y, angle, 3, 0.3, 230, {
      radius: 7,
      damage: bulletDamage(world, 9),
      color: '#ff9bf0',
      kind: 'thorn',
      life: 3.4,
    });
  }
}

function tyrantAttack(world, boss, index) {
  const warden = world.warden;
  const mode = index % 3;
  if (mode === 0) {
    for (let burstIndex = 0; burstIndex < 3; burstIndex += 1) {
      const angle = aimAt(world, boss, warden) + (burstIndex - 1) * 0.24;
      aimedFan(world, boss.x, boss.y, angle, 5, 0.72, 195 + burstIndex * 22, {
        radius: 8,
        damage: bulletDamage(world, 9),
        color: '#e5c9ff',
        kind: 'spore',
        life: 4.5,
        wobble: burstIndex * 2,
      });
    }
  } else if (mode === 1) {
    sporeRing(world, boss.x, boss.y, { count: 22, speed: 88, damage: bulletDamage(world, 7), color: '#b388ff' });
    world.camera.shake = Math.max(world.camera.shake, 5);
  } else {
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * TAU + world.rng.next();
      const distance = 110;
      const x = Math.max(ARENA.left + 40, Math.min(ARENA.right - 40, boss.x + Math.cos(angle) * distance));
      const y = Math.max(ARENA.top + 50, Math.min(ARENA.bottom - 50, boss.y + Math.sin(angle) * distance));
      const kind = i === 0 ? 'splitter' : 'mini';
      world.spawnEnemy(kind, x, y, world.wave >= 9 && i === 0);
      addArc(world.particles, boss.x, boss.y, x, y, 'rgba(179,136,255,0.5)', 0.4);
    }
    world.audio?.play('bossRoar');
  }
}

function crownAttack(world, boss, index) {
  const warden = world.warden;
  const phase = boss.phase;
  const mode = (index + phase) % 4;
  if (mode === 0) {
    const count = 18 + phase * 4;
    bulletRing(world, boss.x, boss.y, count, 150 + phase * 18, {
      radius: 7,
      damage: bulletDamage(world, 8),
      color: '#ff87e0',
      kind: 'spore',
      life: 5.4,
      offset: boss.spin,
    });
    bulletRing(world, boss.x, boss.y, Math.round(count / 2), 105, {
      radius: 9,
      damage: bulletDamage(world, 7),
      color: '#ffd0f4',
      kind: 'spore',
      life: 5.8,
      offset: -boss.spin * 0.7,
    });
    boss.spin += 0.4;
  } else if (mode === 1) {
    boss.state = 'spiral';
    boss.stateTimer = 1.3 + phase * 0.25;
    boss.fireTimer = 0;
    boss.spin = world.rng.next() * TAU;
  } else if (mode === 2) {
    const angle = aimAt(world, boss, warden);
    for (let i = 0; i < (phase >= 3 ? 3 : 2); i += 1) {
      const sweep = (i - (phase >= 3 ? 1 : 0.5)) * 0.36;
      const length = 900;
      spawnHazard(world, {
        type: 'beam',
        x: boss.x,
        y: boss.y,
        x2: boss.x + Math.cos(angle + sweep) * length,
        y2: boss.y + Math.sin(angle + sweep) * length,
        width: 24 + phase * 4,
        delay: 0.95,
        life: 0.32,
        damage: bulletDamage(world, 18),
        target: 'warden',
        color: '#ff5b4a',
      });
    }
    world.audio?.play('bossRoar');
  } else {
    const summons = phase >= 3 ? 3 : 2;
    for (let i = 0; i < summons; i += 1) {
      const angle = (i / summons) * TAU + world.rng.next();
      const x = Math.max(ARENA.left + 40, Math.min(ARENA.right - 40, boss.x + Math.cos(angle) * 140));
      const y = Math.max(ARENA.top + 50, Math.min(ARENA.bottom - 50, boss.y + Math.sin(angle) * 120));
      world.spawnEnemy(i % 2 === 0 ? 'shade' : 'splitter', x, y, phase >= 2);
      addArc(world.particles, boss.x, boss.y, x, y, 'rgba(255,135,224,0.6)', 0.4);
    }
  }
}

function transitionPhase(world, boss) {
  world.camera.shake = Math.max(world.camera.shake, 14);
  world.camera.flash = Math.max(world.camera.flash, 0.65);
  world.camera.flashColor = 'rgba(255,215,106,1)';
  world.camera.hitStop = Math.max(world.camera.hitStop, 0.1);
  addRing(world.particles, boss.x, boss.y, boss.r, 320, 'rgba(255,215,106,0.85)', 0.9, 7);
  burst(world.particles, world.rng, boss.x, boss.y, '#ffd76a', 34, { speed: 280, life: 1, size: 4 });
  bulletRing(world, boss.x, boss.y, 20, 135, {
    radius: 7, damage: bulletDamage(world, 8), color: '#ffd0f4', kind: 'spore', life: 4,
  });
  world.audio?.play('bossRoar');
}

function moveFloat(world, boss, dt) {
  const time = world.time;
  if (boss.type === 'tyrant') {
    const wantedX = 640 + Math.cos(time * 0.42) * 250;
    const wantedY = 198 + Math.sin(time * 0.7 + boss.bob) * 32;
    boss.x += (wantedX - boss.x) * Math.min(1, dt * 1.3);
    boss.y += (wantedY - boss.y) * Math.min(1, dt * 1.3);
  } else if (boss.type === 'crown') {
    const wantedX = 640 + Math.sin(time * 0.34 + boss.bob) * 130;
    const wantedY = 216 + Math.cos(time * 0.55) * 30;
    boss.x += (wantedX - boss.x) * Math.min(1, dt * 1.2);
    boss.y += (wantedY - boss.y) * Math.min(1, dt * 1.2);
  } else {
    const wantedX = world.starseed.x;
    const wantedY = world.starseed.y;
    const dx = wantedX - boss.x;
    const dy = wantedY - boss.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 180) {
      boss.x += (dx / distance) * 28 * dt;
      boss.y += (dy / distance) * 28 * dt;
    }
  }
  boss.x = Math.max(ARENA.left + boss.r, Math.min(ARENA.right - boss.r, boss.x));
  boss.y = Math.max(ARENA.top + boss.r, Math.min(ARENA.bottom - boss.r, boss.y));
}

export function updateBoss(world, dt) {
  const boss = world.boss;
  if (!boss || boss.dead) return;
  boss.hitFlash = Math.max(0, boss.hitFlash - dt);
  boss.spin += dt * 0.5;

  if (boss.type === 'crown') {
    const fraction = boss.hp / boss.maxHp;
    const phase = fraction > 0.66 ? 1 : fraction > 0.33 ? 2 : 3;
    if (phase !== boss.lastPhase) {
      boss.phase = phase;
      boss.lastPhase = phase;
      transitionPhase(world, boss);
    }
  }

  if (boss.state === 'enter') {
    boss.stateTimer -= dt;
    if (boss.stateTimer <= 0) {
      boss.state = 'idle';
      boss.attackTimer = 1.2;
    }
    return;
  }

  if (boss.state === 'windup') {
    boss.stateTimer -= dt;
    const warden = world.warden;
    boss.angle = Math.atan2(warden.y - boss.y, warden.x - boss.x);
    if (boss.stateTimer <= 0) {
      boss.state = 'charge';
      boss.stateTimer = 0.72;
      boss.fireTimer = 0;
      world.audio?.play('bossRoar');
    }
    return;
  }

  if (boss.state === 'charge') {
    boss.stateTimer -= dt;
    boss.x += Math.cos(boss.angle) * 640 * dt;
    boss.y += Math.sin(boss.angle) * 640 * dt;
    boss.x = Math.max(ARENA.left + boss.r, Math.min(ARENA.right - boss.r, boss.x));
    boss.y = Math.max(ARENA.top + boss.r, Math.min(ARENA.bottom - boss.r, boss.y));
    if (world.rng.next() < 0.5) {
      burst(world.particles, world.rng, boss.x, boss.y, '#a44bf0', 2, { speed: 80, life: 0.35, size: 4 });
    }
    if (boss.stateTimer <= 0) {
      boss.state = 'idle';
      boss.attackTimer = 1.7;
    }
    return;
  }

  if (boss.state === 'spiral') {
    boss.stateTimer -= dt;
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      boss.fireTimer = boss.phase >= 3 ? 0.06 : 0.09;
      boss.spin += 0.42;
      const arms = boss.phase >= 2 ? 3 : 2;
      for (let arm = 0; arm < arms; arm += 1) {
        spawnBullet(world, boss.x, boss.y, boss.spin + (arm / arms) * TAU, 165, {
          radius: 6, damage: bulletDamage(world, 7), color: '#ff9bf0', kind: 'spore', life: 4.6,
        });
      }
    }
    if (boss.stateTimer <= 0) {
      boss.state = 'idle';
      boss.attackTimer = 1.3;
    }
    return;
  }

  moveFloat(world, boss, dt);
  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    boss.attackTimer = boss.type === 'bramble' ? 2.15 : boss.type === 'tyrant' ? 1.85 : Math.max(0.95, 1.5 - boss.phase * 0.14);
    const index = boss.attackIndex;
    boss.attackIndex += 1;
    if (boss.type === 'bramble') brambleAttack(world, boss, index);
    else if (boss.type === 'tyrant') tyrantAttack(world, boss, index);
    else crownAttack(world, boss, index);
  }
}
