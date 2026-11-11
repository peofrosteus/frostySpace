# Frosty Space

A retro 2D vertical space shooter built with [Phaser 3](https://phaser.io) and Vite.
It has three stages of enemy waves, power-ups and a multi-part boss fight at the end of each stage.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build
```

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Move |
| Space / Z (hold) | Fire |
| X / B | Bomb (clears bullets, damages everything on screen) |
| P / Esc | Pause |
| M | Mute |

## Gameplay

- **Ships:** four selectable ships (Falcon, Arrow, Wasp, Titan) with different speed and fire rate. Titan starts with a shield.
- **Health:** each life has a 6-segment health bar. Bullets cost 1 HP; collisions and the boss laser cost 2. A short invulnerability blink follows each hit, and HP refills when you lose a life or clear a stage.
- **Power-ups:** gems dropped by destroyed formations, tanks and random kills:
  - red: weapon level, up to 5 (double, then spread, then homing plasma, then a piercing pulse beam);
  - blue: shield;
  - yellow: speed;
  - pink: bomb;
  - orange: repair (+2 HP, or points when you're at full health);
  - teal: extra life.

  Dying drops your weapon one level.
- **Boss:** shoot the part marked by the blinking yellow brackets. Destroy the cannons first, then the helmet, then the core. Each stage's boss is tougher, and the stage-3 boss adds a sweeping ray laser.
- The high score is saved in the browser's `localStorage`.

## Debug URL flags

`?level=2` starts at a stage, `&boss=1` skips straight to the boss, `&god=1` makes you invulnerable, and `&weapon=5` sets the weapon level.

## Project layout

```
src/config.js            constants, ships, enemy types, power-ups
src/levels/levels.js     wave scripts and boss settings per stage
src/scenes/              Boot, Menu, Game, HUD, StageClear, GameOver
src/entities/            Player, Enemy, Boss, Bullet (pooled)
src/systems/             WaveDirector, Background, Sfx (WebAudio synth)
scripts/import-assets.mjs  copies the sprites used from the art pack
```

To add a stage, append an entry to `LEVELS` in `src/levels/levels.js`.

## Art

The sprites are from the **Legacy Collection** by Luis Zuno ([ansimuz](https://ansimuz.itch.io)), which is CC0-licensed (see `public/assets/LICENSE-art.pdf`).
They come from the Warped top-down shooter ship, enemy, boss and space-environment packs, and from the Explosions and Magic and gems packs.
To re-import them from the original pack:

```bash
npm run import-assets -- "<path to Legacy Collection folder>"
```

Sound effects are synthesised at runtime and the font is Press Start 2P (OFL).
