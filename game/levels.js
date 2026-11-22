// levels.js — the three rooms of Vaultbreak.
// Each level is plain data: walls and cover (all block movement and sight),
// guard patrol routes, wall cameras, laser gates, loot, coins, exit and spawn.
// Playfield: x 0..960, y 48..640 (the top 48px are the HUD bar).

export const PLAY = { x: 0, y: 48, w: 960, h: 592 };

function borderWalls() {
  return [
    { x: 0, y: 48, w: 960, h: 12, kind: 'wall' },
    { x: 0, y: 628, w: 960, h: 12, kind: 'wall' },
    { x: 0, y: 48, w: 12, h: 592, kind: 'wall' },
    { x: 948, y: 48, w: 12, h: 592, kind: 'wall' },
  ];
}

const LEVEL_DEFS = [
  {
    name: 'The Gallery',
    subtitle: 'Room 1 of 3 — lift the Star Sapphire',
    lootName: 'Star Sapphire',
    lootValue: 500,
    startCoins: 40,
    playerStart: { x: 480, y: 580 },
    exit: { x: 440, y: 596, w: 80, h: 32, label: 'EXIT' },
    loot: { x: 480, y: 140 },
    coins: [
      { x: 150, y: 150 }, { x: 810, y: 150 }, { x: 150, y: 560 },
      { x: 810, y: 560 }, { x: 480, y: 330 },
    ],
    walls: [
      ...borderWalls(),
      { x: 300, y: 210, w: 120, h: 56, kind: 'case' },
      { x: 540, y: 210, w: 120, h: 56, kind: 'case' },
      { x: 120, y: 370, w: 90, h: 56, kind: 'case' },
      { x: 750, y: 370, w: 90, h: 56, kind: 'case' },
      { x: 80, y: 500, w: 70, h: 70, kind: 'crate' },
      { x: 810, y: 500, w: 70, h: 70, kind: 'crate' },
      { x: 420, y: 430, w: 120, h: 44, kind: 'desk' },
    ],
    guards: [
      { waypoints: [[200, 150], [760, 150], [760, 300], [200, 300]], speed: 55 },
      { waypoints: [[200, 450], [760, 450], [760, 560], [200, 560]], speed: 50 },
    ],
    cameras: [
      { x: 130, y: 62, baseAngle: 80, sweep: 70, speed: 0.55, range: 210 },
      { x: 830, y: 62, baseAngle: 100, sweep: 70, speed: 0.55, range: 210 },
    ],
    lasers: [],
  },
  {
    name: 'The Vault Wing',
    subtitle: 'Room 2 of 3 — steal the Golden Idol',
    lootName: 'Golden Idol',
    lootValue: 750,
    startCoins: 40,
    playerStart: { x: 480, y: 580 },
    exit: { x: 440, y: 596, w: 80, h: 32, label: 'EXIT' },
    loot: { x: 480, y: 120 },
    coins: [
      { x: 90, y: 120 }, { x: 870, y: 120 }, { x: 90, y: 580 },
      { x: 870, y: 580 }, { x: 300, y: 340 }, { x: 660, y: 340 },
    ],
    walls: [
      ...borderWalls(),
      { x: 240, y: 48, w: 16, h: 130, kind: 'wall' },
      { x: 704, y: 48, w: 16, h: 130, kind: 'wall' },
      { x: 240, y: 462, w: 16, h: 166, kind: 'wall' },
      { x: 704, y: 462, w: 16, h: 166, kind: 'wall' },
      { x: 360, y: 250, w: 240, h: 46, kind: 'case' },
      { x: 120, y: 300, w: 70, h: 120, kind: 'crate' },
      { x: 770, y: 300, w: 70, h: 120, kind: 'crate' },
      { x: 420, y: 470, w: 120, h: 44, kind: 'desk' },
    ],
    guards: [
      { waypoints: [[150, 220], [480, 220], [480, 420], [150, 420]], speed: 62 },
      { waypoints: [[810, 220], [480, 220], [480, 420], [810, 420]], speed: 62 },
      { waypoints: [[300, 540], [660, 540], [660, 580], [300, 580]], speed: 58 },
    ],
    cameras: [
      { x: 480, y: 62, baseAngle: 90, sweep: 90, speed: 0.7, range: 220 },
      { x: 130, y: 62, baseAngle: 70, sweep: 60, speed: 0.6, range: 200 },
      { x: 830, y: 62, baseAngle: 110, sweep: 60, speed: 0.6, range: 200 },
    ],
    lasers: [],
  },
  {
    name: 'The Diamond Vault',
    subtitle: 'Room 3 of 3 — take the Heart Diamond',
    lootName: 'Heart Diamond',
    lootValue: 1000,
    startCoins: 40,
    playerStart: { x: 480, y: 580 },
    exit: { x: 440, y: 596, w: 80, h: 32, label: 'EXIT' },
    loot: { x: 480, y: 110 },
    coins: [
      { x: 90, y: 110 }, { x: 870, y: 110 }, { x: 90, y: 580 },
      { x: 870, y: 580 }, { x: 240, y: 330 }, { x: 720, y: 330 },
      { x: 480, y: 480 }, { x: 480, y: 220 },
    ],
    walls: [
      ...borderWalls(),
      { x: 180, y: 48, w: 16, h: 150, kind: 'wall' },
      { x: 764, y: 48, w: 16, h: 150, kind: 'wall' },
      { x: 180, y: 442, w: 16, h: 186, kind: 'wall' },
      { x: 764, y: 442, w: 16, h: 186, kind: 'wall' },
      { x: 330, y: 160, w: 90, h: 50, kind: 'case' },
      { x: 540, y: 160, w: 90, h: 50, kind: 'case' },
      { x: 330, y: 400, w: 90, h: 50, kind: 'case' },
      { x: 540, y: 400, w: 90, h: 50, kind: 'case' },
      { x: 60, y: 300, w: 60, h: 60, kind: 'crate' },
      { x: 840, y: 300, w: 60, h: 60, kind: 'crate' },
      { x: 420, y: 520, w: 120, h: 40, kind: 'desk' },
    ],
    guards: [
      { waypoints: [[120, 240], [480, 240], [480, 320], [120, 320]], speed: 70 },
      { waypoints: [[840, 240], [480, 240], [480, 320], [840, 320]], speed: 70 },
      { waypoints: [[240, 470], [720, 470], [720, 560], [240, 560]], speed: 66 },
      { waypoints: [[480, 120], [480, 200], [360, 200], [360, 120]], speed: 60 },
    ],
    cameras: [
      { x: 250, y: 62, baseAngle: 85, sweep: 80, speed: 0.8, range: 220 },
      { x: 710, y: 62, baseAngle: 95, sweep: 80, speed: 0.8, range: 220 },
      { x: 60, y: 320, baseAngle: 0, sweep: 70, speed: 0.65, range: 200 },
      { x: 900, y: 320, baseAngle: 180, sweep: 70, speed: 0.65, range: 200 },
    ],
    lasers: [
      { x: 256, y: 300, w: 448, h: 6, period: 4, phase: 0 },
      { x: 256, y: 500, w: 448, h: 6, period: 4, phase: 2 },
    ],
  },
];

// A fresh, mutable copy of a level definition (guards and cameras get runtime state).
export function buildLevel(index) {
  const def = LEVEL_DEFS[index % LEVEL_DEFS.length];
  return JSON.parse(JSON.stringify(def));
}

export function levelCount() {
  return LEVEL_DEFS.length;
}
