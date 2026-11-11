import Phaser from 'phaser';
import {
  W, H, SHIPS, DEPTH, POWERUPS, MAX_WEAPON, MAX_HP, START_LIVES, START_BOMBS, DEBUG, text, loadHiscore, saveHiscore,
} from '../config.js';
import { LEVELS } from '../levels/levels.js';
import Background from '../systems/Background.js';
import WaveDirector from '../systems/WaveDirector.js';
import { Sfx } from '../systems/Sfx.js';
import Bullet from '../entities/Bullet.js';
import Enemy from '../entities/Enemy.js';
import Player from '../entities/Player.js';
import Boss from '../entities/Boss.js';

const RANDOM_DROP_CHANCE = 0.05;

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelIndex = Phaser.Math.Clamp((data.level ?? 1) - 1, 0, LEVELS.length - 1);
    this.levelDef = LEVELS[this.levelIndex];
    this.shipIndex = data.ship ?? 0;
    const ship = SHIPS[this.shipIndex];
    this.state = data.state ? { ...data.state } : {
      score: 0,
      lives: START_LIVES,
      hp: MAX_HP,
      bombs: START_BOMBS,
      weapon: DEBUG.weapon ? Phaser.Math.Clamp(DEBUG.weapon, 1, MAX_WEAPON) : 1,
      shield: ship.key === 'ship-02' ? 1 : 0,
    };
    this.state.level = this.levelIndex + 1;
    this.boss = null;
    this.levelOver = false;
    this.paused = false;
    this.pickups = [];
    this.tinkCooldown = 0;
  }

  create() {
    this.bg = new Background(this, this.levelDef.bg);

    this.pBullets = this.physics.add.group({ classType: Bullet, maxSize: 140 });
    this.eBullets = this.physics.add.group({ classType: Bullet, maxSize: 320 });
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 70 });
    this.player = new Player(this, SHIPS[this.shipIndex]);

    const alive = (a, b) => a.active && b.active;
    this.physics.add.overlap(this.pBullets, this.enemies, this.onBulletEnemy, alive, this);
    this.physics.add.overlap(this.player, this.eBullets, (p, b) => { b.kill(); this.hurtPlayer(1); }, alive, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerEnemy, alive, this);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D,
      fire: K.SPACE, fire2: K.Z,
    });
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
    // One-shot actions use key events so quick taps are never missed.
    const kb = this.input.keyboard;
    kb.on('keydown-X', () => !this.paused && this.useBomb());
    kb.on('keydown-B', () => !this.paused && this.useBomb());
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-M', () => Sfx.toggleMute());

    this.director = new WaveDirector(this, this.levelDef);
    if (DEBUG.boss) this.director.skipToBoss();

    this.scene.launch('HUD');
    this.events.once('shutdown', () => this.scene.stop('HUD'));

    this.pausePanel = this.add.rectangle(W / 2, H / 2, W, 60, 0x05070f, 0.8).setDepth(DEPTH.banner).setVisible(false);
    this.pauseText = text(this, W / 2, H / 2, 'PAUSED\n\nP TO RESUME', 8, '#5ff7ff')
      .setOrigin(0.5).setDepth(DEPTH.banner).setVisible(false);

    this.banner(`STAGE ${this.state.level}`, this.levelDef.name);
  }

  // ---------------------------------------------------------------- loop

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.paused) return;

    const k = this.keys;
    const input = {
      up: k.up.isDown || k.w.isDown,
      down: k.down.isDown || k.s.isDown,
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      fire: (k.fire.isDown || k.fire2.isDown) && !this.levelOver,
    };
    this.bg.update(dt);
    this.player.update(dt, input);
    this.director.update(dt);
    if (this.boss) { this.boss.update(dt); this.checkBossHits(); }
    this.updatePickups(dt);
    this.tinkCooldown -= dt;
  }

  togglePause() {
    if (this.levelOver) return;
    this.paused = !this.paused;
    this.pauseText.setVisible(this.paused);
    this.pausePanel.setVisible(this.paused);
    if (this.paused) {
      this.physics.pause();
      this.time.paused = true;
      this.tweens.pauseAll();
      this.anims.pauseAll();
    } else {
      this.physics.resume();
      this.time.paused = false;
      this.tweens.resumeAll();
      this.anims.resumeAll();
    }
  }

  // ------------------------------------------------------------- spawning

  spawnEnemy(type, x, y, opts) {
    if (this.levelOver) return null;
    const e = this.enemies.get(x, y);
    if (!e) return null;
    return e.spawn(type, x, y, opts);
  }

  liveEnemyCount() { return this.enemies.countActive(true); }

  playerBullet(x, y, vx, vy, opts) {
    const b = this.pBullets.get(x, y);
    if (b) b.fire(x, y, vx, vy, { depth: DEPTH.pBullets, ...opts });
  }

  enemyBullet(x, y, vx, vy) {
    if (this.levelOver) return;
    const b = this.eBullets.get(x, y);
    if (b) b.fire(x, y, vx, vy, { tex: 'boss-bolt', anim: 'boss-bolt', radius: 3, depth: DEPTH.eBullets, life: 8 });
  }

  aimedShot(x, y, speed, offset = 0) {
    const p = this.player;
    const ang = Phaser.Math.Angle.Between(x, y, p.x, p.y) + offset;
    this.enemyBullet(x, y, Math.cos(ang) * speed, Math.sin(ang) * speed);
  }

  enemyFire(e) {
    if (this.player.dead) return;
    const a = this.levelDef.aggression;
    const sp = 80 * a;
    if (e.typeKey === 'tank') {
      for (let i = -2; i <= 2; i++) {
        const ang = Math.PI / 2 + i * 0.28;
        this.enemyBullet(e.x, e.y + 20, Math.cos(ang) * sp, Math.sin(ang) * sp);
      }
      this.time.delayedCall(350, () => e.active && this.aimedShot(e.x, e.y + 20, sp * 1.3));
    } else if (e.typeKey === 'shooter' && a > 1.15) {
      [-0.2, 0, 0.2].forEach((o) => this.aimedShot(e.x, e.y + 12, sp, o));
    } else {
      this.aimedShot(e.x, e.y + 12, sp);
    }
    Sfx.enemyShot();
  }

  clearEnemyBullets(withSparks = false) {
    this.eBullets.getChildren().forEach((b) => {
      if (!b.active) return;
      if (withSparks) this.spark(b.x, b.y, 'hit-spark');
      b.kill();
    });
  }

  // Homing plasma picks the nearest enemy or vulnerable boss part.
  findNearestTarget(x, y) {
    let best = null;
    let bestD = Infinity;
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.y < 0) return;
      const d = Phaser.Math.Distance.Squared(x, y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    if (this.boss?.alive) {
      Object.values(this.boss.parts).forEach((z) => {
        if (!this.boss.isVulnerable(z)) return;
        const d = Phaser.Math.Distance.Squared(x, y, z.x, z.y);
        if (d < bestD) { bestD = d; best = z; }
      });
    }
    return best;
  }

  // ----------------------------------------------------------- collisions

  onBulletEnemy(b, e) {
    if (b.pierce) {
      if (b.hitSet.has(e)) return;
      b.hitSet.add(e);
      if (b.hitSet.size > b.pierce) b.kill();
    } else {
      b.kill();
    }
    this.spark(b.x, b.y - 4, 'hit-spark');
    if (e.damage(b.damage)) this.killEnemy(e);
    else Sfx.hit();
  }

  // Boss collisions use plain rectangles: live parts first, then armour.
  checkBossHits() {
    const boss = this.boss;
    if (!boss.alive) return;
    this.pBullets.getChildren().forEach((b) => {
      if (!b.active) return;
      const part = boss.partAt(b.x, b.y);
      if (part) this.onBulletBossPart(b, part);
      else if (boss.hullAt(b.x, b.y)) this.armorTink(b);
    });
    const p = this.player;
    const py = p.y + p.ship.hitY;
    if (!p.dead && (boss.hullAt(p.x, py) || boss.partAt(p.x, py))) this.hurtPlayer(2);
  }

  onBulletBossPart(b, z) {
    b.kill();
    if (z.boss.hitPart(z, b.damage)) {
      this.spark(b.x, b.y - 4, 'hit-spark');
      Sfx.hit();
    } else {
      this.armorTink(b);
    }
  }

  armorTink(b) {
    b.kill();
    this.spark(b.x, b.y - 4, 'hit-star');
    if (this.tinkCooldown <= 0) { Sfx.tink(); this.tinkCooldown = 0.08; }
  }

  onPlayerEnemy(p, e) {
    if (this.player.invuln > 0 || this.player.dead) return;
    this.hurtPlayer(2);
    if (e.typeKey === 'tank') {
      if (e.damage(8)) this.killEnemy(e);
    } else {
      this.killEnemy(e);
    }
  }

  killEnemy(e) {
    const { x, y } = e;
    if (e.typeKey === 'tank') {
      this.bigExplosion(x, y, 4);
      this.cameras.main.shake(250, 0.01);
      this.spawnPickup('weapon', x - 10, y);
      this.spawnPickup(this.randomPowerup(), x + 10, y);
    } else if (e.typeKey === 'rock') {
      this.explosion(x, y, 0.6);
      this.rockDebris(x, y);
    } else {
      this.explosion(x, y);
    }
    Sfx.explode();
    this.addScore(e.score, x, y);

    const w = e.wave;
    if (w && w.total > 1) {
      w.killed++;
      if (w.killed === w.total && e.typeKey !== 'tank') this.spawnPickup(this.randomPowerup(), x, y);
    } else if (e.typeKey !== 'tank' && Math.random() < RANDOM_DROP_CHANCE) {
      this.spawnPickup(this.randomPowerup(), x, y);
    }
    this.removeEnemy(e);
  }

  removeEnemy(e) {
    e.disableBody(true, true);
  }

  hurtPlayer(dmg = 1) {
    const p = this.player;
    if (p.dead || p.invuln > 0 || this.levelOver || DEBUG.god) return;
    if (this.state.shield) {
      this.state.shield = 0;
      p.invuln = 1.2;
      this.spark(p.x, p.y, 'hit-star');
      this.cameras.main.shake(120, 0.006);
      Sfx.tink();
      return;
    }
    this.state.hp = Math.max(0, this.state.hp - dmg);
    if (this.state.hp > 0) {
      p.invuln = 1;
      p.flashHurt();
      this.spark(p.x, p.y, 'hit-spark');
      this.cameras.main.shake(150, 0.008);
      Sfx.hurt();
      return;
    }
    this.state.lives--;
    this.state.weapon = Math.max(1, this.state.weapon - 1);
    p.setDead(true);
    this.bigExplosion(p.x, p.y, 3);
    this.cameras.main.shake(300, 0.015);
    Sfx.playerDie();
    if (this.state.lives <= 0) {
      this.time.delayedCall(2200, () => this.gameOver());
    } else {
      this.time.delayedCall(1300, () => {
        if (this.levelOver) return;
        this.clearEnemyBullets(true);
        this.state.hp = MAX_HP;
        p.respawn();
      });
    }
  }

  // --------------------------------------------------------------- bombs

  useBomb() {
    const p = this.player;
    if (p.dead || this.state.bombs <= 0 || this.levelOver) return;
    this.state.bombs--;
    p.invuln = Math.max(p.invuln, 1.5);
    Sfx.bomb();
    const orb = this.add.sprite(p.x, p.y - 20, 'charged').play('charged-fly').setAngle(-90).setDepth(DEPTH.fx);
    this.tweens.add({
      targets: orb, y: H * 0.4, x: W / 2, duration: 350, ease: 'Quad.easeOut',
      onComplete: () => {
        orb.destroy();
        this.cameras.main.flash(300, 180, 240, 255);
        this.cameras.main.shake(400, 0.015);
        this.clearEnemyBullets(true);
        for (let i = 0; i < 8; i++) {
          this.time.delayedCall(i * 60, () => this.explosion(Phaser.Math.Between(20, W - 20), Phaser.Math.Between(20, H - 60)));
        }
        this.enemies.getChildren().forEach((e) => {
          if (e.active && e.y > -10 && e.damage(14)) this.killEnemy(e);
        });
        if (this.boss?.alive) {
          const z = Object.values(this.boss.parts).find((part) => this.boss.isVulnerable(part));
          if (z) this.boss.hitPart(z, 16);
        }
      },
    });
  }

  // ------------------------------------------------------------ pickups

  randomPowerup() {
    const entries = Object.entries(POWERUPS).map(([k, v]) => {
      let w = v.weight;
      if (k === 'weapon' && this.state.weapon >= MAX_WEAPON) w = 5;
      if (k === 'shield' && this.state.shield) w = 4;
      if (k === 'repair' && this.state.hp < MAX_HP) w *= 2;
      return [k, w];
    });
    let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
    return 'repair';
  }

  spawnPickup(kind, x, y) {
    const pu = POWERUPS[kind];
    const s = this.add.sprite(x, y, 'gems').play(`gem-${pu.colour}`).setDepth(DEPTH.pickups);
    s.kind = kind;
    s.t = 0;
    s.x0 = Phaser.Math.Clamp(x, 16, W - 16);
    s.glow = this.add.circle(x, y, 9, 0xffffff, 0.15).setDepth(DEPTH.pickups - 1);
    this.pickups.push(s);
  }

  updatePickups(dt) {
    const p = this.player;
    this.pickups = this.pickups.filter((s) => {
      s.t += dt;
      // Pop upward a little, then drift down.
      s.y += (s.t < 0.4 ? -50 : 38) * dt;
      s.x = s.x0 + Math.sin(s.t * 3) * 10;
      s.glow.setPosition(s.x, s.y).setScale(1 + Math.sin(s.t * 8) * 0.2);
      const d = Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y);
      if (!p.dead && d < 18) {
        this.collect(s.kind, s.x, s.y);
      } else if (s.y < H + 20) {
        return true;
      }
      s.glow.destroy();
      s.destroy();
      return false;
    });
  }

  collect(kind, x, y) {
    const st = this.state;
    let label = POWERUPS[kind].label;
    switch (kind) {
      case 'weapon':
        if (st.weapon < MAX_WEAPON) st.weapon++;
        else { this.addScore(1000); label = '+1000'; }
        if (st.weapon === MAX_WEAPON && label === 'POWER UP') label = 'MAX POWER';
        break;
      case 'shield': st.shield = 1; break;
      case 'speed': this.player.speedBoost = 10; break;
      case 'bomb': st.bombs = Math.min(st.bombs + 1, 5); break;
      case 'repair':
        if (st.hp < MAX_HP) st.hp = Math.min(MAX_HP, st.hp + 2);
        else { this.addScore(500); label = '+500'; }
        break;
      case 'life': st.lives = Math.min(st.lives + 1, 9); break;
      default: break;
    }
    if (kind === 'life') Sfx.life(); else Sfx.powerup();
    this.popup(x, y - 10, label, '#ffe066');
  }

  // ----------------------------------------------------------- scoring/fx

  addScore(n, x, y) {
    this.state.score += n;
    if (x !== undefined && n >= 500) this.popup(x, y, String(n), '#ffffff');
  }

  popup(x, y, str, color) {
    const t = text(this, Phaser.Math.Clamp(x, 30, W - 30), y, str, 8, color).setOrigin(0.5).setDepth(DEPTH.banner);
    this.tweens.add({ targets: t, y: y - 24, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  spark(x, y, anim) {
    const s = this.add.sprite(x, y, anim === 'hit-star' ? 'hits-2' : 'hits-1').setDepth(DEPTH.fx).play(anim);
    s.once('animationcomplete', () => s.destroy());
  }

  explosion(x, y, scale = 1) {
    const s = this.add.sprite(x, y, 'enemy-explosion').setDepth(DEPTH.fx).setScale(scale).play('enemy-explode');
    s.once('animationcomplete', () => s.destroy());
  }

  bigExplosion(x, y, count = 1) {
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 90, () => {
        const s = this.add.sprite(x + Phaser.Math.Between(-14, 14) * (i > 0), y + Phaser.Math.Between(-14, 14) * (i > 0), 'explosion')
          .setDepth(DEPTH.fx).play('explode');
        s.once('animationcomplete', () => s.destroy());
      });
    }
    Sfx.explode();
  }

  rockDebris(x, y) {
    for (let i = 0; i < 4; i++) {
      const r = this.add.image(x, y, i % 2 ? 'rock-1' : 'rock-2').setDepth(DEPTH.enemies - 1);
      const ang = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: r, x: x + Math.cos(ang) * 40, y: y + Math.sin(ang) * 40 + 20, angle: Phaser.Math.Between(-180, 180),
        alpha: 0, duration: 700, onComplete: () => r.destroy(),
      });
    }
  }

  banner(title, subtitle) {
    const a = text(this, W / 2, H / 2 - 20, title, 16, '#5ff7ff').setOrigin(0.5).setDepth(DEPTH.banner);
    const b = text(this, W / 2, H / 2 + 6, subtitle, 8, '#ffffff').setOrigin(0.5).setDepth(DEPTH.banner);
    [a, b].forEach((t) => t.setAlpha(0));
    this.tweens.add({ targets: [a, b], alpha: 1, duration: 300, yoyo: true, hold: 1800, onComplete: () => { a.destroy(); b.destroy(); } });
  }

  // ---------------------------------------------------------------- boss

  startBossSequence() {
    Sfx.warning();
    const warn = text(this, W / 2, H / 2 - 16, 'WARNING', 16, '#ff4d4d').setOrigin(0.5).setDepth(DEPTH.banner);
    const sub = text(this, W / 2, H / 2 + 8, `${this.levelDef.boss.name} APPROACHING`, 8, '#ffb0b0').setOrigin(0.5).setDepth(DEPTH.banner);
    const bars = this.add.rectangle(W / 2, H / 2 - 4, W, 56, 0xff0000, 0.15).setDepth(DEPTH.banner - 1);
    this.tweens.add({ targets: [warn, sub, bars], alpha: 0.15, duration: 350, yoyo: true, repeat: 3 });
    this.time.delayedCall(2900, () => {
      warn.destroy(); sub.destroy(); bars.destroy();
      this.spawnBoss();
    });
  }

  spawnBoss() {
    this.boss = new Boss(this, this.levelDef.boss);
  }

  onBossDefeated() {
    this.levelOver = true;
    this.addScore(10000 * this.state.level);
    this.clearEnemyBullets();
    this.enemies.getChildren().forEach((e) => e.active && this.killEnemy(e));
    this.time.delayedCall(800, () => Sfx.stageClear());
    // Fly the player off the top of the screen.
    this.time.delayedCall(1600, () => {
      const p = this.player;
      if (p.dead) { p.setDead(false); p.setPosition(W / 2, H - 50); }
      p.autopilot = true;
      this.tweens.killTweensOf(p);
      this.tweens.add({ targets: p, y: -60, duration: 1200, ease: 'Quad.easeIn', delay: 300 });
    });
    this.time.delayedCall(3400, () => {
      const final = this.levelIndex === LEVELS.length - 1;
      this.scene.start('StageClear', { level: this.state.level, ship: this.shipIndex, state: this.state, final });
    });
  }

  gameOver() {
    const hi = loadHiscore();
    const newHi = this.state.score > hi;
    if (newHi) saveHiscore(this.state.score);
    this.scene.start('GameOver', { score: this.state.score, level: this.state.level, newHi, won: false });
  }
}
