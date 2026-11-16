// The Hollow: eight regular creature kinds plus the splitter's minis, each with its own shape,
// colour and behaviour, and elite variants that glow and hit harder later in the run. Enemies
// choose between the Warden and the Starseed as their target; the wave director decides how
// many and which kinds arrive.
import { ARENA } from './config.js';
import { addArc, addParticle, burst } from './particles.js';
import { aimedFan, spawnBullet, spawnHazard } from './projectiles.js';

const TAU = Math.PI * 2;

export const ENEMY_DEFS = {
  inkling: { hp: 22, speed: 104, r: 13, touch: 8, seed: 6, color: '#e05aff', glow: '#ff9bf0' },
  thornback: { hp: 95, speed: 45, r: 21, touch: 13, seed: 9, color: '#a44bf0', glow: '#d59bff' },
  wispEater: { hp: 31, speed: 82, r: 14, touch: 7, seed: 11, color: '#b14bff', glow: '#e7b6ff' },
  spitter: { hp: 40, speed: 56, r: 15, touch: 7, seed: 5, color: '#d65aff', glow: '#ffb7f0' },
  burrower: { hp: 52, speed: 70, r: 16, touch: 10, seed: 8, color: '#7a2bcf', glow: '#c390ff' },
  splitter: { hp: 62, speed: 66, r: 18, touch: 10, seed: 8, color: '#c24bff', glow: '#ff9bf0' },
  shade: { hp: 34, speed: 126, r: 13, touch: 11, seed: 6, color: '#8d3cff', glow: '#d9b0ff' },
  mini: { hp: 13, speed: 146, r: 9, touch: 5, seed: 4, color: '#ff8ae5', glow: '#ffc4f3' },
};

let nextId = 1;
export function resetEnemyIds() {
  nextId = 1;
}

export function spawnPoint(world) {
  const rng = world.rng;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const side = rng.int(0, 3);
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = rng.range(ARENA.left + 40, ARENA.right - 40);
      y = ARENA.top + 22;
    } else if (side === 1) {
      x = ARENA.right - 22;
      y = rng.range(ARENA.top + 40, ARENA.bottom - 40);
    } else if (side === 2) {
      x = rng.range(ARENA.left + 40, ARENA.right - 40);
      y = ARENA.bottom - 22;
    } else {
      x = ARENA.left + 22;
      y = rng.range(ARENA.top + 40, ARENA.bottom - 40);
    }
    const nearPlayer = Math.hypot(x - world.warden.x, y - world.warden.y) < 140;
    const nearSeed = Math.hypot(x - world.starseed.x, y - world.starseed.y) < 110;
    if (!nearPlayer && !nearSeed) return { x, y };
  }
  return { x: ARENA.left + 30, y: ARENA.top + 30 };
}

export function makeEnemy(world, kind, x, y, elite = false) {
  const def = ENEMY_DEFS[kind] ?? ENEMY_DEFS.inkling;
  const wave = world.wave;
  const difficulty = world.difficulty;
  const hpScale = (1 + (wave - 1) * 0.085) * difficulty.hp * (elite ? 2.15 : 1);
  const damageScale = (1 + (wave - 1) * 0.04) * difficulty.damage * (elite ? 1.35 : 1);
  const radius = def.r * (elite ? 1.22 : 1);
  return {
    id: `e${nextId++}`,
    kind,
    x,
    y,
    r: radius,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    speed: def.speed * (1 + (wave - 1) * 0.009) * (elite ? 1.04 : 1),
    touchDamage: def.touch * damageScale,
    seedDamage: def.seed * damageScale,
    elite,
    color: def.color,
    glow: elite ? '#ffe28a' : def.glow,
    dead: false,
    burrowed: false,
    hitFlash: 0,
    slowTimer: 0,
    slowFactor: 1,
    seedCooldown: 0,
    state: 'hunt',
    stateTimer: 0,
    fireTimer: 0.7 + world.rng.next() * 0.9,
    blinkTimer: 1.2 + world.rng.next() * 1.4,
    angle: 0,
    wobble: world.rng.next() * TAU,
    targetX: x,
    targetY: y,
    isBoss: false,
  };
}

function moveToward(enemy, tx, ty, speed, dt) {
  const dx = tx - enemy.x;
  const dy = ty - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  enemy.x += (dx / length) * speed * dt;
  enemy.y += (dy / length) * speed * dt;
  enemy.angle = Math.atan2(dy, dx);
}

function clampArena(enemy) {
  enemy.x = Math.max(ARENA.left + enemy.r, Math.min(ARENA.right - enemy.r, enemy.x));
  enemy.y = Math.max(ARENA.top + enemy.r, Math.min(ARENA.bottom - enemy.r, enemy.y));
}

function nearestOf(world, x, y) {
  const warden = world.warden;
  const seed = world.starseed;
  const dw = (warden.x - x) ** 2 + (warden.y - y) ** 2;
  const ds = (seed.x - x) ** 2 + (seed.y - y) ** 2;
  return dw <= ds ? warden : seed;
}

function updateInkling(world, enemy, dt, speed) {
  const target = nearestOf(world, enemy.x, enemy.y);
  const sway = Math.sin(world.time * 3 + enemy.wobble) * 26;
  moveToward(enemy, target.x + sway * 0.2, target.y + Math.cos(world.time * 2.4 + enemy.wobble) * 18, speed, dt);
}

function updateThornback(world, enemy, dt, speed) {
  const seed = world.starseed;
  const warden = world.warden;
  const distance = Math.hypot(seed.x - enemy.x, seed.y - enemy.y);
  if (distance > 150) moveToward(enemy, seed.x, seed.y, speed, dt);
  else {
    const angle = Math.atan2(seed.y - enemy.y, seed.x - enemy.x) + Math.PI / 2;
    enemy.x += Math.cos(angle) * speed * 0.35 * dt;
    enemy.y += Math.sin(angle) * speed * 0.35 * dt;
  }
  enemy.fireTimer -= dt;
  if (enemy.fireTimer <= 0) {
    enemy.fireTimer = Math.max(1.25, 2.5 - world.wave * 0.05);
    const angle = Math.atan2(warden.y - enemy.y, warden.x - enemy.x);
    aimedFan(world, enemy.x, enemy.y, angle, 3, 0.34, 220, {
      radius: 7,
      damage: 9 * (enemy.elite ? 1.35 : 1) * world.difficulty.damage,
      color: '#c77bff',
      kind: 'thorn',
      life: 4,
    });
  }
}

function updateWispEater(world, enemy, dt, speed) {
  moveToward(enemy, world.starseed.x, world.starseed.y, speed, dt);
  if (world.rng.next() < 0.06) {
    addParticle(world.particles, enemy.x, enemy.y, 0, 0, 0.3, 3, 'rgba(177,75,255,0.5)', { drag: 4 });
  }
}

function updateSpitter(world, enemy, dt, speed) {
  const warden = world.warden;
  const distance = Math.hypot(warden.x - enemy.x, warden.y - enemy.y);
  if (distance < 220) moveToward(enemy, enemy.x * 2 - warden.x, enemy.y * 2 - warden.y, speed, dt);
  else if (distance > 330) moveToward(enemy, warden.x, warden.y, speed, dt);
  else {
    const angle = Math.atan2(warden.y - enemy.y, warden.x - enemy.x) + Math.PI / 2;
    const side = Math.sin(world.time * 0.7 + enemy.wobble) > 0 ? 1 : -1;
    enemy.x += Math.cos(angle) * speed * 0.5 * side * dt;
    enemy.y += Math.sin(angle) * speed * 0.5 * side * dt;
  }
  enemy.fireTimer -= dt;
  if (enemy.fireTimer <= 0) {
    enemy.fireTimer = Math.max(1.1, 2.2 - world.wave * 0.04);
    const angle = Math.atan2(warden.y - enemy.y, warden.x - enemy.x);
    spawnBullet(world, enemy.x, enemy.y, angle, 175, {
      radius: 8,
      damage: 8 * (enemy.elite ? 1.35 : 1) * world.difficulty.damage,
      color: '#ff87e0',
      kind: 'lob',
      wobble: enemy.wobble,
      life: 5,
    });
  }
}

function updateBurrower(world, enemy, dt, speed) {
  enemy.stateTimer -= dt;
  if (enemy.state === 'hunt') {
    moveToward(enemy, world.warden.x, world.warden.y, speed, dt);
    if (enemy.stateTimer <= 0) {
      enemy.state = 'burrow';
      enemy.stateTimer = 0.9;
      enemy.burrowed = true;
      burst(world.particles, world.rng, enemy.x, enemy.y, '#5b1e9c', 12, { speed: 120, life: 0.5, size: 4, shape: 'shard' });
    }
  } else if (enemy.state === 'burrow') {
    if (enemy.stateTimer <= 0) {
      enemy.state = 'telegraph';
      enemy.stateTimer = 0.8;
      const angle = world.rng.next() * TAU;
      const distance = 26 + world.rng.next() * 34;
      enemy.targetX = Math.max(ARENA.left + 30, Math.min(ARENA.right - 30, world.warden.x + Math.cos(angle) * distance));
      enemy.targetY = Math.max(ARENA.top + 30, Math.min(ARENA.bottom - 30, world.warden.y + Math.sin(angle) * distance));
      spawnHazard(world, {
        type: 'circle',
        x: enemy.targetX,
        y: enemy.targetY,
        radius: 46,
        delay: 0.8,
        life: 0.28,
        damage: 12 * world.difficulty.damage,
        target: 'warden',
        color: '#c77bff',
      });
      addArc(world.particles, enemy.x, enemy.y, enemy.targetX, enemy.targetY, 'rgba(199,123,255,0.5)', 0.75);
    }
  } else if (enemy.state === 'telegraph') {
    if (enemy.stateTimer <= 0) {
      enemy.x = enemy.targetX;
      enemy.y = enemy.targetY;
      enemy.burrowed = false;
      enemy.state = 'hunt';
      enemy.stateTimer = 2.2 + world.rng.next() * 1.2;
      burst(world.particles, world.rng, enemy.x, enemy.y, '#c77bff', 16, { speed: 180, life: 0.5, size: 3.2 });
      for (let i = 0; i < 6; i += 1) {
        spawnBullet(world, enemy.x, enemy.y, (i / 6) * TAU, 130, {
          radius: 6, damage: 7 * world.difficulty.damage, color: '#d9a6ff', kind: 'spore', life: 2.4,
        });
      }
    }
  }
}

function updateShade(world, enemy, dt, speed) {
  moveToward(enemy, world.warden.x, world.warden.y, speed, dt);
  enemy.blinkTimer -= dt;
  const distance = Math.hypot(world.warden.x - enemy.x, world.warden.y - enemy.y);
  if (enemy.blinkTimer <= 0 && distance > 95) {
    enemy.blinkTimer = 2.1 + world.rng.next() * 1.2;
    const angle = Math.atan2(world.warden.y - enemy.y, world.warden.x - enemy.x) + (world.rng.next() - 0.5) * 0.7;
    const fromX = enemy.x;
    const fromY = enemy.y;
    enemy.x += Math.cos(angle) * Math.min(150, distance - 60);
    enemy.y += Math.sin(angle) * Math.min(150, distance - 60);
    addArc(world.particles, fromX, fromY, enemy.x, enemy.y, 'rgba(141,60,255,0.55)', 0.22);
    burst(world.particles, world.rng, fromX, fromY, '#8d3cff', 7, { speed: 120, life: 0.35, size: 3 });
  }
}

export function updateEnemies(world, dt) {
  const enemies = world.enemies;
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (enemy.dead) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      if (enemy.slowTimer <= 0) enemy.slowFactor = 1;
    }
    const speed = enemy.speed * (enemy.slowTimer > 0 ? enemy.slowFactor : 1);
    switch (enemy.kind) {
      case 'thornback': updateThornback(world, enemy, dt, speed); break;
      case 'wispEater': updateWispEater(world, enemy, dt, speed); break;
      case 'spitter': updateSpitter(world, enemy, dt, speed); break;
      case 'burrower': updateBurrower(world, enemy, dt, speed); break;
      case 'shade': updateShade(world, enemy, dt, speed); break;
      case 'mini':
      case 'splitter': updateInkling(world, enemy, dt, speed); break;
      default: updateInkling(world, enemy, dt, speed); break;
    }
    if (!enemy.burrowed) clampArena(enemy);
    if (enemy.elite && world.rng.next() < 0.12) {
      addParticle(world.particles, enemy.x + (world.rng.next() - 0.5) * enemy.r * 2, enemy.y + (world.rng.next() - 0.5) * enemy.r * 2, 0, -10, 0.4, 2, 'rgba(255,226,138,0.7)', { drag: 3 });
    }
  }
  // Remove the dead after the frame's collisions have seen them.
  let write = 0;
  for (let i = 0; i < enemies.length; i += 1) {
    if (!enemies[i].dead) {
      enemies[write] = enemies[i];
      write += 1;
    }
  }
  enemies.length = write;
}
