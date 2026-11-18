// Guardian Evolution fork: two mutually exclusive paths, one per run, at wave 5.
// Mouse clicks the card; 1/2 pick directly; arrows compare and Enter confirms.
import { FIELD, TITLE_FONT } from '../config.js';
import { drawUpgradeIcon } from './icons.js';
import { evolutionDelta } from '../evolutions.js';
import { addButton, clearButtons, drawButtons, roundedRect } from '../ui/buttons.js';

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function easeOut(value) {
  const t = Math.max(0, Math.min(1, value));
  return 1 - (1 - t) * (1 - t);
}

function drawChoice(ctx, app, choice, index, x, y, w, h, time) {
  const appear = easeOut((app.evolution.time - index * 0.1) * 3.4);
  const focused = app.evolution.focus === index && app.evolution.chosen < 0;
  const hover = app.pointer
    && app.pointer.x >= x && app.pointer.x <= x + w
    && app.pointer.y >= y && app.pointer.y <= y + h;
  const pick = app.evolution.chosen === index;
  const dim = app.evolution.chosen >= 0 && !pick;
  const drawY = y + (1 - appear) * 40;
  ctx.save();
  ctx.globalAlpha = appear * (dim ? 0.4 : 1);

  if (focused || hover || pick) {
    ctx.save();
    ctx.shadowColor = choice.color;
    ctx.shadowBlur = pick ? 34 : focused ? 26 : 18;
    roundedRect(ctx, x, drawY, w, h, 20);
    ctx.fillStyle = 'rgba(8,18,34,0.94)';
    ctx.fill();
    ctx.restore();
  }
  const face = ctx.createLinearGradient(x, drawY, x, drawY + h);
  face.addColorStop(0, 'rgba(16,32,54,0.97)');
  face.addColorStop(1, 'rgba(7,15,30,0.98)');
  roundedRect(ctx, x, drawY, w, h, 20);
  ctx.fillStyle = face;
  ctx.fill();
  roundedRect(ctx, x, drawY, w, h, 20);
  ctx.strokeStyle = choice.color;
  ctx.lineWidth = pick ? 3 : focused ? 2.4 : 1.6;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 10px system-ui, sans-serif';
  ctx.fillStyle = choice.color;
  ctx.fillText(choice.kicker, x + w / 2, drawY + 26);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + w / 2, drawY + 74, 30, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.strokeStyle = `${choice.color}66`;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  drawUpgradeIcon(ctx, choice.icon, x + w / 2, drawY + 74, 40, choice.color, time);

  ctx.font = `700 27px ${TITLE_FONT}`;
  ctx.fillStyle = '#eafff8';
  ctx.fillText(choice.name, x + w / 2, drawY + 126);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 30, drawY + 146);
  ctx.lineTo(x + w - 30, drawY + 146);
  ctx.stroke();

  ctx.font = '500 13.5px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(214,238,246,0.9)';
  const lines = wrapText(ctx, choice.desc, w - 56);
  lines.slice(0, 4).forEach((text, lineIndex) => {
    ctx.fillText(text, x + w / 2, drawY + 168 + lineIndex * 19);
  });

  const deltaY = drawY + 168 + Math.min(4, lines.length) * 19 + 6;
  ctx.font = '800 11px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,238,184,0.9)';
  ctx.fillText('NOW → AFTER', x + w / 2, deltaY);
  ctx.font = '700 12.5px system-ui, sans-serif';
  ctx.fillStyle = choice.color;
  ctx.fillText(evolutionDelta(app.world ?? app.titleWorld, choice), x + w / 2, deltaY + 18);

  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,154,60,0.95)';
  const costLines = wrapText(ctx, `COST · ${choice.cost}`, w - 56);
  costLines.slice(0, 2).forEach((text, lineIndex) => {
    ctx.fillText(text, x + w / 2, deltaY + 44 + lineIndex * 16);
  });

  ctx.fillStyle = '#07231f';
  ctx.beginPath();
  ctx.arc(x + 26, drawY + 26, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b6ffe6';
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillText(String(index + 1), x + 26, drawY + 27);

  if (pick) {
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillStyle = choice.color;
    ctx.fillText('CHOSEN', x + w / 2, drawY + h - 22);
  }
  ctx.restore();
}

export function drawEvolution(ctx, app) {
  const world = app.world ?? app.titleWorld;
  ctx.fillStyle = 'rgba(3,8,20,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  const cx = FIELD.width / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 44px ${TITLE_FONT}`;
  ctx.shadowColor = 'rgba(182,255,230,0.4)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#d8fff3';
  ctx.fillText('GUARDIAN EVOLUTION', cx, 92);
  ctx.shadowBlur = 0;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,238,184,0.85)';
  const guardian = world?.guardian?.name?.toUpperCase() ?? 'WARDEN';
  const wave = world ? world.wave : 5;
  ctx.fillText(`WAVE ${wave} · ${guardian} · CHOOSE ONE PATH FOR THE REST OF THIS RUN`, cx, 130);
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(143,182,198,0.75)';
  ctx.fillText('The other path closes until you start a new run.', cx, 154);
  ctx.restore();

  clearButtons(app.ui);
  const choices = app.evolution ? app.evolution.choices : [];
  const w = 356;
  const h = 392;
  const gap = 40;
  const total = choices.length * w + (choices.length - 1) * gap;
  let x = (FIELD.width - total) / 2;
  const y = 178;
  for (let i = 0; i < choices.length; i += 1) {
    drawChoice(ctx, app, choices[i], i, x, y, w, h, app.ui.time);
    addButton(app.ui, {
      x, y, w, h, style: 'none', action: `evolution:${i}`,
      focused: app.evolution && app.evolution.focus === i,
    });
    x += w + gap;
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(234,255,248,0.7)';
  ctx.fillText('1 / 2 chooses a path · ← → compares · Enter confirms · click a card', cx, 624);
  ctx.fillStyle = 'rgba(143,182,198,0.55)';
  ctx.fillText('One evolution per run. Restarting returns you to the Warden’s starting build.', cx, 650);
  ctx.restore();

  drawButtons(ctx, app.ui, app.pointer ?? null, app.ui.time);
}
