// The Warden's body and kit: movement, the invulnerable dash, seed-dart volleys, Bloom, and
// the passive effects upgrades add (orbiting petals, thorn aura, dash trail, lingering bloom).
// All tunables come from config.js and the run's modifier counts, so upgrade stacks compose.
import { ARENA, FEEL, PLAYER } from './config.js';
import { addAfterimage, addNumber, addParticle, addRing, burst } from './particles.js';
import { spawnDart } from './projectiles.js';
import { registerShot } from './scoring.js';

const TAU = Math.PI * 2;

function clampWarden(warden) {
  warden.x = Math.max(ARENA.left + warden.r, Math.min(ARENA.right - warden.r, warden.x));
  warden.y = Math.max(ARENA.top + warden.r, Math.min(ARENA.bottom - warden.r, warden.y));
}

function aimVector(control, warden) {
  let dx = (control.aimX ?? warden.x) - warden.x;
  let dy = (control.aimY ?? warden.y - 100) - warden.y;
  const length = Math.hypot(dx, dy);
  if (length < 6) {
    dx = 0;
    dy = -1;
  } else {
    dx /= length;
    dy /= length;
  }
  return { x: dx, y: dy, angle: Math.atan2(dy, dx) };
}

function fireVolley(world, control) {
  const warden = world.warden;
  const mods = world.mods;
  const aim = aimVector(control, warden);
  const count = 1 + mods.multishot;
  const spread = count === 1 ? 0 : 0.09 + (count - 1) * 0.035;
  const damage = PLAYER.dartDamage * (1 + 0.28 * mods.heavy);
  const radius = PLAYER.dartRadius * (1 + 0.1 * mods.heavy);
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread * 2;
    const angle = aim.angle + offset;
    const muzzle = warden.r + 8;
    spawnDart(world, warden.x + Math.cos(angle) * muzzle, warden.y + Math.sin(angle) * muzzle, angle, {
      damage,
      radius,
      pierce: mods.pierce,
      homing: mods.homing,
      frost: mods.frost,
      chain: mods.chain,
      ricochets: mods.ricochet,
      critChance: mods.crit * 0.12,
    });
    for (let spark = 0; spark < 2; spark += 1) {
      addParticle(
        world.particles,
        warden.x + Math.cos(angle) * muzzle,
        warden.y + Math.sin(angle) * muzzle,
        Math.cos(angle + (world.rng.next() - 0.5) * 1.4) * 140,
        Math.sin(angle + (world.rng.next() - 0.5) * 1.4) * 140,
        0.22, 2.2, '#b6ffe6', { drag: 4 },
      );
    }
  }
  registerShot(world.score);
  warden.fireTimer = PLAYER.fireInterval / (1 + 0.16 * mods.rapid);
  world.audio?.play('shoot');
  warden.recoil = 0.08;
}

function startDash(world, control) {
  const warden = world.warden;
  const mods = world.mods;
  let dx = control.moveX ?? 0;
  let dy = control.moveY ?? 0;
  if (dx === 0 && dy === 0) {
    const aim = aimVector(control, warden);
    dx = aim.x;
    dy = aim.y;
  }
  const length = Math.hypot(dx, dy) || 1;
  warden.dashX = dx / length;
  warden.dashY = dy / length;
  warden.dashTimer = PLAYER.dashTime;
  warden.invulnerable = Math.max(warden.invulnerable, PLAYER.dashInvulnerable);
  warden.dashCooldown = PLAYER.dashCooldown * Math.pow(0.82, mods.flit);
  warden.trailTimer = 0;
  addRing(world.particles, warden.x, warden.y, 8, 48, 'rgba(182,255,230,0.8)', 0.3, 3);
  burst(world.particles, world.rng, warden.x, warden.y, '#b6ffe6', 10, { speed: 150, life: 0.35, size: 2.6 });
  world.camera.shake = Math.max(world.camera.shake, 2.4);
  world.audio?.play('dash');
}

function releaseBloom(world) {
  const warden = world.warden;
  const mods = world.mods;
  const radius = PLAYER.bloomRadius * (1 + 0.15 * mods.bloomPower);
  const damage = PLAYER.bloomDamage * (1 + 0.35 * mods.bloomPower);
  warden.bloom = 0;
  warden.bloomLock = PLAYER.bloomCooldown;
  world.damageInRadius(warden.x, warden.y, radius, damage, { crit: false });
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - warden.x;
    const dy = enemy.y - warden.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < radius + enemy.r) {
      enemy.x += (dx / distance) * 34;
      enemy.y += (dy / distance) * 34;
      enemy.slowTimer = Math.max(enemy.slowTimer, 1.1);
      enemy.slowFactor = Math.min(enemy.slowFactor, 0.6);
    }
  }
  let destroyed = 0;
  const bullets = world.bullets;
  let write = 0;
  for (let i = 0; i < bullets.length; i += 1) {
    const bullet = bullets[i];
    if (Math.hypot(bullet.x - warden.x, bullet.y - warden.y) < radius) {
      burst(world.particles, world.rng, bullet.x, bullet.y, '#b6ffe6', 3, { speed: 100, life: 0.3, size: 2 });
      destroyed += 1;
    } else {
      bullets[write] = bullet;
      write += 1;
    }
  }
  bullets.length = write;
  if (destroyed > 0) {
    addNumber(world.particles, warden.x, warden.y - 40, `BLOOM ×${destroyed}`, '#b6ffe6', 18);
  }
  addRing(world.particles, warden.x, warden.y, 14, radius, 'rgba(182,255,230,0.95)', 0.65, 8);
  addRing(world.particles, warden.x, warden.y, 8, radius * 0.7, 'rgba(255,215,106,0.7)', 0.5, 5);
  burst(world.particles, world.rng, warden.x, warden.y, '#b6ffe6', 40, { speed: 330, life: 0.9, size: 3.4 });
  burst(world.particles, world.rng, warden.x, warden.y, '#ffd76a', 18, { speed: 220, life: 1.0, size: 3 });
  world.camera.shake = Math.max(world.camera.shake, FEEL.shakeBloom);
  world.camera.flash = Math.max(world.camera.flash, 0.7);
  world.camera.flashColor = 'rgba(182,255,230,1)';
  world.camera.hitStop = Math.max(world.camera.hitStop, 0.07);
  world.audio?.play('bloom');
  if (mods.linger > 0) {
    world.lingerRings.push({ x: warden.x, y: warden.y, radius: radius * 0.82, life: 2.5, maxLife: 2.5, tick: 0 });
  }
}

function updatePassives(world, dt) {
  const warden = world.warden;
  const mods = world.mods;

  if (mods.orbit > 0) {
    warden.orbitAngle = (warden.orbitAngle + dt * 2.3) % TAU;
    world.petalTimer -= dt;
    if (world.petalTimer <= 0) {
      world.petalTimer = 0.22;
      const radius = 56;
      for (let p = 0; p < mods.orbit; p += 1) {
        const angle = warden.orbitAngle + (p / mods.orbit) * TAU;
        const px = warden.x + Math.cos(angle) * radius;
        const py = warden.y + Math.sin(angle) * radius;
        for (const enemy of world.enemies) {
          if (enemy.dead || enemy.burrowed || enemy.orbitCooldown > 0) continue;
          if (Math.hypot(enemy.x - px, enemy.y - py) < enemy.r + 11) {
            enemy.orbitCooldown = 0.3;
            world.damageEnemy(enemy, 7 * mods.orbit * (1 + world.wave * 0.03), {});
            addParticle(world.particles, px, py, 0, -20, 0.25, 3, '#8ff7c8', { drag: 3 });
          }
        }
        if (world.boss && !world.boss.dead && Math.hypot(world.boss.x - px, world.boss.y - py) < world.boss.r + 11) {
          if ((world.boss.orbitCooldown ?? 0) <= 0) {
            world.boss.orbitCooldown = 0.3;
            world.damageEnemy(world.boss, 7 * mods.orbit, { silent: true });
          }
        }
      }
    }
    for (const enemy of world.enemies) enemy.orbitCooldown = Math.max(0, (enemy.orbitCooldown ?? 0) - dt);
    if (world.boss) world.boss.orbitCooldown = Math.max(0, (world.boss.orbitCooldown ?? 0) - dt);
  }

  if (mods.thorn > 0) {
    warden.thornTimer -= dt;
    if (warden.thornTimer <= 0) {
      warden.thornTimer = 0.5;
      const radius = 66 + mods.thorn * 10;
      world.damageInRadius(warden.x, warden.y, radius, 11 * mods.thorn * (1 + world.wave * 0.03), { silent: false });
      addRing(world.particles, warden.x, warden.y, radius * 0.6, radius, 'rgba(164,75,240,0.5)', 0.3, 3);
    }
  }

  const trails = world.trails;
  let write = 0;
  for (let i = 0; i < trails.length; i += 1) {
    const trail = trails[i];
    trail.life -= dt;
    if (trail.life <= 0) continue;
    trail.tick -= dt;
    if (trail.tick <= 0) {
      trail.tick = 0.3;
      world.damageInRadius(trail.x, trail.y, trail.r, 7 * trail.power, { silent: true });
    }
    trails[write] = trail;
    write += 1;
  }
  trails.length = write;

  const rings = world.lingerRings;
  write = 0;
  for (let i = 0; i < rings.length; i += 1) {
    const ring = rings[i];
    ring.life -= dt;
    if (ring.life <= 0) continue;
    ring.tick -= dt;
    if (ring.tick <= 0) {
      ring.tick = 0.25;
      world.damageInRadius(ring.x, ring.y, ring.radius, 12 * (1 + 0.15 * world.mods.bloomPower), { silent: true });
    }
    rings[write] = ring;
    write += 1;
  }
  rings.length = write;
}

export function updatePlayer(world, dt, control) {
  const warden = world.warden;
  const mods = world.mods;
  const dtClamped = Math.min(dt, 0.05);
  warden.invulnerable = Math.max(0, warden.invulnerable - dtClamped);
  warden.hitFlash = Math.max(0, warden.hitFlash - dtClamped);
  warden.fireTimer = Math.max(0, warden.fireTimer - dtClamped);
  warden.dashCooldown = Math.max(0, warden.dashCooldown - dtClamped);
  warden.bloomLock = Math.max(0, warden.bloomLock - dtClamped);
  warden.recoil = Math.max(0, warden.recoil - dtClamped * 6);

  if (world.outcome) return;

  const aim = aimVector(control, warden);
  warden.aimAngle = aim.angle;
  warden.aimX = Number.isFinite(control.aimX) ? control.aimX : warden.x;
  warden.aimY = Number.isFinite(control.aimY) ? control.aimY : warden.y - 120;

  if (control.dash && warden.dashCooldown <= 0 && warden.dashTimer <= 0) startDash(world, control);

  if (warden.dashTimer > 0) {
    warden.dashTimer -= dtClamped;
    warden.x += warden.dashX * PLAYER.dashSpeed * dtClamped;
    warden.y += warden.dashY * PLAYER.dashSpeed * dtClamped;
    warden.trailTimer -= dtClamped;
    if (warden.trailTimer <= 0) {
      warden.trailTimer = 0.035;
      addAfterimage(world.particles, warden.x, warden.y, warden.r, aim.angle);
      if (mods.dashTrail > 0) {
        world.trails.push({
          x: warden.x, y: warden.y, r: 19, life: 1.2, maxLife: 1.2, tick: 0.12, power: mods.dashTrail,
        });
      }
    }
  } else {
    const speed = PLAYER.speed * (1 + 0.08 * mods.swift);
    warden.x += (control.moveX ?? 0) * speed * dtClamped;
    warden.y += (control.moveY ?? 0) * speed * dtClamped;
    warden.walkPhase = (warden.walkPhase + dtClamped * 8 * Math.hypot(control.moveX ?? 0, control.moveY ?? 0)) % TAU;
  }
  clampWarden(warden);

  if (control.bloom && warden.bloom >= PLAYER.bloomMax && warden.bloomLock <= 0) releaseBloom(world);
  if (control.firing && warden.fireTimer <= 0) fireVolley(world, control);

  updatePassives(world, dtClamped);

  if (world.trails.length > 70) world.trails.splice(0, world.trails.length - 70);
}
