// guards.js — patrol guards, their vision cones, and line-of-sight geometry.
// A guard walks its waypoint loop. When the thief is inside its cone and no
// wall blocks the view, suspicion rises; at high suspicion the alarm climbs
// and the guard gives chase. Breaking line of sight lets suspicion cool off.

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Slab test: does segment (x1,y1)-(x2,y2) cross the rectangle?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function hasLineOfSight(x1, y1, x2, y2, walls) {
  for (const wall of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return false;
  }
  return true;
}

// Is the point inside a watcher's cone (range + half-angle) with clear sight?
export function canSeeWatcher(wx, wy, facing, range, halfAngle, px, py, walls, sneaking) {
  const dx = px - wx;
  const dy = py - wy;
  const dist = Math.hypot(dx, dy);
  const effectiveRange = sneaking ? range * 0.68 : range;
  if (dist > effectiveRange) return false;
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toPlayer, facing)) > halfAngle) return false;
  return hasLineOfSight(wx, wy, px, py, walls);
}

export const GUARD_CONE_RANGE = 190;
export const GUARD_CONE_HALF_ANGLE = Math.PI * 0.21; // ~38 degrees each side

export function createGuard(def) {
  const start = def.waypoints[0];
  return {
    x: start[0],
    y: start[1],
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    speed: def.speed,
    facing: 0,
    suspicion: 0,      // 0..1, rises while the thief is seen
    state: 'patrol',   // patrol | alert | chase | investigate
    investigateX: 0,
    investigateY: 0,
    investigateTimer: 0,
    chaseTimer: 0,
    pauseTimer: 0,
    stepTimer: 0,
  };
}

function moveToward(guard, tx, ty, speed, dt, walls) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  // Slide along walls: try x then y separately.
  if (!circleHitsWalls(nx, guard.y, 13, walls)) guard.x = nx;
  if (!circleHitsWalls(guard.x, ny, 13, walls)) guard.y = ny;
  guard.facing = Math.atan2(dy, dx);
  return dist <= speed * dt + 1;
}

export function circleHitsWalls(cx, cy, r, walls) {
  for (const wall of walls) {
    const nearestX = Math.max(wall.x, Math.min(cx, wall.x + wall.w));
    const nearestY = Math.max(wall.y, Math.min(cy, wall.y + wall.h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

export function updateGuard(guard, dt, player, walls, smokes, onStep) {
  const seen = canSeeWatcher(
    guard.x, guard.y, guard.facing, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE,
    player.x, player.y, walls, player.sneaking,
  ) && !insideSmoke(player.x, player.y, smokes);

  if (seen) {
    guard.suspicion = Math.min(1, guard.suspicion + dt * (player.sneaking ? 0.8 : 1.5));
    if (guard.suspicion > 0.55 && guard.state !== 'chase') guard.state = 'alert';
    if (guard.suspicion >= 1) {
      guard.state = 'chase';
      guard.chaseTimer = 3;
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - dt * 0.45);
    if (guard.state === 'alert' && guard.suspicion < 0.3) guard.state = 'patrol';
  }

  if (guard.state === 'chase') {
    guard.chaseTimer -= dt;
    moveToward(guard, player.x, player.y, guard.speed * 1.5, dt, walls);
    if (guard.chaseTimer <= 0) {
      guard.state = 'patrol';
      guard.suspicion = 0.4;
    }
  } else if (guard.state === 'investigate') {
    guard.investigateTimer -= dt;
    const arrived = moveToward(guard, guard.investigateX, guard.investigateY, guard.speed * 1.15, dt, walls);
    if (arrived || guard.investigateTimer <= 0) {
      guard.state = 'patrol';
      guard.pauseTimer = 1.2;
    }
  } else if (guard.pauseTimer > 0) {
    guard.pauseTimer -= dt;
    guard.facing += dt * 0.8; // look around while pausing at a waypoint
  } else {
    const target = guard.waypoints[guard.waypointIndex];
    const arrived = moveToward(guard, target[0], target[1], guard.speed, dt, walls);
    if (arrived) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseTimer = 0.6;
    }
  }

  // Footstep ticks for the audio layer.
  guard.stepTimer -= dt;
  if (guard.stepTimer <= 0) {
    guard.stepTimer = 0.45;
    if (onStep) onStep();
  }

  return seen;
}

export function insideSmoke(x, y, smokes) {
  for (const smoke of smokes) {
    const dx = x - smoke.x;
    const dy = y - smoke.y;
    if (dx * dx + dy * dy < smoke.r * smoke.r) return true;
  }
  return false;
}

export function sendGuardTo(guard, x, y, seconds) {
  guard.state = 'investigate';
  guard.investigateX = x;
  guard.investigateY = y;
  guard.investigateTimer = seconds;
  guard.suspicion = Math.max(guard.suspicion, 0.2);
}
