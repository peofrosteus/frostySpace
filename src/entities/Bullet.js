import Phaser from 'phaser';
import { W, H } from '../config.js';

// Pooled projectile used by both the player and enemies.
export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'laser');
  }

  // opts: { tex, frame, anim, angle, damage, pierce, homing, radius, depth, flipX }
  fire(x, y, vx, vy, opts = {}) {
    this.enableBody(true, x, y, true, true);
    this.setTexture(opts.tex || 'laser', opts.frame ?? 0);
    if (opts.anim) this.play(opts.anim); else this.anims.stop();
    this.setAngle(opts.angle ?? 0);
    this.setFlipX(!!opts.flipX);
    this.setDepth(opts.depth ?? 12);
    this.setAlpha(1);
    this.clearTint();
    this.damage = opts.damage ?? 1;
    this.pierce = opts.pierce ?? 0;
    this.homing = opts.homing ?? false;
    this.life = opts.life ?? 6;
    this.hitSet = this.pierce ? new Set() : null;
    const r = opts.radius ?? 3;
    // Centred circle so the hit area is correct regardless of sprite rotation.
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.setVelocity(vx, vy);
    this.speed = Math.hypot(vx, vy);
    return this;
  }

  kill() {
    this.disableBody(true, true);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active || this.scene.paused) return;
    const dt = delta / 1000;
    this.life -= dt;
    if (this.homing) this.steer(dt);
    if (this.life <= 0 || this.y < -40 || this.y > H + 40 || this.x < -40 || this.x > W + 40) this.kill();
  }

  steer(dt) {
    const target = this.scene.findNearestTarget?.(this.x, this.y);
    if (!target) return;
    const want = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const cur = Math.atan2(this.body.velocity.y, this.body.velocity.x);
    const next = Phaser.Math.Angle.RotateTo(cur, want, 5 * dt);
    this.setVelocity(Math.cos(next) * this.speed, Math.sin(next) * this.speed);
    this.setRotation(next);
  }
}
