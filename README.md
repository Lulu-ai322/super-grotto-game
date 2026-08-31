# Super Grotto Escape

A playable platformer built with [Phaser 3](https://phaser.io/phaser3) using the
**"Super Grotto Escape"** asset pack by Luis Zuno ([@ansimuz](https://ansimuz.com)),
with extra creatures from the **Tiny RPG** pack and UI from the **Pixel UI** pack.

> Live demo: **https://super-grotto-escape.netlify.app**

## How to play

- **Move** — `←` / `→` or `A` / `D`
- **Jump / double-jump** — `↑` / `W` / `Space`
- **Shoot** — `X` / `J`
- **Duck** — `↓` / `S`
- On **touch devices**, on-screen buttons appear (move left/right, jump, shoot).

Reach the **gate** at the end of each level to escape and unlock the next one.

## Game features

- **15 levels** of increasing difficulty (levels 3+ introduce new enemy types).
- **Levels 1-10 (Grotto)** — levels 1-9 are the standard grotto, with **Level 9** the
  hardest standard level (hordes of demons, bats & blood creatures).
- **Level 10 — Final Boss**: a **Minotaur** boss fight.
  - The minotaur hunts you across a compact arena and swings when you're close.
  - A dedicated **boss HP bar** (top-center) shows its remaining health.
  - Destroying it triggers a big explosion and unlocks the next chapter.
  - Boss logic lives in its own file: `boss.js`.
- **Levels 11-15 (Fort of Illusion)** — a second chapter after the boss finale with a
  brand-new fort environment: its own tileset/platforms, castle/mountain parallax
  backgrounds, and fort props (banners, flags, windows, doors).
- **Level 16 — Fort Finale Boss**: the **Gollux** boss fights you in the fort. It
  glides toward you, fires ranged energy projectiles, and slams when you get close.
- **Score & 3-star rating** — full score earns 3 stars on the win screen.
- **Player health bar** (uses the Pixel UI bar asset), red when low.
- **Environment decoration** — palm trees and plants in the grotto levels, fort props
  in the fort levels, plus animated **force-field** barriers on later levels.
- Persistent level-unlock progress (saved in `localStorage`).

## Assets

- **Environment / world / props / player / base enemies** — `Super Grotto Escape` (ansimuz).
- **Fort of Illusion environment** (levels 11+) — `Fort of Illusion` (tonyredhead).
- **Demon & Blood creatures** — `Tiny RPG` (press start).
- **UI panels, bars & medallions** — `Pixel UI`.
 - **Minotaur boss + HP bar** — `mino v1.1` free.
 - **Gollux boss** (fort finale) — `Bosses_Gollux` free.
- **Music** — included under `assets/audio/` (see licensing in the pack).

## Project structure

```
index.html    Entry point (loads game.js + boss.js + gollux.js)
game.js       Core game code: scenes, levels, player, enemies, HUD
boss.js       Minotaur boss: assets, AI, HP bar, defeat
gollux.js     Gollux (fort finale) boss: assets, AI, ranged/melee, defeat
assets/
  env/        Tileset, parallax backgrounds, plants, force fields
  fort/       Fort of Illusion tileset, backgrounds, props (levels 11+)
  enemies/    Slime, bat, skeleton, demon, blood, minotaur
  boss/       Gollux boss spritesheets (fort finale)
  player/     Player sprites
  props/      Batteries, crate, gate
  fx/         Explosions, pickups, bullets
  ui/         Panels, health bars, round stars / medallions
  audio/      Background music
```

## Local setup

Just serve the folder (any static server works, e.g. `python3 -m http.server`).

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Requires an internet connection for the Phaser CDN, or download Phaser and host it locally.
