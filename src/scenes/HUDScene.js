import Phaser from 'phaser';
import { W, H, SHIPS, MAX_WEAPON, MAX_HP, text, pad, loadHiscore } from '../config.js';
import { Sfx } from '../systems/Sfx.js';

export default class HUDScene extends Phaser.Scene {
  constructor() { super('HUD'); }

  create() {
    this.game$ = this.scene.get('Game');
    this.hi = loadHiscore();

    this.add.rectangle(0, 0, W, 14, 0x000000, 0.45).setOrigin(0);
    this.score = text(this, 4, 3, '', 8, '#ffffff');
    this.hiText = text(this, W - 4, 3, '', 8, '#ffe066').setOrigin(1, 0);

    const ship = SHIPS[this.game$.shipIndex];
    this.add.rectangle(0, H - 26, W, 26, 0x000000, 0.5).setOrigin(0);
    this.hpLabel = text(this, 4, H - 24, 'HP', 8, '#7dff8a');
    this.hpBar = this.add.graphics();
    this.hpShown = MAX_HP;
    this.add.image(10, H - 7, ship.key, 0).setScale(ship.size === 64 ? 0.25 : 0.33);
    this.lives = text(this, 18, H - 11, '', 8);
    this.bombs = text(this, 52, H - 11, '', 8, '#ff9ef5');
    this.pwrLabel = text(this, 128, H - 11, 'PWR', 8, '#ff6b6b');
    this.pwr = this.add.graphics();
    this.mute = text(this, W - 4, H - 11, '', 8, '#888888').setOrigin(1, 0);

    // Boss health bar.
    this.bossName = text(this, W / 2, 18, '', 8, '#ff8080').setOrigin(0.5, 0).setVisible(false);
    this.bossBar = this.add.graphics();
    this.bossShown = 0;
  }

  update() {
    const g = this.game$;
    if (!g || !g.state) return;
    const st = g.state;
    this.score.setText(`1UP ${pad(st.score)}`);
    this.hiText.setText(`HI ${pad(Math.max(this.hi, st.score))}`);
    this.lives.setText(`x${Math.max(0, st.lives)}`);
    this.bombs.setText(`B x${st.bombs}`);
    this.mute.setText(Sfx.muted ? 'MUTE' : '');

    this.drawHealth(st.hp ?? MAX_HP);

    this.pwr.clear();
    for (let i = 0; i < MAX_WEAPON; i++) {
      const on = i < st.weapon;
      this.pwr.fillStyle(on ? 0xff6b6b : 0x442222).fillRect(156 + i * 8, H - 11, 6, 7);
    }

    const boss = g.boss;
    this.bossBar.clear();
    if (boss && boss.alive && !boss.entering) {
      this.bossShown = Phaser.Math.Linear(this.bossShown, boss.hpFraction, 0.15);
      this.bossName.setText(g.levelDef.boss.name).setVisible(true);
      const x = 28;
      const w = W - 56;
      this.bossBar.fillStyle(0x000000, 0.6).fillRect(x - 1, 28, w + 2, 6);
      this.bossBar.fillStyle(0x661111).fillRect(x, 29, w, 4);
      this.bossBar.fillStyle(0xff4d4d).fillRect(x, 29, Math.round(w * this.bossShown), 4);
      this.bossBar.fillStyle(0xffb0b0).fillRect(x, 29, Math.round(w * this.bossShown), 1);
    } else {
      this.bossName.setVisible(false);
      this.bossShown = boss && boss.alive ? 1 : 0;
    }
  }

  // Segmented health bar: green -> yellow -> red, blinking when critical.
  drawHealth(hp) {
    const g = this.hpBar;
    g.clear();
    // Smoothly drain the trailing "damage" segment.
    this.hpShown = hp > this.hpShown ? hp : Phaser.Math.Linear(this.hpShown, hp, 0.08);
    const frac = hp / MAX_HP;
    const col = frac > 0.5 ? 0x4dff6a : frac > 0.25 ? 0xffd84d : 0xff4d4d;
    const blink = frac <= 0.34 && Math.floor(this.time.now / 200) % 2 === 0;
    const x0 = 22;
    const segW = 16;
    const y = H - 24;
    for (let i = 0; i < MAX_HP; i++) {
      const x = x0 + i * (segW + 2);
      g.fillStyle(0x1a2a1a).fillRect(x, y, segW, 7);
      if (i < hp) {
        g.fillStyle(blink ? 0xffffff : col).fillRect(x, y, segW, 7);
        g.fillStyle(0xffffff, 0.35).fillRect(x, y, segW, 2);
      } else if (i < this.hpShown) {
        g.fillStyle(0xff4d4d, 0.6).fillRect(x, y, Math.round(segW * Math.min(1, this.hpShown - i)), 7);
      }
    }
    this.hpLabel.setColor(blink ? '#ffffff' : frac > 0.5 ? '#7dff8a' : frac > 0.25 ? '#ffd84d' : '#ff6b6b');
  }
}
