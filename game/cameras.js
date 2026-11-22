// cameras.js — wall-mounted security cameras.
// A camera sits on a wall and sweeps its cone back and forth. While the thief
// is inside the cone with clear sight, the alarm climbs. An EMP freezes a
// camera in place (its cone goes grey) until the freeze timer runs out.

import { canSeeWatcher, insideSmoke } from './guards.js';

export const CAMERA_CONE_HALF_ANGLE = Math.PI * 0.2; // ~36 degrees each side

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: (def.baseAngle * Math.PI) / 180,
    sweep: (def.sweep * Math.PI) / 180,
    sweepSpeed: def.speed,
    range: def.range,
    phase: Math.random() * Math.PI * 2,
    angle: (def.baseAngle * Math.PI) / 180,
    frozen: 0,   // seconds left frozen by an EMP
    seeing: false,
  };
}

export function updateCamera(camera, dt, time, player, walls, smokes) {
  if (camera.frozen > 0) {
    camera.frozen -= dt;
    camera.seeing = false;
    return false;
  }
  camera.angle = camera.baseAngle + Math.sin(time * camera.sweepSpeed + camera.phase) * (camera.sweep / 2);
  const seen = canSeeWatcher(
    camera.x, camera.y, camera.angle, camera.range, CAMERA_CONE_HALF_ANGLE,
    player.x, player.y, walls, player.sneaking,
  ) && !insideSmoke(player.x, player.y, smokes);
  camera.seeing = seen;
  return seen;
}

export function freezeAllCameras(cameras, seconds) {
  for (const camera of cameras) camera.frozen = seconds;
}
