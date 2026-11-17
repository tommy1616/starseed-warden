// Flying things and boss telegraphs: movement here, hit resolution in combat.js.
import { ARENA, FIELD, PLAYER } from './config.js';
import { addParticle } from './particles.js';
import { hurtWarden, hurtStarseed } from './combat.js';

const TAU = Math.PI * 2;

export function spawnDart(world, x, y, angle, options = {}) {
  const warden = world.warden;
  const speed = options.speed ?? PLAYER.dartSpeed;
  const damage = options.damage ?? warden.dartDamage;
  world.darts.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: options.radius ?? warden.dartRadius,
    damage,
    pierce: options.pierce ?? warden.pierce,
    life: PLAYER.dartLife,
    homing: options.homing ?? warden.homing,
    frost: options.frost ?? warden.frost,
    chain: options.chain ?? warden.chain,
    ricochets: options.ricochets ?? warden.ricochet,
    critChance: options.critChance ?? warden.critChance,
    angle,
    hitIds: new Set(),
    trail: 0,
  });
}

export function spawnBullet(world, x, y, angle, speed, options = {}) {
  world.bullets.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: options.radius ?? 6,
    damage: options.damage ?? 9,
    life: options.life ?? 5.5,
    color: options.color ?? '#ff87e0',
    kind: options.kind ?? 'thorn',
    homing: options.homing ?? 0,
    target: options.target ?? 'warden',
    wobble: options.wobble ?? 0,
    angle,
    age: 0,
    trail: 0,
  });
}

export function bulletRing(world, x, y, count, speed, options = {}) {
  const offset = options.offset ?? world.rng.next() * TAU;
  for (let i = 0; i < count; i += 1) {
    spawnBullet(world, x, y, offset + (i / count) * TAU, speed, options);
  }
}

/** A telegraph that becomes a burst or a beam. Nothing hurts until `delay` has passed. */
export function spawnHazard(world, hazard) {
  world.hazards.push({
    type: 'circle',
    x: 0, y: 0, x2: 0, y2: 0,
    radius: 34,
    delay: 0.8,
    life: 0.28,
    damage: 12,
    width: 18,
    target: 'warden',
    color: '#ff5b4a',
    tick: 0,
    hit: false,
    ...hazard,
  });
}

function nearestTarget(world, x, y, boss) {
  const warden = world.warden;
  const seed = world.starseed;
  const dw = (warden.x - x) ** 2 + (warden.y - y) ** 2;
  const ds = (seed.x - x) ** 2 + (seed.y - y) ** 2;
  return dw <= ds ? { x: warden.x, y: warden.y } : { x: seed.x, y: seed.y };
}

export function updateDarts(world, dt) {
  const darts = world.darts;
  let write = 0;
  for (let i = 0; i < darts.length; i += 1) {
    const dart = darts[i];
    dart.life -= dt;
    if (dart.life <= 0) continue;
    if (dart.homing > 0) {
      const target = nearestTarget(world, dart.x, dart.y);
      const wanted = Math.atan2(target.y - dart.y, target.x - dart.x);
      let diff = wanted - dart.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      dart.angle += Math.max(-3.4 * dt, Math.min(3.4 * dt, diff)) * (0.7 + dart.homing * 0.45);
      const speed = Math.hypot(dart.vx, dart.vy);
      dart.vx = Math.cos(dart.angle) * speed;
      dart.vy = Math.sin(dart.angle) * speed;
    }
    dart.x += dart.vx * dt;
    dart.y += dart.vy * dt;
    dart.trail -= dt;
    if (dart.trail <= 0) {
      dart.trail = 0.035;
      addParticle(world.particles, dart.x, dart.y, 0, 0, 0.22, dart.r * 0.55, 'rgba(169,255,232,0.55)', { drag: 6, glow: true });
    }
    if (dart.x < ARENA.left - 40 || dart.x > ARENA.right + 40 || dart.y < ARENA.top - 40 || dart.y > ARENA.bottom + 40) continue;
    darts[write] = dart;
    write += 1;
  }
  darts.length = write;
}

export function updateBullets(world, dt) {
  const bullets = world.bullets;
  let write = 0;
  for (let i = 0; i < bullets.length; i += 1) {
    const bullet = bullets[i];
    bullet.life -= dt;
    bullet.age += dt;
    if (bullet.life <= 0) continue;
    if (bullet.homing > 0) {
      const target = bullet.target === 'seed' ? world.starseed : world.warden;
      const wanted = Math.atan2(target.y - bullet.y, target.x - bullet.x);
      let diff = wanted - bullet.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      bullet.angle += Math.max(-bullet.homing * dt, Math.min(bullet.homing * dt, diff));
      const speed = Math.hypot(bullet.vx, bullet.vy);
      bullet.vx = Math.cos(bullet.angle) * speed;
      bullet.vy = Math.sin(bullet.angle) * speed;
    }
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.wobble > 0) {
      const perp = bullet.angle + Math.PI / 2;
      const sway = Math.sin(bullet.age * 9 + bullet.wobble) * 20 * dt;
      bullet.x += Math.cos(perp) * sway;
      bullet.y += Math.sin(perp) * sway;
    }
    bullet.trail -= dt;
    if (bullet.trail <= 0) {
      bullet.trail = 0.08;
      addParticle(world.particles, bullet.x, bullet.y, 0, 0, 0.24, bullet.r * 0.6, bullet.color, { drag: 5, glow: true });
    }
    if (bullet.x < ARENA.left - 60 || bullet.x > ARENA.right + 60 || bullet.y < ARENA.top - 60 || bullet.y > ARENA.bottom + 60) continue;
    bullets[write] = bullet;
    write += 1;
  }
  bullets.length = write;
}

function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function updateHazards(world, dt) {
  const hazards = world.hazards;
  let write = 0;
  for (let i = 0; i < hazards.length; i += 1) {
    const hazard = hazards[i];
    if (hazard.delay > 0) {
      hazard.delay -= dt;
      if (hazard.delay <= 0) {
        if (hazard.type === 'circle') {
          hazard.hit = true;
          hurtHazardTargets(world, hazard, hazard.damage);
          addParticle(world.particles, hazard.x, hazard.y, 0, 0, 0.3, hazard.radius, 'rgba(255,91,74,0.18)', { drag: 8, glow: true });
        }
      }
      hazards[write] = hazard;
      write += 1;
      continue;
    }
    hazard.life -= dt;
    if (hazard.life <= 0) continue;
    if (hazard.type === 'beam') {
      hazard.tick -= dt;
      if (hazard.tick <= 0) {
        hazard.tick = 0.12;
        const warden = world.warden;
        const distance = pointSegmentDistance(warden.x, warden.y, hazard.x, hazard.y, hazard.x2, hazard.y2);
        if (distance < hazard.width / 2 + warden.r && warden.invulnerable <= 0) {
          hurtWarden(world, hazard.damage, hazard.x2, hazard.y2, 'beam');
        }
      }
    }
    hazards[write] = hazard;
    write += 1;
  }
  hazards.length = write;
}

function hurtHazardTargets(world, hazard, damage) {
  const warden = world.warden;
  const seed = world.starseed;
  const reach = hazard.radius;
  if ((hazard.target === 'both' || hazard.target === 'warden') && Math.hypot(warden.x - hazard.x, warden.y - hazard.y) < reach + warden.r) {
    hurtWarden(world, damage, hazard.x, hazard.y, hazard.type);
  }
  if ((hazard.target === 'both' || hazard.target === 'seed') && Math.hypot(seed.x - hazard.x, seed.y - hazard.y) < reach + seed.r) {
    hurtStarseed(world, damage);
  }
}

/** A slow, expanding wall of spores: called on a timer by the bosses. */
export function sporeRing(world, x, y, options = {}) {
  const count = options.count ?? 18;
  const speed = options.speed ?? 95;
  const offset = world.rng.next() * TAU;
  for (let i = 0; i < count; i += 1) {
    const angle = offset + (i / count) * TAU;
    spawnBullet(world, x, y, angle, speed, {
      radius: 8,
      damage: options.damage ?? 8,
      color: options.color ?? '#b388ff',
      kind: 'spore',
      life: 6,
      wobble: i,
    });
  }
}

/** Aimed fan used by the Spore Tyrant and the Withering Crown. */
export function aimedFan(world, x, y, angle, count, spread, speed, options = {}) {
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
    spawnBullet(world, x, y, angle + t, speed, options);
  }
}

export function offscreenCull(bullets) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    if (b.x < -80 || b.x > FIELD.width + 80 || b.y < -80 || b.y > FIELD.height + 80) bullets.splice(i, 1);
  }
}
