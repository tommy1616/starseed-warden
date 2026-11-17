// Three start-of-run guardians. Each begins with a real build (the same cards the draft uses)
// and pays for it with lower dart output or HP, so the choice is a play-style trade, not a
// free stat. The standard Seedshot Warden stays the baseline pick.
import { PLAYER } from './config.js';
import { takeUpgrade, upgradeById } from './upgrades.js';

export const GUARDIANS = [
  {
    id: 'seedshot', name: 'Seedshot Warden', tagline: 'Balanced darts · full HP',
    color: '#7ee8ff', cards: [], hp: 1, dart: 1, fire: 1, speed: 1,
  },
  {
    id: 'petal', name: 'Petal Dancer', tagline: 'Orbit petals · close range, weak darts',
    color: '#b6ffe6', cards: ['orbit', 'orbit'], hp: 0.85, dart: 0.65, fire: 1.25, speed: 1.08,
  },
  {
    id: 'bloom', name: 'Bloomkeeper', tagline: 'Fast wide Bloom · weak darts',
    color: '#ffd76a', cards: ['bloomCharge', 'bloomPower'], hp: 0.9, dart: 0.7, fire: 1.15, speed: 1,
  },
];

const BY_ID = new Map(GUARDIANS.map((guardian) => [guardian.id, guardian]));

export function guardianById(id) {
  return BY_ID.get(id) ?? GUARDIANS[0];
}

export function applyGuardian(world, id) {
  const guardian = guardianById(id);
  world.guardian = guardian;
  for (const cardId of guardian.cards) {
    const card = upgradeById(cardId);
    if (card) takeUpgrade(world, card);
  }
  world.startingUpgrades = guardian.cards.length;
  world.warden.maxHp = Math.max(1, Math.round(PLAYER.maxHp * guardian.hp));
  world.warden.hp = world.warden.maxHp;
}
