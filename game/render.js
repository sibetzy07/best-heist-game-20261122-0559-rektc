// render.js — every pixel of Vaultbreak: floor, walls, ray-cast vision cones,
// guards, cameras, lasers, loot, the thief, the HUD and all menu screens.

import { GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE } from './guards.js';
import { CAMERA_CONE_HALF_ANGLE } from './cameras.js';
import { TOOL_BUTTONS, TOOL_COSTS, playerNearLoot, playerNearCoin } from './game.js';

// Distance along a ray before it hits a wall rect, or Infinity.
function rayHitDistance(x, y, dx, dy, rect) {
  let tmin = 0;
  let tmax = Infinity;
  if (dx === 0) {
    if (x < rect.x || x > rect.x + rect.w) return Infinity;
  } else {
    let t1 = (rect.x - x) / dx;
    let t2 = (rect.x + rect.w - x) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  if (dy === 0) {
    if (y < rect.y || y > rect.y + rect.h) return Infinity;
  } else {
    let t1 = (rect.y - y) / dy;
    let t2 = (rect.y + rect.h - y) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

function castRay(x, y, angle, maxDist, walls) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const wall of walls) {
    const hit = rayHitDistance(x, y, dx, dy, wall);
    if (hit < best) best = hit;
  }
  return best;
}

// A vision cone whose edge stops at walls, like a flashlight in the dark.
function drawCone(ctx, x, y, facing, range, halfAngle, walls, color, edgeColor) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= steps; i++) {
    const angle = facing - halfAngle + (2 * halfAngle * i) / steps;
    const dist = castRay(x, y, angle, range, walls);
    ctx.lineTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx) {
  ctx.fillStyle = '#1b1b2b';
  ctx.fillRect(0, 48, 960, 592);
  // Checker tiles, faint, so routes read at a glance.
  const tile = 40;
  for (let ty = 48; ty < 640; ty += tile) {
    for (let tx = 0; tx < 960; tx += tile) {
      const odd = ((tx / tile) + ((ty - 48) / tile)) % 2 === 0;
      ctx.fillStyle = odd ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(tx, ty, tile, tile);
    }
  }
  // A red carpet runner down the middle of each room.
  ctx.fillStyle = 'rgba(140,30,50,0.16)';
  ctx.fillRect(440, 48, 80, 592);
}

function drawWalls(ctx, walls) {
  for (const wall of walls) {
    if (wall.kind === 'wall') {
      ctx.fillStyle = '#3d3d5c';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = '#56568a';
      ctx.fillRect(wall.x, wall.y, wall.w, 3);
    } else if (wall.kind === 'case') {
      // Glass display case: dark frame, glowing glass top.
      ctx.fillStyle = '#2a2a44';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = 'rgba(120,200,255,0.22)';
      ctx.fillRect(wall.x + 4, wall.y + 4, wall.w - 8, wall.h - 8);
      ctx.strokeStyle = '#6a6a9a';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x + 1, wall.y + 1, wall.w - 2, wall.h - 2);
    } else if (wall.kind === 'crate') {
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeStyle = '#7a5a34';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x + 3, wall.y + 3, wall.w - 6, wall.h - 6);
      ctx.beginPath();
      ctx.moveTo(wall.x + 3, wall.y + 3);
      ctx.lineTo(wall.x + wall.w - 3, wall.y + wall.h - 3);
      ctx.moveTo(wall.x + wall.w - 3, wall.y + 3);
      ctx.lineTo(wall.x + 3, wall.y + wall.h - 3);
      ctx.stroke();
    } else {
      // Desk: wood top with a lamp glow.
      ctx.fillStyle = '#5a3d24';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = 'rgba(255,220,120,0.25)';
      ctx.fillRect(wall.x + wall.w / 2 - 8, wall.y + 6, 16, 12);
    }
  }
}

function drawExit(ctx, exit, lootTaken, time) {
  const pulse = 0.5 + 0.3 * Math.sin(time * 3);
  ctx.fillStyle = lootTaken ? `rgba(60,220,110,${0.35 + pulse * 0.3})` : 'rgba(60,220,110,0.18)';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = '#3cdc6e';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = '#b8ffcf';
  ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lootTaken ? 'EXIT ▲' : 'EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2);
}

function drawLoot(ctx, game, time) {
  const def = game.def;
  if (!game.lootTaken) {
    const pulse = 1 + 0.15 * Math.sin(time * 4);
    const glow = ctx.createRadialGradient(def.loot.x, def.loot.y, 4, def.loot.x, def.loot.y, 46 * pulse);
    glow.addColorStop(0, 'rgba(255,215,106,0.85)');
    glow.addColorStop(1, 'rgba(255,215,106,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(def.loot.x, def.loot.y, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // The jewel itself: a faceted diamond.
    ctx.save();
    ctx.translate(def.loot.x, def.loot.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(-11, -11, 22, 22);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.lootName.toUpperCase(), def.loot.x, def.loot.y - 34);
  }
  for (const coin of game.coinsLeft) {
    if (coin.taken) continue;
    const bob = Math.sin(time * 3 + coin.x) * 2;
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff0b0';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLasers(ctx, game) {
  for (const laser of game.lasers) {
    ctx.fillStyle = laser.on ? 'rgba(255,40,40,0.9)' : 'rgba(255,40,40,0.15)';
    ctx.fillRect(laser.x, laser.y - laser.h / 2, laser.w, laser.h);
    if (laser.on) {
      ctx.fillStyle = 'rgba(255,120,120,0.5)';
      ctx.fillRect(laser.x, laser.y - 5, laser.w, 2);
      ctx.fillRect(laser.x, laser.y + 3, laser.w, 2);
    }
    ctx.fillStyle = '#888';
    ctx.fillRect(laser.x - 6, laser.y - 8, 6, 16);
    ctx.fillRect(laser.x + laser.w, laser.y - 8, 6, 16);
  }
}

function drawGuards(ctx, game) {
  for (const guard of game.guards) {
    const hot = guard.suspicion > 0.55;
    const warm = guard.suspicion > 0.3;
    const coneColor = hot
      ? 'rgba(255,60,60,0.30)'
      : warm ? 'rgba(255,190,60,0.26)' : 'rgba(255,220,90,0.20)';
    const edgeColor = hot ? 'rgba(255,80,80,0.5)' : 'rgba(255,220,90,0.35)';
    drawCone(ctx, guard.x, guard.y, guard.facing, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, game.def.walls, coneColor, edgeColor);
  }
  for (const guard of game.guards) {
    // Body: navy uniform with a cap.
    ctx.fillStyle = '#2c4a7a';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c3050';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 8, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#cfe0ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 18, guard.y + Math.sin(guard.facing) * 18);
    ctx.stroke();
    // Alert marks.
    if (guard.suspicion > 0.55) {
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 22);
    } else if (guard.state === 'investigate') {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 20px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', guard.x, guard.y - 22);
    }
    // Suspicion arc over the guard's head.
    if (guard.suspicion > 0.05) {
      ctx.strokeStyle = guard.suspicion > 0.55 ? '#ff4040' : '#ffd76a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 18, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawCameras(ctx, game) {
  for (const camera of game.cameras) {
    const color = camera.frozen > 0
      ? 'rgba(150,150,170,0.16)'
      : camera.seeing ? 'rgba(255,50,50,0.32)' : 'rgba(255,70,70,0.20)';
    const edge = camera.frozen > 0 ? 'rgba(150,150,170,0.3)' : 'rgba(255,70,70,0.4)';
    drawCone(ctx, camera.x, camera.y, camera.angle, camera.range, CAMERA_CONE_HALF_ANGLE, game.def.walls, color, edge);
  }
  for (const camera of game.cameras) {
    ctx.fillStyle = camera.frozen > 0 ? '#777' : camera.seeing ? '#ff3030' : '#c03030';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 4, 0, Math.PI * 2);
    ctx.fill();
    // Lens direction tick.
    ctx.strokeStyle = camera.frozen > 0 ? '#999' : '#ff8080';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y);
    ctx.lineTo(camera.x + Math.cos(camera.angle) * 14, camera.y + Math.sin(camera.angle) * 14);
    ctx.stroke();
    if (camera.frozen > 0) {
      ctx.fillStyle = '#cfe0ff';
      ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP', camera.x, camera.y - 14);
    }
  }
}

function drawPlayer(ctx, game, time) {
  const player = game.player;
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 9, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded thief: dark cloak, pale mask, gold trim.
  const bob = player.moving ? Math.sin(time * 10) * 1.5 : 0;
  ctx.fillStyle = player.sneaking ? '#241a3d' : '#2e2148';
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 4, player.y + bob + Math.sin(player.facing) * 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 13, -0.6, 0.6);
  ctx.stroke();
  // Sneak indicator.
  if (player.sneaking) {
    ctx.fillStyle = '#9fb8ff';
    ctx.font = '11px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', player.x, player.y - 20);
  }
}

function drawSmokesAndNoises(ctx, game) {
  for (const smoke of game.smokes) {
    const alpha = Math.min(0.75, smoke.life * 0.3);
    ctx.fillStyle = `rgba(180,180,200,${alpha})`;
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, smoke.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const noise of game.noises) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, 10 + (1.2 - noise.life) * 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLINK!', noise.x, noise.y - 16);
  }
  for (const popup of game.popups) {
    ctx.globalAlpha = Math.min(1, popup.life);
    ctx.fillStyle = popup.color;
    ctx.font = 'bold 16px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(popup.text, popup.x, popup.y - (1.4 - popup.life) * 24);
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx, game, input) {
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, 960, 48);
  ctx.fillStyle = '#3a3a55';
  ctx.fillRect(0, 47, 960, 1);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 17px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(game.def.name, 14, 16);
  ctx.fillStyle = '#8f8fb0';
  ctx.font = '12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(game.def.subtitle, 14, 34);

  // Alarm meter.
  const ax = 218;
  const ay = 12;
  ctx.fillStyle = '#8f8fb0';
  ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('ALARM', ax, ay + 5);
  ctx.fillStyle = '#222';
  ctx.fillRect(ax + 48, ay, 150, 16);
  const alarmFrac = game.alarm / 100;
  const alarmColor = game.alarm > 70 ? '#ff3030' : game.alarm > 35 ? '#ff9a2a' : '#ffd76a';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(ax + 48, ay, 150 * alarmFrac, 16);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax + 48, ay, 150, 16);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`${Math.floor(game.alarm)}%`, ax + 204, ay + 8);

  // Loot and coins, stacked in the middle-right of the bar.
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 14px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`LOOT $${game.lootValue}`, 486, 16);
  ctx.fillStyle = '#ffcf3f';
  ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`◉ ${game.coins} coins`, 486, 34);

  // Tool buttons (clickable; hotkeys 1/2/3).
  for (const button of TOOL_BUTTONS) {
    const affordable = game.coins >= button.cost;
    const hover =
      input.mouseX >= button.x && input.mouseX <= button.x + button.w &&
      input.mouseY >= button.y && input.mouseY <= button.y + button.h;
    ctx.fillStyle = hover ? '#3a3a6a' : '#23233a';
    ctx.fillRect(button.x, button.y, button.w, button.h);
    ctx.strokeStyle = affordable ? '#ffd76a' : '#555';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(button.x, button.y, button.w, button.h);
    ctx.fillStyle = affordable ? '#ffe9a8' : '#777';
    ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${button.label} · ${button.cost}c`, button.x + button.w / 2, button.y + button.h / 2 + 1);
  }
  ctx.textAlign = 'left';
}

function drawWarnings(ctx, game) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (game.spotted) {
    ctx.fillStyle = 'rgba(255,40,40,0.9)';
    ctx.font = 'bold 26px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('SPOTTED!', 480, 84);
  } else if (game.cameraSpotted) {
    ctx.fillStyle = 'rgba(255,120,40,0.95)';
    ctx.font = 'bold 24px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('ON CAMERA!', 480, 84);
  }
  if (game.messageTimer > 0) {
    ctx.fillStyle = 'rgba(10,10,20,0.75)';
    const w = ctx.measureText(game.message).width + 28;
    ctx.fillRect(480 - w / 2, 600, w, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '14px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(game.message, 480, 613);
  }
  if (playerNearLoot(game) || playerNearCoin(game)) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 16px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('Press E to grab', game.player.x, game.player.y - 30);
  }
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${game.flash * 0.5})`;
    ctx.fillRect(0, 48, 960, 592);
  }
  // Timer + score, bottom corners.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8f8fb0';
  ctx.font = '13px "Trebuchet MS", Verdana, sans-serif';
  const mins = Math.floor(game.levelTime / 60);
  const secs = Math.floor(game.levelTime % 60).toString().padStart(2, '0');
  ctx.fillText(`${mins}:${secs}`, 16, 626);
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${game.score}`, 944, 626);
  ctx.textAlign = 'left';
}

// The live game frame.
export function drawGame(ctx, game, input) {
  drawFloor(ctx);
  drawLoot(ctx, game, game.time);
  drawExit(ctx, game.def.exit, game.lootTaken, game.time);
  drawLasers(ctx, game);
  drawGuards(ctx, game);
  drawCameras(ctx, game);
  drawWalls(ctx, game.def.walls);
  drawSmokesAndNoises(ctx, game);
  drawPlayer(ctx, game, game.time);
  drawHud(ctx, game, input);
  drawWarnings(ctx, game);
}

// --- Screens ---------------------------------------------------------------

function drawBackdrop(ctx) {
  ctx.fillStyle = '#0d0d18';
  ctx.fillRect(0, 0, 960, 640);
  // Faint vault door rings behind the title.
  ctx.strokeStyle = 'rgba(255,215,106,0.12)';
  ctx.lineWidth = 3;
  for (let r = 60; r <= 240; r += 60) {
    ctx.beginPath();
    ctx.arc(480, 250, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function centerText(ctx, text, y, font, color) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 480, y);
}

export function drawMenu(ctx, unlockedLevels, time) {
  drawBackdrop(ctx);
  const glow = 0.7 + 0.3 * Math.sin(time * 2);
  ctx.fillStyle = `rgba(255,215,106,${glow})`;
  ctx.font = 'bold 64px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VAULTBREAK', 480, 150);
  centerText(ctx, '— The Midnight Gallery Heist —', 200, 'italic 20px "Trebuchet MS", Verdana, sans-serif', '#b9b9d6');
  centerText(ctx, 'Slip past the guards. Dodge the cameras. Lift the jewel. Vanish.', 260, '17px "Trebuchet MS", Verdana, sans-serif', '#e8e8f2');
  centerText(ctx, 'WASD / arrows — move      Shift — sneak      E — grab loot', 310, '16px "Trebuchet MS", Verdana, sans-serif', '#c9c9e0');
  centerText(ctx, '1 EMP (freeze cameras) · 2 Smoke bomb · 3 Noisemaker (lure a guard)', 336, '16px "Trebuchet MS", Verdana, sans-serif', '#c9c9e0');
  centerText(ctx, 'Coins buy tools. If the alarm hits 100%, you are caught.', 362, '16px "Trebuchet MS", Verdana, sans-serif', '#c9c9e0');
  centerText(ctx, 'CLICK OR PRESS ENTER TO START', 440, 'bold 22px "Trebuchet MS", Verdana, sans-serif', '#ffd76a');
  const rooms = ['1 · The Gallery', '2 · The Vault Wing', '3 · The Diamond Vault'];
  rooms.forEach((room, i) => {
    const locked = i >= unlockedLevels;
    centerText(ctx, locked ? `${room}  —  LOCKED` : room, 500 + i * 30, '16px "Trebuchet MS", Verdana, sans-serif', locked ? '#555' : '#8fd6a8');
  });
  centerText(ctx, 'Three rooms. One clean getaway.', 600, 'italic 15px "Trebuchet MS", Verdana, sans-serif', '#8f8fb0');
}

export function drawCaught(ctx, reason) {
  ctx.fillStyle = 'rgba(40,0,0,0.72)';
  ctx.fillRect(0, 0, 960, 640);
  centerText(ctx, 'BUSTED!', 250, 'bold 64px "Trebuchet MS", Verdana, sans-serif', '#ff4040');
  centerText(ctx, reason, 320, '18px "Trebuchet MS", Verdana, sans-serif', '#ffd0d0');
  centerText(ctx, 'The crew leaves no thief behind — but this run is over.', 360, '16px "Trebuchet MS", Verdana, sans-serif', '#c9c9e0');
  centerText(ctx, 'PRESS ENTER TO TRY AGAIN', 440, 'bold 22px "Trebuchet MS", Verdana, sans-serif', '#ffd76a');
}

export function drawLevelClear(ctx, reason, score) {
  ctx.fillStyle = 'rgba(0,30,10,0.6)';
  ctx.fillRect(0, 0, 960, 640);
  centerText(ctx, 'ROOM CLEARED!', 250, 'bold 56px "Trebuchet MS", Verdana, sans-serif', '#3cdc6e');
  centerText(ctx, reason, 320, '18px "Trebuchet MS", Verdana, sans-serif', '#e8ffe8');
  centerText(ctx, `Total score so far: ${score}`, 360, 'bold 20px "Trebuchet MS", Verdana, sans-serif', '#ffd76a');
  centerText(ctx, 'PRESS ENTER FOR THE NEXT ROOM', 440, 'bold 22px "Trebuchet MS", Verdana, sans-serif', '#ffd76a');
}

export function drawWin(ctx, reason, score) {
  drawBackdrop(ctx);
  centerText(ctx, 'CLEAN GETAWAY!', 200, 'bold 56px "Trebuchet MS", Verdana, sans-serif', '#ffd76a');
  centerText(ctx, 'Every jewel lifted. Every guard outwitted. The crew vanishes into the night.', 270, '18px "Trebuchet MS", Verdana, sans-serif', '#e8e8f2');
  centerText(ctx, reason, 320, '16px "Trebuchet MS", Verdana, sans-serif', '#c9c9e0');
  centerText(ctx, `FINAL SCORE: ${score}`, 380, 'bold 28px "Trebuchet MS", Verdana, sans-serif', '#3cdc6e');
  centerText(ctx, 'PRESS ENTER TO PLAY AGAIN', 460, 'bold 22px "Trebuchet MS", Verdana, sans-serif', '#ffd76a');
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 960, 640);
  centerText(ctx, 'PAUSED', 300, 'bold 48px "Trebuchet MS", Verdana, sans-serif', '#fff');
  centerText(ctx, 'Press P to keep sneaking', 360, '18px "Trebuchet MS", Verdana, sans-serif', '#c9c9e0');
}
