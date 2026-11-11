import Phaser from 'phaser';
import { W, text, pad, loadHiscore, saveHiscore, MAX_HP } from '../config.js';
import Background from '../systems/Background.js';
import { Sfx } from '../systems/Sfx.js';

const LIFE_BONUS = 2000;
const BOMB_BONUS = 1000;

export default class StageClearScene extends Phaser.Scene {
  constructor() { super('StageClear'); }

  init(data) { this.data$ = data; }

  create() {
    const { level, state, final } = this.data$;
    this.bg = new Background(this, { speed: 60 });
    this.cameras.main.fadeIn(400);

    text(this, W / 2, 60, final ? 'MISSION\nCOMPLETE' : `STAGE ${level}\nCLEAR`, 16, '#5ff7ff')
      .setOrigin(0.5).setLineSpacing(8);

    const lifeBonus = state.lives * LIFE_BONUS;
    const bombBonus = state.bombs * BOMB_BONUS;
    const rows = [
      ['BOSS BONUS', 10000 * level],
      [`LIVES  x${state.lives}`, lifeBonus],
      [`BOMBS  x${state.bombs}`, bombBonus],
    ];
    rows.forEach(([label, v], i) => {
      const y = 120 + i * 18;
      const l = text(this, 28, y, label, 8, '#ffffff').setAlpha(0);
      const r = text(this, W - 28, y, pad(v), 8, '#ffe066').setOrigin(1, 0).setAlpha(0);
      this.tweens.add({ targets: [l, r], alpha: 1, delay: 400 + i * 350, duration: 150, onStart: () => Sfx.select() });
    });
    // Boss bonus was already added in-game; add the tally bonuses now.
    state.score += lifeBonus + bombBonus;
    const total = text(this, W / 2, 190, '', 8, '#ffffff').setOrigin(0.5);
    this.time.delayedCall(1600, () => { total.setText(`SCORE ${pad(state.score)}`); Sfx.confirm(); });

    const hi = loadHiscore();
    if (state.score > hi) saveHiscore(state.score);

    const prompt = text(this, W / 2, 240, final ? 'PRESS ENTER' : 'PRESS ENTER\n\nFOR NEXT STAGE', 8, '#5ff7ff')
      .setOrigin(0.5).setAlpha(0);
    this.time.delayedCall(2000, () => {
      prompt.setAlpha(1);
      this.tweens.add({ targets: prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
      const next = () => {
        if (this.leaving) return;
        this.leaving = true;
        Sfx.confirm();
        if (final) {
          this.scene.start('GameOver', { score: state.score, level, newHi: state.score > hi, won: true });
        } else {
          state.bombs = Math.max(state.bombs, 1);
          state.hp = MAX_HP;
          this.scene.start('Game', { level: level + 1, ship: this.data$.ship, state });
        }
      };
      this.input.keyboard.once('keydown-ENTER', next);
      this.input.keyboard.once('keydown-SPACE', next);
      this.input.once('pointerdown', next);
    });
    this.leaving = false;
  }

  update(_t, delta) { this.bg.update(delta / 1000); }
}
