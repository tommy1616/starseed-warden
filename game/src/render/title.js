// The title screen: the animated garden with the Starseed and Warden behind a stylised logo,
// the Play button, the three difficulty choices, How to Play and Sound, and the saved best for
// the selected difficulty. Every control is also reachable from the keyboard.
import { DIFFICULTIES, FIELD, TITLE_FONT } from '../config.js';
import { drawBackground } from './background.js';
import { drawEntities } from './entities.js';
import { addButton, clearButtons, drawButtons, panel, roundedRect } from '../ui/buttons.js';

function drawLogo(ctx, time) {
  const cx = FIELD.width / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const halo = ctx.createRadialGradient(cx, 186, 20, cx, 186, 330);
  halo.addColorStop(0, 'rgba(255,215,106,0.16)');
  halo.addColorStop(0.55, 'rgba(126,232,255,0.05)');
  halo.addColorStop(1, 'rgba(126,232,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, 186, 330, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `800 92px ${TITLE_FONT}`;
  ctx.shadowColor = 'rgba(255,207,90,0.55)';
  ctx.shadowBlur = 30;
  const gold = ctx.createLinearGradient(0, 120, 0, 220);
  gold.addColorStop(0, '#fff6d0');
  gold.addColorStop(0.5, '#ffd76a');
  gold.addColorStop(1, '#f0a94b');
  ctx.fillStyle = gold;
  ctx.fillText('STARSEED', cx, 168);

  ctx.font = `700 64px ${TITLE_FONT}`;
  ctx.shadowColor = 'rgba(126,232,255,0.5)';
  ctx.shadowBlur = 22;
  const mint = ctx.createLinearGradient(0, 210, 0, 278);
  mint.addColorStop(0, '#eafff8');
  mint.addColorStop(1, '#7ef7e0');
  ctx.fillStyle = mint;
  ctx.fillText('WARDEN', cx, 238);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,215,106,0.45)';
  ctx.lineWidth = 1.4;
  const width = 380 + Math.sin(time * 0.8) * 10;
  ctx.beginPath();
  ctx.moveTo(cx - width, 288);
  ctx.lineTo(cx - 80, 288);
  ctx.moveTo(cx + 80, 288);
  ctx.lineTo(cx + width, 288);
  ctx.stroke();
  ctx.fillStyle = '#ffeeb8';
  ctx.beginPath();
  ctx.arc(cx, 288, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '600 14px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(182,255,230,0.78)';
  ctx.fillText('DEFEND THE STARSEED FROM THE HOLLOW', cx, 315);
  ctx.restore();
}

function drawHowTo(ctx, app) {
  const x = 292;
  const y = 104;
  const w = 696;
  const h = 512;
  panel(ctx, x, y, w, h, { fill: 'rgba(5,13,26,0.96)', edge: 'rgba(255,215,106,0.4)', radius: 20, glow: 26 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 34px Georgia, serif';
  ctx.fillStyle = '#ffeeb8';
  ctx.fillText('HOW TO PLAY', FIELD.width / 2, y + 52);
  ctx.strokeStyle = 'rgba(255,215,106,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 90, y + 80);
  ctx.lineTo(x + w - 90, y + 80);
  ctx.stroke();

  const lines = [
    ['MOVE', 'WASD or the arrow keys.'],
    ['AIM & FIRE', 'Mouse aims. Hold left mouse or J to fire seed-darts.'],
    ['DASH', 'Space or Shift. A short burst with a moment of invulnerability.'],
    ['BLOOM', 'E or right mouse, once pollen fills the meter: a radial burst that clears shots.'],
    ['PAUSE / SOUND', 'Esc or P pauses. M toggles the synthesized sound and music.'],
    ['THE GOAL', 'Survive 12 waves across three biomes. Defeat the Withering Crown at the end.'],
    ['THE STARSEED', 'If the Warden or the Starseed falls, the run is over. Between waves, draft a bloom.'],
  ];
  let lineY = y + 118;
  for (const [key, text] of lines) {
    ctx.textAlign = 'left';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillStyle = '#7ee8ff';
    ctx.fillText(key, x + 60, lineY);
    ctx.font = '500 16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(234,255,248,0.88)';
    ctx.fillText(text, x + 190, lineY);
    lineY += 44;
  }
  ctx.textAlign = 'center';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(143,182,198,0.8)';
  ctx.fillText('H or the Close button hides this panel.', FIELD.width / 2, y + h - 84);
}

export function drawTitle(ctx, app) {
  const world = app.titleWorld;
  if (world) {
    drawBackground(ctx, world);
    ctx.save();
    ctx.globalAlpha = 0.86;
    drawEntities(ctx, world, { aim: false });
    ctx.restore();
    const dim = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    dim.addColorStop(0, 'rgba(4,9,22,0.32)');
    dim.addColorStop(0.55, 'rgba(4,9,22,0.12)');
    dim.addColorStop(1, 'rgba(4,9,22,0.72)');
    ctx.fillStyle = dim;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  drawLogo(ctx, app.screenTime);
  clearButtons(app.ui);

  const cx = FIELD.width / 2;
  addButton(app.ui, {
    x: cx - 132, y: 352, w: 264, h: 62,
    style: 'primary', label: 'PLAY', sub: 'ENTER THE GLADE', action: 'play',
    focused: app.focusAction === 'play',
  });

  const total = DIFFICULTIES.length * 160 - 12;
  let x = cx - total / 2;
  for (const difficulty of DIFFICULTIES) {
    addButton(app.ui, {
      x, y: 434, w: 152, h: 48,
      style: 'difficulty',
      label: difficulty.name.toUpperCase(),
      sub: difficulty.blurb,
      action: `diff:${difficulty.id}`,
      selected: app.difficultyId === difficulty.id,
      focused: app.focusAction === `diff:${difficulty.id}`,
      color: difficulty.color,
    });
    x += 160;
  }

  addButton(app.ui, {
    x: cx - 200, y: 500, w: 190, h: 44,
    style: 'ghost', label: 'HOW TO PLAY', action: 'howto',
    focused: app.focusAction === 'howto',
  });
  addButton(app.ui, {
    x: cx + 10, y: 500, w: 190, h: 44,
    style: 'ghost',
    label: app.soundOn ? 'SOUND ON' : 'SOUND OFF',
    action: 'sound',
    focused: app.focusAction === 'sound',
  });

  const best = app.best;
  const bestLine = best.score > 0
    ? `BEST ${best.score.toLocaleString('en-US')}  ·  WAVE ${best.wave}  ·  ${app.difficulty.name.toUpperCase()}`
    : `NO RUN YET ON ${app.difficulty.name.toUpperCase()} — THE GLADE IS WAITING`;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,238,184,0.75)';
  ctx.fillText(bestLine, cx, 574);
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(143,182,198,0.62)';
  ctx.fillText('ARROWS / ENTER FOR MENUS  ·  1 2 3 PICK DIFFICULTY  ·  M SOUND', cx, 684);
  ctx.restore();

  if (app.showHowTo) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,14,0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
    drawHowTo(ctx, app);
    addButton(app.ui, {
      x: FIELD.width / 2 - 90, y: 570, w: 180, h: 40,
      style: 'ghost', label: 'CLOSE', action: 'howto', focused: true,
    });
  }

  drawButtons(ctx, app.ui, app.pointer ?? null, app.ui.time);
}
