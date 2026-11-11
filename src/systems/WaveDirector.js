import Phaser from 'phaser';
import { W } from '../config.js';

const spline = (pts) => new Phaser.Curves.Spline(pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
const mirror = (pts) => pts.map(([x, y]) => [W - x, y]);

// Loop-the-loop entering from the top left and leaving bottom right.
const SWOOP = [[-24, 30], [60, 110], [170, 150], [205, 90], [150, 40], [80, 90], [90, 190], [170, 260], [230, 360]];

export default class WaveDirector {
  constructor(scene, level) {
    this.scene = scene;
    this.waves = level.waves;
    this.index = 0;
    this.timer = 2.5; // grace period before the first wave
    this.pendingSpawns = 0;
    this.done = false;
    this.paths = { swoopL: spline(SWOOP), swoopR: spline(mirror(SWOOP)) };
  }

  update(dt) {
    if (this.done) return;
    this.timer -= dt;
    const cleared = this.pendingSpawns === 0 && this.scene.liveEnemyCount() === 0;
    if (this.timer <= 0 || (cleared && this.timer < this.lastWait - 1.2)) {
      if (this.index >= this.waves.length) {
        if (cleared) { this.done = true; this.scene.startBossSequence(); }
        return;
      }
      const def = this.waves[this.index++];
      this.spawnWave(def);
      this.timer = def.wait ?? 6;
      this.lastWait = this.timer;
    }
  }

  skipToBoss() {
    this.index = this.waves.length;
    this.timer = 0;
  }

  // Schedules the enemies of one wave. `wave` tracks kills so a fully
  // destroyed formation can reward the player with a power-up.
  spawnWave(def) {
    const n = def.n ?? 1;
    const wave = { total: def.f === 'rocks' ? 0 : n, killed: 0 };
    const gap = def.gap ?? 0.3;
    const at = (i, fn) => {
      this.pendingSpawns++;
      this.scene.time.delayedCall(i * 1000, () => { this.pendingSpawns--; fn(); });
    };
    const spawn = (type, x, y, opts) => this.scene.spawnEnemy(type, x, y, { wave, ...opts });
    const type = def.type ?? 'grunt';

    switch (def.f) {
      case 'line': {
        for (let i = 0; i < n; i++) {
          const x = 24 + ((W - 48) * i) / Math.max(1, n - 1);
          at(i * 0.08, () => spawn(type, x, -24, { pattern: def.pattern ?? 'dive', speed: 55 }));
        }
        break;
      }
      case 'vee': {
        const mid = (n - 1) / 2;
        for (let i = 0; i < n; i++) {
          const x = W / 2 + (i - mid) * 26;
          const y = -24 - Math.abs(i - mid) * 18;
          at(0, () => spawn(type, x, y, { pattern: 'dive', speed: 60 }));
        }
        break;
      }
      case 'column': {
        const x = def.x ?? Phaser.Math.Between(50, W - 50);
        for (let i = 0; i < n; i++) {
          at(i * (def.gap ?? 0.35), () => spawn(type, x, -24, { pattern: def.pattern ?? 'dive', speed: 65, dir: x < W / 2 ? 1 : -1 }));
        }
        break;
      }
      case 'zigzag': {
        for (let i = 0; i < n; i++) {
          const left = i % 2 === 0;
          at(i * 0.4, () => spawn(type, left ? 40 : W - 40, -24, { pattern: 'zigzag', speed: 50, dir: left ? 1 : -1 }));
        }
        break;
      }
      case 'swoopL':
      case 'swoopR': {
        const path = this.paths[def.f];
        for (let i = 0; i < n; i++) {
          const p0 = path.getPoint(0);
          at(i * gap, () => spawn(type, p0.x, p0.y, { pattern: 'path', path, speed: 95 }));
        }
        break;
      }
      case 'hover': {
        for (let i = 0; i < n; i++) {
          const x = (W * (i + 1)) / (n + 1);
          const ty = 50 + (i % 2) * 30;
          at(i * 0.4, () => spawn(type, x, -30, { pattern: 'hover', targetY: ty, hold: 7, speed: 50 }));
        }
        break;
      }
      case 'tank':
        at(0, () => spawn('tank', def.x ?? W / 2, -40, { pattern: 'tank', targetY: 64, hold: 14, speed: 40 }));
        break;
      case 'kamikaze': {
        for (let i = 0; i < n; i++) {
          at(i * gap, () => spawn(type, Phaser.Math.Between(30, W - 30), -24, { pattern: 'kamikaze', speed: 80 }));
        }
        break;
      }
      case 'rocks': {
        for (let i = 0; i < n; i++) {
          at(i * gap, () => spawn('rock', Phaser.Math.Between(20, W - 20), -30, {
            pattern: 'dive', speed: Phaser.Math.Between(35, 60), vx: Phaser.Math.Between(-15, 15),
          }));
        }
        break;
      }
      default:
        console.warn('Unknown formation', def.f);
    }
  }
}
