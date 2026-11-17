// The end of a run, victory or defeat: a large title, zero to three Starseed stars, the run's
// numbers, a new-best flag and the two ways back in (Play again, Title). Enter plays again.
import { FIELD, TITLE_FONT } from '../config.js';
import { RARITY } from '../palette.js';
import { ownedCards } from '../upgrades.js';
import { addButton, clearButtons, drawButtons, panel, roundedRect } from '../ui/buttons.js';
import { drawStar, drawUpgradeIcon } from './icons.js';

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function easeOut(value) {
  const t = Math.max(0, Math.min(1, value));
  return 1 - (1 - t) * (1 - t);
}

function drawStats(ctx, app, x, y, w, h) {
  const results = app.results;
  panel(ctx, x, y, w, h, { fill: 'rgba(5,14,28,0.86)', edge: 'rgba(255,215,106,0.22)', radius: 18 });
  const rows = [
    ['SCORE', results.score.toLocaleString('en-US')],
    ['BEST SCORE', results.bestScore.toLocaleString('en-US')],
    ['WAVES CLEARED', `${results.wavesCleared} / 12`],
    ['ENEMIES DEFEATED', String(results.kills)],
    ['ACCURACY', `${Math.round(results.accuracy * 100)}%`],
    ['TIME IN THE GLADE', formatTime(results.time)],
    ['UPGRADES TAKEN', String(results.upgradesTaken)],
    ['BEST COMBO · OATHS KEPT', `${results.comboBest} · ${results.oathsCompleted ?? 0} kept (+${results.oathBonus ?? 0})`],
  ];
  const colWidth = w / 2;
  for (let i = 0; i < rows.length; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = x + col * colWidth + 34;
    const cy = y + 38 + row * 48;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(143,182,198,0.82)';
    ctx.fillText(rows[i][0], cx, cy);
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.fillStyle = '#eafff8';
    ctx.fillText(rows[i][1], cx, cy + 19);
  }

  if (results.newBest) {
    const badgeW = 122;
    const bx = x + w - badgeW - 22;
    const by = y - 16;
    ctx.save();
    ctx.shadowColor = 'rgba(255,215,106,0.7)';
    ctx.shadowBlur = 18;
    roundedRect(ctx, bx, by, badgeW, 30, 15);
    ctx.fillStyle = '#ffd76a';
    ctx.fill();
    ctx.restore();
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillStyle = '#172026';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW BEST', bx + badgeW / 2, by + 16);
  }
}

function drawBuildSummary(ctx, app, y) {
  const results = app.results;
  const world = app.world;
  const cards = world ? ownedCards(world) : [];
  const cx = FIELD.width / 2;
  ctx.save();
  ctx.textBaseline = 'middle';

  const caption = `BLOOMS TAKEN · ${results.upgradesTaken}`;
  ctx.font = '800 10px system-ui, sans-serif';
  const captionWidth = ctx.measureText(caption).width;
  const shown = cards.slice(0, 16);
  const size = 24;
  const gap = 5;
  const iconsWidth = shown.length > 0 ? shown.length * size + (shown.length - 1) * gap : 0;
  const groupWidth = captionWidth + (iconsWidth > 0 ? 14 + iconsWidth : 0);
  let x = cx - groupWidth / 2;

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(143,182,198,0.82)';
  ctx.fillText(caption, x + captionWidth, y);
  if (cards.length === 0) {
    ctx.textAlign = 'left';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(143,182,198,0.5)';
    ctx.fillText('NONE GATHERED', x + captionWidth + 14, y);
    ctx.restore();
    return;
  }

  let iconX = x + captionWidth + 14;
  const iconY = y - size / 2;
  for (const { card, level } of shown) {
    const rarity = RARITY[card.rarity];
    roundedRect(ctx, iconX, iconY, size, size, 6);
    ctx.fillStyle = 'rgba(5,14,28,0.92)';
    ctx.fill();
    ctx.strokeStyle = rarity.color;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    drawUpgradeIcon(ctx, card.icon, iconX + size / 2, iconY + size / 2 - 1, 15, rarity.color, app.ui.time);
    if (level > 1) {
      ctx.fillStyle = '#ffeeb8';
      ctx.beginPath();
      ctx.arc(iconX + size - 4, iconY + size - 4, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#172026';
      ctx.font = '800 7px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(level), iconX + size - 4, iconY + size - 3);
    }
    iconX += size + gap;
  }
  ctx.restore();
}

export function drawResults(ctx, app) {
  const results = app.results;
  if (!results) return;
  const tint = results.victory ? 'rgba(4,14,26,0.64)' : 'rgba(20,3,12,0.66)';
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  const appear = easeOut(app.screenTime * 2.4);
  const cx = FIELD.width / 2;
  ctx.save();
  ctx.globalAlpha = appear;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `800 58px ${TITLE_FONT}`;
  ctx.shadowColor = results.victory ? 'rgba(255,215,106,0.55)' : 'rgba(255,91,74,0.5)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = results.victory ? '#ffeeb8' : '#ffb3ad';
  ctx.fillText(results.victory ? 'THE GROVE ENDURES' : 'THE STARSEED FADES', cx, 96);
  ctx.shadowBlur = 0;

  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = results.victory ? 'rgba(234,255,248,0.82)' : 'rgba(255,196,190,0.82)';
  const reason = results.victory
    ? 'The Withering Crown is unmade. The Starseed burns on through the night.'
    : results.lostReason === 'seed'
      ? 'The Starseed withered. Its light belongs to the Hollow now.'
      : 'The Warden fell. The garden grows quiet.';
  ctx.fillText(reason, cx, 136);
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,238,184,0.7)';
  ctx.fillText(`${results.difficulty.toUpperCase()}  ·  ${results.victory ? 'VICTORY' : 'DEFEAT'}`, cx, 162);
  ctx.restore();

  const starY = 210;
  for (let i = 0; i < 3; i += 1) {
    const delay = 0.3 + i * 0.16;
    const pop = easeOut((app.screenTime - delay) * 4.4);
    if (pop <= 0) continue;
    const filled = i < results.stars;
    const size = 27 * (0.5 + pop * 0.5);
    ctx.save();
    ctx.globalAlpha = Math.min(1, pop);
    if (filled) {
      ctx.shadowColor = 'rgba(255,215,106,0.8)';
      ctx.shadowBlur = 20;
    }
    drawStar(ctx, cx + (i - 1) * 74, starY, size, filled, filled ? '#ffe9a8' : 'rgba(255,233,168,0.26)');
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = appear;
  drawStats(ctx, app, 280, 258, 720, 214);
  drawBuildSummary(ctx, app, 500);
  ctx.restore();

  clearButtons(app.ui);
  addButton(app.ui, {
    x: cx - 246, y: 528, w: 228, h: 58,
    style: 'primary', label: 'PLAY AGAIN', sub: 'ENTER', action: 'again',
    focused: app.focusAction === 'again',
  });
  addButton(app.ui, {
    x: cx + 18, y: 528, w: 228, h: 58,
    style: 'ghost', label: 'TITLE', sub: 'RETURN TO THE GARDEN', action: 'title',
    focused: app.focusAction === 'title',
  });

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(143,182,198,0.62)';
  ctx.fillText('ENTER TO PLAY AGAIN  ·  ARROWS CHOOSE  ·  M SOUND', cx, 628);
  ctx.fillStyle = 'rgba(255,238,184,0.6)';
  ctx.fillText(results.victory ? 'THE STARSEED REMEMBERS YOU' : 'THE STARSEED WILL WAIT FOR ANOTHER WARDEN', cx, 652);
  ctx.restore();

  drawButtons(ctx, app.ui, app.pointer ?? null, app.ui.time);
}
