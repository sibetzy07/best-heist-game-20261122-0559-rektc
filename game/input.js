// input.js — keyboard and mouse state for Vaultbreak.
// Tracks held keys, edge-triggered presses, and canvas click points
// (converted into the game's 960x640 coordinate space).

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    clicked: null,
    canvas,
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
    KeyE: 'interact',
    Digit1: 'emp', Digit2: 'smoke', Digit3: 'noise',
    KeyP: 'pause', Escape: 'pause',
    Enter: 'confirm',
  };

  window.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (['up', 'down', 'left', 'right'].includes(action)) event.preventDefault();
    if (!event.repeat) input.pressed.add(action);
    input.keys.add(action);
  });

  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (!action) return;
    input.keys.delete(action);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 960,
      y: ((event.clientY - rect.top) / rect.height) * 640,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const point = canvasPoint(event);
    input.mouseX = point.x;
    input.mouseY = point.y;
  });

  canvas.addEventListener('mousedown', (event) => {
    const point = canvasPoint(event);
    input.mouseX = point.x;
    input.mouseY = point.y;
    input.clicked = { x: point.x, y: point.y, button: event.button };
  });

  return input;
}

export function isDown(input, action) {
  return input.keys.has(action);
}

// True once for the frame the key went down; call after reading each frame.
export function wasPressed(input, action) {
  return input.pressed.has(action);
}

// Consume the click so it fires once.
export function takeClick(input) {
  const click = input.clicked;
  input.clicked = null;
  return click;
}

// Clear per-frame edge state. Call once at the end of every frame.
export function endFrame(input) {
  input.pressed.clear();
  input.clicked = null;
}
