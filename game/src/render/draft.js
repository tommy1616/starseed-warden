// Between waves the glade dims and three Bloom cards rise out of it. Each card shows its
// rarity border, a code-drawn icon, its name, a one-line effect, the stack the Warden already
// owns and the key that takes it. Cards can be clicked or picked with 1/2/3, arrows and Enter.
import { FIELD, TITLE_FONT } from '../config.js';
import { RARITY } from '../palette.js';
import { drawBackground } from './background.js';
import { drawEntities } from './entities.js';
import { drawAirEffects, drawHazards } from './effects.js';
import { drawUpgradeIcon } from './icons.js';
import { addButton, clearButtons, drawButtons, panel, roundedRect } from '../ui/buttons.js';

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

function drawCard(ctx, app, card, index, x, y, w, h, time, dimmed) {
  const rarity = RARITY[card.rarity];
  const appear = easeOut((app.draft.time - index * 0.12) * 3.2);
  const focused = app.draft.focus === index && !dimmed;
  const hover = app.pointer
    && app.pointer.x >= x && app.pointer.x <= x + w
    && app.pointer.y >= y && app.pointer.y <= y + h;
  const lift = (focused || hover ? 10 : 0) * appear;
  const drawY = y - lift + (1 - appear) * 46;
  const alpha = appear * (dimmed ? 0.55 : 1);

  ctx.save();
  ctx.globalAlpha = alpha;

  if (focused || hover) {
    ctx.save();
    ctx.shadowColor = rarity.glow;
    ctx.shadowBlur = focused ? 30 : 20;
    roundedRect(ctx, x, drawY, w, h, 18);
    ctx.fillStyle = 'rgba(8,18,34,0.9)';
    ctx.fill();
    ctx.restore();
  }

  const face = ctx.createLinearGradient(x, drawY, x, drawY + h);
  face.addColorStop(0, 'rgba(16,30,52,0.97)');
  face.addColorStop(0.55, 'rgba(9,20,38,0.97)');
  face.addColorStop(1, 'rgba(7,15,30,0.98)');
  roundedRect(ctx, x, drawY, w, h, 18);
  ctx.fillStyle = face;
  ctx.fill();

  ctx.save();
  ctx.shadowColor = rarity.glow;
  ctx.shadowBlur = focused ? 24 : 12;
  roundedRect(ctx, x, drawY, w, h, 18);
  ctx.strokeStyle = rarity.color;
  ctx.lineWidth = focused ? 2.6 : 1.8;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = rarity.color;
  roundedRect(ctx, x + w / 2 - 52, drawY + 16, 104, 22, 11);
  ctx.globalAlpha = 0.18;
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.font = '800 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rarity.color;
  ctx.fillText(rarity.label.toUpperCase(), x + w / 2, drawY + 28);

  const iconY = drawY + 94;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + w / 2, iconY, 42, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fill();
  ctx.strokeStyle = `${rarity.color}66`;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  drawUpgradeIcon(ctx, card.icon, x + w / 2, iconY, 54, rarity.color, time);

  ctx.textAlign = 'center';
  ctx.font = `700 22px ${TITLE_FONT}`;
  ctx.fillStyle = '#eafff8';
  ctx.fillText(card.name, x + w / 2, drawY + 166);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 34, drawY + 186);
  ctx.lineTo(x + w - 34, drawY + 186);
  ctx.stroke();

  ctx.font = '500 14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(214,238,246,0.88)';
  const lines = wrapText(ctx, card.desc, w - 48);
  lines.slice(0, 3).forEach((text, lineIndex) => {
    ctx.fillText(text, x + w / 2, drawY + 214 + lineIndex * 21);
  });

  const owned = app.world ? (app.world.upgrades.get(card.id) ?? 0) : 0;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillStyle = owned > 0 ? rarity.color : 'rgba(143,182,198,0.75)';
  const stackText = owned > 0 ? `STACK ${owned} / ${card.maxLevel}` : `NEW  ·  STACK 0 / ${card.maxLevel}`;
  ctx.fillText(stackText, x + w / 2, drawY + h - 38);

  ctx.fillStyle = '#07231f';
  ctx.beginPath();
  ctx.arc(x + 26, drawY + 28, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b6ffe6';
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillText(String(index + 1), x + 26, drawY + 29);

  if (focused) {
    ctx.fillStyle = 'rgba(255,215,106,0.9)';
    ctx.beginPath();
    ctx.arc(x + w / 2, drawY + h - 12, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawDraft(ctx, app) {
  const world = app.world ?? app.titleWorld;
  if (world) {
    drawBackground(ctx, world);
    drawHazards(ctx, world);
    ctx.save();
    ctx.globalAlpha = 0.45;
    drawEntities(ctx, world, { aim: false });
    drawAirEffects(ctx, world);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(3,8,20,0.7)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  const cx = FIELD.width / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 52px ${TITLE_FONT}`;
  ctx.shadowColor = 'rgba(182,255,230,0.4)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#d8fff3';
  ctx.fillText('BLOOM DRAFT', cx, 118);
  ctx.shadowBlur = 0;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,238,184,0.8)';
  const biome = world ? world.biomeIndex + 1 : 1;
  const nextWave = world ? Math.min(12, world.wave + 1) : 2;
  ctx.fillText(`CHOOSE ONE BLOOM FOR WAVE ${nextWave}  ·  BIOME ${biome}`, cx, 158);
  ctx.fillStyle = 'rgba(143,182,198,0.7)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(world && world.phase === 'clearing' ? 'THE GLADE IS QUIET FOR A MOMENT' : 'THE HOLLOW WAITS BEYOND THE LIGHT', cx, 182);
  ctx.restore();

  clearButtons(app.ui);
  const cards = app.draft ? app.draft.cards : [];
  const w = 280;
  const h = 336;
  const gap = 26;
  const total = cards.length * w + (cards.length - 1) * gap;
  let x = (FIELD.width - total) / 2;
  const y = 218;
  for (let i = 0; i < cards.length; i += 1) {
    drawCard(ctx, app, cards[i], i, x, y, w, h, app.ui.time, false);
    addButton(app.ui, {
      x, y, w, h, style: 'none', action: `card:${i}`,
      focused: app.draft && app.draft.focus === i,
    });
    x += w + gap;
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(234,255,248,0.65)';
  ctx.fillText('1 / 2 / 3  OR  ARROWS + ENTER', cx, 628);
  ctx.fillStyle = 'rgba(143,182,198,0.55)';
  ctx.fillText('Upgrades combine: stacks of a card grow its bloom.', cx, 652);
  ctx.restore();

  drawButtons(ctx, app.ui, app.pointer ?? null, app.ui.time);
}
