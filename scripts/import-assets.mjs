// Copies the sprites frostySpace uses from the "Legacy Collection" art pack
// into public/assets/, flattened and renamed.
//
// Usage: npm run import-assets -- "<path to Legacy Collection folder>"
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2];
if (!root || !existsSync(join(root, 'Assets'))) {
  console.error('Usage: npm run import-assets -- "<path to Legacy Collection folder>"');
  process.exit(1);
}

const A = join(root, 'Assets');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');

const SHIP = 'Warped/Characters/top-down-shooter-ship/spritesheets';
const ENEMY = 'Warped/Characters/top-down-shooter-enemies/spritesheets';
const BOSS = 'Warped/Characters/top-down-boss/PNG/spritesheets';
const SPACE = 'Warped/Environments/top-down-space-environment/PNG/layers';
const FX = 'Explosions and Magic/Warped shooting fx';

const files = {
  // player
  'player/ship-01.png': `${SHIP}/yellow/ship-01.png`,
  'player/ship-02.png': `${SHIP}/yellow/ship-02.png`,
  'player/ship-03.png': `${SHIP}/yellow/ship-03.png`,
  'player/ship-04.png': `${SHIP}/yellow/ship-04.png`,
  'player/thrust-01.png': `${SHIP}/thrust/ship-01.png`,
  'player/thrust-03.png': `${SHIP}/thrust/ship-03.png`,
  'player/thrust-04.png': `${SHIP}/thrust/ship-04.png`,
  // enemies
  'enemies/enemy-01.png': `${ENEMY}/enemy-01.png`,
  'enemies/enemy-02.png': `${ENEMY}/enemy-02.png`,
  'enemies/enemy-03.png': `${ENEMY}/enemy-03.png`,
  'enemies/enemy-explosion.png': `${ENEMY}/enemy-explosion.png`,
  'enemies/alien-flying.png': 'Warped/Characters/alien-flying-enemy/spritesheet.png',
  'enemies/red-ship-01.png': `${SHIP}/red/ship-01.png`,
  // boss
  'boss/boss.png': `${BOSS}/boss.png`,
  'boss/boss-thrust.png': `${BOSS}/boss-thrust.png`,
  'boss/cannon-left.png': `${BOSS}/cannon-left.png`,
  'boss/cannon-right.png': `${BOSS}/cannon-right.png`,
  'boss/helmet.png': `${BOSS}/helmet.png`,
  'boss/bolt.png': `${BOSS}/bolt.png`,
  'boss/rays.png': `${BOSS}/rays.png`,
  // environment
  'env/stage-back.png': `${SPACE}/stage-back.png`,
  'env/asteroid-01.png': `${SPACE}/cut-out-sprites/asteroid-01.png`,
  'env/asteroid-02.png': `${SPACE}/cut-out-sprites/asteroid-02.png`,
  'env/asteroid-03.png': `${SPACE}/cut-out-sprites/asteroid-03.png`,
  'env/asteroid-04.png': `${SPACE}/cut-out-sprites/asteroid-04.png`,
  'env/asteroid-05.png': `${SPACE}/cut-out-sprites/asteroid-05.png`,
  'env/planet.png': `${SPACE}/cut-out-sprites/planet.png`,
  'env/eclipse-1.png': `${SPACE}/cut-out-sprites/eclipse-1.png`,
  'env/eclipse-2.png': `${SPACE}/cut-out-sprites/eclipse-2.png`,
  'env/blue-stars.png': 'Warped/Environments/space_background_pack/Blue Version/layered/blue-stars.png',
  'env/rock-1.png': 'Warped/Misc/asteroid-fighter Pack/PNG/asteroids/asteroid-1.png',
  'env/rock-2.png': 'Warped/Misc/asteroid-fighter Pack/PNG/asteroids/asteroid-2.png',
  // fx
  'fx/bolt.png': `${FX}/Bolt/spritesheet.png`,
  'fx/charged.png': `${FX}/charged/spritesheet.png`,
  'fx/pulse.png': `${FX}/Pulse/spritesheet.png`,
  'fx/hits-1.png': `${FX}/hits/hits-1/spritesheet.png`,
  'fx/hits-2.png': `${FX}/hits/Hits-2/spritesheet.png`,
  'fx/explosion.png': 'Explosions and Magic/Explosions pack/explosion-1-b/spritesheet.png',
  // pickups
  'items/gems.png': 'Misc/gems/spritesheets/gems-spritesheet.png',
};

let n = 0;
for (const [dest, src] of Object.entries(files)) {
  const from = join(A, src);
  const to = join(out, dest);
  if (!existsSync(from)) {
    console.error(`Missing: ${src}`);
    process.exitCode = 1;
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  n++;
}
const license = join(root, 'public-license.pdf');
if (existsSync(license)) copyFileSync(license, join(out, 'LICENSE-art.pdf'));
console.log(`Copied ${n} files to ${out}`);
