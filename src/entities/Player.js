import Phaser from 'phaser';
import { W, H, DEPTH, MAX_WEAPON } from '../config.js';
import { Sfx } from '../systems/Sfx.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, ship) {
    super(scene, W / 2, H - 40, ship.key, 0);
    this.ship = ship;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    this.play(`${ship.key}-idle`);
    this.body.setCircle(4, this.width / 2 - 4, this.height / 2 - 4 + ship.hitY);
    this.thrust = scene.add.sprite(this.x, this.y + ship.thrustY, ship.thrust).setOrigin(0.5, 0)
      .play(ship.thrust).setDepth(DEPTH.player - 1);
    this.shieldGfx = scene.add.graphics().setDepth(DEPTH.player + 1);

    this.fireCooldown = 0;
    this.plasmaCooldown = 0;
    this.shotCount = 0;
    this.invuln = 0;
    this.speedBoost = 0;
    this.dead = false;
  }

  get gs() { return this.scene.state; }

  update(dt, input) {
    if (this.dead) return;
    if (this.autopilot) {
      this.thrust.setPosition(this.x, this.y + this.ship.thrustY).setScale(1, 1.6);
      this.angle = 0;
      this.setAlpha(1);
      this.drawShield();
      return;
    }
    const s = this.ship.speed * (this.speedBoost > 0 ? 1.4 : 1);
    let vx = 0;
    let vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (vx && vy) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
    this.x = Phaser.Math.Clamp(this.x + vx * s * dt, 12, W - 12);
    this.y = Phaser.Math.Clamp(this.y + vy * s * dt, 20, H - 34);
    // Slight bank when strafing.
    this.angle = Phaser.Math.Linear(this.angle, vx * 6, Math.min(1, 12 * dt));
    this.thrust.setPosition(this.x, this.y + this.ship.thrustY);
    this.thrust.setScale(1, vy < 0 ? 1.4 : vy > 0 ? 0.7 : 1);

    if (this.speedBoost > 0) this.speedBoost -= dt;
    if (this.invuln > 0) {
      this.invuln -= dt;
      const vis = Math.floor(this.invuln * 15) % 2 === 0;
      this.setAlpha(vis ? 1 : 0.25);
      if (this.invuln <= 0) this.setAlpha(1);
    }

    this.fireCooldown -= dt * 1000;
    this.plasmaCooldown -= dt;
    if (input.fire && this.fireCooldown <= 0) {
      this.fireCooldown = this.ship.fireDelay;
      this.fire();
    }
    this.drawShield();
  }

  fire() {
    const sc = this.scene;
    const lv = this.gs.weapon;
    const x = this.x;
    const y = this.y - this.height / 2 + 10;
    const v = -340;
    const shot = (dx, ang = 0, opts = {}) => {
      const rad = Phaser.Math.DegToRad(ang);
      sc.playerBullet(x + dx, y, Math.sin(rad) * -v, Math.cos(rad) * v, { angle: ang, radius: 3, ...opts });
    };
    this.shotCount++;

    if (lv >= 5 && this.shotCount % 2 === 0) {
      // Piercing pulse beam replaces the centre laser.
      shot(0, 0, { tex: 'pulse', anim: 'pulse-fly', angle: -90, damage: 2, pierce: 3, radius: 6 });
    } else if (lv === 1 || lv >= 5) {
      shot(0);
    }
    if (lv >= 2) { shot(-6); shot(6); }
    if (lv >= 3) { shot(-10, -12); shot(10, 12); }
    if (lv >= 4 && this.plasmaCooldown <= 0) {
      this.plasmaCooldown = 0.45;
      const side = this.shotCount % 2 ? -1 : 1;
      sc.playerBullet(x + side * 14, this.y, side * 60, -200, {
        tex: 'bolt', anim: 'bolt-fly', angle: -90, damage: 2, homing: true, radius: 6, life: 3,
      });
      Sfx.plasma();
    }
    Sfx.shoot();
  }

  drawShield() {
    const g = this.shieldGfx;
    g.clear();
    if (!this.gs.shield || this.dead) return;
    const t = this.scene.time.now / 1000;
    const r = this.ship.size / 2 - 2 + Math.sin(t * 8) * 1.5;
    g.lineStyle(2, 0x5ff7ff, 0.55 + Math.sin(t * 6) * 0.2);
    g.strokeCircle(this.x, this.y + this.ship.hitY / 2, r);
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeCircle(this.x, this.y + this.ship.hitY / 2, r - 2);
  }

  flashHurt() {
    this.setTint(0xff4040);
    this.scene.time.delayedCall(120, () => this.clearTint());
  }

  setDead(dead) {
    this.dead = dead;
    this.setVisible(!dead);
    this.thrust.setVisible(!dead);
    this.body.enable = !dead;
    if (dead) this.shieldGfx.clear();
  }

  respawn() {
    this.setPosition(W / 2, H + 30);
    this.setDead(false);
    this.invuln = 3;
    this.scene.tweens.add({ targets: this, y: H - 56, duration: 700, ease: 'Quad.easeOut' });
  }

  static clampWeapon(n) { return Phaser.Math.Clamp(n, 1, MAX_WEAPON); }
}
