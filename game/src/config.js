// Tuning and the fixed geometry of Starseed Warden. The simulation always plays in a
// 1280x720 logical field; the renderer scales that field to the window. Nothing below
// depends on pixels of the real screen, so a run is identical at every window size.

export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step: 60 updates a second, independent of the display's frame rate. */
export const STEP = 1 / 60;

/** The playable glade, leaving room for the HUD along the top and a little air at the edges. */
export const ARENA = { left: 30, right: 1250, top: 92, bottom: 698 };

/** The Starseed is planted at the heart of the glade. */
export const STARSEED = {
  x: 640,
  y: 380,
  radius: 48,
  maxHp: 130,
  shieldPulse: 12,
  shieldInterval: 9,
  regrow: 1.4,
};

export const PLAYER = {
  radius: 17,
  speed: 300,
  maxHp: 100,
  hitInvulnerable: 0.95,
  dashSpeed: 1080,
  dashTime: 0.16,
  dashCooldown: 1.55,
  dashInvulnerable: 0.30,
  fireInterval: 0.165,
  dartSpeed: 780,
  dartDamage: 9,
  dartRadius: 5,
  dartLife: 1.35,
  bloomMax: 100,
  bloomPerMote: 9,
  bloomRadius: 185,
  bloomDamage: 55,
  bloomCooldown: 0.5,
};

/** How close a pollen mote must be before it drifts into the Warden. */
export const PICKUP = { baseRadius: 78, life: 14, value: 4 };

export const DIFFICULTIES = [
  {
    id: 'sprout',
    name: 'Sprout',
    blurb: 'A gentle first night.',
    hp: 0.7,
    damage: 0.55,
    spawn: 0.75,
    score: 0.85,
    seedHp: 2.35,
    seedDamage: 0.45,
    color: '#78f0b8',
  },
  {
    id: 'warden',
    name: 'Warden',
    blurb: 'The garden as it is.',
    hp: 0.95,
    damage: 0.95,
    spawn: 0.95,
    score: 1,
    seedHp: 2.2,
    seedDamage: 0.55,
    color: '#7ee8ff',
  },
  {
    id: 'eclipse',
    name: 'Eclipse',
    blurb: 'The Hollow hungers.',
    hp: 1.32,
    damage: 1.28,
    spawn: 1.2,
    score: 1.25,
    seedHp: 0.95,
    seedDamage: 1.15,
    color: '#ff87e0',
  },
];

export const BIOMES = [
  {
    id: 'meadow',
    name: 'Moonlit Meadow',
    from: 1,
    to: 4,
    sky: ['#0a1230', '#10204a', '#123a4a'],
    ground: '#0b1c2c',
    accent: '#7ee8ff',
    accent2: '#78f0b8',
    ink: '#331b58',
    pollen: '#ffd76a',
    hills: 0,
  },
  {
    id: 'fungal',
    name: 'Fungal Hollow',
    from: 5,
    to: 8,
    sky: ['#120a2c', '#241040', '#173049'],
    ground: '#160f2a',
    accent: '#b388ff',
    accent2: '#6ff0d0',
    ink: '#3d1150',
    pollen: '#ffcf5a',
    hills: 1,
  },
  {
    id: 'crystal',
    name: 'Crystal Canopy',
    from: 9,
    to: 12,
    sky: ['#0a1a33', '#162248', '#2a1550'],
    ground: '#0d1430',
    accent: '#8fd8ff',
    accent2: '#ff87e0',
    ink: '#2a0f42',
    pollen: '#ffe28a',
    hills: 2,
  },
];

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const TITLE_FONT = 'Georgia, "Palatino Linotype", "Times New Roman", serif';

/** Timing that shapes the feel rather than the rules. */
export const FEEL = {
  banner: 1.65,
  draftDelay: 1.15,
  waveClearPause: 1.4,
  comboWindow: 2.6,
  hitStop: 0.055,
  shakeHit: 4,
  shakeKill: 3,
  shakePlayer: 9,
  shakeBloom: 11,
  maxParticles: 900,
};

export const SCORE = {
  kill: {
    inkling: 10,
    thornback: 42,
    wispEater: 16,
    spitter: 26,
    burrower: 32,
    splitter: 36,
    shade: 30,
    mini: 6,
    boss: 0,
  },
  eliteMultiplier: 2.2,
  waveClear: 130,
  seedBonus: 220,
  victory: 1200,
};
