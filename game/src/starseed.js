// The Starseed at the heart of the glade: the thing the Hollow is trying to wither. It holds
// its own health, regrows when Root Regrowth is owned, and pulses a temporary shield with the
// Starseed Ward upgrade. Losing it ends the run just as surely as losing the Warden.
import { STARSEED } from './config.js';
import { addRing, burst } from './particles.js';

export function updateStarseed(world, dt) {
  const seed = world.starseed;
  seed.hurtFlash = Math.max(0, seed.hurtFlash - dt);
  seed.pulse += dt;
  seed.shieldFlash = Math.max(0, seed.shieldFlash - dt);

  const regrow = world.mods.regrow;
  if (regrow > 0 && seed.hp > 0 && seed.hp < seed.maxHp) {
    seed.hp = Math.min(seed.maxHp, seed.hp + STARSEED.regrow * regrow * dt);
  }

  const shieldLevel = world.mods.shield;
  if (shieldLevel > 0) {
    seed.shieldMax = shieldLevel;
    seed.shieldTimer -= dt;
    if (seed.shield < seed.shieldMax && seed.shieldTimer <= 0) {
      seed.shield += 1;
      seed.shieldTimer = seed.shieldInterval;
      seed.shieldFlash = 0.8;
      addRing(world.particles, seed.x, seed.y, seed.r * 0.8, seed.r + 66, 'rgba(126,200,255,0.75)', 0.7, 4);
      burst(world.particles, world.rng, seed.x, seed.y, '#7ec8ff', 14, { speed: 120, life: 0.8, size: 3 });
      world.audio?.play('pickup');
    }
  }
}
