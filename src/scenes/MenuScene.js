import Phaser from 'phaser';
import { W, H, SHIPS, text, pad, loadHiscore } from '../config.js';
import Background from '../systems/Background.js';
import { Sfx } from '../systems/Sfx.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(data) {
    this.selected = data?.ship ?? 0;
    this.starting = false;
  }

  create() {
    this.bg = new Background(this, { speed: 18 });

    const title = text(this, W / 2, 46, 'FROSTY\nSPACE', 24, '#5ff7ff').setOrigin(0.5).setLineSpacing(6);
    title.setStroke('#0b2a4a', 4).setShadow(0, 3, '#ff4dd2', 0, false, true);
    this.tweens.add({ targets: title, y: 50, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    text(this, W / 2, 96, `HI-SCORE ${pad(loadHiscore())}`, 8, '#ffe066').setOrigin(0.5);

    text(this, W / 2, 120, 'SELECT SHIP', 8, '#aaaaaa').setOrigin(0.5);
    this.shipSprite = this.add.sprite(W / 2, 160, SHIPS[0].key);
    this.thrust = this.add.sprite(W / 2, 180, 'thrust-01').setOrigin(0.5, 0);
    this.arrowL = text(this, W / 2 - 50, 156, '<', 8, '#5ff7ff').setOrigin(0.5);
    this.arrowR = text(this, W / 2 + 50, 156, '>', 8, '#5ff7ff').setOrigin(0.5);
    this.shipName = text(this, W / 2, 204, '', 8, '#ffffff').setOrigin(0.5);
    this.shipDesc = text(this, W / 2, 216, '', 8, '#8fd3ff').setOrigin(0.5);
    this.tweens.add({ targets: [this.arrowL, this.arrowR], alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });

    const start = text(this, W / 2, 240, 'PRESS ENTER', 8, '#ffffff').setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

    text(this, W / 2, 262, 'ARROWS/WASD MOVE\nSPACE/Z FIRE  X BOMB\nP PAUSE  M MUTE', 8, '#888888')
      .setOrigin(0.5).setLineSpacing(4);
    text(this, W / 2, H - 8, 'ART: ANSIMUZ (CC0)', 8, '#555577').setOrigin(0.5);

    this.showShip();

    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.cycle(-1));
    kb.on('keydown-A', () => this.cycle(-1));
    kb.on('keydown-RIGHT', () => this.cycle(1));
    kb.on('keydown-D', () => this.cycle(1));
    kb.on('keydown-ENTER', () => this.begin());
    kb.on('keydown-SPACE', () => this.begin());
    kb.on('keydown-M', () => Sfx.toggleMute());
    this.input.on('pointerdown', () => this.begin());
  }

  cycle(d) {
    Sfx.unlock();
    this.selected = (this.selected + d + SHIPS.length) % SHIPS.length;
    Sfx.select();
    this.showShip();
  }

  showShip() {
    const s = SHIPS[this.selected];
    this.shipSprite.setTexture(s.key, 0).play(`${s.key}-idle`);
    this.thrust.setTexture(s.thrust, 0).play(s.thrust).setPosition(W / 2, 160 + s.thrustY);
    this.shipName.setText(s.name);
    this.shipDesc.setText(s.desc);
  }

  begin() {
    if (this.starting) return;
    this.starting = true;
    Sfx.unlock();
    Sfx.confirm();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { level: 1, ship: this.selected });
    });
  }

  update(_t, delta) { this.bg.update(delta / 1000); }
}
