// game.js — the playing state's update: the thief, loot, tools, alarm and win/lose.
// Owns one level's live state and advances it one frame at a time.

import { buildLevel } from './levels.js';
import { createGuard, updateGuard, circleHitsWalls, sendGuardTo, insideSmoke } from './guards.js';
import { createCamera, updateCamera, freezeAllCameras } from './cameras.js';
import { isDown, wasPressed, takeClick } from './input.js';

export const TOOL_COSTS = { emp: 30, smoke: 20, noise: 15 };
export const PLAYER_RADIUS = 13;
export const GRAB_RADIUS = 46;

export function createGame(levelIndex, carryCoins, carryScore) {
  const def = buildLevel(levelIndex);
  return {
    levelIndex,
    def,
    player: {
      x: def.playerStart.x,
      y: def.playerStart.y,
      facing: -Math.PI / 2,
      sneaking: false,
      moving: false,
      stepTimer: 0,
    },
    guards: def.guards.map(createGuard),
    cameras: def.cameras.map(createCamera),
    lasers: def.lasers.map((l) => ({ ...l, on: true, hitCooldown: 0 })),
    lootTaken: false,
    coinsLeft: def.coins.map((c) => ({ ...c, taken: false })),
    coins: carryCoins !== undefined ? carryCoins : def.startCoins,
    lootValue: 0,
    score: carryScore || 0,
    alarm: 0,
    time: 0,
    levelTime: 0,
    smokes: [],
    noises: [],
    popups: [],
    flash: 0,
    spotted: false,
    cameraSpotted: false,
    message: '',
    messageTimer: 0,
    result: null, // 'levelclear' | 'win' | 'caught' once the level ends
    resultReason: '',
  };
}

function addPopup(game, x, y, text, color) {
  game.popups.push({ x, y, text, color: color || '#ffd76a', life: 1.4 });
}

function showMessage(game, text, seconds) {
  game.message = text;
  game.messageTimer = seconds || 2.2;
}

function movePlayer(game, dt, input) {
  const player = game.player;
  let dx = 0;
  let dy = 0;
  if (isDown(input, 'left')) dx -= 1;
  if (isDown(input, 'right')) dx += 1;
  if (isDown(input, 'up')) dy -= 1;
  if (isDown(input, 'down')) dy += 1;
  const len = Math.hypot(dx, dy);
  player.sneaking = isDown(input, 'sneak');
  player.moving = len > 0;
  if (len === 0) return false;
  const speed = player.sneaking ? 95 : 175;
  dx /= len;
  dy /= len;
  player.facing = Math.atan2(dy, dx);
  const nx = player.x + dx * speed * dt;
  const ny = player.y + dy * speed * dt;
  if (!circleHitsWalls(nx, player.y, PLAYER_RADIUS, game.def.walls)) player.x = nx;
  if (!circleHitsWalls(player.x, ny, PLAYER_RADIUS, game.def.walls)) player.y = ny;
  // Footstep ticks, slower while sneaking.
  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = player.sneaking ? 0.5 : 0.32;
    return true;
  }
  return false;
}

function tryGrab(game, audio) {
  const player = game.player;
  const def = game.def;
  if (!game.lootTaken) {
    const d = Math.hypot(player.x - def.loot.x, player.y - def.loot.y);
    if (d < GRAB_RADIUS) {
      game.lootTaken = true;
      game.lootValue += def.lootValue;
      addPopup(game, def.loot.x, def.loot.y - 24, `+${def.lootValue} ${def.lootName}`, '#ffd76a');
      showMessage(game, `Grabbed the ${def.lootName}! Get to the EXIT!`, 3);
      audio.playLoot();
      return;
    }
  }
  for (const coin of game.coinsLeft) {
    if (coin.taken) continue;
    const d = Math.hypot(player.x - coin.x, player.y - coin.y);
    if (d < 30) {
      coin.taken = true;
      game.coins += 25;
      game.lootValue += 25;
      addPopup(game, coin.x, coin.y - 18, '+25', '#ffe9a8');
      audio.playCoin();
      return;
    }
  }
}

function useTool(game, tool, input, audio) {
  const cost = TOOL_COSTS[tool];
  if (game.coins < cost) {
    showMessage(game, `Not enough coins — ${tool.toUpperCase()} costs ${cost}`, 1.6);
    return;
  }
  game.coins -= cost;
  if (tool === 'emp') {
    freezeAllCameras(game.cameras, 8);
    showMessage(game, 'EMP burst! Cameras frozen for 8s', 2);
    audio.playEmp();
  } else if (tool === 'smoke') {
    game.smokes.push({ x: game.player.x, y: game.player.y, r: 70, life: 5 });
    showMessage(game, 'Smoke bomb! Hidden for 5s', 2);
    audio.playSmoke();
  } else if (tool === 'noise') {
    const target = { x: input.mouseX, y: input.mouseY };
    game.noises.push({ x: target.x, y: target.y, life: 1.2 });
    let nearest = null;
    let best = Infinity;
    for (const guard of game.guards) {
      const d = Math.hypot(guard.x - target.x, guard.y - target.y);
      if (d < best) { best = d; nearest = guard; }
    }
    if (nearest) sendGuardTo(nearest, target.x, target.y, 4);
    showMessage(game, 'Noisemaker thrown — a guard goes to check', 2);
    audio.playNoiseMaker();
  }
}

function laserIsOn(laser, time) {
  const cycle = (time + laser.phase) % laser.period;
  return cycle < laser.period / 2;
}

function updateLasers(game, dt, audio) {
  const player = game.player;
  for (const laser of game.lasers) {
    laser.on = laserIsOn(laser, game.time);
    laser.hitCooldown = Math.max(0, laser.hitCooldown - dt);
    if (!laser.on || laser.hitCooldown > 0) continue;
    // Player crossing the beam strip?
    if (
      player.x > laser.x - PLAYER_RADIUS && player.x < laser.x + laser.w + PLAYER_RADIUS &&
      Math.abs(player.y - laser.y) < PLAYER_RADIUS + laser.h
    ) {
      laser.hitCooldown = 1.5;
      game.alarm = Math.min(100, game.alarm + 20);
      game.flash = 0.5;
      addPopup(game, player.x, player.y - 24, 'LASER! +20 alarm', '#ff5a5a');
      audio.playLaser();
    }
  }
}

function updateAlarm(game, dt, anyGuardSees, anyCameraSees, audio) {
  game.spotted = anyGuardSees;
  game.cameraSpotted = anyCameraSees;
  let rising = false;
  for (const guard of game.guards) {
    if (guard.suspicion > 0.55) {
      game.alarm = Math.min(100, game.alarm + dt * 20 * (guard.suspicion - 0.4));
      rising = true;
    }
  }
  if (anyCameraSees) {
    game.alarm = Math.min(100, game.alarm + dt * 13);
    rising = true;
  }
  if (!rising && !anyGuardSees && !anyCameraSees) {
    game.alarm = Math.max(0, game.alarm - dt * 3.5);
  }
  if (game.alarm > 55) audio.startAlarm();
  else audio.stopAlarm();
  if (game.alarm >= 100) {
    game.result = 'caught';
    game.resultReason = 'The alarm hit 100% — security swarmed the room.';
    audio.stopAlarm();
    audio.playLose();
  }
}

function checkCaughtByGuard(game, audio) {
  for (const guard of game.guards) {
    const d = Math.hypot(guard.x - game.player.x, guard.y - game.player.y);
    if (d < 26) {
      game.result = 'caught';
      game.resultReason = 'A guard grabbed you in the open.';
      audio.stopAlarm();
      audio.playLose();
      return true;
    }
  }
  return false;
}

function checkExit(game, audio) {
  const exit = game.def.exit;
  const player = game.player;
  const inside =
    player.x > exit.x && player.x < exit.x + exit.w &&
    player.y > exit.y - 10 && player.y < exit.y + exit.h + 10;
  if (!inside || !game.lootTaken) return;
  const timeBonus = Math.max(0, 500 - Math.floor(game.levelTime) * 2);
  const levelScore = game.lootValue + timeBonus;
  game.score += levelScore;
  if (game.levelIndex >= 2) {
    game.result = 'win';
    game.resultReason = `Getaway complete! Level score ${levelScore} (loot ${game.lootValue} + time bonus ${timeBonus}).`;
  } else {
    game.result = 'levelclear';
    game.resultReason = `Room cleared! Level score ${levelScore} (loot ${game.lootValue} + time bonus ${timeBonus}).`;
  }
  audio.stopAlarm();
  audio.playWin();
}

// One frame of play. Returns nothing; game.result is set when the level ends.
export function updateGame(game, dt, input, audio) {
  if (game.result) return;
  game.time += dt;
  game.levelTime += dt;
  game.flash = Math.max(0, game.flash - dt);
  game.messageTimer = Math.max(0, game.messageTimer - dt);

  const stepped = movePlayer(game, dt, input);
  if (stepped) audio.playStep();

  if (wasPressed(input, 'interact')) tryGrab(game, audio);
  if (wasPressed(input, 'emp')) useTool(game, 'emp', input, audio);
  if (wasPressed(input, 'smoke')) useTool(game, 'smoke', input, audio);
  if (wasPressed(input, 'noise')) useTool(game, 'noise', input, audio);

  // Mouse clicks on the HUD tool buttons (their rects are computed in render.js).
  const click = takeClick(input);
  if (click && click.y < 48) {
    const tool = toolAtPoint(click.x, click.y);
    if (tool) useTool(game, tool, input, audio);
  }

  let anyGuardSees = false;
  for (const guard of game.guards) {
    const seen = updateGuard(guard, dt, game.player, game.def.walls, game.smokes, () => audio.playStep());
    if (seen) anyGuardSees = true;
  }
  let anyCameraSees = false;
  for (const camera of game.cameras) {
    const seen = updateCamera(camera, dt, game.time, game.player, game.def.walls, game.smokes);
    if (seen) anyCameraSees = true;
  }
  if ((anyGuardSees || anyCameraSees) && game.alarm < 100) {
    if (!game._warned) {
      audio.playSpotted();
      game._warned = true;
    }
  } else {
    game._warned = false;
  }

  updateLasers(game, dt, audio);
  updateAlarm(game, dt, anyGuardSees, anyCameraSees, audio);
  if (game.result) return;

  for (const smoke of game.smokes) smoke.life -= dt;
  game.smokes = game.smokes.filter((s) => s.life > 0);
  for (const noise of game.noises) noise.life -= dt;
  game.noises = game.noises.filter((n) => n.life > 0);
  for (const popup of game.popups) popup.life -= dt;
  game.popups = game.popups.filter((p) => p.life > 0);

  if (checkCaughtByGuard(game, audio)) return;
  checkExit(game, audio);
}

// HUD tool buttons live in the top bar; render.js draws them at these rects.
export const TOOL_BUTTONS = [
  { tool: 'emp', x: 640, y: 8, w: 92, h: 32, label: '1 · EMP', cost: TOOL_COSTS.emp },
  { tool: 'smoke', x: 740, y: 8, w: 92, h: 32, label: '2 · Smoke', cost: TOOL_COSTS.smoke },
  { tool: 'noise', x: 840, y: 8, w: 92, h: 32, label: '3 · Noise', cost: TOOL_COSTS.noise },
];

export function toolAtPoint(x, y) {
  for (const button of TOOL_BUTTONS) {
    if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
      return button.tool;
    }
  }
  return null;
}

export function playerNearLoot(game) {
  const def = game.def;
  if (game.lootTaken) return false;
  return Math.hypot(game.player.x - def.loot.x, game.player.y - def.loot.y) < GRAB_RADIUS;
}

export function playerNearCoin(game) {
  for (const coin of game.coinsLeft) {
    if (coin.taken) continue;
    if (Math.hypot(game.player.x - coin.x, game.player.y - coin.y) < 30) return true;
  }
  return false;
}
