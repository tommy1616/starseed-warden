// Pollen motes: the Hollow's remains, the Warden's Bloom charge and a little score. They
// scatter on death, drift, and are pulled in by the Pollen Magnet upgrade. Collecting one is
// the small satisfying beat between fights.
import { PLAYER, PICKUP } from './config.js';
import { bloomPerMote, magnetRadius } from './upgrades.js';
import { addNumber, addRing, addParticle } from './particles.js';

export function spawnPollen(world, x, y, elite = false) {
  const rng = world.rng;
  const angle = rng.next() * Math.PI * 2;
  const speed = 40 + rng.next() * 120;
  world.pickups.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 30,
    r: elite ? 7 : 5.5,
    value: elite ? PICKUP.value * 2 : PICKUP.value,
    life: PICKUP.life,
    glow: elite,
    phase: rng.next() * Math.PI * 2,
  });
}

export function dropPollen(world, x, y, count, elite = false) {
  const motes = Math.max(1, Math.round(count));
  for (let i = 0; i < motes; i += 1) spawnPollen(world, x, y, elite && i === 0);
}

export function updatePickups(world, dt) {
  const warden = world.warden;
  const seed = world.starseed;
  const magnet = magnetRadius(world);
  const list = world.pickups;
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const mote = list[i];
    mote.life -= dt;
    if (mote.life <= 0) continue;
    const dx = warden.x - mote.x;
    const dy = warden.y - mote.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < magnet) {
      const pull = 520 * (1 - distance / magnet) + 120;
      mote.vx += (dx / distance) * pull * dt;
      mote.vy += (dy / distance) * pull * dt;
    } else {
      const seedDx = seed.x - mote.x;
      const seedDy = seed.y - mote.y;
      const seedDistance = Math.hypot(seedDx, seedDy) || 1;
      if (seedDistance < 70) {
        mote.vx -= (seedDx / seedDistance) * 30 * dt;
        mote.vy -= (seedDy / seedDistance) * 30 * dt;
      }
    }
    const damping = Math.max(0, 1 - 2.4 * dt);
    mote.vx *= damping;
    mote.vy *= damping;
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    mote.phase += dt * 4;
    if (distance < warden.r + mote.r + 3) {
      world.warden.bloom = Math.min(PLAYER.bloomMax, world.warden.bloom + bloomPerMote(world));
      world.pollenCollected += 1;
      world.score.score += mote.value * world.difficulty.score;
      world.score.pickupScore += mote.value;
      if (world.warden.bloom >= PLAYER.bloomMax && !world.bloomWasFull) {
        world.bloomWasFull = true;
        addNumber(world.particles, warden.x, warden.y - 34, 'BLOOM READY', '#ffd76a', 17);
        world.audio?.play('select');
      }
      addParticle(world.particles, mote.x, mote.y, 0, -20, 0.3, mote.r, '#ffd76a', { drag: 4 });
      addRing(world.particles, mote.x, mote.y, 2, 16, 'rgba(255,215,106,0.8)', 0.25, 2);
      world.audio?.play('pickup');
      continue;
    }
    if (world.warden.bloom < PLAYER.bloomMax) world.bloomWasFull = false;
    list[write] = mote;
    write += 1;
  }
  list.length = write;
}
