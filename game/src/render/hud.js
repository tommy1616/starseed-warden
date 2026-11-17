// In-play HUD: health, Starseed, wave/score, Bloom/dash, upgrade icons, boss bar and staged prompts.
import { BIOMES, FEEL, FIELD, PLAYER } from '../config.js';
import { COLORS, RARITY } from '../palette.js';
import { comboMultiplier } from '../scoring.js';
import { ownedCards } from '../upgrades.js';
import { remainingEnemies } from '../world.js';
import { oathById, oathProgress } from '../oaths.js';
import { drawUpgradeIcon } from './icons.js';
import { panel, roundedRect } from '../ui/buttons.js';

function formatNumber(value) {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function label(ctx, value, x, y, size, color, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function bar(ctx, x, y, w, h, fraction, color, back = 'rgba(255,255,255,0.1)', glow = 0) {
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  const clamped = Math.max(0, Math.min(1, fraction));
  if (clamped > 0) {
    ctx.save();
    roundedRect(ctx, x, y, Math.max(h, w * clamped), h, h / 2);
    if (glow > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function heart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-13, -3, -7, -14, 0, -7);
  ctx.bezierCurveTo(7, -14, 13, -3, 0, 8);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawWardenPanel(ctx, world) {
  const warden = world.warden;
  const x = 22;
  const y = 14;
  const w = 318;
  const h = 72;
  panel(ctx, x, y, w, h, { fill: 'rgba(6,16,28,0.94)', edge: 'rgba(126,232,255,0.22)', radius: 14 });
  heart(ctx, x + 24, y + 27, 20, COLORS.hp);
  label(ctx, 'WARDEN', x + 42, y + 20, 13, 'rgba(234,255,248,0.75)', 'left', 800);
  const fraction = warden.hp / warden.maxHp;
  bar(ctx, x + 42, y + 34, 220, 12, fraction, fraction < 0.3 ? '#ff5b4a' : '#ff6b8a', 'rgba(255,107,138,0.16)', fraction < 0.3 ? 10 : 0);
  label(ctx, `${Math.ceil(warden.hp)} / ${Math.round(warden.maxHp)}`, x + 42, y + 56, 12, 'rgba(234,255,248,0.72)', 'left', 600);
  const pips = Math.min(10, Math.ceil(warden.maxHp / 20));
  for (let i = 0; i < pips; i += 1) {
    const px = x + 140 + i * 11;
    const py = y + 69;
    ctx.fillStyle = i < Math.ceil(warden.hp / 20) ? '#ff8fa3' : 'rgba(255,143,163,0.18)';
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, `SCORE ${formatNumber(world.score.score)}`, x + 22, y + 88, 18, '#ffeeb8', 'left', 800);
  const combo = world.score.combo;
  if (combo > 1) {
    const multiplier = comboMultiplier(world.score);
    const color = multiplier > 2 ? '#ffd76a' : '#b6ffe6';
    label(ctx, `COMBO ${combo}  ×${multiplier.toFixed(2)}`, x + 22, y + 109, 14, color, 'left', 800);
    const timer = Math.max(0, world.score.comboTimer / FEEL.comboWindow);
    bar(ctx, x + 22, y + 119, 150, 4, timer, color, 'rgba(255,255,255,0.1)');
  } else {
    label(ctx, 'CHAIN KILLS TO RAISE THE COMBO', x + 22, y + 109, 11, 'rgba(143,182,198,0.8)', 'left', 600);
  }
}

function drawSeedPanel(ctx, world) {
  const seed = world.starseed;
  const x = 432;
  const y = 14;
  const w = 416;
  const h = 72;
  panel(ctx, x, y, w, h, { fill: 'rgba(6,16,28,0.94)', edge: 'rgba(255,215,106,0.28)', radius: 14 });
  ctx.save();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.moveTo(x + 26, y + 14);
  ctx.bezierCurveTo(x + 40, y + 26, x + 38, y + 44, x + 26, y + 52);
  ctx.bezierCurveTo(x + 14, y + 44, x + 12, y + 26, x + 26, y + 14);
  ctx.fill();
  ctx.restore();
  label(ctx, 'THE STARSEED', x + 46, y + 22, 13, 'rgba(255,238,184,0.85)', 'left', 800);
  const fraction = seed.hp / seed.maxHp;
  bar(ctx, x + 46, y + 35, 286, 12, fraction, fraction < 0.3 ? '#ff9a3c' : '#ffd76a', 'rgba(255,215,106,0.15)', fraction < 0.3 ? 10 : 4);
  label(ctx, `${Math.ceil(seed.hp)} / ${Math.round(seed.maxHp)}`, x + 46, y + 57, 12, 'rgba(255,238,184,0.76)', 'left', 600);
  for (let i = 0; i < Math.max(0, seed.shieldMax); i += 1) {
    const px = x + 344 + i * 18;
    ctx.fillStyle = i < seed.shield ? '#7ec8ff' : 'rgba(126,200,255,0.2)';
    ctx.beginPath();
    ctx.arc(px, y + 38, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (seed.shield > 0) label(ctx, 'WARD', x + 346, y + 57, 10, 'rgba(126,200,255,0.85)', 'left', 700);
  const regrow = world.mods.regrow;
  if (regrow > 0) label(ctx, `ROOT REGROWTH +${(regrow * 1.4).toFixed(1)}/s`, x + 46, y + 83, 11, 'rgba(120,240,184,0.8)', 'left', 600);
}

function drawWavePanel(ctx, world) {
  const x = 932;
  const y = 14;
  const w = 326;
  const h = 72;
  panel(ctx, x, y, w, h, { fill: 'rgba(6,16,28,0.94)', edge: 'rgba(126,232,255,0.22)', radius: 14 });
  const biome = BIOMES[world.biomeIndex] ?? BIOMES[0];
  label(ctx, `WAVE ${world.wave} / 12`, x + 18, y + 18, 16, '#eafff8', 'left', 800);
  label(ctx, biome.name.toUpperCase(), x + 18, y + 36, 10, biome.accent, 'left', 700);
  const remaining = remainingEnemies(world);
  label(ctx, remaining === 0 ? 'GLADE CLEAR' : `${remaining} HOLLOW LEFT`, x + 18, y + 55, 12, remaining === 0 ? '#78f0b8' : 'rgba(234,255,248,0.72)', 'left', 600);
  label(ctx, `KILLS ${world.score.kills}`, x + w - 18, y + 18, 11, 'rgba(234,255,248,0.66)', 'right', 600);
  const waves = 12;
  const dotGap = 12;
  const dotStart = x + w - 18 - (waves - 1) * dotGap;
  for (let i = 0; i < waves; i += 1) {
    const px = dotStart + i * dotGap;
    const py = y + 39;
    const done = i + 1 < world.wave;
    const current = i + 1 === world.wave;
    ctx.fillStyle = done ? biome.accent : current ? '#ffd76a' : 'rgba(143,182,198,0.22)';
    ctx.beginPath();
    ctx.arc(px, py, current ? 3.3 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, 'WAVE PROGRESS', x + w - 18, y + 58, 9, 'rgba(143,182,198,0.62)', 'right', 600);
}

function drawBloomAndDash(ctx, world) {
  const warden = world.warden;
  const x = FIELD.width / 2 - 210;
  const y = FIELD.height - 72;
  const w = 320;
  const h = 54;
  panel(ctx, x, y, w, h, { fill: 'rgba(6,16,28,0.92)', edge: 'rgba(126,232,255,0.22)', radius: 14 });
  const fraction = warden.bloom / PLAYER.bloomMax;
  const full = fraction >= 1;
  label(ctx, full ? 'BLOOM READY — E / RIGHT CLICK' : 'BLOOM', x + 18, y + 17, 11, full ? '#ffeeb8' : 'rgba(143,182,198,0.9)', 'left', 800);
  bar(ctx, x + 18, y + 27, 232, 12, fraction, full ? '#ffe28a' : '#b6ffe6', 'rgba(182,255,230,0.12)', full ? 12 : 0);
  label(ctx, `${Math.floor(fraction * 100)}%`, x + 258, y + 34, 11, 'rgba(234,255,248,0.7)', 'left', 700);

  const cx = x + 292;
  const cy = y + 27;
  const dashReady = warden.dashCooldown <= 0;
  const dashFraction = dashReady ? 1 : 1 - warden.dashCooldown / (PLAYER.dashCooldown * Math.pow(0.82, world.mods.flit));
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = dashReady ? '#b6ffe6' : 'rgba(126,232,255,0.55)';
  if (dashReady) {
    ctx.shadowColor = '#b6ffe6';
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, dashFraction));
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = dashReady ? '#07231f' : '#b6ffe6';
  ctx.font = '800 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dashReady ? 'DASH' : '···', cx, cy + 1);
  label(ctx, dashReady ? 'SPACE' : `${warden.dashCooldown.toFixed(1)}s`, cx, y + 47, 9, 'rgba(143,182,198,0.8)', 'center', 700);
}

function drawUpgradeRow(ctx, world) {
  const cards = ownedCards(world);
  if (cards.length === 0) return;
  const size = 32;
  const gap = 6;
  const perRow = 14;
  const startX = 24;
  const rows = Math.ceil(cards.length / perRow);
  const startY = FIELD.height - 20 - rows * (size + gap) + gap;
  for (let i = 0; i < cards.length; i += 1) {
    const { card, level } = cards[i];
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = startX + col * (size + gap);
    const y = startY + row * (size + gap);
    const rarity = RARITY[card.rarity];
    roundedRect(ctx, x, y, size, size, 9);
    ctx.fillStyle = 'rgba(6,16,28,0.86)';
    ctx.fill();
    ctx.strokeStyle = rarity.color;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawUpgradeIcon(ctx, card.icon, x + size / 2, y + size / 2 - 1, 19, rarity.color, world.time);
    if (level > 1) {
      ctx.fillStyle = '#ffeeb8';
      ctx.beginPath();
      ctx.arc(x + size - 5, y + size - 5, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#172026';
      ctx.font = '800 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(level), x + size - 5, y + size - 4);
    }
  }
}

function drawBossBar(ctx, world) {
  const boss = world.boss;
  if (!boss || boss.dead) return;
  const w = 720;
  const x = (FIELD.width - w) / 2;
  const y = 92;
  panel(ctx, x, y, w, 52, { fill: 'rgba(10,6,20,0.95)', edge: 'rgba(255,91,74,0.42)', radius: 13 });
  label(ctx, boss.name.toUpperCase(), x + 20, y + 17, 14, '#ffeeb8', 'left', 800);
  if (boss.type === 'crown') {
    label(ctx, 'PHASE', x + w - 78, y + 17, 9, 'rgba(255,155,240,0.75)', 'right', 700);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < boss.phase ? '#ffd76a' : 'rgba(255,215,106,0.18)';
      ctx.beginPath();
      ctx.arc(x + w - 62 + i * 16, y + 17, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const fraction = Math.max(0, boss.hp / boss.maxHp);
  bar(ctx, x + 20, y + 29, w - 40, 13, fraction, boss.type === 'crown' && boss.phase >= 3 ? '#ff5b4a' : '#ff5bd0', 'rgba(255,91,208,0.16)', 8);
}

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

function drawIntroHint(ctx, world) {
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
  ctx.fillText(
    `FIRST NIGHT  ·  STEP ${Math.min(4, hint.stage + 1)} / 4`,
    x + 18,
    y + 13,
  );

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

function drawControlsHint(ctx, world) {
  const text = 'WASD move · aim mouse · fire · SPACE dash (graze = Bloom) · E bloom · ESC pause';
  ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(143,182,198,0.55)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, FIELD.width - 24, FIELD.height - 24);
}

export function drawHud(ctx, world) {
  drawWardenPanel(ctx, world);
  drawSeedPanel(ctx, world);
  drawWavePanel(ctx, world);
  drawBloomAndDash(ctx, world);
  drawUpgradeRow(ctx, world);
  drawBossBar(ctx, world);
  drawOathPanel(ctx, world);
  drawIntroHint(ctx, world);
  drawControlsHint(ctx, world);
}

function drawOathPanel(ctx, world) {
  const oath = oathById(world.oath?.id);
  const x = 936, y = 158, w = 322;
  ctx.save();
  panel(ctx, x, y, w, 91, { fill: 'rgba(5,14,28,0.9)', edge: `${oath.color}66`, radius: 13 });
  label(ctx, `GARDEN OATH / ${world.oathsCompleted} KEPT`, x + 16, y + 17, 10, oath.color, 'left', 800);
  label(ctx, oath.name.toUpperCase(), x + 16, y + 37, 15, '#eafff8', 'left', 800);
  const detail = oathProgress(world);
  ctx.font = '600 11px system-ui, sans-serif';
  const words = detail.split(' ');
  let line = '', row = 0;
  for (const word of words) {
    if (ctx.measureText(`${line} ${word}`).width > w - 32 && line) {
      label(ctx, line, x + 16, y + 58 + row * 15, 11, oath.color, 'left', 600);
      line = word; row += 1;
    } else line = line ? `${line} ${word}` : word;
  }
  label(ctx, line, x + 16, y + 58 + row * 15, 11, oath.color, 'left', 600);
  const notice = world.oathNotice;
  if (notice) {
    ctx.globalAlpha = Math.min(1, notice.timer * 1.8);
    panel(ctx, x, y + 97, w, 30, { fill: 'rgba(5,14,28,0.9)', edge: notice.color, radius: 10 });
    label(ctx, notice.text, x + w / 2, y + 113, 11.5, notice.color, 'center', 800);
  }
  ctx.restore();
}
