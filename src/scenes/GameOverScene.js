import Phaser from 'phaser';
import { W, H, text, pad, loadHiscore } from '../config.js';
import Background from '../systems/Background.js';
import { Sfx } from '../systems/Sfx.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.data$ = data; this.leaving = false; }

  create() {
    const { score, level, newHi, won } = this.data$;
    this.bg = new Background(this, { speed: won ? 40 : 8, tint: won ? 0xffffff : 0x9090b0 });
    this.cameras.main.fadeIn(500);
    if (won) Sfx.stageClear(); else Sfx.gameOver();

    text(this, W / 2, 80, won ? 'YOU SAVED\nTHE GALAXY' : 'GAME OVER', 16, won ? '#5ff7ff' : '#ff4d4d')
      .setOrigin(0.5).setLineSpacing(8);
    text(this, W / 2, 130, won ? 'ALL STAGES CLEAR' : `REACHED STAGE ${level}`, 8, '#aaaaaa').setOrigin(0.5);
    text(this, W / 2, 160, `SCORE ${pad(score)}`, 8, '#ffffff').setOrigin(0.5);
    text(this, W / 2, 176, `HI    ${pad(loadHiscore())}`, 8, '#ffe066').setOrigin(0.5);
    if (newHi) {
      const t = text(this, W / 2, 200, 'NEW HIGH SCORE!', 8, '#ff9ef5').setOrigin(0.5);
      this.tweens.add({ targets: t, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
    }
    const prompt = text(this, W / 2, 250, 'PRESS ENTER', 8, '#5ff7ff').setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.time.delayedCall(800, () => {
      const back = () => {
        if (this.leaving) return;
        this.leaving = true;
        Sfx.confirm();
        this.scene.start('Menu');
      };
      this.input.keyboard.once('keydown-ENTER', back);
      this.input.keyboard.once('keydown-SPACE', back);
      this.input.once('pointerdown', back);
    });
  }

  update(_t, delta) { this.bg.update(delta / 1000); }
}
