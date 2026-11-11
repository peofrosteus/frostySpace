import Phaser from 'phaser';
import { W, H, ENEMY_TYPES, DEPTH } from '../config.js';

const ROCKS = ['asteroid-02', 'asteroid-03', 'asteroid-04', 'asteroid-05'];

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy-01');
  }

  // opts: { pattern, path, speed, wave, targetY, vx }
  spawn(typeKey, x, y, opts = {}) {
    const type = ENEMY_TYPES[typeKey];
    this.typeKey = typeKey;
    this.type = type;
    this.enableBody(true, x, y, true, true);
    const tex = typeKey === 'rock' ? Phaser.Utils.Array.GetRandom(ROCKS) : type.tex;
    this.setTexture(tex, 0);
    if (type.anim) this.play(type.anim); else this.anims.stop();
    this.setFlipY(!!type.flipY);
    this.setAngle(0);
    this.setDepth(typeKey === 'rock' ? DEPTH.enemies - 1 : DEPTH.enemies);
    this.clearTint();
    this.setAlpha(1);
    this.body.setCircle(type.radius, this.width / 2 - type.radius, this.height / 2 - type.radius);
    this.setVelocity(0, 0);

    const lvl = this.scene.levelDef;
    this.hp = Math.ceil(type.hp * (lvl.hpMul ?? 1));
    this.maxHp = this.hp;
    this.score = type.score;
    this.wave = opts.wave ?? null;
    this.pattern = opts.pattern ?? 'dive';
    this.speed = (opts.speed ?? 60) * (lvl.speedMul ?? 1);
    this.t = 0;
    this.x0 = x;
    this.y0 = y;
    this.dir = opts.dir ?? 1;
    this.targetY = opts.targetY ?? 70;
    this.hold = opts.hold ?? 6;
    this.entered = false;
    this.spin = typeKey === 'rock' ? Phaser.Math.FloatBetween(-1.2, 1.2) : 0;
    this.vx = opts.vx ?? 0;
    this.path = opts.path ?? null;
    this.pathT = 0;
    this.pathLen = this.path ? this.path.getLength() : 0;
    // Fire: shooters/tanks always; other types sometimes at higher levels.
    const fireChance = lvl.fireChance ?? 0;
    this.fireRate = type.fireRate ?? ((typeKey !== 'rock' && Math.random() < fireChance) ? 2.5 : 0);
    this.fireTimer = this.fireRate ? Phaser.Math.FloatBetween(0.6, this.fireRate) : 0;

    if (this.pattern === 'kamikaze') {
      const p = this.scene.player;
      const ang = Phaser.Math.Angle.Between(x, y, p.x, p.y + 40);
      this.setVelocity(Math.cos(ang) * this.speed * 1.6, Math.sin(ang) * this.speed * 1.6);
      this.setRotation(ang - Math.PI / 2);
    }
    return this;
  }

  damage(n) {
    this.hp -= n;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => { if (this.active) this.clearTint(); });
    return this.hp <= 0;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active || this.scene.paused) return;
    const dt = delta / 1000;
    this.t += dt;
    this.move(dt);
    this.angle += this.spin * 60 * dt;

    if (this.fireRate && this.y > 10 && this.y < H * 0.75) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireRate / (this.scene.levelDef.aggression ?? 1);
        this.scene.enemyFire(this);
      }
    }

    if (this.y > 0) this.entered = true;
    if (this.y > H + 50 || this.y < -140 || this.x < -90 || this.x > W + 90) {
      this.scene.removeEnemy(this, false);
    }
  }

  move(dt) {
    switch (this.pattern) {
      case 'dive':
        this.y += this.speed * dt;
        this.x += this.vx * dt;
        break;
      case 'sine':
        this.y += this.speed * dt;
        this.x = this.x0 + Math.sin(this.t * 2.4) * 40 * this.dir;
        break;
      case 'zigzag':
        this.y += this.speed * dt;
        this.x += this.dir * this.speed * 1.2 * dt;
        if (this.x < 20 || this.x > W - 20) { this.dir *= -1; this.x = Phaser.Math.Clamp(this.x, 20, W - 20); }
        break;
      case 'path': {
        this.pathT += (this.speed * dt) / this.pathLen;
        if (this.pathT >= 1) { this.scene.removeEnemy(this, false); return; }
        const pt = this.path.getPoint(this.pathT);
        this.setPosition(pt.x, pt.y);
        break;
      }
      case 'hover':
        // Move in, hold position while firing, then leave.
        if (this.t < this.hold) {
          this.y += (this.targetY - this.y) * Math.min(1, 2 * dt);
          this.x = this.x0 + Math.sin(this.t * 1.5) * 12;
        } else {
          this.y += this.speed * 1.5 * dt;
        }
        break;
      case 'tank':
        if (this.t < this.hold) {
          this.y += (this.targetY - this.y) * Math.min(1, 1.2 * dt);
          this.x = this.x0 + Math.sin(this.t * 0.8) * Math.min(70, this.x0 - 30, W - 30 - this.x0);
        } else {
          this.y += this.speed * dt;
        }
        break;
      case 'kamikaze':
      default:
        break; // velocity already set
    }
  }
}
