// Starseed Warden — make.fun best-game-01 entry.
//
// The game itself lives in game/: plain static HTML, CSS and ES modules that a desktop
// browser runs offline. This program is the hand-in step the bounty expects: it publishes
// a copy of game/ and screenshots/ into the output directory, then writes dossier.json,
// the source summary the judge reads, using the kit's vendored buildDossier library.
//
// Node 22, standard library only. The scorer runs this twice and compares the bytes, so
// every step is deterministic: no timestamps, no hashes of file mtimes, no directory
// iteration that depends on insertion order.
//
// Local use:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The same reference caps the bounty's gate uses. text_max_bytes trims the dossier text;
// the rest refuse an oversized or overfull entry instead of writing something the scorer
// would discard.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const SHOT_NAMES = /\.(png|jpe?g)$/i;

function fail(message: string): never {
  console.error(`starseed-warden: ${message}`);
  process.exit(1);
}

/** Refuse to publish a game the browser cannot boot or a screenshot set outside the rules. */
function sanityCheck(): void {
  const index = join(ROOT, 'game', 'index.html');
  if (!existsSync(index) || !statSync(index).isFile()) {
    fail('game/index.html is missing — the entry would not open in a browser');
  }

  const shotDir = join(ROOT, 'screenshots');
  if (!existsSync(shotDir) || !statSync(shotDir).isDirectory()) {
    fail('screenshots/ is missing — the dossier needs 3 or 4 real renders');
  }
  const shots = readdirSync(shotDir)
    .filter((name) => !name.startsWith('.') && SHOT_NAMES.test(name))
    .sort();
  if (shots.length < 3 || shots.length > 4) {
    fail(`screenshots/ holds ${shots.length} images; the gate wants 3 or 4`);
  }
}

function publishGame(): void {
  const from = join(ROOT, 'game');
  const to = join(OUTPUT, 'game');
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function publishScreenshots(): void {
  const from = join(ROOT, 'screenshots');
  const to = join(OUTPUT, 'screenshots');
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function writeDossier(): void {
  const dossier = buildDossier(OUTPUT, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT, 'dossier.json'), dossier);
}

function main(): void {
  sanityCheck();
  mkdirSync(OUTPUT, { recursive: true });
  publishGame();
  publishScreenshots();
  writeDossier();
  console.log(`starseed-warden: published game/, screenshots/ and dossier.json to ${OUTPUT}`);
}

main();
