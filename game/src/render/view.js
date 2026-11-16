// The canvas viewport: a fixed 1280x720 logical field scaled to the window and centred with a
// night-coloured letterbox. Mouse coordinates are converted back into that logical field, so
// aiming and menu hit-tests behave identically at every window size.
import { FIELD } from '../config.js';
import { COLORS } from '../palette.js';
import { shakeOffset } from '../camera.js';

export function createView(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const state = { scale: 1, x: 0, y: 0, dpr: 1 };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));
    state.dpr = dpr;
    canvas.width = width;
    canvas.height = height;
    state.scale = Math.min(width / FIELD.width, height / FIELD.height);
    state.x = (width - FIELD.width * state.scale) / 2;
    state.y = (height - FIELD.height * state.scale) / 2;
  }

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
    const py = (clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
    return {
      x: (px - state.x) / state.scale,
      y: (py - state.y) / state.scale,
    };
  }

  function beginFrame(camera, time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.night;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shake = camera ? shakeOffset(camera, time) : { x: 0, y: 0 };
    ctx.setTransform(
      state.scale, 0, 0, state.scale,
      state.x + shake.x * state.scale,
      state.y + shake.y * state.scale,
    );
  }

  resize();
  window.addEventListener('resize', resize);
  return { ctx, state, resize, toLogical, beginFrame };
}
