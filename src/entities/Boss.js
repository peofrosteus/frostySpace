import Phaser from 'phaser';
import { W, H, DEPTH } from '../config.js';
import { Sfx } from '../systems/Sfx.js';

// Part offsets are measured from the boss sprite centre (frame is 192x144).
// Hit testing is done with plain rectangles every frame (see partAt/hullAt).
const PARTS = {
  cannonL: { x: -56, y: 40, w: 28, h: 36, stage: 0 },
  cannonR: { x: 56, y: 40, w: 28, h: 36, stage: 0 },
  helmet: { x: 0, y: 2, w: 44, h: 48, stage: 1 },
  // The core spans the exposed face and the purple reactor below it, and
  // reaches the boss's lower edge so shots from below always connect.
  core: { x: 0, y: 26, w: 48, h: 64, stage: 2 },
};

// Armour: shots that hit here (and no live part) are deflected.
const HULL = [
  { x1: -76, y1: -50, x2: 76, y2: 6 },
  { x1: -72, y1: 6, x2: -26, y2: 52 },
  { x1: 26, y1: 6, x2: 72, y2: 52 },
];

export default class Boss {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg; // { hpMul, aggression, rays, name }
    this.a = cfg.aggression;
    this.alive = true;
    this.entering = true;
    this.stage = 0;
    this.t = 0;
    this.timers = { cannon: 1.5, fan: 2.5, burst: 3, spiral: 2, ray: 4 };
    this.cannonSide = 0;
    this.spiralAngle = 0;

    this.thrust = scene.add.sprite(W / 2, -140, 'boss-thrust').play('boss-thrust').setDepth(DEPTH.boss - 1).setFlipY(true);
    this.sprite = scene.add.sprite(W / 2, -90, 'boss', 0).setDepth(DEPTH.boss);

    const hp = (base) => Math.round(base * cfg.hpMul);
    this.parts = {};
    for (const [name, p] of Object.entries(PARTS)) {
      const z = { partName: name, boss: this, x: 0, y: 0, w: p.w, h: p.h, dead: false };
      z.hp = hp({ cannonL: 22, cannonR: 22, helmet: 45, core: 95 }[name]);
      z.maxHp = z.hp;
      this.parts[name] = z;
    }
    this.totalMax = Object.values(this.parts).reduce((s, z) => s + z.maxHp, 0);

    this.ray = scene.add.sprite(0, 0, 'rays', 0).setOrigin(0.5, 0).setDepth(DEPTH.boss + 1).setVisible(false);
    this.rayState = 'off';
    this.smoke = [];
    // Blinking reticle over whichever part can currently be damaged.
    this.marker = scene.add.graphics().setDepth(DEPTH.boss + 1);

    this.syncParts();
    scene.tweens.add({
      targets: this.sprite, y: 76, duration: 3200, ease: 'Sine.easeOut',
      onComplete: () => {
        this.entering = false;
        scene.tweens.add({ targets: this.thrust, alpha: 0, duration: 600 });
      },
    });
  }

  get hpFraction() {
    return Object.values(this.parts).reduce((s, z) => s + Math.max(0, z.hp), 0) / this.totalMax;
  }

  // Part of the current stage under a point, or null. Parts belonging to a
  // later stage are ignored (they are still covered up) so they can never
  // block shots aimed at the current weak point; the hull handles deflection.
  partAt(x, y) {
    if (!this.alive) return null;
    for (const z of Object.values(this.parts)) {
      if (z.dead || PARTS[z.partName].stage !== this.stage) continue;
      if (Math.abs(x - z.x) <= z.w / 2 && Math.abs(y - z.y) <= z.h / 2) return z;
    }
    return null;
  }

  hullAt(x, y) {
    if (!this.alive) return false;
    const dx = x - this.sprite.x;
    const dy = y - this.sprite.y;
    return HULL.some((r) => dx >= r.x1 && dx <= r.x2 && dy >= r.y1 && dy <= r.y2);
  }

  isVulnerable(z) {
    return !this.entering && this.alive && !z.dead && PARTS[z.partName].stage === this.stage;
  }

  hitPart(z, dmg) {
    if (!this.isVulnerable(z)) return false;
    z.hp -= dmg;
    this.sprite.setTint(0xffb0b0);
    this.scene.time.delayedCall(40, () => this.sprite.active && this.sprite.clearTint());
    if (z.partName === 'core') {
      const f = z.hp / z.maxHp;
      this.sprite.setFrame(f < 0.3 ? 4 : f < 0.65 ? 3 : 2);
    }
    if (z.hp <= 0) this.destroyPart(z);
    return true;
  }

  destroyPart(z) {
    z.dead = true;
    const p = this.partPos(z.partName);
    this.scene.bigExplosion(p.x, p.y, 3);
    this.scene.addScore(1000, p.x, p.y);
    if (z.partName.startsWith('cannon')) {
      this.debris(z.partName === 'cannonL' ? 'cannon-left' : 'cannon-right', p.x, p.y, z.partName === 'cannonL' ? -1 : 1);
      this.smoke.push(z.partName);
      if (this.parts.cannonL.dead && this.parts.cannonR.dead) {
        this.smoke = [];
        this.stage = 1;
        this.sprite.setFrame(1);
      }
    } else if (z.partName === 'helmet') {
      this.debris('helmet', p.x, p.y, Phaser.Math.RND.sign());
      this.stage = 2;
      this.sprite.setFrame(2);
    } else if (z.partName === 'core') {
      this.die();
    }
  }

  debris(key, x, y, dir) {
    const d = this.scene.add.image(x, y, key).setDepth(DEPTH.boss + 2);
    this.scene.tweens.add({
      targets: d, x: x + dir * 60, y: y + 180, angle: dir * 300, alpha: 0, duration: 1400, ease: 'Quad.easeIn',
      onComplete: () => d.destroy(),
    });
  }

  partPos(name) {
    const p = PARTS[name];
    return { x: this.sprite.x + p.x, y: this.sprite.y + p.y };
  }

  syncParts() {
    for (const [name, z] of Object.entries(this.parts)) {
      const p = this.partPos(name);
      z.x = p.x;
      z.y = p.y;
    }
    this.thrust.setPosition(this.sprite.x, this.sprite.y - 70);
  }

  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    if (!this.entering) {
      this.sprite.x = W / 2 + Math.sin(this.t * 0.5) * 34;
      this.sprite.y = 76 + Math.sin(this.t * 1.1) * 6;
    }
    this.syncParts();
    this.drawMarker();
    this.updateRay(dt);
    if (this.entering) return;

    // Smoke puffs from destroyed cannons until the stage changes.
    if (this.smoke.length && Math.random() < dt * 6) {
      const p = this.partPos(Phaser.Utils.Array.GetRandom(this.smoke));
      this.scene.spark(p.x + Phaser.Math.Between(-8, 8), p.y + Phaser.Math.Between(-8, 8), 'hit-star');
    }

    const T = this.timers;
    const a = this.a;
    for (const k of Object.keys(T)) T[k] -= dt;

    if (this.stage === 0) {
      if (T.cannon <= 0) {
        T.cannon = 0.9 / a;
        const names = ['cannonL', 'cannonR'].filter((n) => !this.parts[n].dead);
        if (names.length) {
          const n = names[this.cannonSide++ % names.length];
          const p = this.partPos(n);
          this.scene.aimedShot(p.x, p.y + 16, 85 * a, 0);
          if (a > 1.2) this.scene.aimedShot(p.x, p.y + 16, 85 * a, 0.25);
        }
      }
      if (T.fan <= 0) { T.fan = 3.2 / a; this.fan(5, 0.9, 70 * a); }
    } else if (this.stage === 1) {
      if (T.fan <= 0) { T.fan = 2.2 / a; this.fan(9, 1.5, 75 * a); }
      if (T.burst <= 0) { T.burst = 2.8 / a; this.burst(4 + Math.round(a), 105 * a); }
    } else if (this.stage === 2) {
      // Spiral for 2.2s, rest for 1.8s, repeat. Paused while the ray fires.
      const spiralling = (this.t % 4) < 2.2 && this.rayState !== 'beam';
      if (spiralling && T.spiral <= 0) {
        T.spiral = 0.12 / a;
        this.spiralAngle += 0.33;
        const c = this.partPos('core');
        for (let i = 0; i < 3; i++) {
          const ang = this.spiralAngle + (i * Math.PI * 2) / 3;
          this.scene.enemyBullet(c.x, c.y + 10, Math.cos(ang) * 65 * a, Math.sin(ang) * 65 * a);
        }
      }
      if (T.burst <= 0) { T.burst = 3.4 / a; this.burst(3, 110 * a); }
      if (this.cfg.rays && T.ray <= 0 && this.rayState === 'off') { T.ray = 7; this.startRay(); }
    }
  }

  drawMarker() {
    const g = this.marker;
    g.clear();
    if (this.entering) return;
    // Pulse between bright and dim so the target is always visible.
    g.lineStyle(1, 0xffe066, Math.floor(this.t * 4) % 2 ? 0.45 : 1);
    for (const z of Object.values(this.parts)) {
      if (!this.isVulnerable(z)) continue;
      const hw = z.w / 2 + 2;
      const hh = z.h / 2 + 2;
      const c = 5;
      // Corner brackets.
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        const x = z.x + sx * hw;
        const y = z.y + sy * hh;
        g.lineBetween(x, y, x - sx * c, y);
        g.lineBetween(x, y, x, y - sy * c);
      });
    }
  }

  fan(n, spread, speed) {
    const c = { x: this.sprite.x, y: this.sprite.y + 56 };
    for (let i = 0; i < n; i++) {
      const ang = Math.PI / 2 - spread / 2 + (spread * i) / (n - 1);
      this.scene.enemyBullet(c.x, c.y, Math.cos(ang) * speed, Math.sin(ang) * speed);
    }
    Sfx.enemyShot();
  }

  burst(n, speed) {
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 110, () => {
        if (this.alive) this.scene.aimedShot(this.sprite.x, this.sprite.y + 56, speed, 0);
      });
    }
  }

  startRay() {
    this.rayState = 'charge';
    this.ray.setVisible(true).play('rays-charge');
    Sfx.charge();
    this.ray.once('animationcomplete', () => {
      if (!this.alive) return;
      this.rayState = 'beam';
      this.ray.play('rays-beam');
      Sfx.laser();
      this.scene.cameras.main.shake(1400, 0.004);
      this.scene.time.delayedCall(1500, () => {
        this.rayState = 'off';
        this.ray.setVisible(false).stop();
      });
    });
  }

  updateRay() {
    if (this.rayState === 'off') return;
    this.ray.setPosition(this.sprite.x, this.sprite.y + 44);
    if (this.rayState === 'beam') {
      const p = this.scene.player;
      if (Math.abs(p.x - this.ray.x) < 10 && p.y > this.ray.y) this.scene.hurtPlayer(2);
    }
  }

  die() {
    this.alive = false;
    this.ray.setVisible(false).stop();
    this.rayState = 'off';
    this.marker.clear();
    this.scene.tweens.killTweensOf(this.sprite);
    const s = this.scene;
    s.clearEnemyBullets();
    let n = 0;
    s.time.addEvent({
      delay: 120, repeat: 16,
      callback: () => {
        n++;
        s.bigExplosion(this.sprite.x + Phaser.Math.Between(-80, 80), this.sprite.y + Phaser.Math.Between(-50, 50), 1);
        if (n % 4 === 0) s.cameras.main.shake(200, 0.01);
      },
    });
    s.time.delayedCall(2100, () => {
      s.cameras.main.flash(500, 255, 255, 255);
      s.cameras.main.shake(600, 0.02);
      Sfx.bigExplode();
      for (let i = 0; i < 6; i++) s.bigExplosion(this.sprite.x + Phaser.Math.Between(-60, 60), this.sprite.y + Phaser.Math.Between(-40, 40), 1);
      this.destroy();
      s.onBossDefeated();
    });
  }

  destroy() {
    this.sprite.destroy();
    this.thrust.destroy();
    this.ray.destroy();
    this.marker.destroy();
  }
}
