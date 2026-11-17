// Optional, wave-local Garden Oaths: a self-imposed challenge chosen in the Bloom Draft.
// An oath pays once when its wave is cleared; a broken oath costs only the bonus and never
// touches the ordinary wave reward. Guard counts HP actually lost, so a regrowing seed or a
// healing oath can never hide a hit that already broke the shell.
import { PLAYER } from './config.js';
import { TOTAL_WAVES } from './waves.js';
import { burst, addRing, addNumber } from './particles.js';

export const OATHS = [
  { id: 'none', name: 'Quiet Garden', rule: 'No extra challenge', reward: 'Ordinary wave rewards only', color: '#8fb6c6' },
  { id: 'guard', name: 'Unbroken Shell', rule: 'Let no damage reach the Starseed', reward: '+18 seed HP, +900 score', color: '#ffd76a' },
  { id: 'graze', name: 'Dance with Thorns', rule: 'Perform 2 Perfect Dashes this wave', reward: '+25 Warden HP, +600 score', color: '#7ee8ff' },
  { id: 'harvest', name: 'Golden Harvest', rule: 'Collect 8 pollen motes this wave', reward: '+40 Bloom, +700 score', color: '#b6ffe6' },
];

const TARGET = { guard: 1, graze: 2, harvest: 8 };
const POINTS = { guard: 900, graze: 600, harvest: 700 };

export function oathById(id) { return OATHS.find(o => o.id === id) ?? OATHS[0]; }

/** Short, visible feedback under the HUD panel; the world ages it out. */
function notice(world, text, color) {
  world.oathNotice = { text, color, timer: 2.8 };
}

export function beginOath(world, id) {
  const spec = oathById(id);
  world.oath = {
    id: spec.id,
    wave: world.wave,
    status: spec.id === 'none' ? 'rest' : 'active',
    progress: 0,
    broken: false,
    seedDamage: world.seedDamageTaken,
    dashBase: world.perfectDashes,
    pollenBase: world.pollenCollected,
  };
  world.oathNotice = null;
}

export function updateOath(world) {
  const oath = world.oath;
  if (!oath || oath.status !== 'active' || oath.wave !== world.wave) return;
  if (oath.id === 'guard') {
    if (!oath.broken && world.seedDamageTaken > oath.seedDamage) {
      oath.broken = true;
      notice(world, 'OATH BROKEN — the shell is cracked', '#ff9a3c');
      burst(world.particles, world.rng, world.starseed.x, world.starseed.y, '#ff9a3c', 22, { speed: 210, life: 0.9, size: 3.4 });
      addRing(world.particles, world.starseed.x, world.starseed.y, world.starseed.r, world.starseed.r + 90, 'rgba(255,154,60,0.8)', 0.7, 5);
      world.audio?.play('playerHurt');
    }
    oath.progress = oath.broken ? 0 : 1;
  } else if (oath.id === 'graze') {
    oath.progress = Math.min(TARGET.graze, world.perfectDashes - oath.dashBase);
  } else if (oath.id === 'harvest') {
    oath.progress = Math.min(TARGET.harvest, world.pollenCollected - oath.pollenBase);
  }
}

/** Settle once, on the wave-clear that follows the oath's wave. Never called after defeat. */
export function settleOath(world) {
  const oath = world.oath;
  if (!oath || oath.status !== 'active' || oath.wave !== world.wave || world.outcome) return;
  updateOath(world);
  oath.status = !oath.broken && oath.progress >= TARGET[oath.id] ? 'fulfilled' : 'missed';
  const spec = oathById(oath.id);
  if (oath.status !== 'fulfilled') {
    notice(world, `OATH MISSED — ${spec.name}`, 'rgba(255,154,60,0.95)');
    world.audio?.play('select');
    return;
  }
  const points = POINTS[oath.id];
  world.score.score += points;
  world.oathsCompleted += 1;
  world.oathBonus += points;
  if (oath.id === 'guard') world.starseed.hp = Math.min(world.starseed.maxHp, world.starseed.hp + 18);
  if (oath.id === 'graze') world.warden.hp = Math.min(world.warden.maxHp, world.warden.hp + 25);
  if (oath.id === 'harvest') world.warden.bloom = Math.min(PLAYER.bloomMax, world.warden.bloom + 40);
  notice(world, `OATH KEPT · ${spec.name} +${points}`, spec.color);
  const at = oath.id === 'guard' ? world.starseed : world.warden;
  burst(world.particles, world.rng, at.x, at.y, spec.color, 30, { speed: 240, life: 1.1, size: 3.6 });
  addRing(world.particles, at.x, at.y, 18, 220, spec.color, 0.9, 6);
  addNumber(world.particles, at.x, at.y - 40, `+${points}`, spec.color, 20);
  world.audio?.play('card');
}

export function oathProgress(world) {
  const o = world.oath;
  if (!o || o.id === 'none') {
    return world.wave >= TOTAL_WAVES
      ? 'No oath sworn — the last stand'
      : 'No oath sworn — choose one in the next Bloom Draft';
  }
  if (o.status === 'fulfilled') return `FULFILLED / ${oathById(o.id).reward}`;
  if (o.status === 'missed' || o.broken) return 'MISSED / ordinary wave reward is safe';
  if (o.id === 'guard') return 'SHELL UNBROKEN / hold until wave clear';
  return `${o.progress} / ${TARGET[o.id]} / finish the wave to claim`;
}
