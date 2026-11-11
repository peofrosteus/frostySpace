import Phaser from 'phaser';
import { W, H, DEPTH } from '../config.js';

const PROPS = ['planet', 'eclipse-1', 'eclipse-2', 'asteroid-01', 'asteroid-03', 'asteroid-04', 'asteroid-05'];

// Scrolling space backdrop: looping nebula, parallax star layer and slow
// decorative props (planets, distant asteroids) that do not collide.
export default class Background {
  constructor(scene, { speed = 24, tint = 0xffffff, starTint = 0xffffff } = {}) {
    this.scene = scene;
    this.speed = speed;
    this.back = scene.add.tileSprite(0, 0, W, H, 'bg-loop').setOrigin(0).setDepth(DEPTH.bg).setTint(tint);
    this.stars = scene.add.tileSprite(0, 0, W, H, 'blue-stars').setOrigin(0).setDepth(DEPTH.stars)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7).setTint(starTint);
    this.props = [];
    this.propTimer = 2;
  }

  update(dt) {
    this.back.tilePositionY -= this.speed * dt;
    this.stars.tilePositionY -= this.speed * 2.2 * dt;

    this.propTimer -= dt;
    if (this.propTimer <= 0) {
      this.propTimer = Phaser.Math.FloatBetween(5, 10);
      const key = Phaser.Utils.Array.GetRandom(PROPS);
      const p = this.scene.add.image(Phaser.Math.Between(16, W - 16), -40, key).setDepth(DEPTH.props).setAlpha(0.85);
      p.vy = this.speed * Phaser.Math.FloatBetween(1.3, 1.8);
      p.spin = key.startsWith('asteroid') ? Phaser.Math.FloatBetween(-0.4, 0.4) : 0;
      this.props.push(p);
    }
    this.props = this.props.filter((p) => {
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      if (p.y > H + 50) { p.destroy(); return false; }
      return true;
    });
  }
}
