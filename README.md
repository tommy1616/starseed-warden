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

- **Garden Oaths:** in each between-wave draft, optionally select an oath before choosing your Bloom. Quiet Garden skips the challenge. Unbroken Shell requires zero Starseed HP damage and rewards 18 seed HP +900 score; Dance with Thorns asks for two Perfect Dashes and rewards 25 Warden HP +600; Golden Harvest asks for eight pollen motes and rewards 40 Bloom +700. Defense pays the most, since a whole wave without a scratch is the hardest of the three. Each oath lasts one wave, pays once on clearing it, and never removes your ordinary wave reward on failure. Health and Bloom stay capped. The HUD tracks live progress and flashes when the shell breaks; the draft recalls the last oath; the results count kept oaths. Click an oath, or use arrows and Enter; 1/2/3 still choose a Bloom immediately.

- **Move** with WASD or the arrow keys; **aim** with the mouse.
- **Hold left mouse or J** to fire seed-darts; **Space or Shift** dashes with a moment of invulnerability.
- **Perfect Dash:** brush an enemy shot during a dash without taking damage. The shot is recycled and you gain 12 Bloom. At most one reward per dash; it adds no score, cooldown reset or extra invulnerability.
- **E or right mouse** releases Bloom when the pollen meter is full; it damages the Hollow and clears nearby shots.
- **Esc or P** pauses, **M** toggles sound. Survive all twelve waves and defeat The Withering Crown; if the Warden or the Starseed falls, the run ends.
- The first wave teaches one step at a time (move, fire, dash, collect pollen). Each prompt advances when you perform the action and never blocks play.
- **Bloom Draft** cards mark a **SYNERGY** when the card combines with an upgrade you already own, using the real counts and effects. Draft picks stack; the run keeps the same twelve-wave loop and original art.

## Project layout

- `main.ts` — entrypoint: sanity-checks the game and screenshots, copies them to the output directory, writes `dossier.json`.
- `serve.ts` — small static server for local play.
- `game/index.html`, `game/style.css` — the canvas page.
- `game/src/main.js` — boot and the one fixed-step loop.
- `game/src/state.js` — title / play / draft / pause / results screen machine.
- `game/src/config.js`, `palette.js` — tuning, geometry and the night-garden palette.
- `game/src/world.js` — simulation orchestration, wave hand-offs and run outcome.
- `game/src/player.js`, `starseed.js` — the Warden's kit (including Perfect Dash) and the Starseed's shell.
- `game/src/enemies.js`, `bosses.js`, `projectiles.js`, `pickups.js` — the Hollow, its bosses, shots and pollen.
- `game/src/waves.js` — wave director and biome table.
- `game/src/oaths.js` — the four Garden Oaths: their rules, one-wave progress, capped payout and feedback.
- `game/src/upgrades.js` — the 23-card Bloom Draft pool, stacking effects and real synergy hints.
- `game/src/combat.js`, `scoring.js`, `particles.js`, `camera.js` — hits, score, debris, shake and hit-stop.
- `game/src/audio.js`, `music.js` — synthesized SFX and the generative ambient score.
- `game/src/input.js`, `rng.js`, `storage.js` — controls, seeded randomness and saved bests.
- `game/src/render/` — view, background, entities, effects, HUD, title, draft, pause, results and icons.
- `game/src/ui/buttons.js` — canvas menu buttons, hover and keyboard focus.
- `game/src/shots.js` — deterministic screenshot scenes and the simple autopilot.
- `tools/shoot.mjs`, `tools/playtest.mjs`, `tools/oath-flow.mjs`, `tools/browser.mjs` — headless Chrome screenshot, playtest and real oath-flow tools.
- `screenshots/` — the four published captures.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1b9yy072&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
