// Keyboard/pointer input in logical field coordinates: held state plus one-shot ACTION flags.

export const ACTION = {
  confirm: 1,
  pause: 2,
  mute: 4,
  dash: 8,
  bloom: 16,
  up: 32,
  down: 64,
  left: 128,
  right: 256,
  card1: 512,
  card2: 1024,
  card3: 2048,
  howto: 4096,
};

const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyJ', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight',
  'Escape', 'KeyP', 'KeyM', 'Enter', 'NumpadEnter', 'KeyH',
  'Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3',
]);

export function createInput(canvas, toLogical) {
  const held = new Set();
  const pointer = { x: 640, y: 400, left: false, right: false, inside: true };
  let actions = 0;
  let clicks = [];

  function press(code) {
    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') actions |= ACTION.dash;
    else if (code === 'KeyE') actions |= ACTION.bloom;
    else if (code === 'Escape' || code === 'KeyP') actions |= ACTION.pause;
    else if (code === 'KeyM') actions |= ACTION.mute;
    else if (code === 'Enter' || code === 'NumpadEnter') actions |= ACTION.confirm;
    else if (code === 'KeyH') actions |= ACTION.howto;
    else if (code === 'ArrowUp' || code === 'KeyW') actions |= ACTION.up;
    else if (code === 'ArrowDown' || code === 'KeyS') actions |= ACTION.down;
    else if (code === 'ArrowLeft' || code === 'KeyA') actions |= ACTION.left;
    else if (code === 'ArrowRight' || code === 'KeyD') actions |= ACTION.right;
    else if (code === 'Digit1' || code === 'Numpad1') actions |= ACTION.card1;
    else if (code === 'Digit2' || code === 'Numpad2') actions |= ACTION.card2;
    else if (code === 'Digit3' || code === 'Numpad3') actions |= ACTION.card3;
  }

  window.addEventListener('keydown', (event) => {
    if (!MOVE_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) press(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    pointer.left = false;
    pointer.right = false;
  });

  function pointerPosition(event) {
    const point = toLogical(event.clientX, event.clientY);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.inside = point.x >= 0 && point.y >= 0 && point.x <= 1280 && point.y <= 720;
  }

  canvas.addEventListener('pointermove', (event) => {
    pointerPosition(event);
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointerPosition(event);
    if (event.button === 0) pointer.left = true;
    else if (event.button === 2) pointer.right = true;
    clicks.push({ x: pointer.x, y: pointer.y, button: event.button });
    if (event.button === 2) actions |= ACTION.bloom;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.button === 0) pointer.left = false;
    else if (event.button === 2) pointer.right = false;
  });
  canvas.addEventListener('pointercancel', () => {
    pointer.left = false;
    pointer.right = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('mouseleave', () => {
    pointer.left = false;
    pointer.right = false;
  });

  return {
    pointer,
    /** One-shot key presses since the last call, as ACTION flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Clicks queued since the last call, in order. */
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
    down(code) {
      return held.has(code);
    },
    /** The movement vector the Warden should follow this step. */
    movement() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = Math.SQRT1_2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** Firing is the held left button or J; Bloom is E, right button or the queued flag. */
    firing() {
      return pointer.left || held.has('KeyJ');
    },
    clear() {
      held.clear();
      pointer.left = false;
      pointer.right = false;
      actions = 0;
      clicks = [];
    },
  };
}

/** A no-op input used while a shot is staged: the autopilot writes a control snapshot directly. */
export function createNullInput() {
  return {
    pointer: { x: 640, y: 300, left: false, right: false, inside: true },
    takeActions: () => 0,
    takeClicks: () => [],
    down: () => false,
    movement: () => ({ x: 0, y: 0 }),
    firing: () => false,
    clear: () => {},
  };
}
