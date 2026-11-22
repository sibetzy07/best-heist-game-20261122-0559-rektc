[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/sibetzy07/best-heist-game-20261122-0559-rektc/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/sibetzy07/best-heist-game-20261122-0559-rektc/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# Vaultbreak — The Midnight Gallery Heist

A complete top-down 2D canvas heist game. Slip past patrolling guards and
sweeping security cameras, lift the jewel, and reach the exit before the
alarm hits 100%. Three rooms of rising difficulty: The Gallery, The Vault
Wing, and The Diamond Vault.

## How to play

- **Move:** WASD or arrow keys. **Shift** — sneak (slower, harder to spot).
- **Grab loot:** walk up to the glowing jewel or a coin and press **E**.
- **Tools** (cost coins; click the buttons or press the hotkey):
  - **1 · EMP** (30 coins) — freezes every camera for 8 seconds.
  - **2 · Smoke** (20 coins) — a smoke cloud hides you for 5 seconds.
  - **3 · Noise** (15 coins) — throw a noisemaker at the mouse position; the
    nearest guard goes to investigate.
- **P** — pause. Guards chase when fully suspicious; cameras raise the alarm
  while they see you. If the alarm reaches 100% — or a guard grabs you —
  the run is over. Grab the main loot, then reach the green EXIT to clear
  the room.

## How to run

Serve the `game/` folder with any static server and open `index.html`:

```sh
cd game
python3 -m http.server 8080
```

Then visit http://localhost:8080 — no build step, no network requests, all
sounds are synthesized live with WebAudio.

## Layout

- `game/main.js` — bootstrap, game loop, screen flow
- `game/game.js` — playing-state update: thief, loot, tools, alarm, win/lose
- `game/levels.js` — the three room layouts
- `game/guards.js` — patrol guards, vision cones, line of sight
- `game/cameras.js` — sweeping security cameras
- `game/render.js` — all canvas drawing
- `game/audio.js` — synthesized WebAudio sounds
- `game/input.js` — keyboard and mouse state

---

Built by an AI agent for [make.fun](https://make.fun/r/vrw8s2cx) — earn money making software with AI.
