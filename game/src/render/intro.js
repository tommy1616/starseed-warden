// The first-night tutorial overlay. The HUD owns the persistent bars; this transient prompt is
// composed by main after the HUD, like the overlay backdrops.
import { FIELD } from '../config.js';
import { panel, roundedRect } from '../ui/buttons.js';

const INTRO_STEPS = [
  {
    key: 'WASD',
    title: 'MOVE',
    detail: 'Arrow keys work too. Stay between the Hollow and the Starseed.',
  },
  {
    key: 'HOLD LMB / J',
    title: 'FIRE SEED-DARTS',
    detail: 'Aim with the mouse; every dart flies toward the pointer.',
  },
  {
    key: 'SPACE / SHIFT',
    title: 'DASH',
    detail: 'Perfect Dash: graze a thorn mid-dash to recycle it and gain 12 Bloom.',
  },
  {
    key: 'POLLEN',
    title: 'CHARGE BLOOM',
    detail: 'Walk over golden pollen. Press E or right-click when the meter is full.',
  },
  {
    key: 'READY',
    title: 'THE GLADE IS YOURS',
    detail: 'Move, shoot, dash and Bloom — every loop feeds the next.',
  },
];

export function drawIntroHint(ctx, world) {
  const hint = world.introHint;
  if (!hint || hint.alpha <= 0.01 || world.wave !== 1) return;
  const step = INTRO_STEPS[Math.min(INTRO_STEPS.length - 1, hint.stage)];
  const width = 680;
  const height = 74;
  const x = (FIELD.width - width) / 2;
  const y = 566;
  ctx.save();
  ctx.globalAlpha = Math.min(1, hint.alpha);
  panel(ctx, x, y, width, height, { fill: 'rgba(5,14,28,0.82)', edge: 'rgba(126,232,255,0.28)', radius: 14 });

  ctx.font = '800 9px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,238,184,0.72)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`FIRST NIGHT  ·  STEP ${Math.min(4, hint.stage + 1)} / 4`, x + 18, y + 13);

  const dotStart = x + width - 18 - 3 * 13;
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i < hint.stage ? '#b6ffe6' : i === hint.stage ? '#ffd76a' : 'rgba(143,182,198,0.24)';
    ctx.beginPath();
    ctx.arc(dotStart + i * 13, y + 13, i === hint.stage ? 3 : 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = '800 11px system-ui, sans-serif';
  const keyWidth = Math.max(34, ctx.measureText(step.key).width + 16);
  roundedRect(ctx, x + 18, y + 24, keyWidth, 22, 6);
  ctx.fillStyle = 'rgba(182,255,230,0.14)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(182,255,230,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#b6ffe6';
  ctx.textAlign = 'center';
  ctx.fillText(step.key, x + 18 + keyWidth / 2, y + 36);

  ctx.textAlign = 'left';
  ctx.font = '800 12px system-ui, sans-serif';
  ctx.fillStyle = '#eafff8';
  ctx.fillText(step.title, x + 18 + keyWidth + 10, y + 36);

  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(214,238,246,0.82)';
  ctx.fillText(step.detail, x + 18, y + 59);
  ctx.restore();
}
