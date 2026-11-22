// main.js — Vaultbreak bootstrap: the game loop, screen flow (menu, playing,
// paused, caught, level clear, win) and the ?shot= staging used for screenshots.

import { createInput, isDown, wasPressed, endFrame } from './input.js';
import { createAudio } from './audio.js';
import { createGame, updateGame } from './game.js';
import { levelCount } from './levels.js';
import { drawGame, drawMenu, drawCaught, drawLevelClear, drawWin, drawPaused } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const app = {
  screen: 'menu',
  game: null,
  levelIndex: 0,
  unlockedLevels: 1,
  score: 0,
  coins: 40,
  time: 0,
  lastFrame: performance.now(),
};

// Exposed for playtesting and screenshots (window.VAULTBREAK).
window.VAULTBREAK = app;

function startLevel(index) {
  app.levelIndex = index;
  app.game = createGame(index, app.coins, app.score);
  app.screen = 'playing';
  audio.unlock();
}

function backToMenu() {
  app.screen = 'menu';
  app.game = null;
  app.score = 0;
  app.coins = 40;
  audio.stopAlarm();
}

// --- Screenshot staging (?shot=cover|loot|alarm|win) -----------------------
// Puts the game into a fixed, readable scene so a screenshot shows the
// heist at its best. Only active when the URL carries ?shot=.
function stageShot(shot) {
  if (shot === 'win') {
    app.score = 2480;
    app.game = createGame(2, 95, 2480);
    app.game.result = 'win';
    app.game.resultReason = 'Getaway complete! Three rooms cleared, every jewel lifted.';
    app.screen = 'win';
    return;
  }
  startLevel(0);
  const game = app.game;
  if (shot === 'cover') {
    // Mid-heist: the thief crossing the open floor, loot glowing ahead,
    // guard cones sweeping, cameras watching, alarm already warm.
    game.player.x = 480;
    game.player.y = 340;
    game.alarm = 35;
    game.guards[0].x = 640;
    game.guards[0].y = 300;
    game.guards[0].facing = Math.PI;
    game.guards[1].x = 300;
    game.guards[1].y = 520;
    game.guards[1].facing = 0;
  } else if (shot === 'loot') {
    // The jewel just lifted: popup, message and exit beacon on.
    game.player.x = 480;
    game.player.y = 185;
    game.lootTaken = true;
    game.lootValue = 500;
    game.popups.push({ x: 480, y: 116, text: '+500 Star Sapphire', color: '#ffd76a', life: 1.4 });
    game.message = 'Grabbed the Star Sapphire! Get to the EXIT!';
    game.messageTimer = 3;
    game.alarm = 22;
    game.guards[0].x = 220;
    game.guards[0].y = 150;
    game.guards[0].facing = 0;
    game.guards[1].x = 700;
    game.guards[1].y = 560;
    game.guards[1].facing = Math.PI;
  } else if (shot === 'alarm') {
    // Caught in a cone: red cone, SPOTTED banner, alarm nearly full.
    game.player.x = 320;
    game.player.y = 155;
    game.alarm = 78;
    game.guards[0].x = 220;
    game.guards[0].y = 155;
    game.guards[0].facing = 0;
    game.guards[0].suspicion = 0.95;
    game.guards[0].state = 'alert';
    game.spotted = true;
    game.guards[1].x = 700;
    game.guards[1].y = 450;
    game.guards[1].facing = Math.PI;
  }
}

function handleScreenInput() {
  const clicked = input.clicked !== null;
  if (app.screen === 'menu') {
    if (wasPressed(input, 'confirm') || clicked) startLevel(0);
  } else if (app.screen === 'caught') {
    if (wasPressed(input, 'confirm') || clicked) startLevel(app.levelIndex);
  } else if (app.screen === 'levelclear') {
    if (wasPressed(input, 'confirm') || clicked) {
      app.score = app.game.score;
      app.coins = app.game.coins;
      app.unlockedLevels = Math.max(app.unlockedLevels, app.levelIndex + 2);
      startLevel(app.levelIndex + 1);
    }
  } else if (app.screen === 'win') {
    if (wasPressed(input, 'confirm') || clicked) backToMenu();
  } else if (app.screen === 'playing') {
    if (wasPressed(input, 'pause')) {
      app.screen = 'paused';
      audio.stopAlarm();
    }
  } else if (app.screen === 'paused') {
    if (wasPressed(input, 'pause') || wasPressed(input, 'confirm')) {
      app.screen = 'playing';
    }
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - app.lastFrame) / 1000);
  app.lastFrame = now;
  app.time += dt;

  handleScreenInput();

  if (app.screen === 'playing' && app.game) {
    updateGame(app.game, dt, input, audio);
    if (app.game.result === 'caught') {
      app.screen = 'caught';
    } else if (app.game.result === 'levelclear') {
      app.score = app.game.score;
      app.coins = app.game.coins;
      app.unlockedLevels = Math.max(app.unlockedLevels, app.levelIndex + 2);
      app.screen = 'levelclear';
    } else if (app.game.result === 'win') {
      app.score = app.game.score;
      app.coins = app.game.coins;
      app.screen = 'win';
    }
  }

  if (app.screen === 'menu') {
    drawMenu(ctx, app.unlockedLevels, app.time);
  } else if (app.screen === 'paused') {
    drawGame(ctx, app.game, input);
    drawPaused(ctx);
  } else if (app.screen === 'caught') {
    drawGame(ctx, app.game, input);
    drawCaught(ctx, app.game.resultReason);
  } else if (app.screen === 'levelclear') {
    drawGame(ctx, app.game, input);
    drawLevelClear(ctx, app.game.resultReason, app.game.score);
  } else if (app.screen === 'win') {
    drawWin(ctx, app.game.resultReason, app.game.score);
  } else if (app.game) {
    drawGame(ctx, app.game, input);
  }

  endFrame(input);
  requestAnimationFrame(frame);
}

// Boot: a ?shot= URL jumps straight into a staged scene for screenshots.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(shot);
} else {
  const level = parseInt(params.get('level') || '0', 10);
  if (params.get('autostart') === '1' && level >= 0 && level < levelCount()) {
    startLevel(level);
  }
}
requestAnimationFrame(frame);
