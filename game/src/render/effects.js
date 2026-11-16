// The transient layer: telegraph warnings under the creatures, then sparks, shards, shock
// rings, lightning arcs, dash ghosts, floating damage numbers, the low-health vignette and the
// brief full-screen flash. Everything reads the simulation's particle lists; nothing mutates them.
import { FEEL, FIELD } from '../config.js';

const TAU = Math.PI * 2;

export function drawHazards(ctx, world) {
  for (const hazard of world.hazards) {
    if (hazard.type === 'beam') {
      const charging = hazard.delay > 0;
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 18);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      if (charging) {
        ctx.strokeStyle = 'rgba(255,91,74,0.06)';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(hazard.x, hazard.y);
        ctx.lineTo(hazard.x2, hazard.y2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,91,74,${0.38 + 0.35 * pulse})`;
        ctx.lineWidth = 1.5 + pulse * 0.8;
        ctx.beginPath();
        ctx.moveTo(hazard.x, hazard.y);
        ctx.lineTo(hazard.x2, hazard.y2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,170,120,0.9)';
        ctx.lineWidth = 1.1;
        ctx.setLineDash([6, 13]);
        ctx.lineDashOffset = -world.time * 52;
        ctx.beginPath();
        ctx.moveTo(hazard.x, hazard.y);
        ctx.lineTo(hazard.x2, hazard.y2);
        ctx.stroke();
        ctx.setLineDash([]);
        const warningPulse = 14 + pulse * 5;
        ctx.strokeStyle = `rgba(255,91,74,${0.24 + 0.24 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(hazard.x2, hazard.y2, warningPulse, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,91,74,${0.55 + 0.35 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(hazard.x2, hazard.y2 - 5);
        ctx.lineTo(hazard.x2 + 5, hazard.y2);
        ctx.lineTo(hazard.x2, hazard.y2 + 5);
        ctx.lineTo(hazard.x2 - 5, hazard.y2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,91,74,0.9)';
        ctx.lineWidth = hazard.width;
        ctx.beginPath();
        ctx.moveTo(hazard.x, hazard.y);
        ctx.lineTo(hazard.x2, hazard.y2);
        ctx.stroke();
      }
      ctx.restore();
    } else if (hazard.delay > 0) {
      const t = 1 - hazard.delay / 0.85;
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 16);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,91,74,${0.06 + 0.12 * t})`;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.radius * (0.5 + 0.5 * t), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,91,74,${0.4 + 0.5 * pulse})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.radius * (0.55 + 0.45 * t), 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,207,90,${0.3 + 0.3 * t})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.radius * 0.9, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function drawAirEffects(ctx, world) {
  const particles = world.particles;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const ghost of particles.afterimages) {
    const alpha = (ghost.life / ghost.maxLife) * 0.35;
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(ghost.angle + Math.PI / 2);
    ctx.fillStyle = `rgba(126,247,224,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -ghost.radius * 1.2);
    ctx.quadraticCurveTo(ghost.radius, 0, 0, ghost.radius);
    ctx.quadraticCurveTo(-ghost.radius, 0, 0, -ghost.radius * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const p of particles.list) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = Math.min(1, alpha * 1.4);
    if (p.glow) {
      ctx.fillStyle = p.color;
    } else {
      ctx.fillStyle = p.color;
    }
    if (p.shape === 'shard') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle + p.life * 3);
      ctx.fillRect(-p.size * 0.4, -p.size * 0.7, p.size * 0.8, p.size * 2.2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * (0.4 + alpha * 0.6)), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  for (const ring of particles.rings) {
    const alpha = Math.max(0, ring.life / ring.maxLife);
    ctx.strokeStyle = ring.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = ring.width * (0.4 + alpha * 0.8);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const arc of particles.arcs) {
    const alpha = Math.max(0, arc.life / arc.maxLife);
    const dx = arc.x2 - arc.x1;
    const dy = arc.y2 - arc.y1;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    ctx.strokeStyle = arc.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1);
    const segments = 5;
    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      const jitter = Math.sin(i * 12.9 + arc.life * 500) * 9;
      ctx.lineTo(arc.x1 + dx * t + nx * jitter, arc.y1 + dy * t + ny * jitter);
    }
    ctx.lineTo(arc.x2, arc.y2);
    ctx.stroke();
  }
  ctx.restore();

  for (const number of particles.numbers) {
    const alpha = Math.max(0, Math.min(1, number.life / number.maxLife));
    // Keep floating combat text out of the top HUD and the boss band.
    const numberY = Math.max(162, number.y);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${number.size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(4,8,18,0.85)';
    ctx.strokeText(number.text, number.x, numberY);
    ctx.fillStyle = number.color;
    ctx.fillText(number.text, number.x, numberY);
    ctx.restore();
  }
}

export function drawReticle(ctx, world) {
  const warden = world.warden;
  if (!warden || world.outcome) return;
  const x = warden.aimX;
  const y = warden.aimY;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > FIELD.width || y < 0 || y > FIELD.height) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(182,255,230,0.92)';
  ctx.fillStyle = 'rgba(234,255,248,0.95)';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * TAU + world.time * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 14, y + Math.sin(angle) * 14);
    ctx.lineTo(x + Math.cos(angle) * 21, y + Math.sin(angle) * 21);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, 2.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawLowHealth(ctx, world) {
  const wardenFraction = world.warden.hp / world.warden.maxHp;
  const seedFraction = world.starseed.hp / world.starseed.maxHp;
  const danger = Math.min(wardenFraction, seedFraction);
  if (danger > 0.36) return;
  const intensity = (1 - danger / 0.36) * (0.55 + 0.45 * Math.sin(world.time * 4.2));
  const gradient = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, 190, FIELD.width / 2, FIELD.height / 2, 720);
  gradient.addColorStop(0, 'rgba(255,50,60,0)');
  gradient.addColorStop(0.72, `rgba(255,50,60,${0.06 * intensity})`);
  gradient.addColorStop(1, `rgba(255,30,50,${0.34 * intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

export function drawFlash(ctx, camera) {
  if (camera.flash <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.75, camera.flash * 0.55);
  ctx.fillStyle = camera.flashColor;
  ctx.fillRect(-60, -60, FIELD.width + 120, FIELD.height + 120);
  ctx.restore();
}

export function drawWaveBanner(ctx, world) {
  if (world.bannerTimer <= 0) return;
  const timer = world.bannerTimer;
  const duration = world.bannerMax || FEEL.banner;
  const progress = 1 - timer / duration;
  let alpha = 1;
  if (progress < 0.16) alpha = progress / 0.16;
  else if (progress > 0.8) alpha = (1 - progress) / 0.2;
  const rise = (1 - Math.min(1, progress * 4)) * 12;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  const width = 660;
  const x = (FIELD.width - width) / 2;
  const y = 238 + rise;
  const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
  gradient.addColorStop(0, 'rgba(6,16,30,0)');
  gradient.addColorStop(0.2, 'rgba(6,16,30,0.82)');
  gradient.addColorStop(0.8, 'rgba(6,16,30,0.82)');
  gradient.addColorStop(1, 'rgba(6,16,30,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, 104);
  ctx.fillStyle = 'rgba(255,215,106,0.7)';
  ctx.fillRect(x + 150, y + 8, width - 300, 1.4);
  ctx.fillRect(x + 150, y + 96, width - 300, 1.4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 42px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = '#ffeeb8';
  ctx.shadowColor = 'rgba(255,207,90,0.6)';
  ctx.shadowBlur = 22;
  ctx.fillText(world.bannerText, FIELD.width / 2, y + 44);
  ctx.shadowBlur = 0;
  ctx.font = '600 15px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(234,255,248,0.72)';
  ctx.fillText('THE HOLLOW STIRS', FIELD.width / 2, y + 76);
  ctx.restore();
}
