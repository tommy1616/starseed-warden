// The pause menu over a dimmed, frozen glade: resume, restart the run, quit to the title, or
// toggle sound. Esc/P resumes; arrows and Enter work the same buttons.
import { BIOMES, FIELD, TITLE_FONT } from '../config.js';
import { drawBackground } from './background.js';
import { drawEntities } from './entities.js';
import { drawAirEffects, drawHazards } from './effects.js';
import { addButton, clearButtons, drawButtons, panel } from '../ui/buttons.js';

export function drawPause(ctx, app) {
  const world = app.world;
  if (world) {
    drawBackground(ctx, world);
    drawHazards(ctx, world);
    drawEntities(ctx, world);
    drawAirEffects(ctx, world);
  }
  ctx.fillStyle = 'rgba(3,8,20,0.7)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  const w = 470;
  const h = 414;
  const x = (FIELD.width - w) / 2;
  const y = 150;
  panel(ctx, x, y, w, h, { fill: 'rgba(5,13,26,0.96)', edge: 'rgba(126,232,255,0.4)', radius: 20, glow: 26 });

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 46px ${TITLE_FONT}`;
  ctx.fillStyle = '#d8fff3';
  ctx.shadowColor = 'rgba(126,232,255,0.4)';
  ctx.shadowBlur = 18;
  ctx.fillText('PAUSED', FIELD.width / 2, y + 58);
  ctx.shadowBlur = 0;
  const biome = world ? BIOMES[world.biomeIndex] : BIOMES[0];
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(143,182,198,0.8)';
  ctx.fillText(world ? `WAVE ${world.wave} · ${biome.name.toUpperCase()} · SCORE ${Math.round(world.score.score).toLocaleString('en-US')}` : 'THE GARDEN HOLDS ITS BREATH', FIELD.width / 2, y + 96);
  ctx.restore();

  clearButtons(app.ui);
  const bx = FIELD.width / 2 - 140;
  const bw = 280;
  const bh = 48;
  addButton(app.ui, { x: bx, y: y + 126, w: bw, h: bh, style: 'primary', label: 'RESUME', action: 'resume', focused: app.focusAction === 'resume' });
  addButton(app.ui, { x: bx, y: y + 188, w: bw, h: bh, style: 'ghost', label: 'RESTART RUN', action: 'restart', focused: app.focusAction === 'restart' });
  addButton(app.ui, { x: bx, y: y + 250, w: bw, h: bh, style: 'ghost', label: 'QUIT TO TITLE', action: 'quit', focused: app.focusAction === 'quit' });
  addButton(app.ui, { x: bx, y: y + 312, w: bw, h: bh, style: 'ghost', label: app.soundOn ? 'SOUND: ON' : 'SOUND: OFF', action: 'sound', focused: app.focusAction === 'sound' });

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(143,182,198,0.6)';
  ctx.fillText('ESC / P RESUME  ·  ENTER ACTIVATES  ·  M SOUND', FIELD.width / 2, y + h - 22);
  ctx.restore();

  drawButtons(ctx, app.ui, app.pointer ?? null, app.ui.time);
}
