// Small read-only field queries. The HUD needs a count, not the whole simulation module, so
// these live apart from world.js and stay cheap to import.
export function remainingEnemies(world) {
  let alive = 0;
  for (const enemy of world.enemies) if (!enemy.dead) alive += 1;
  return alive + world.spawnQueue.length + (world.boss ? 1 : 0);
}
