// Collisions and damage bookkeeping; one place for hit feedback, kills, slows and area damage.
import { FEEL, PLAYER } from './config.js';
import { addArc, addNumber, addRing, burst } from './particles.js';
import { awardKill, registerHit } from './scoring.js';

function play(world, name) {
  if (world.audio) world.audio.play(name);
}

export function hurtWarden(world, amount, sourceX, sourceY, kind = 'hit') {
  const warden = world.warden;
  if (world.outcome || warden.hp <= 0) return false;
  if (warden.invulnerable > 0) return false;
  const damage = Math.max(1, Math.round(amount));
  warden.hp = Math.max(0, warden.hp - damage);
  warden.invulnerable = PLAYER.hitInvulnerable;
  warden.hitFlash = 0.22;
  world.score.combo = 0;
  world.score.comboTimer = 0;
  addNumber(world.particles, warden.x, warden.y - 18, `-${damage}`, '#ff8fa3', 20);
  burst(world.particles, world.rng, warden.x, warden.y, '#ff8fa3', 12, { speed: 150, life: 0.5, size: 3 });
  addRing(world.particles, warden.x, warden.y, 10, 46, 'rgba(255,107,138,0.7)', 0.35, 3);
  world.camera.shake = Math.max(world.camera.shake, FEEL.shakePlayer);
  world.camera.flash = Math.max(world.camera.flash, 0.55);
  world.camera.flashColor = 'rgba(255,80,110,1)';
  world.camera.hitStop = Math.max(world.camera.hitStop, 0.05);
  play(world, 'playerHurt');
  if (kind === 'seed' && world.audio) play(world, 'seedHurt');
  if (warden.hp <= 0) world.lose('warden');
  return true;
}

export function hurtStarseed(world, amount) {
  const seed = world.starseed;
  if (world.outcome || seed.hp <= 0) return false;
  if (seed.shield > 0) {
    seed.shield -= 1;
    seed.shieldTimer = Math.max(3, seed.shieldInterval);
    seed.hurtFlash = 0.25;
    addRing(world.particles, seed.x, seed.y, seed.r, seed.r + 80, 'rgba(126,200,255,0.85)', 0.6, 5);
    burst(world.particles, world.rng, seed.x, seed.y, '#7ec8ff', 18, { speed: 190, life: 0.7, size: 3.5 });
    world.camera.shake = Math.max(world.camera.shake, 7);
    play(world, 'seedHurt');
    return true;
  }
  const damage = Math.max(1, Math.round(amount));
  seed.hp = Math.max(0, seed.hp - damage);
  world.seedDamageTaken += damage;
  seed.hurtFlash = 0.35;
  addNumber(world.particles, seed.x, seed.y - 44, `-${damage}`, '#ffcf5a', 20);
  burst(world.particles, world.rng, seed.x, seed.y, '#ffcf5a', 10, { speed: 130, life: 0.6, size: 3 });
  world.camera.shake = Math.max(world.camera.shake, 5);
  play(world, 'seedHurt');
  if (seed.hp <= 0) world.lose('seed');
  return true;
}

export function damageEnemy(world, enemy, amount, options = {}) {
  if (!enemy || enemy.dead || enemy.burrowed) return 0;
  const damage = Math.max(1, Math.round(amount));
  enemy.hp -= damage;
  enemy.hitFlash = 0.12;
  if (options.slow) {
    enemy.slowTimer = Math.max(enemy.slowTimer, options.slowTime ?? 1.6);
    enemy.slowFactor = Math.min(enemy.slowFactor ?? 1, options.slow);
  }
  if (!options.silent) {
    const crit = Boolean(options.crit);
    addNumber(
      world.particles,
      enemy.x,
      enemy.y - enemy.r - 6,
      crit ? `${damage}!` : `${damage}`,
      crit ? '#ffe28a' : '#e9fff8',
      crit ? 22 : 15,
      { key: enemy.id, amount: damage, crit },
    );
    burst(world.particles, world.rng, enemy.x, enemy.y, crit ? '#ffe28a' : enemy.glow ?? '#e05aff', crit ? 9 : 4, {
      speed: crit ? 210 : 120,
      life: 0.32,
      size: crit ? 3.4 : 2.2,
    });
  }
  if (enemy.hp <= 0) killEnemy(world, enemy, options);
  return damage;
}

function killEnemy(world, enemy, options) {
  if (enemy.dead) return;
  enemy.dead = true;
  if (enemy.isBoss) {
    world.bossCleared(enemy);
    return;
  }
  const points = awardKill(world.score, enemy.kind, enemy.elite, world.difficulty, world.wave);
  burst(world.particles, world.rng, enemy.x, enemy.y, enemy.color, enemy.elite ? 26 : 16, {
    speed: enemy.elite ? 260 : 190,
    life: 0.7,
    size: 3.2,
  });
  burst(world.particles, world.rng, enemy.x, enemy.y, '#2a1038', Math.round((enemy.elite ? 12 : 7)), {
    speed: 120,
    life: 0.9,
    size: 5,
    shape: 'shard',
  });
  addRing(world.particles, enemy.x, enemy.y, enemy.r, enemy.r + (enemy.elite ? 60 : 34), enemy.elite ? 'rgba(255,215,106,0.75)' : 'rgba(224,90,255,0.55)', 0.4, enemy.elite ? 4 : 2.5);
  addNumber(world.particles, enemy.x, enemy.y - enemy.r - 20, `+${Math.round(points)}`, enemy.elite ? '#ffe28a' : '#b6ffe6', enemy.elite ? 18 : 14);
  const motes = (enemy.kind === 'splitter' ? 2 : 1) + (enemy.elite ? 2 : 0) + (world.mods.satchel > 0 ? 1 : 0);
  world.dropPollen(enemy.x, enemy.y, motes, enemy.elite);
  play(world, 'kill');
  world.camera.shake = Math.max(world.camera.shake, FEEL.shakeKill + (enemy.elite ? 3 : 0));
  if (world.mods.lifesteal > 0) {
    const heal = Math.min(world.warden.maxHp, world.warden.hp + 2 * world.mods.lifesteal);
    if (heal > world.warden.hp) {
      world.warden.hp = heal;
      addNumber(world.particles, world.warden.x, world.warden.y - 24, '+2', '#78f0b8', 14);
    }
  }
  if (enemy.kind === 'splitter') {
    const offset = enemy.r + 8;
    world.spawnEnemy('mini', enemy.x - offset, enemy.y, false);
    world.spawnEnemy('mini', enemy.x + offset, enemy.y, false);
  }
  if (options.crit) {
    world.camera.hitStop = Math.max(world.camera.hitStop, FEEL.hitStop);
  }
}

function ricochetTarget(world, dart, from) {
  let best = null;
  let bestDistance = 280 * 280;
  const consider = (candidate) => {
    if (!candidate || candidate.dead || candidate.burrowed || candidate === from) return;
    if (dart.hitIds.has(candidate.id)) return;
    const distance = (candidate.x - dart.x) ** 2 + (candidate.y - dart.y) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  };
  for (const enemy of world.enemies) consider(enemy);
  if (world.boss) consider(world.boss);
  return best;
}

export function resolveDarts(world) {
  const darts = world.darts;
  for (let d = 0; d < darts.length; d += 1) {
    const dart = darts[d];
    if (dart.life <= 0) continue;
    let consumed = false;
    const hitOne = (enemy) => {
      if (!enemy || enemy.dead || enemy.burrowed || dart.hitIds.has(enemy.id)) return false;
      const reach = dart.r + enemy.r;
      if ((enemy.x - dart.x) ** 2 + (enemy.y - dart.y) ** 2 > reach * reach) return false;
      dart.hitIds.add(enemy.id);
      if (!dart.hasHit) {
        dart.hasHit = true;
        registerHit(world.score);
      }
      const crit = dart.critChance > 0 && world.rng.chance(dart.critChance);
      const damage = Math.round(dart.damage * (crit ? 2 : 1));
      damageEnemy(world, enemy, damage, {
        crit,
        slow: dart.frost > 0 ? Math.min(0.62, 0.28 + 0.1 * (dart.frost - 1)) : 0,
      });
      if (dart.frost > 0) {
        world.camera.shake = Math.max(world.camera.shake, 1.5);
      }
      if (dart.chain > 0) {
        let arcTarget = null;
        let bestDistance = 190 * 190;
        const chainFrom = (candidate) => {
          if (!candidate || candidate.dead || candidate.burrowed || candidate === enemy || dart.hitIds.has(candidate.id)) return;
          const distance = (candidate.x - enemy.x) ** 2 + (candidate.y - enemy.y) ** 2;
          if (distance < bestDistance) {
            bestDistance = distance;
            arcTarget = candidate;
          }
        };
        for (const other of world.enemies) chainFrom(other);
        if (world.boss) chainFrom(world.boss);
        if (arcTarget) {
          const chainSlow = dart.frost > 0 ? Math.min(0.62, 0.28 + 0.1 * (dart.frost - 1)) : 0;
          damageEnemy(world, arcTarget, Math.round(dart.damage * (0.42 + 0.08 * dart.chain)), {
            silent: true,
            slow: chainSlow,
            slowTime: 1.2,
          });
          addArc(
            world.particles,
            enemy.x, enemy.y, arcTarget.x, arcTarget.y,
            dart.frost > 0 ? 'rgba(174,238,255,0.95)' : 'rgba(126,232,255,0.95)',
            0.14,
          );
          burst(world.particles, world.rng, arcTarget.x, arcTarget.y, dart.frost > 0 ? '#b6f4ff' : '#7ee8ff', 4, { speed: 90, life: 0.25, size: 2 });
        }
      }
      play(world, 'hit');
      if (dart.ricochets > 0 && !enemy.dead) {
        const next = ricochetTarget(world, dart, enemy);
        if (next) {
          dart.ricochets -= 1;
          dart.x = enemy.x;
          dart.y = enemy.y;
          const angle = Math.atan2(next.y - enemy.y, next.x - enemy.x);
          const speed = Math.hypot(dart.vx, dart.vy);
          dart.vx = Math.cos(angle) * speed;
          dart.vy = Math.sin(angle) * speed;
          dart.angle = angle;
          addArc(world.particles, enemy.x, enemy.y, next.x, next.y, 'rgba(255,255,255,0.6)', 0.1);
          return false;
        }
      }
      if (dart.pierce > 0) {
        dart.pierce -= 1;
        return false;
      }
      dart.life = 0;
      consumed = true;
      return true;
    };
    for (let i = 0; i < world.enemies.length; i += 1) {
      if (hitOne(world.enemies[i])) break;
    }
    if (!consumed && world.boss) hitOne(world.boss);
  }
}

export function resolveBullets(world) {
  const bullets = world.bullets;
  const warden = world.warden;
  const seed = world.starseed;
  let write = 0;
  for (let i = 0; i < bullets.length; i += 1) {
    const bullet = bullets[i];
    const hitWarden = warden.hp > 0 && warden.invulnerable <= 0
      && (bullet.x - warden.x) ** 2 + (bullet.y - warden.y) ** 2 < (bullet.r + warden.r) ** 2;
    if (hitWarden) {
      hurtWarden(world, bullet.damage, bullet.x, bullet.y, bullet.kind);
      continue;
    }
    const hitSeed = seed.hp > 0 && (bullet.x - seed.x) ** 2 + (bullet.y - seed.y) ** 2 < (bullet.r + seed.r) ** 2;
    // Enemies do not shoot their own Starseed target, but stray shots still bruise it.
    if (hitSeed && bullet.target === 'seed') {
      hurtStarseed(world, bullet.damage);
      continue;
    }
    if (hitSeed && bullet.kind === 'spore') {
      hurtStarseed(world, bullet.damage * 0.5);
      continue;
    }
    bullets[write] = bullet;
    write += 1;
  }
  bullets.length = write;
}

export function resolveBodies(world) {
  const warden = world.warden;
  const seed = world.starseed;
  for (const enemy of world.enemies) {
    if (enemy.dead || enemy.burrowed) continue;
    enemy.seedCooldown = Math.max(0, (enemy.seedCooldown ?? 0) - 1 / 60);
    const reachW = (enemy.x - warden.x) ** 2 + (enemy.y - warden.y) ** 2;
    if (reachW < (enemy.r + warden.r) ** 2) {
      hurtWarden(world, enemy.touchDamage, enemy.x, enemy.y, enemy.kind);
    }
    const reachS = (enemy.x - seed.x) ** 2 + (enemy.y - seed.y) ** 2;
    if (reachS < (enemy.r + seed.r) ** 2 && enemy.seedCooldown <= 0) {
      enemy.seedCooldown = 1.1;
      hurtStarseed(world, enemy.seedDamage);
      burst(world.particles, world.rng, enemy.x, enemy.y, '#ffcf5a', 5, { speed: 80, life: 0.35, size: 2.4 });
    }
  }
  const boss = world.boss;
  if (boss && !boss.dead) {
    const dx = boss.x - warden.x;
    const dy = boss.y - warden.y;
    if (dx * dx + dy * dy < (boss.r + warden.r) ** 2) {
      hurtWarden(world, boss.touchDamage, boss.x, boss.y, 'boss');
    }
    const sx = boss.x - seed.x;
    const sy = boss.y - seed.y;
    boss.seedCooldown = Math.max(0, (boss.seedCooldown ?? 0) - 1 / 60);
    if (sx * sx + sy * sy < (boss.r + seed.r) ** 2 && boss.seedCooldown <= 0) {
      boss.seedCooldown = 0.8;
      hurtStarseed(world, boss.seedDamage);
    }
  }
}

/** Used by Bloom and the dash trail for an area hit; returns how many creatures were struck. */
export function damageInRadius(world, x, y, radius, damage, options = {}) {
  let hits = 0;
  for (const enemy of world.enemies) {
    if (enemy.dead || enemy.burrowed) continue;
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (distance < radius + enemy.r) {
      damageEnemy(world, enemy, damage, options);
      hits += 1;
    }
  }
  if (world.boss && !world.boss.dead) {
    const distance = Math.hypot(world.boss.x - x, world.boss.y - y);
    if (distance < radius + world.boss.r) {
      damageEnemy(world, world.boss, damage, options);
      hits += 1;
    }
  }
  return hits;
}
