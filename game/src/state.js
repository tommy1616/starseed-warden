// Screen machine: title, play, draft, pause and results; it owns the run and the best record.
import { GUARDIANS, guardianById } from './guardians.js';
import { DIFFICULTIES } from './config.js';
import { createWorld } from './world.js';
import { difficultyById } from './waves.js';
import { createUi } from './ui/buttons.js';
import { drawDraft, takeUpgrade, ownedCards } from './upgrades.js';
import { readBest, writeBest } from './storage.js';
import { accuracy } from './scoring.js';
import { ACTION } from './input.js';
import { OATHS, oathById } from './oaths.js';
import { evolutionsFor, applyEvolution } from './evolutions.js';

export const SCREEN = {
  title: 'title',
  play: 'play',
  draft: 'draft',
  evolve: 'evolve',
  paused: 'paused',
  results: 'results',
};

export function createApp(options = {}) {
  const difficulty = difficultyById(options.difficultyId ?? 'warden');
  const app = {
    seed: (options.seed ?? Math.floor(Math.random() * 4294967296)) >>> 0,
    shotMode: Boolean(options.shotMode),
    audio: options.audio ?? null,
    screen: SCREEN.title,
    previousScreen: SCREEN.title,
    difficultyId: difficulty.id,
    difficulty,
    guardianId: options.guardianId ?? 'seedshot',
    world: null,
    titleWorld: null,
    runIndex: 0,
    best: readBest(difficulty.id),
    draft: null,
    evolution: null,
    results: null,
    ui: createUi(),
    focusAction: 'play',
    showHowTo: false,
    screenTime: 0,
    soundOn: options.audio ? !options.audio.muted : true,
    announce: () => {},
  };
  app.titleWorld = makeTitleWorld(app);
  return app;
}

function makeTitleWorld(app) {
  const world = createWorld({
    seed: (app.seed ^ 0x51ed270b) >>> 0,
    difficulty: app.difficulty,
    audio: null,
  });
  world.phase = 'idle';
  world.starseed.x = 1030;
  world.starseed.y = 538;
  world.warden.x = 248;
  world.warden.y = 536;
  world.warden.aimAngle = -0.35;
  return world;
}

export function setDifficulty(app, id) {
  const difficulty = difficultyById(id);
  app.difficulty = difficulty;
  app.difficultyId = difficulty.id;
  app.best = readBest(difficulty.id);
  if (app.titleWorld) app.titleWorld.difficulty = difficulty;
  app.audio?.play('select');
}

/** Pick the start-of-run guardian; it is a build choice, not a per-wave upgrade. */
export function setGuardian(app, id) {
  app.guardianId = guardianById(id).id;
  app.focusAction = `guardian:${app.guardianId}`;
  app.audio?.play('select');
}

function recordProgress(app) {
  if (app.world && !app.results) {
    app.best = writeBest(app.difficultyId, app.world.score.score, app.world.wave);
  }
}

export function startRun(app) {
  recordProgress(app);
  app.runIndex += 1;
  const seed = app.shotMode ? app.seed : (Math.random() * 4294967296) >>> 0;
  app.world = createWorld({ seed, difficulty: app.difficulty, audio: app.audio });
  app.world.startRun(app.guardianId);
  app.screen = SCREEN.play;
  app.previousScreen = SCREEN.play;
  app.draft = null;
  app.evolution = null;
  app.results = null;
  app.focusAction = 'play';
  app.screenTime = 0;
  app.announce(`${guardianById(app.guardianId).name}: Wave 1, Moonlit Meadow. Defend the Starseed.`);
  app.audio?.setScene(0, false);
}

export function openDraft(app, cards = null) {
  if (!app.world) return;
  app.world.requestDraft = false;
  const options = app.shotMode && app.shotDraftOptions ? app.shotDraftOptions : {};
  app.draft = {
    cards: cards ?? drawDraft(app.world, app.world.rng, options),
    focus: 0,
    time: 0,
    chosen: -1,
    oathId: 'none',
  };
  app.screen = SCREEN.draft;
  app.screenTime = 0;
  app.focusAction = 'card:0';
  app.announce('Bloom Draft: optional garden oath first, then choose a bloom with 1, 2 or 3. Arrows reach all choices.');
}

export function pickDraft(app, index) {
  if (!app.draft || !app.draft.cards[index]) return;
  if (app.draft.chosen >= 0) return;
  const card = app.draft.cards[index];
  app.draft.chosen = index;
  app.draft.focus = index;
  takeUpgrade(app.world, card);
  app.audio?.play('card');
  app.announce(`${card.name} taken.`);
  app.world.nextWave(app.draft.oathId);
  app.screen = SCREEN.play;
  app.screenTime = 0;
  app.focusAction = 'play';
  app.draft = null;
}

/** The wave-5 fork: two mutually exclusive evolutions for this guardian, chosen once per run. */
export function openEvolution(app) {
  if (!app.world) return;
  app.world.requestEvolution = false;
  if (app.world.evolution) return;
  const choices = evolutionsFor(app.world.guardian?.id ?? app.guardianId);
  if (choices.length === 0) return;
  app.evolution = { choices, focus: 0, chosen: -1, time: 0 };
  app.screen = SCREEN.evolve;
  app.screenTime = 0;
  app.focusAction = 'evolution:0';
  app.announce('Guardian Evolution: choose one path for the rest of this run. The other closes.');
}

export function pickEvolution(app, index) {
  if (!app.evolution || app.evolution.chosen >= 0) return;
  const choice = app.evolution.choices[index];
  if (!choice) return;
  app.evolution.chosen = index;
  app.evolution.focus = index;
  const applied = applyEvolution(app.world, choice);
  app.audio?.play(applied ? 'card' : 'select');
  app.announce(applied ? `${choice.name} chosen. ${choice.cost}` : 'This run already has an evolution.');
  app.screen = SCREEN.play;
  app.screenTime = 0;
  app.focusAction = 'play';
  app.evolution = null;
}

export function pauseGame(app) {
  if (app.screen !== SCREEN.play) return;
  app.previousScreen = app.screen;
  app.screen = SCREEN.paused;
  app.screenTime = 0;
  app.focusAction = 'resume';
  app.announce('Paused.');
}

export function resumeGame(app) {
  if (app.screen !== SCREEN.paused) return;
  app.screen = SCREEN.play;
  app.screenTime = 0;
  app.focusAction = 'play';
  app.announce('Playing.');
}

export function quitToTitle(app) {
  recordProgress(app);
  app.screen = SCREEN.title;
  app.screenTime = 0;
  app.draft = null;
  app.results = null;
  app.world = null;
  app.titleWorld = makeTitleWorld(app);
  app.focusAction = 'play';
  app.showHowTo = false;
  app.audio?.setScene(0, false);
  app.announce('Starseed Warden title screen.');
}

export function endRun(app) {
  const world = app.world;
  if (!world || app.results) return;
  const victory = world.outcome === 'victory';
  const score = Math.round(world.score.score);
  const previous = app.best;
  const newBest = score > previous.score;
  const saved = writeBest(app.difficultyId, score, world.wave);
  app.best = saved;
  const seedFraction = world.starseed.hp / world.starseed.maxHp;
  let stars = 0;
  if (victory) stars = seedFraction >= 0.8 ? 3 : seedFraction >= 0.5 ? 2 : 1;
  const upgradesTaken = Math.max(0, ownedCards(world).reduce((sum, entry) => sum + entry.level, 0) - (world.startingUpgrades ?? 0));
  app.results = {
    victory,
    stars,
    score,
    bestScore: saved.score,
    bestWave: saved.wave,
    wavesCleared: victory ? 12 : Math.max(0, Math.min(11, world.wave - 1)),
    kills: world.score.kills,
    eliteKills: world.score.eliteKills,
    accuracy: accuracy(world.score),
    time: world.runTime,
    upgradesTaken,
    comboBest: world.score.comboBest,
    newBest,
    difficulty: app.difficulty.name,
    lostReason: world.lostReason,
    oathsCompleted: world.oathsCompleted,
    oathBonus: world.oathBonus,
    evolution: world.evolution ? `${world.evolution.name} · ${world.evolution.kicker}` : null,
  };
  app.screen = SCREEN.results;
  app.screenTime = 0;
  app.focusAction = 'again';
  app.announce(victory ? 'Victory. The grove endures.' : 'Defeat. The Starseed fades.');
}

export function toggleSound(app) {
  if (!app.audio) return;
  if (app.audio.muted) {
    app.audio.unlock();
    app.audio.setMuted(false);
    app.audio.setScene(app.world ? app.world.biomeIndex : 0, Boolean(app.world && app.world.boss));
  } else {
    app.audio.setMuted(true);
  }
  app.soundOn = !app.audio.muted;
  app.audio.play('click');
}

export function toggleHowTo(app) {
  app.showHowTo = !app.showHowTo;
  app.focusAction = app.showHowTo ? 'howto' : 'play';
  app.audio?.play('click');
}

const FOCUS = {
  title: ['play', ...GUARDIANS.map((guardian) => `guardian:${guardian.id}`), 'diff:sprout', 'diff:warden', 'diff:eclipse', 'howto', 'sound'],
  paused: ['resume', 'restart', 'quit', 'sound'],
  results: ['again', 'title'],
};

export function cycleFocus(app, delta) {
  if (app.screen === SCREEN.draft && app.draft) {
    const choices = [...app.draft.cards.map((_, i) => `card:${i}`), ...OATHS.map(o => `oath:${o.id}`)];
    const current = Math.max(0, choices.indexOf(app.focusAction));
    app.focusAction = choices[(current + delta + choices.length) % choices.length];
    app.draft.focus = app.focusAction.startsWith('card:') ? Number(app.focusAction.slice(5)) : -1;
    app.audio?.play('select');
    return;
  }
  if (app.screen === SCREEN.evolve && app.evolution) {
    const count = app.evolution.choices.length;
    const current = Math.max(0, app.evolution.focus);
    app.evolution.focus = (current + delta + count) % count;
    app.focusAction = `evolution:${app.evolution.focus}`;
    app.audio?.play('select');
    return;
  }
  const list = FOCUS[app.screen];
  if (!list) return;
  let index = list.indexOf(app.focusAction);
  if (index < 0) index = 0;
  index = (index + delta + list.length) % list.length;
  app.focusAction = list[index];
  app.audio?.play('select');
}

export function dispatch(app, action) {
  if (!action) return;
  if (action === 'play') {
    startRun(app);
  } else if (action === 'again') {
    startRun(app);
  } else if (action === 'title' || action === 'quit') {
    quitToTitle(app);
  } else if (action === 'resume') {
    resumeGame(app);
  } else if (action === 'restart') {
    startRun(app);
  } else if (action === 'sound') {
    toggleSound(app);
  } else if (action === 'howto') {
    toggleHowTo(app);
  } else if (action.startsWith('diff:')) {
    setDifficulty(app, action.slice(5));
    app.focusAction = action;
  } else if (action.startsWith('guardian:')) {
    setGuardian(app, action.slice(9));
  } else if (action.startsWith('card:')) {
    pickDraft(app, Number(action.slice(5)));
  } else if (action.startsWith('evolution:')) {
    pickEvolution(app, Number(action.slice(10)));
  } else if (action.startsWith('oath:') && app.screen === SCREEN.draft && app.draft) {
    app.draft.oathId = oathById(action.slice(5)).id;
    app.focusAction = 'card:0';
    app.draft.focus = 0;
    app.announce(`${oathById(app.draft.oathId).name} selected. Choose a Bloom with 1, 2 or 3, or Enter.`);
  }
}

/**
 * Keyboard actions for every screen except movement in play. Returns true when the action was
 * consumed so the caller knows not to treat it as a world control.
 */
export function handleActions(app, actions) {
  if (!actions) return false;
  let handled = false;
  if (actions & ACTION.mute) {
    toggleSound(app);
    handled = true;
  }
  if (actions & ACTION.pause) {
    if (app.screen === SCREEN.play) {
      pauseGame(app);
      handled = true;
    } else if (app.screen === SCREEN.paused) {
      resumeGame(app);
      handled = true;
    }
  }
  if (app.screen === SCREEN.play) return handled;

  if (actions & (ACTION.up | ACTION.left)) {
    cycleFocus(app, -1);
    handled = true;
  }
  if (actions & (ACTION.down | ACTION.right)) {
    cycleFocus(app, 1);
    handled = true;
  }
  if (actions & ACTION.howto && app.screen === SCREEN.title) {
    toggleHowTo(app);
    handled = true;
  }
  if (actions & ACTION.confirm) {
    dispatch(app, app.focusAction);
    handled = true;
  }
  if (app.screen === SCREEN.draft && app.draft) {
    if (actions & ACTION.card1) {
      pickDraft(app, 0);
      handled = true;
    } else if (actions & ACTION.card2) {
      pickDraft(app, 1);
      handled = true;
    } else if (actions & ACTION.card3) {
      pickDraft(app, 2);
      handled = true;
    }
  }
  if (app.screen === SCREEN.evolve && app.evolution) {
    if (actions & ACTION.card1) {
      pickEvolution(app, 0);
      handled = true;
    } else if (actions & ACTION.card2) {
      pickEvolution(app, 1);
      handled = true;
    }
  }
  if (app.screen === SCREEN.title) {
    if (actions & ACTION.card1) setDifficulty(app, 'sprout');
    else if (actions & ACTION.card2) setDifficulty(app, 'warden');
    else if (actions & ACTION.card3) setDifficulty(app, 'eclipse');
  }
  return handled;
}

/** Advance the screen's own clocks and catch the simulation's two hand-offs. */
export function updateApp(app, dt) {
  app.screenTime += dt;
  app.ui.time += dt;
  const world = app.world;
  if (app.screen === SCREEN.title) {
    if (app.titleWorld) {
      app.titleWorld.time += dt;
      app.titleWorld.bannerTimer = 0;
      if (app.titleWorld.starseed) app.titleWorld.starseed.pulse += dt;
    }
    return;
  }
  if (app.screen === SCREEN.draft) {
    if (app.draft) app.draft.time += dt;
    return;
  }
  if (app.screen === SCREEN.evolve) {
    if (app.evolution) app.evolution.time += dt;
    return;
  }
  if (app.screen === SCREEN.results) return;
  if (!world) return;
  if (world.outcome && world.requestResults) {
    endRun(app);
    return;
  }
  if (world.requestDraft) {
    app.shotDraftOptions = app.shotDraftOptions ?? null;
    openDraft(app);
    return;
  }
  if (world.requestEvolution) {
    if (app.shotMode) {
      // Staged scenes must never stall on a menu: topic scenes take the first path silently.
      applyEvolution(world, evolutionsFor(world.guardian?.id ?? app.guardianId)[0]);
      world.requestEvolution = false;
    } else {
      openEvolution(app);
    }
  }
}

export function difficultyList() {
  return DIFFICULTIES;
}
