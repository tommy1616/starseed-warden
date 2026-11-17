// Bloom Draft cards: rarity, icon, effect, owned stack and real synergy hints; click or press 1/2/3.
import { FIELD, TITLE_FONT } from '../config.js';
import { RARITY } from '../palette.js';
import { drawUpgradeIcon } from './icons.js';
import { draftSynergies } from '../upgrades.js';
import { OATHS, oathById } from '../oaths.js';
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

/** Only real combos with owned cards are printed; three short lines keep the card legible. */
function drawSynergies(ctx, world, card, x, drawY, w) {
  if (!world) return;
  const lines = draftSynergies(world, card);
  if (lines.length === 0) return;
  const wrapped = [];
  ctx.font = '600 11.5px system-ui, sans-serif';
  for (const text of lines) {
    for (const part of wrapText(ctx, `· ${text}`, w - 48)) {
      if (wrapped.length >= 3) break;
      wrapped.push(part);
    }
    if (wrapped.length >= 3) break;
  }
  ctx.textAlign = 'center';
  ctx.font = '800 9px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,215,106,0.86)';
  ctx.fillText('SYNERGY WITH YOUR BUILD', x + w / 2, drawY + 274);
  ctx.font = '600 11.5px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,238,184,0.92)';
  for (let i = 0; i < wrapped.length; i += 1) {
    ctx.fillText(wrapped[i], x + w / 2, drawY + 292 + i * 16);
  }
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

  const owned = app.world ? (app.world.upgrades.get(card.id) ?? 0) : 0;
  ctx.font = '800 9px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = owned > 0 ? rarity.color : 'rgba(143,182,198,0.75)';
  ctx.fillText(owned > 0 ? `STACK ${owned}/${card.maxLevel}` : `NEW · 0/${card.maxLevel}`, x + w - 18, drawY + 28);

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

  ctx.font = '500 13.5px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(214,238,246,0.88)';
  const lines = wrapText(ctx, card.desc, w - 48);
  lines.slice(0, 3).forEach((text, lineIndex) => {
    ctx.fillText(text, x + w / 2, drawY + 208 + lineIndex * 20);
  });

  drawSynergies(ctx, app.world, card, x, drawY, w);

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
  const guardian = world?.guardian?.name?.toUpperCase();
  ctx.fillText(`CHOOSE ONE BLOOM FOR WAVE ${nextWave}  ·  BIOME ${biome}${guardian ? `  ·  ${guardian}` : ''}`, cx, 158);
  ctx.fillStyle = 'rgba(143,182,198,0.7)';
  ctx.font = '600 12px system-ui, sans-serif';
  const lastOath = world?.oath;
  let status = world && world.phase === 'clearing' ? 'THE GLADE IS QUIET FOR A MOMENT' : 'THE HOLLOW WAITS BEYOND THE LIGHT';
  if (lastOath && lastOath.id !== 'none' && lastOath.status === 'fulfilled') {
    status = `LAST OATH KEPT · ${oathById(lastOath.id).name.toUpperCase()}`;
    ctx.fillStyle = 'rgba(182,255,230,0.92)';
  } else if (lastOath && lastOath.status === 'missed') {
    status = `LAST OATH MISSED · ${oathById(lastOath.id).name.toUpperCase()} · ordinary reward kept`;
    ctx.fillStyle = 'rgba(255,154,60,0.9)';
  }
  ctx.fillText(status, cx, 182);
  ctx.restore();

  clearButtons(app.ui);
  const cards = app.draft ? app.draft.cards : [];
  const w = 280;
  const h = 360;
  const gap = 26;
  const total = cards.length * w + (cards.length - 1) * gap;
  let x = (FIELD.width - total) / 2;
  const y = 202;
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
  ctx.fillText('OPTIONAL: CHOOSE A GARDEN OATH, THEN YOUR BLOOM', cx, 580);
  ctx.fillStyle = 'rgba(143,182,198,0.55)';
  const selected = oathById(app.draft?.oathId);
  ctx.fillText(`${selected.rule} / ${selected.reward}`, cx, 671);
  ctx.fillText('1 / 2 / 3 chooses a bloom. Click any oath, or use arrows + Enter.', cx, 695);
  ctx.restore();

  OATHS.forEach((oath, i) => addButton(app.ui, {
    x: 70 + i * 288, y: 596, w: 276, h: 52,
    style: 'difficulty', label: oath.name.toUpperCase(),
    sub: oath.id === 'none' ? 'No bonus / no extra task' : oath.reward,
    action: `oath:${oath.id}`, selected: app.draft?.oathId === oath.id,
    focused: app.focusAction === `oath:${oath.id}`, color: oath.color,
  }));

  drawButtons(ctx, app.ui, app.pointer ?? null, app.ui.time);
}
