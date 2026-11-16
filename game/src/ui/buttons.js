// Menu buttons in logical playfield space: rounded translucent panels with a warm hover glow,
// hit-tested against the mouse pointer and drawable with a keyboard focus ring. Screens rebuild
// the list each frame, so layout stays with the screen that owns it.
import { FONT } from '../config.js';

export function createUi() {
  return { buttons: [], hover: null, time: 0 };
}

export function clearButtons(ui) {
  ui.buttons.length = 0;
  ui.hover = null;
}

export function addButton(ui, spec) {
  const button = {
    x: 0, y: 0, w: 240, h: 54,
    style: 'ghost',
    label: '',
    sub: '',
    action: null,
    disabled: false,
    focused: false,
    color: null,
    ...spec,
  };
  ui.buttons.push(button);
  return button;
}

export function buttonAt(ui, x, y) {
  for (let i = ui.buttons.length - 1; i >= 0; i -= 1) {
    const b = ui.buttons[i];
    if (b.disabled) continue;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

export function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function panel(ctx, x, y, w, h, options = {}) {
  const {
    fill = 'rgba(7, 16, 30, 0.88)',
    edge = 'rgba(126, 232, 255, 0.28)',
    radius = 16,
    glow = 0,
    lineWidth = 1.5,
  } = options;
  roundedRect(ctx, x, y, w, h, radius);
  if (glow > 0) {
    ctx.save();
    ctx.shadowColor = edge;
    ctx.shadowBlur = glow;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function text(ctx, value, x, y, size, color, align = 'center', weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

export function drawButton(ctx, button, pointer, time) {
  if (button.style === 'none') return false;
  const hover = pointer
    && pointer.x >= button.x && pointer.x <= button.x + button.w
    && pointer.y >= button.y && pointer.y <= button.y + button.h;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2 + button.x * 0.01);
  const accent = button.color ?? (button.style === 'primary' ? '#b6ffe6' : 'rgba(126,232,255,0.8)');

  const lift = hover && !button.disabled ? 2 : 0;
  const x = button.x;
  const y = button.y - lift;

  if (button.style === 'primary') {
    ctx.save();
    ctx.shadowColor = hover ? 'rgba(182,255,230,0.7)' : 'rgba(126,232,255,0.35)';
    ctx.shadowBlur = hover ? 26 : 14;
    const gradient = ctx.createLinearGradient(x, y, x, y + button.h);
    gradient.addColorStop(0, hover ? '#d8fff3' : '#b6ffe6');
    gradient.addColorStop(1, hover ? '#8ff7d8' : '#78f0c8');
    roundedRect(ctx, x, y, button.w, button.h, 14);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    roundedRect(ctx, x, y, button.w, button.h, 14);
    ctx.stroke();
    text(ctx, button.label, x + button.w / 2, y + (button.sub ? button.h * 0.38 : button.h / 2), 23, '#07231f', 'center', 700);
    if (button.sub) text(ctx, button.sub, x + button.w / 2, y + button.h * 0.7, 13, 'rgba(7,35,31,0.72)', 'center', 600);
  } else if (button.style === 'difficulty') {
    const selected = Boolean(button.selected);
    roundedRect(ctx, x, y, button.w, button.h, 12);
    ctx.fillStyle = selected ? 'rgba(14, 44, 52, 0.95)' : hover ? 'rgba(12, 28, 44, 0.92)' : 'rgba(8, 20, 34, 0.72)';
    ctx.fill();
    ctx.strokeStyle = selected ? accent : 'rgba(126, 232, 255, 0.22)';
    ctx.lineWidth = selected ? 2 : 1;
    if (selected) {
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12 + pulse * 8;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.stroke();
    }
    text(ctx, button.label, x + button.w / 2, y + button.h * 0.42, 17, selected ? accent : '#cfe9f1', 'center', 700);
    if (button.sub) text(ctx, button.sub, x + button.w / 2, y + button.h * 0.72, 11, selected ? 'rgba(232,255,247,0.7)' : 'rgba(143,182,198,0.75)', 'center', 500);
  } else {
    roundedRect(ctx, x, y, button.w, button.h, 13);
    ctx.fillStyle = hover ? 'rgba(18, 46, 54, 0.9)' : 'rgba(8, 22, 38, 0.78)';
    ctx.fill();
    ctx.strokeStyle = button.disabled ? 'rgba(90,110,125,0.3)' : hover ? accent : 'rgba(126, 232, 255, 0.26)';
    ctx.lineWidth = hover ? 1.8 : 1.2;
    ctx.stroke();
    text(ctx, button.label, x + button.w / 2, y + (button.sub ? button.h * 0.38 : button.h / 2), 19, button.disabled ? '#5b7f92' : '#eafff8', 'center', 700);
    if (button.sub) text(ctx, button.sub, x + button.w / 2, y + button.h * 0.7, 12, '#8fb6c6', 'center', 500);
  }

  if (button.focused) {
    roundedRect(ctx, x - 4, y - 4, button.w + 8, button.h + 8, 17);
    ctx.strokeStyle = 'rgba(255, 215, 106, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  return hover;
}

export function drawButtons(ctx, ui, pointer, time) {
  let hovered = null;
  for (let i = 0; i < ui.buttons.length; i += 1) {
    if (drawButton(ctx, ui.buttons[i], pointer, time)) hovered = ui.buttons[i];
  }
  ui.hover = hovered;
  return hovered;
}

export function drawMiniButton(ctx, x, y, w, h, label, pointer, color = 'rgba(126,232,255,0.7)') {
  const hover = pointer && pointer.x >= x && pointer.x <= x + w && pointer.y >= y && pointer.y <= y + h;
  roundedRect(ctx, x, y, w, h, 9);
  ctx.fillStyle = hover ? 'rgba(18,46,54,0.95)' : 'rgba(8,22,38,0.82)';
  ctx.fill();
  ctx.strokeStyle = hover ? color : 'rgba(126,232,255,0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2, 13, '#eafff8', 'center', 600);
}
