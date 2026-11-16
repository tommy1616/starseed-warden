# starseed-warden

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/tommy1616/starseed-warden/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/tommy1616/starseed-warden/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Starseed Warden is a top-down nocturnal-garden arena game: a small seed-spirit defends a luminous Starseed from the Hollow across twelve waves and three biomes, drafting Bloom upgrades between fights. Everything — art, sound and music — is generated in code and synthesized at runtime.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## How to play

- **Move** with WASD or the arrow keys; **aim** with the mouse.
- **Hold left mouse or J** to fire seed-darts; **Space or Shift** dashes with a moment of invulnerability.
- **E or right mouse** releases Bloom when the pollen meter is full; it damages the Hollow and clears nearby shots.
- **Esc or P** pauses, **M** toggles sound. Survive all twelve waves and defeat The Withering Crown; if the Warden or the Starseed falls, the run ends.

## Project layout

- `main.ts` — entrypoint: sanity-checks the game and screenshots, copies them to the output directory, writes `dossier.json`.
- `serve.ts` — small static server for local play.
- `game/index.html`, `game/style.css` — the canvas page.
- `game/src/main.js` — boot and the one fixed-step loop.
- `game/src/state.js` — title / play / draft / pause / results screen machine.
- `game/src/config.js`, `palette.js` — tuning, geometry and the night-garden palette.
- `game/src/world.js` — simulation orchestration, wave hand-offs and run outcome.
- `game/src/player.js`, `starseed.js` — the Warden's kit and the Starseed's shell.
- `game/src/enemies.js`, `bosses.js`, `projectiles.js`, `pickups.js` — the Hollow, its bosses, shots and pollen.
- `game/src/waves.js` — wave director and biome table.
- `game/src/upgrades.js` — the 23-card Bloom Draft pool and stacking effects.
- `game/src/combat.js`, `scoring.js`, `particles.js`, `camera.js` — hits, score, debris, shake and hit-stop.
- `game/src/audio.js`, `music.js` — synthesized SFX and the generative ambient score.
- `game/src/input.js`, `rng.js`, `storage.js` — controls, seeded randomness and saved bests.
- `game/src/render/` — view, background, entities, effects, HUD, title, draft, pause, results and icons.
- `game/src/ui/buttons.js` — canvas menu buttons, hover and keyboard focus.
- `game/src/shots.js` — deterministic screenshot scenes and the simple autopilot.
- `tools/shoot.mjs`, `tools/playtest.mjs`, `tools/browser.mjs` — headless Chrome screenshot and playtest tools.
- `screenshots/` — the four published captures.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1b9yy072&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
