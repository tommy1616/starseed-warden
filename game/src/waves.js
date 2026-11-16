// The wave director: twelve waves across three biomes, each with its own composition and
// spawn cadence, and a boss at the end of every biome. The table is data; buildWave() turns
// one row into the spawn list the world consumes, scaling counts by the chosen difficulty
// and flagging elites later in the run.
import { BIOMES, DIFFICULTIES } from './config.js';

export const WAVES = [
  {
    biome: 0, interval: 0.92,
    parts: [['inkling', 9]],
  },
  {
    biome: 0, interval: 0.84,
    parts: [['inkling', 9], ['wispEater', 3]],
  },
  {
    biome: 0, interval: 0.78,
    parts: [['inkling', 7], ['thornback', 2], ['spitter', 3]],
  },
  {
    biome: 0, interval: 0.7, boss: 'bramble',
    parts: [['inkling', 6], ['wispEater', 2]],
  },
  {
    biome: 1, interval: 0.72,
    parts: [['inkling', 7], ['spitter', 3], ['burrower', 3]],
  },
  {
    biome: 1, interval: 0.56,
    parts: [['inkling', 9], ['splitter', 4], ['wispEater', 4], ['spitter', 3]],
  },
  {
    biome: 1, interval: 0.52,
    parts: [['thornback', 3], ['spitter', 4], ['burrower', 3], ['shade', 2], ['splitter', 3]],
  },
  {
    biome: 1, interval: 0.62, boss: 'tyrant',
    parts: [['splitter', 4], ['spitter', 3], ['inkling', 6]],
  },
  {
    biome: 2, interval: 0.5,
    parts: [['shade', 4], ['splitter', 4], ['inkling', 8], ['wispEater', 3]],
  },
  {
    biome: 2, interval: 0.46,
    parts: [['spitter', 5], ['burrower', 4], ['thornback', 3], ['inkling', 8]],
  },
  {
    biome: 2, interval: 0.4,
    parts: [['inkling', 10], ['shade', 4], ['splitter', 4], ['thornback', 3], ['spitter', 4], ['burrower', 3]],
  },
  {
    biome: 2, interval: 0.58, boss: 'crown',
    parts: [['shade', 4], ['splitter', 4], ['inkling', 6]],
  },
];

export const BOSS_NAMES = {
  bramble: 'Bramble Matron',
  tyrant: 'Spore Tyrant',
  crown: 'The Withering Crown',
};

export function biomeIndexForWave(wave) {
  const row = WAVES[Math.max(0, Math.min(WAVES.length - 1, wave - 1))];
  return row ? row.biome : 0;
}

export function biomeForWave(wave) {
  return BIOMES[biomeIndexForWave(wave)];
}

export function waveTitle(wave) {
  return `Wave ${wave}: ${biomeForWave(wave).name}`;
}

export function isBossWave(wave) {
  const row = WAVES[wave - 1];
  return Boolean(row && row.boss);
}

export function difficultyById(id) {
  return DIFFICULTIES.find((entry) => entry.id === id) ?? DIFFICULTIES[1];
}

/** Elite chance per wave: none early, a growing trickle from the Fungal Hollow on. */
function eliteChance(wave) {
  if (wave < 6) return 0;
  return Math.min(0.34, 0.08 + (wave - 6) * 0.035);
}

/**
 * Build the spawn list and boss for one wave. `countScale` is the difficulty's spawn factor;
 * `eliteRoll` receives the wave so scripted scenes can force particular variants.
 */
export function buildWave(wave, difficulty, rng, options = {}) {
  const row = WAVES[Math.max(0, Math.min(WAVES.length - 1, wave - 1))];
  const spawns = [];
  const scale = options.countScale ?? difficulty.spawn;
  for (const [kind, base] of row.parts) {
    const count = Math.max(1, Math.round(base * scale));
    for (let i = 0; i < count; i += 1) {
      const elite = rng.chance(eliteChance(wave));
      spawns.push({ kind, elite });
    }
  }
  rng.shuffle(spawns);
  return {
    spawns,
    interval: row.interval / difficulty.spawn,
    boss: row.boss ?? null,
    bossName: row.boss ? BOSS_NAMES[row.boss] : null,
    biome: row.biome,
  };
}

export const TOTAL_WAVES = WAVES.length;
