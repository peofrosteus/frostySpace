export const W = 256;
export const H = 320;
export const FONT = '"Press Start 2P"';

// Player ships. `hitY` is the vertical offset of the hit circle from the
// sprite centre; `thrustY` is where the engine flame attaches.
export const SHIPS = [
  { key: 'ship-01', name: 'FALCON', size: 48, thrust: 'thrust-01', thrustY: 20, hitY: 7, speed: 120, fireDelay: 120, desc: 'BALANCED' },
  { key: 'ship-03', name: 'ARROW', size: 48, thrust: 'thrust-03', thrustY: 20, hitY: 9, speed: 145, fireDelay: 130, desc: 'FAST' },
  { key: 'ship-04', name: 'WASP', size: 48, thrust: 'thrust-04', thrustY: 18, hitY: 7, speed: 115, fireDelay: 95, desc: 'RAPID FIRE' },
  { key: 'ship-02', name: 'TITAN', size: 64, thrust: 'thrust-03', thrustY: 30, hitY: 11, speed: 100, fireDelay: 125, desc: 'STARTS SHIELDED' },
];

export const MAX_WEAPON = 5;
export const START_LIVES = 3;
export const START_BOMBS = 2;
// Hit points per life. Bullets do 1 damage; collisions and boss lasers do 2.
export const MAX_HP = 6;

// Gem sheet is a 16x16 grid, 53 columns. Top gem row is grid row 2, each
// colour has 7 animation frames starting at column 4 + colour * 8.
export const GEM_COLS = 53;
export const gemFrame = (colour, f) => 2 * GEM_COLS + 4 + colour * 8 + f;

// Power-up kinds -> gem colour index and drop weight.
export const POWERUPS = {
  weapon: { colour: 2, weight: 34, label: 'POWER UP' },  // red
  shield: { colour: 5, weight: 15, label: 'SHIELD' },    // blue
  speed: { colour: 3, weight: 14, label: 'SPEED UP' },   // yellow
  bomb: { colour: 4, weight: 14, label: 'BOMB +1' },     // pink
  repair: { colour: 1, weight: 17, label: 'REPAIR' },    // orange: +2 HP
  life: { colour: 0, weight: 6, label: '1UP' },          // teal
};

export const ENEMY_TYPES = {
  grunt: { tex: 'enemy-01', anim: 'enemy-01-fly', hp: 2, score: 100, radius: 12 },
  shooter: { tex: 'enemy-02', anim: 'enemy-02-fly', hp: 5, score: 200, radius: 13, fireRate: 1.7 },
  swooper: { tex: 'enemy-03', anim: 'enemy-03-fly', hp: 3, score: 150, radius: 12 },
  interceptor: { tex: 'red-ship-01', anim: 'red-ship-fly', hp: 3, score: 150, radius: 10, flipY: true },
  tank: { tex: 'alien-flying', anim: 'alien-fly', hp: 45, score: 1500, radius: 22, fireRate: 1.4 },
  rock: { tex: 'asteroid-02', hp: 6, score: 50, radius: 15 },
};

export const DEPTH = {
  bg: 0, stars: 1, props: 2, pickups: 5, boss: 8, enemies: 10, pBullets: 12,
  player: 15, eBullets: 20, fx: 25, banner: 30,
};

export const HISCORE_KEY = 'frostyspace.hiscore';

export function loadHiscore() {
  try { return parseInt(localStorage.getItem(HISCORE_KEY) || '0', 10) || 0; } catch { return 0; }
}
export function saveHiscore(v) {
  try { localStorage.setItem(HISCORE_KEY, String(v)); } catch { /* storage unavailable */ }
}

export function text(scene, x, y, str, size = 8, color = '#ffffff') {
  return scene.add.text(Math.round(x), Math.round(y), str, {
    fontFamily: FONT, fontSize: `${size}px`, color, align: 'center',
  });
}

export const pad = (n, len = 6) => String(Math.max(0, Math.floor(n))).padStart(len, '0');

// Debug flags from the URL, e.g. ?level=3&boss=1&god=1
export const DEBUG = (() => {
  const p = new URLSearchParams(window.location.search);
  return {
    level: p.has('level') ? Math.max(1, Math.min(3, parseInt(p.get('level'), 10) || 1)) : null,
    boss: p.get('boss') === '1',
    god: p.get('god') === '1',
    weapon: p.has('weapon') ? parseInt(p.get('weapon'), 10) : null,
  };
})();
