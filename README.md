# Emberhold — Tower Defense

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bagusahmad03/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bagusahmad03/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original tower defense game, built for the [make.fun "best-game-01" bounty](https://make.fun/bounty/best-game-01). The Gloom marches down the road toward the Ember Crystal. Build
towers, hold the road for 15 waves, and keep the crystal burning.

## How to play

- **Goal:** stop every wave before the Gloom reaches the Ember Crystal.
  You lose when your 20 lives run out; you win by clearing wave 15.
- **Build:** click a tower card (or press 1–4), then click a free tile beside
  the road. Hold Shift while placing to build several of one kind.
- **Towers:** Spark Spire (rapid bolts), Frost Obelisk (slows enemies),
  Ember Cannon (splash damage), Storm Pylon (chaining lightning). Each has
  three levels — click a placed tower to upgrade or sell it.
- **Waves:** press Space or the Start Wave button. Calling a wave while the
  field is clear pays bonus gold. Every cleared wave pays a bonus too.
- **Enemies:** Skitters are fast, Husks are tough, Wisps resist frost,
  Golems soak damage, and the Gloomlord walks the road on wave 15.

## Controls

| Input | Action |
| --- | --- |
| Mouse | Build, select towers, press buttons |
| 1–4 | Pick a tower type |
| Click a tower | Select it (upgrade / sell) |
| Right-click / Esc | Cancel build choice or selection |
| Space | Start wave (build phase) / pause (during a wave) |
| P | Pause / resume |
| F | Toggle 1x / 2x speed |
| M | Mute / unmute |
| U | Upgrade the selected tower |
| R | Restart |
| Enter | Start / play again |

## Running it

Serve `game/` with any static file server and open `game/index.html` in a
desktop browser. Everything is offline: no library, no download, no network
request of any kind. All art is drawn in code and all sound is synthesized
with WebAudio.

## Layout

- `game/index.html`, `game/style.css` — page and backdrop.
- `game/src/main.js` — state, fixed-step loop, actions.
- `game/src/config.js` — balance, towers, enemies, waves.
- `game/src/map.js` — grid, road, build rules.
- `game/src/towers.js` — placement, upgrades, targeting, firing.
- `game/src/enemies.js` — movement, slows, damage, leaks.
- `game/src/projectiles.js` — homing shots, splash, chain lightning.
- `game/src/particles.js` — bursts, floating text, screen shake.
- `game/src/waves.js` — spawn schedule, bonuses, victory.
- `game/src/render.js` — all drawing: field, towers, enemies, effects.
- `game/src/ui.js` — sidebar, banners, screens, hit-testing.
- `game/src/input.js` — mouse and keyboard.
- `game/src/audio.js` — synthesized sound effects.
- `game/src/util.js` — math and random helpers.
- `game/src/shots.js` — screenshot staging (`?shot=`, see below).
- `game/src/selftest.js` — automated checks (`?selftest=1`, see below).

## Test hooks (query parameters only)

- `?shot=title|action|upgrade|victory|defeat` stages a real game state for
  screenshots, built through the game's own placement and spawn functions.
  The 4 screenshots in `screenshots/` were taken this way in headless
  Chrome: action (cover), title, upgrade, victory.
- `?selftest=1` runs 12 automated checks against the real loop (placement
  rules, upgrades, selling, a full simulated wave, the victory and defeat
  paths, restart, sound, rendering) and writes PASS/FAIL lines into the
  document. It runs only when the parameter is present.

## Honest notes

- Balance (tower costs, enemy health scaling, wave sizes) was set by
  reasoning and simulation, not by human play-testing: the game has never
  been played by a person, and difficulty may be easier or harder than
  intended.
- Play-testing and screenshots were done in headless Chrome on Linux with
  software rendering; desktop Chrome on a real machine was not available.
- The synthesized audio was never heard by a human ear; volumes and tones
  are set by code alone.
- Bot opponents do not exist in this game; the challenge is the wave ladder.

## License

MIT. See LICENSE. `vendor/makefun-game.ts` is the kit's dossier library,
unchanged.
