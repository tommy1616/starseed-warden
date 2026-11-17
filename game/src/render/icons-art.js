// The upgrade-icon art itself: vector paths for the 23 Bloom cards. Kept apart from the tiny
// UI-facing icons.js so screens depend on the icon API, not on every path.
import { starPath } from './icons.js';

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawUpgradeIconArt(ctx, icon, cx, cy, size, color = '#b6ffe6', time = 0) {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.4, size * 0.09);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (icon) {
    case 'fan':
      for (let i = -1; i <= 1; i += 1) {
        line(ctx, 0, s * 0.6, i * s * 0.65, -s * 0.55);
        dot(ctx, i * s * 0.65, -s * 0.55, size * 0.07);
      }
      dot(ctx, 0, s * 0.6, size * 0.08);
      break;
    case 'spine':
      line(ctx, -s * 0.6, s * 0.6, s * 0.35, -s * 0.35);
      line(ctx, s * 0.35, -s * 0.55, s * 0.5, -s * 0.2);
      line(ctx, s * 0.1, -s * 0.35, s * 0.5, -s * 0.2);
      break;
    case 'spark':
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.8);
      ctx.lineTo(-s * 0.45, s * 0.05);
      ctx.lineTo(-s * 0.05, s * 0.05);
      ctx.lineTo(-s * 0.2, s * 0.8);
      ctx.lineTo(s * 0.5, -s * 0.15);
      ctx.lineTo(s * 0.05, -s * 0.15);
      ctx.closePath();
      ctx.fill();
      break;
    case 'seed':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75);
      ctx.bezierCurveTo(s * 0.7, -s * 0.3, s * 0.55, s * 0.55, 0, s * 0.75);
      ctx.bezierCurveTo(-s * 0.55, s * 0.55, -s * 0.7, -s * 0.3, 0, -s * 0.75);
      ctx.closePath();
      ctx.stroke();
      line(ctx, 0, -s * 0.3, 0, s * 0.45);
      break;
    case 'leaf':
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, s * 0.55);
      ctx.quadraticCurveTo(-s * 0.55, -s * 0.75, s * 0.75, -s * 0.6);
      ctx.quadraticCurveTo(s * 0.5, s * 0.7, -s * 0.7, s * 0.55);
      ctx.closePath();
      ctx.stroke();
      line(ctx, -s * 0.5, s * 0.4, s * 0.45, -s * 0.35);
      break;
    case 'orbit':
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.78, s * 0.34, -0.45, 0, Math.PI * 2);
      ctx.stroke();
      dot(ctx, 0, 0, size * 0.12);
      dot(ctx, s * 0.62, -s * 0.36, size * 0.08);
      break;
    case 'aura':
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 10; i += 1) {
        const angle = (i / 10) * Math.PI * 2;
        line(ctx, Math.cos(angle) * s * 0.55, Math.sin(angle) * s * 0.55, Math.cos(angle) * s * 0.82, Math.sin(angle) * s * 0.82);
      }
      break;
    case 'trail':
      for (let i = 0; i < 4; i += 1) {
        ctx.globalAlpha = 1 - i * 0.2;
        dot(ctx, -s * 0.55 + i * s * 0.36, s * 0.35 - i * s * 0.28, size * (0.13 - i * 0.02));
      }
      ctx.globalAlpha = 1;
      break;
    case 'drop':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.bezierCurveTo(s * 0.7, -s * 0.1, s * 0.55, s * 0.7, 0, s * 0.7);
      ctx.bezierCurveTo(-s * 0.55, s * 0.7, -s * 0.7, -s * 0.1, 0, -s * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.12, s * 0.3, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'root':
      line(ctx, 0, -s * 0.7, 0, s * 0.2);
      line(ctx, 0, -s * 0.1, -s * 0.55, s * 0.65);
      line(ctx, 0, -s * 0.25, s * 0.55, s * 0.55);
      line(ctx, 0, s * 0.2, 0, s * 0.75);
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75);
      ctx.lineTo(s * 0.65, -s * 0.4);
      ctx.lineTo(s * 0.5, s * 0.35);
      ctx.quadraticCurveTo(0, s * 0.9, -s * 0.5, s * 0.35);
      ctx.lineTo(-s * 0.65, -s * 0.4);
      ctx.closePath();
      ctx.stroke();
      line(ctx, 0, -s * 0.35, 0, s * 0.35);
      break;
    case 'magnet':
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.52, Math.PI, 0);
      ctx.stroke();
      line(ctx, -s * 0.52, 0, -s * 0.52, s * 0.6);
      line(ctx, s * 0.52, 0, s * 0.52, s * 0.6);
      break;
    case 'star':
      starPath(ctx, 0, 0, s * 0.82, s * 0.34);
      ctx.stroke();
      break;
    case 'ring':
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      dot(ctx, s * 0.38, -s * 0.38, size * 0.11);
      break;
    case 'snow':
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        line(ctx, 0, 0, Math.cos(angle) * s * 0.75, Math.sin(angle) * s * 0.75);
      }
      break;
    case 'chain':
      ctx.beginPath();
      ctx.ellipse(-s * 0.25, s * 0.15, s * 0.32, s * 0.18, -0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s * 0.25, -s * 0.15, s * 0.32, s * 0.18, -0.6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'heart':
      ctx.beginPath();
      ctx.moveTo(0, s * 0.65);
      ctx.bezierCurveTo(-s * 0.95, s * 0.05, -s * 0.5, -s * 0.75, 0, -s * 0.22);
      ctx.bezierCurveTo(s * 0.5, -s * 0.75, s * 0.95, s * 0.05, 0, s * 0.65);
      ctx.stroke();
      break;
    case 'hourglass':
      line(ctx, -s * 0.5, -s * 0.7, s * 0.5, -s * 0.7);
      line(ctx, -s * 0.5, s * 0.7, s * 0.5, s * 0.7);
      line(ctx, -s * 0.42, -s * 0.7, s * 0.42, s * 0.7);
      line(ctx, s * 0.42, -s * 0.7, -s * 0.42, s * 0.7);
      break;
    case 'burst':
      dot(ctx, 0, 0, size * 0.16);
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        line(ctx, Math.cos(angle) * s * 0.35, Math.sin(angle) * s * 0.35, Math.cos(angle) * s * 0.8, Math.sin(angle) * s * 0.8);
      }
      break;
    case 'boot':
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, -s * 0.7);
      ctx.lineTo(s * 0.2, -s * 0.7);
      ctx.lineTo(s * 0.2, s * 0.15);
      ctx.lineTo(s * 0.65, s * 0.35);
      ctx.quadraticCurveTo(s * 0.8, s * 0.75, s * 0.2, s * 0.72);
      ctx.lineTo(-s * 0.25, s * 0.72);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'wing':
      ctx.beginPath();
      ctx.moveTo(-s * 0.75, s * 0.45);
      ctx.quadraticCurveTo(-s * 0.2, -s * 0.75, s * 0.75, -s * 0.5);
      ctx.quadraticCurveTo(s * 0.1, s * 0.1, -s * 0.75, s * 0.45);
      ctx.stroke();
      line(ctx, -s * 0.6, s * 0.35, s * 0.5, -s * 0.35);
      break;
    case 'shard':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.55, 0);
      ctx.lineTo(0, s * 0.8);
      ctx.lineTo(-s * 0.55, 0);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'pouch':
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.2);
      ctx.quadraticCurveTo(-s * 0.8, s * 0.7, 0, s * 0.75);
      ctx.quadraticCurveTo(s * 0.8, s * 0.7, s * 0.6, -s * 0.2);
      ctx.closePath();
      ctx.stroke();
      line(ctx, -s * 0.6, -s * 0.2, s * 0.6, -s * 0.2);
      dot(ctx, 0, s * 0.3, size * 0.09);
      break;
    default:
      dot(ctx, 0, 0, s * 0.45);
      break;
  }
  ctx.restore();
}
