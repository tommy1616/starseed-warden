// A seeded random generator (mulberry32). Every roll in the simulation comes from here, so
// a seed and a sequence of inputs always replay the same run — which is what makes the
// screenshot scenes and the debug defeat reproducible.
export function createRng(seed) {
  let state = (seed | 0) ^ 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    chance(probability) {
      return next() < probability;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
    shuffle(list) {
      for (let i = list.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      return list;
    },
  };
}

/** Integer seed from any string, so a URL seed can be a word too. */
export function seedFromText(text, fallback = 1) {
  const value = Number.parseInt(text ?? '', 10);
  if (Number.isInteger(value) && Number.isFinite(value)) return value >>> 0;
  let hash = 2166136261;
  for (const char of String(text ?? '')) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || fallback;
}
