// Bloom Draft cards, stacking effects, real synergy hints and pollen helpers.
import { PLAYER, PICKUP } from './config.js';

export const UPGRADES = [
  {
    id: 'spread', name: 'Spread Seed', rarity: 'rare', maxLevel: 3, icon: 'fan',
    desc: '+1 dart in every volley.',
    apply(world) { world.mods.multishot += 1; },
  },
  {
    id: 'pierce', name: 'Thorn Tip', rarity: 'common', maxLevel: 3, icon: 'spine',
    desc: 'Darts pierce +1 Hollow creature.',
    apply(world) { world.mods.pierce += 1; },
  },
  {
    id: 'rapid', name: 'Quick Pollen', rarity: 'common', maxLevel: 4, icon: 'spark',
    desc: 'Fire 16% faster.',
    apply(world) { world.mods.rapid += 1; },
  },
  {
    id: 'heavy', name: 'Heavy Seed', rarity: 'rare', maxLevel: 3, icon: 'seed',
    desc: '+28% dart damage, slightly larger darts.',
    apply(world) { world.mods.heavy += 1; },
  },
  {
    id: 'homing', name: 'Seeking Seed', rarity: 'rare', maxLevel: 2, icon: 'leaf',
    desc: 'Darts curve toward nearby enemies.',
    apply(world) { world.mods.homing += 1; },
  },
  {
    id: 'orbit', name: 'Orbiting Petals', rarity: 'rare', maxLevel: 3, icon: 'orbit',
    desc: 'A glowing petal circles you and cuts what it touches.',
    apply(world) { world.mods.orbit += 1; },
  },
  {
    id: 'thorn', name: 'Thorn Aura', rarity: 'legendary', maxLevel: 2, icon: 'aura',
    desc: 'Briars lash nearby enemies every half second.',
    apply(world) { world.mods.thorn += 1; },
  },
  {
    id: 'dashTrail', name: 'Verdant Wake', rarity: 'rare', maxLevel: 2, icon: 'trail',
    desc: 'Your dash leaves a burning trail of spores.',
    apply(world) { world.mods.dashTrail += 1; },
  },
  {
    id: 'lifesteal', name: 'Sap Siphon', rarity: 'rare', maxLevel: 3, icon: 'drop',
    desc: 'Each kill restores 2 Warden HP.',
    apply(world) { world.mods.lifesteal += 1; },
  },
  {
    id: 'regrow', name: 'Root Regrowth', rarity: 'rare', maxLevel: 3, icon: 'root',
    desc: 'The Starseed slowly regrows its shell.',
    apply(world) { world.mods.regrow += 1; },
  },
  {
    id: 'shield', name: 'Starseed Ward', rarity: 'legendary', maxLevel: 2, icon: 'shield',
    desc: 'The Starseed pulses a shield that soaks one hit.',
    apply(world) { world.mods.shield += 1; },
  },
  {
    id: 'magnet', name: 'Pollen Magnet', rarity: 'common', maxLevel: 3, icon: 'magnet',
    desc: 'Pollen drifts to you from farther, and fills Bloom faster.',
    apply(world) { world.mods.magnet += 1; },
  },
  {
    id: 'crit', name: 'Keen Bloom', rarity: 'rare', maxLevel: 3, icon: 'star',
    desc: '+12% critical chance. Crits deal double damage.',
    apply(world) { world.mods.crit += 1; },
  },
  {
    id: 'ricochet', name: 'Ricoherb', rarity: 'legendary', maxLevel: 2, icon: 'ring',
    desc: 'Darts bounce once to a new enemy after a hit.',
    apply(world) { world.mods.ricochet += 1; },
  },
  {
    id: 'frost', name: 'Frost Seeds', rarity: 'common', maxLevel: 2, icon: 'snow',
    desc: 'Hits chill enemies, slowing them for 1.6s.',
    apply(world) { world.mods.frost += 1; },
  },
  {
    id: 'chain', name: 'Spark Vine', rarity: 'rare', maxLevel: 3, icon: 'chain',
    desc: 'Hits arc lightning to one nearby enemy.',
    apply(world) { world.mods.chain += 1; },
  },
  {
    id: 'vitality', name: 'Deep Roots', rarity: 'common', maxLevel: 4, icon: 'heart',
    desc: '+20 maximum Warden HP, and heal 20 now.',
    apply(world) {
      world.mods.vitality += 1;
      world.warden.maxHp = PLAYER.maxHp + world.mods.vitality * 20;
      world.warden.hp = Math.min(world.warden.maxHp, world.warden.hp + 20);
    },
  },
  {
    id: 'bloomCharge', name: 'Wild Bloom', rarity: 'common', maxLevel: 3, icon: 'hourglass',
    desc: 'Bloom fills 25% faster from pollen.',
    apply(world) { world.mods.bloomCharge += 1; },
  },
  {
    id: 'bloomPower', name: 'Bright Bloom', rarity: 'rare', maxLevel: 3, icon: 'burst',
    desc: 'Bloom is 35% stronger and reaches farther.',
    apply(world) { world.mods.bloomPower += 1; },
  },
  {
    id: 'swift', name: 'Dew Step', rarity: 'common', maxLevel: 3, icon: 'boot',
    desc: 'Move 8% faster.',
    apply(world) { world.mods.swift += 1; },
  },
  {
    id: 'flit', name: 'Flit', rarity: 'common', maxLevel: 2, icon: 'wing',
    desc: 'Dash recharges 18% sooner.',
    apply(world) { world.mods.flit += 1; },
  },
  {
    id: 'linger', name: 'Lasting Bloom', rarity: 'legendary', maxLevel: 1, icon: 'shard',
    desc: 'Bloom leaves a radiant ring that burns for 2.5s.',
    apply(world) { world.mods.linger += 1; },
  },
  {
    id: 'satchel', name: 'Pollen Satchel', rarity: 'common', maxLevel: 2, icon: 'pouch',
    desc: 'Enemies drop one extra pollen mote.',
    apply(world) { world.mods.satchel += 1; },
  },
];

const BY_ID = new Map(UPGRADES.map((card) => [card.id, card]));
const RARITY_WEIGHT = { common: 1, rare: 0.44, legendary: 0.15 };

export function upgradeById(id) {
  return BY_ID.get(id) ?? null;
}

export function ownedLevel(world, id) {
  return world.upgrades.get(id) ?? 0;
}

/** Weighted random card that is not maxed; null when every card is full. */
function rollCard(world, rng, exclude) {
  const pool = UPGRADES.filter((card) => ownedLevel(world, card.id) < card.maxLevel && !exclude.has(card.id));
  if (pool.length === 0) return null;
  let total = 0;
  for (const card of pool) total += RARITY_WEIGHT[card.rarity];
  let roll = rng.next() * total;
  for (const card of pool) {
    roll -= RARITY_WEIGHT[card.rarity];
    if (roll <= 0) return card;
  }
  return pool[pool.length - 1];
}

/**
 * Three distinct cards for the draft. `options.forced` names card ids to show first (the
 * screenshot scenes use it for a readable common/rare/legendary spread).
 */
export function drawDraft(world, rng, options = {}) {
  const seen = new Set();
  const cards = [];
  for (const id of options.forced ?? []) {
    const card = BY_ID.get(id);
    if (card && ownedLevel(world, card.id) < card.maxLevel) {
      cards.push(card);
      seen.add(card.id);
    }
  }
  while (cards.length < 3) {
    const card = rollCard(world, rng, seen);
    if (!card) break;
    cards.push(card);
    seen.add(card.id);
  }
  // Keep the order the caller asked for, otherwise shuffle so the same rarities do not
  // always land in the same slot.
  if (!options.forced) rng.shuffle(cards);
  return cards;
}

/** Take a card: record its stack and run its effect. */
export function takeUpgrade(world, card) {
  const level = ownedLevel(world, card.id) + 1;
  if (level > card.maxLevel) return 0;
  world.upgrades.set(card.id, level);
  card.apply(world);
  if (card.id === 'hack') return level;
  return level;
}

/** All owned cards with their stack levels, for the HUD row. */
export function ownedCards(world) {
  const list = [];
  for (const [id, level] of world.upgrades) {
    const card = BY_ID.get(id);
    if (card) list.push({ card, level });
  }
  return list;
}

export function magnetRadius(world) {
  return PICKUP.baseRadius + world.mods.magnet * 70;
}

export function bloomPerMote(world) {
  return (PLAYER.bloomPerMote + world.mods.magnet * 2) * (1 + 0.25 * world.mods.bloomCharge);
}

// Only pairs with a real interaction in the simulation belong here. Each rule names the
// owned partner card; `text` receives that partner's level so the card can state the actual
// counts instead of inventing a bonus.
const SYNERGY_RULES = {
  spread: [
    { with: 'pierce', text: (w) => `Thorn Tip: all ${2 + ownedLevel(w, 'spread')} darts pierce ${ownedLevel(w, 'pierce')}.` },
    { with: 'heavy', text: (w) => `Heavy Seed: +${28 * ownedLevel(w, 'heavy')}% damage on all ${2 + ownedLevel(w, 'spread')} darts.` },
    { with: 'crit', text: () => 'Keen Bloom: every dart in the fan rolls crit.' },
    { with: 'frost', text: () => 'Frost Seeds: each dart can chill a different target.' },
  ],
  pierce: [
    { with: 'spread', text: (w, next) => `Spread Seed: your ${1 + ownedLevel(w, 'spread')} darts each pierce +${next}.` },
    { with: 'frost', text: () => 'Frost Seeds: every pierced enemy is chilled.' },
    { with: 'crit', text: () => 'Keen Bloom: each pierced hit rolls crit separately.' },
    { with: 'chain', text: () => 'Spark Vine: piercing a crowd feeds more arcs.' },
  ],
  rapid: [
    { with: 'crit', text: () => 'Keen Bloom: more shots per second means more crits.' },
    { with: 'heavy', text: () => 'Heavy Seed: more heavy darts per second.' },
    { with: 'chain', text: () => 'Spark Vine: more hits means more arcs.' },
    { with: 'frost', text: () => 'Frost Seeds: chill is refreshed more often.' },
  ],
  heavy: [
    { with: 'spread', text: (w, next) => `Spread Seed: +${28 * next}% damage on every dart in the fan.` },
    { with: 'chain', text: () => 'Spark Vine: arc damage scales with dart damage.' },
    { with: 'crit', text: () => 'Keen Bloom: crits double these heavier hits.' },
  ],
  homing: [
    { with: 'ricochet', text: () => 'Ricoherb: the dart keeps curving after a bounce.' },
    { with: 'frost', text: () => 'Frost Seeds: seeking darts carry chill to evasive targets.' },
    { with: 'pierce', text: () => 'Thorn Tip: seeking darts line up extra pierces.' },
  ],
  orbit: [
    { with: 'lifesteal', text: (w, next, partner) => `Sap Siphon: petal kills heal ${2 * partner} HP.` },
  ],
  thorn: [
    { with: 'lifesteal', text: (w, next, partner) => `Sap Siphon: briar kills heal ${2 * partner} HP.` },
  ],
  dashTrail: [
    { with: 'flit', text: () => 'Flit: faster dash recharge leaves more burning wakes.' },
  ],
  lifesteal: [
    { with: 'orbit', text: (w, next) => `Orbiting Petals: each petal kill can heal ${2 * next} HP.` },
    { with: 'thorn', text: (w, next) => `Thorn Aura: each briar kill can heal ${2 * next} HP.` },
  ],
  magnet: [
    { with: 'satchel', text: () => 'Pollen Satchel: extra motes, all pulled from farther.' },
    { with: 'bloomCharge', text: (w, next, partner) => `Wild Bloom: wider pickup feeds Bloom ${25 * partner}% faster.` },
  ],
  crit: [
    { with: 'rapid', text: () => 'Quick Pollen: more shots per second, more crits.' },
    { with: 'spread', text: () => 'Spread Seed: every dart in the fan rolls crit.' },
    { with: 'pierce', text: () => 'Thorn Tip: each pierced hit rolls crit separately.' },
    { with: 'heavy', text: () => 'Heavy Seed: crits double a heavier dart.' },
  ],
  ricochet: [
    { with: 'crit', text: () => 'Keen Bloom: bounces keep the dart crit chance.' },
    { with: 'frost', text: () => 'Frost Seeds: bounced hits chill too.' },
    { with: 'homing', text: () => 'Seeking Seed: the dart re-aims after a bounce.' },
    { with: 'chain', text: () => 'Spark Vine: bounces and arcs cover a packed glade.' },
  ],
  frost: [
    { with: 'chain', text: () => 'Spark Vine: chain arcs now carry the chill.' },
    { with: 'pierce', text: () => 'Thorn Tip: every pierced enemy is chilled.' },
    { with: 'spread', text: () => 'Spread Seed: each dart can chill a different target.' },
    { with: 'ricochet', text: () => 'Ricoherb: bounced hits chill too.' },
  ],
  chain: [
    { with: 'frost', text: () => 'Frost Seeds: chain arcs now carry the chill.' },
    { with: 'heavy', text: () => 'Heavy Seed: arc damage scales with dart damage.' },
    { with: 'spread', text: () => 'Spread Seed: more darts means more arcs.' },
    { with: 'rapid', text: () => 'Quick Pollen: more hits means more arcs.' },
  ],
  bloomCharge: [
    { with: 'magnet', text: (w, next) => `Pollen Magnet: a wider pull feeds Bloom ${25 * next}% faster.` },
    { with: 'satchel', text: () => 'Pollen Satchel: extra motes fill the meter faster.' },
    { with: 'bloomPower', text: () => 'Bright Bloom: reach the stronger blast sooner.' },
  ],
  bloomPower: [
    { with: 'linger', text: (w, next) => `Lasting Bloom: lingering ticks burn ${15 * next}% harder.` },
    { with: 'bloomCharge', text: () => 'Wild Bloom: charge the stronger blast sooner.' },
  ],
  flit: [
    { with: 'dashTrail', text: () => 'Verdant Wake: more dashes means more burning trails.' },
  ],
  linger: [
    { with: 'bloomPower', text: (w, next, partner) => `Bright Bloom: lingering ticks burn ${15 * partner}% harder.` },
  ],
  satchel: [
    { with: 'magnet', text: () => 'Pollen Magnet: extra motes are pulled from farther.' },
    { with: 'bloomCharge', text: () => 'Wild Bloom: extra motes fill Bloom faster.' },
  ],
};

/** Up to two real combos between this card and upgrades already owned. */
export function draftSynergies(world, card) {
  const rules = SYNERGY_RULES[card.id];
  if (!rules || !world) return [];
  const next = ownedLevel(world, card.id) + 1;
  const lines = [];
  for (const rule of rules) {
    const partner = ownedLevel(world, rule.with);
    if (partner <= 0) continue;
    lines.push(typeof rule.text === 'function' ? rule.text(world, next, partner) : rule.text);
    if (lines.length >= 2) break;
  }
  return lines;
}
