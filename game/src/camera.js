// Screen shake and hit-stop, kept apart from the rules. Shake is a decaying magnitude the
// renderer turns into a small offset; hit-stop freezes the simulation for a few frames on a
// big impact while the screen keeps painting. Both are deliberately restrained.
export function createCamera() {
  return {
    shake: 0,
    hitStop: 0,
    flash: 0,
    flashColor: 'rgba(255, 255, 255, 0)',
  };
}

export function kickShake(camera, amount) {
  camera.shake = Math.max(camera.shake, amount);
}

export function kickHitStop(camera, seconds) {
  camera.hitStop = Math.max(camera.hitStop, seconds);
}

export function flashScreen(camera, amount, color) {
  camera.flash = Math.max(camera.flash, amount);
  if (color) camera.flashColor = color;
}

export function updateCamera(camera, dt) {
  camera.shake = Math.max(0, camera.shake - dt * 34);
  camera.flash = Math.max(0, camera.flash - dt * 3.1);
}

/** Horizontal and vertical shake offsets for the current frame. */
export function shakeOffset(camera, time) {
  if (camera.shake <= 0.01) return { x: 0, y: 0 };
  return {
    x: Math.sin(time * 71.3) * camera.shake * 0.6,
    y: Math.cos(time * 93.7) * camera.shake * 0.45,
  };
}
