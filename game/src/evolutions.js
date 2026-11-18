// Guardian Evolution: one mutually exclusive fork per path, offered once run, at wave 5.
// Each choice is a real change to the simulation (not a rename): the numbers below are read
// by player.js, and every direction pays for its strength with a stated cost.
import { PLAYER } from './config.js';

export const EVOLUTION_WAVE = 5;

export const EVOLUTIONS = {
  seedshot: [
    {
      id: 'longdraw', name: 'Long Draw', kicker: 'PENETRATE', color: '#7ee8ff', icon: 'spine',
      desc: 'Every dart punches through 2 more Hollow and flies 35% faster, so one line can clear a column.',
      cost: 'The bow draws 15% slower.',
      effect: { pierce: 2, dartSpeed: 1.35, fireInterval: 1.15 },
    },
    {
      id: 'twinnock', name: 'Twin Nock', kicker: 'SPREAD', color: '#b6ffe6', icon: 'fan',
      desc: 'Every volley looses one extra dart, covering a wider arc at close and mid range.',
      cost: 'Each dart deals 15% less damage.',
      effect: { extraDarts: 1, dartDamage: 0.85, fireInterval: 0.95 },
    },
  ],
  petal: [
    {
      id: 'guardring', name: 'Guard Ring', kicker: 'PROTECT', color: '#8ff7c8', icon: 'orbit',
      desc: 'The petal ring widens to 74px, sweeping a wider shell around you and anything you stand beside.',
      cost: 'Each petal cuts 20% softer.',
      effect: { orbitRadius: 74, orbitDamage: 0.8 },
    },
    {
      id: 'closecut', name: 'Close Cut', kicker: 'PRESS', color: '#ffd76a', icon: 'aura',
      desc: 'The petal ring tightens to 46px and cuts 45% harder.',
      cost: 'You have to hug what you want to kill.',
      effect: { orbitRadius: 46, orbitDamage: 1.45 },
    },
  ],
  bloom: [
    {
      id: 'sporeward', name: 'Spore Ward', kicker: 'CONTROL', color: '#7ec8ff', icon: 'shield',
      desc: 'Bloom slows every Hollow caught in its blast to 45% speed for 2.4s. The Crown itself is not slowed.',
      cost: 'Bloom hits 15% softer and reaches 10% less far.',
      effect: { bloomSlow: 2.4, bloomSlowFactor: 0.45, bloomDamage: 0.85, bloomRadius: 0.9 },
    },
    {
      id: 'burstcrown', name: 'Burst Crown', kicker: 'BURST', color: '#ffd76a', icon: 'burst',
      desc: 'Bloom erupts for 55% more damage.',
      cost: 'The blast reaches 20% less far.',
      effect: { bloomDamage: 1.55, bloomRadius: 0.8 },
    },
  ],
};

export function evolutionsFor(guardianId) {
  return EVOLUTIONS[guardianId] ?? [];
}

export function evolutionById(id) {
  for (const list of Object.values(EVOLUTIONS)) {
    const hit = list.find((entry) => entry.id === id);
    if (hit) return hit;
  }
  return null;
}

/** The concrete before → after line the choice screen prints, read from the live world. */
export function evolutionDelta(world, choice) {
  const mods = world.mods;
  const effect = choice.effect;
  if (choice.id === 'longdraw') {
    return `PIERCE ${mods.pierce} → ${mods.pierce + effect.pierce}  ·  DART SPEED ${Math.round(PLAYER.dartSpeed)} → ${Math.round(PLAYER.dartSpeed * effect.dartSpeed)}`;
  }
  if (choice.id === 'twinnock') {
    return `DARTS PER VOLLEY ${1 + mods.multishot} → ${2 + mods.multishot}`;
  }
  if (choice.id === 'guardring' || choice.id === 'closecut') {
    return `PETAL RING 56 → ${effect.orbitRadius}px  ·  PETAL CUT ×${effect.orbitDamage.toFixed(2)}`;
  }
  const baseRadius = Math.round(PLAYER.bloomRadius * (1 + 0.15 * mods.bloomPower));
  const baseDamage = Math.round(PLAYER.bloomDamage * (1 + 0.35 * mods.bloomPower));
  const radius = Math.round(PLAYER.bloomRadius * (1 + 0.15 * mods.bloomPower) * effect.bloomRadius);
  const damage = Math.round(PLAYER.bloomDamage * (1 + 0.35 * mods.bloomPower) * effect.bloomDamage);
  if (choice.id === 'sporeward') {
    return `CHILL 1.1s → ${effect.bloomSlow.toFixed(1)}s  ·  BLAST ${baseDamage} → ${damage} dmg`;
  }
  return `BLAST ${baseDamage} → ${damage} dmg  ·  RADIUS ${baseRadius} → ${radius}px`;
}

/** One evolution per run: a second call is ignored, so a restart or a double click cannot stack. */
export function applyEvolution(world, choice) {
  if (!world || !choice || world.evolution) return false;
  world.evolution = {
    id: choice.id,
    name: choice.name,
    kicker: choice.kicker,
    color: choice.color,
    guardian: world.guardian?.id ?? null,
    ...choice.effect,
  };
  world.evolutionNotice = { text: `${choice.name.toUpperCase()} · ${choice.kicker}`, color: choice.color, timer: 3.2 };
  return true;
}
