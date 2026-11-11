import Phaser from 'phaser';
import '@fontsource/press-start-2p/400.css';
import './style.css';
import { W, H, FONT } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import HUDScene from './scenes/HUDScene.js';
import StageClearScene from './scenes/StageClearScene.js';
import GameOverScene from './scenes/GameOverScene.js';

function start() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#05070f',
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, GameScene, HUDScene, StageClearScene, GameOverScene],
  });
  window.__game = game;
}

// Make sure the pixel font is ready before any text is rendered.
document.fonts.load(`8px ${FONT}`).then(start, start);
