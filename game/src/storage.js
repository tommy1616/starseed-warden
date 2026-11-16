// Best score and best wave, kept per difficulty in this browser's localStorage. Storage may
// be unavailable (private windows, blocked cookies), so every access is guarded and the
// game simply forgets the record instead of failing.
const PREFIX = 'starseed-warden.v1';

function key(difficulty) {
  return `${PREFIX}.${difficulty}`;
}

export function readBest(difficulty) {
  try {
    const raw = window.localStorage.getItem(key(difficulty));
    if (!raw) return { score: 0, wave: 0 };
    const parsed = JSON.parse(raw);
    return {
      score: Number(parsed.score) || 0,
      wave: Number(parsed.wave) || 0,
    };
  } catch {
    return { score: 0, wave: 0 };
  }
}

export function writeBest(difficulty, score, wave) {
  const previous = readBest(difficulty);
  const next = {
    score: Math.max(previous.score, Math.max(0, Math.round(score))),
    wave: Math.max(previous.wave, Math.max(0, wave)),
  };
  try {
    window.localStorage.setItem(key(difficulty), JSON.stringify(next));
  } catch {
    // Ignore: the record lasts this visit only.
  }
  return next;
}

export function clearBest(difficulty) {
  try {
    window.localStorage.removeItem(key(difficulty));
  } catch {
    // Ignore.
  }
}
