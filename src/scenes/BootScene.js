import Phaser from 'phaser';
import { W, H, text, gemFrame, POWERUPS, DEBUG, SHIPS } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = this.add.rectangle(W / 2 - 60, H / 2, 0, 4, 0x5ff7ff).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 122, 8).setStrokeStyle(1, 0x5ff7ff);
    text(this, W / 2, H / 2 - 16, 'LOADING', 8, '#5ff7ff').setOrigin(0.5);
    this.load.on('progress', (p) => { bar.width = 120 * p; });

    this.load.setPath('assets/');
    const sheet = (key, file, w, h) => this.load.spritesheet(key, file, { frameWidth: w, frameHeight: h });

    // player
    sheet('ship-01', 'player/ship-01.png', 48, 48);
    sheet('ship-02', 'player/ship-02.png', 64, 64);
    sheet('ship-03', 'player/ship-03.png', 48, 48);
    sheet('ship-04', 'player/ship-04.png', 48, 48);
    sheet('thrust-01', 'player/thrust-01.png', 16, 10);
    sheet('thrust-03', 'player/thrust-03.png', 20, 16);
    sheet('thrust-04', 'player/thrust-04.png', 11, 12);
    // enemies
    sheet('enemy-01', 'enemies/enemy-01.png', 48, 48);
    sheet('enemy-02', 'enemies/enemy-02.png', 48, 48);
    sheet('enemy-03', 'enemies/enemy-03.png', 48, 48);
    sheet('red-ship-01', 'enemies/red-ship-01.png', 48, 48);
    sheet('alien-flying', 'enemies/alien-flying.png', 83, 64);
    sheet('enemy-explosion', 'enemies/enemy-explosion.png', 80, 80);
    // boss
    sheet('boss', 'boss/boss.png', 192, 144);
    sheet('boss-thrust', 'boss/boss-thrust.png', 128, 48);
    sheet('boss-bolt', 'boss/bolt.png', 8, 8);
    sheet('rays', 'boss/rays.png', 64, 224);
    this.load.image('cannon-left', 'boss/cannon-left.png');
    this.load.image('cannon-right', 'boss/cannon-right.png');
    this.load.image('helmet', 'boss/helmet.png');
    // environment
    this.load.image('stage-back', 'env/stage-back.png');
    this.load.image('blue-stars', 'env/blue-stars.png');
    ['asteroid-01', 'asteroid-02', 'asteroid-03', 'asteroid-04', 'asteroid-05', 'planet', 'eclipse-1', 'eclipse-2', 'rock-1', 'rock-2']
      .forEach((k) => this.load.image(k, `env/${k}.png`));
    // fx
    sheet('bolt', 'fx/bolt.png', 48, 32);
    sheet('pulse', 'fx/pulse.png', 63, 32);
    sheet('charged', 'fx/charged.png', 63, 48);
    sheet('hits-1', 'fx/hits-1.png', 32, 32);
    sheet('hits-2', 'fx/hits-2.png', 32, 32);
    sheet('explosion', 'fx/explosion.png', 64, 64);
    // pickups
    sheet('gems', 'items/gems.png', 16, 16);
  }

  create() {
    this.makeTextures();
    this.makeAnims();
    if (DEBUG.level) {
      this.scene.start('Game', { level: DEBUG.level, ship: 0, fresh: true });
    } else {
      this.scene.start('Menu');
    }
  }

  makeTextures() {
    // Small pixel lasers for the basic gun.
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2fb8ff).fillRect(0, 1, 3, 9);
    g.fillStyle(0x9ff4ff).fillRect(1, 0, 1, 10);
    g.fillStyle(0xffffff).fillRect(1, 1, 1, 4);
    g.generateTexture('laser', 3, 10);
    g.clear();
    g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
    g.generateTexture('px', 2, 2);
    g.destroy();

    // A seamless, vertically looping background: the stage art plus a
    // mirrored copy underneath so the tile edges always match.
    const src = this.textures.get('stage-back').getSourceImage();
    const canvas = this.textures.createCanvas('bg-loop', src.width, src.height * 2);
    const c = canvas.getContext();
    c.drawImage(src, 0, 0);
    c.save();
    c.translate(0, src.height * 2);
    c.scale(1, -1);
    c.drawImage(src, 0, 0);
    c.restore();
    canvas.refresh();
  }

  makeAnims() {
    const a = (key, tex, start, end, rate, repeat = -1) => this.anims.create({
      key, frames: this.anims.generateFrameNumbers(tex, { start, end }), frameRate: rate, repeat,
    });
    SHIPS.forEach((s) => a(`${s.key}-idle`, s.key, 0, 4, 10));
    a('thrust-01', 'thrust-01', 0, 1, 16);
    a('thrust-03', 'thrust-03', 0, 1, 16);
    a('thrust-04', 'thrust-04', 0, 1, 16);
    a('enemy-01-fly', 'enemy-01', 0, 4, 10);
    a('enemy-02-fly', 'enemy-02', 0, 3, 8);
    a('enemy-03-fly', 'enemy-03', 0, 3, 10);
    a('red-ship-fly', 'red-ship-01', 0, 4, 10);
    a('alien-fly', 'alien-flying', 0, 7, 12);
    a('enemy-explode', 'enemy-explosion', 0, 6, 16, 0);
    a('explode', 'explosion', 0, 7, 16, 0);
    a('hit-spark', 'hits-1', 0, 4, 24, 0);
    a('hit-star', 'hits-2', 0, 6, 24, 0);
    a('bolt-fly', 'bolt', 0, 3, 14);
    a('pulse-fly', 'pulse', 0, 3, 14);
    a('charged-fly', 'charged', 0, 5, 14);
    a('boss-bolt', 'boss-bolt', 0, 1, 10);
    a('boss-thrust', 'boss-thrust', 0, 1, 12);
    a('rays-charge', 'rays', 0, 7, 12, 0);
    a('rays-beam', 'rays', 8, 10, 14);
    Object.values(POWERUPS).forEach(({ colour }) => {
      this.anims.create({
        key: `gem-${colour}`,
        frames: [0, 1, 2, 3, 4, 5, 6].map((f) => ({ key: 'gems', frame: gemFrame(colour, f) })),
        frameRate: 10,
        repeat: -1,
      });
    });
  }
}
