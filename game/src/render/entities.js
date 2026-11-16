// The creatures and things of the glade: the Warden, the Starseed, eight Hollow kinds, the
// bosses, pollen, darts, enemy shots, petals and dash trails. Shapes are drawn directly with
// canvas paths; the luminous parts are translucent additive circles rather than image assets.
import { PLAYER } from '../config.js';

const TAU = Math.PI * 2;

function glow(ctx, x, y, radius, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function shadow(ctx, x, y, radius) {
  ctx.save();
  ctx.translate(x, y + radius * 0.72);
  ctx.scale(1, 0.36);
  ctx.fillStyle = 'rgba(2, 6, 14, 0.5)';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.85, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function wavyBlob(ctx, radius, time, phase, wobble = 0.12) {
  ctx.beginPath();
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * TAU;
    const r = radius * (1 + Math.sin(time * 4 + phase + i * 1.7) * wobble);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawEnemyBody(ctx, world, enemy) {
  const time = world.time;
  const angle = enemy.angle;
  const flash = enemy.hitFlash > 0;
  const body = flash ? '#ffffff' : enemy.color;
  const light = flash ? '#ffffff' : enemy.glow;
  const slowed = enemy.slowTimer > 0;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  shadow(ctx, 0, 0, enemy.r);

  if (enemy.elite) {
    glow(ctx, 0, 0, enemy.r * 2.15, 'rgba(255,226,138,0.18)');
    ctx.strokeStyle = 'rgba(255,226,138,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r + 5, 0, TAU);
    ctx.stroke();
  }

  switch (enemy.kind) {
    case 'thornback': {
      ctx.rotate(time * 0.4);
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU;
        ctx.lineTo(Math.cos(a) * enemy.r, Math.sin(a) * enemy.r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = light;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * enemy.r * 0.9, Math.sin(a) * enemy.r * 0.9);
        ctx.lineTo(Math.cos(a) * (enemy.r + 11), Math.sin(a) * (enemy.r + 11));
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,155,240,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.r * 0.34, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a0f36';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.r * 0.16, 0, TAU);
      ctx.fill();
      break;
    }
    case 'wispEater': {
      ctx.rotate(time * 1.2);
      ctx.strokeStyle = 'rgba(231,182,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.r * 1.5, enemy.r * 0.6, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(0, -enemy.r * 1.15);
      ctx.lineTo(enemy.r * 0.9, 0);
      ctx.lineTo(0, enemy.r * 1.15);
      ctx.lineTo(-enemy.r * 0.9, 0);
      ctx.closePath();
      ctx.fill();
      glow(ctx, 0, 0, enemy.r * 0.5, 'rgba(255,255,255,0.35)');
      break;
    }
    case 'spitter': {
      ctx.rotate(angle);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(enemy.r * 1.1, 0);
      ctx.quadraticCurveTo(enemy.r * 0.2, -enemy.r, -enemy.r * 0.95, -enemy.r * 0.35);
      ctx.quadraticCurveTo(-enemy.r * 1.2, 0, -enemy.r * 0.95, enemy.r * 0.35);
      ctx.quadraticCurveTo(enemy.r * 0.2, enemy.r, enemy.r * 1.1, 0);
      ctx.closePath();
      ctx.fill();
      glow(ctx, enemy.r * 1.15, 0, enemy.r * 0.38, 'rgba(255,155,240,0.75)');
      ctx.fillStyle = '#2a0f36';
      ctx.beginPath();
      ctx.arc(enemy.r * 0.2, -enemy.r * 0.2, enemy.r * 0.14, 0, TAU);
      ctx.arc(enemy.r * 0.2, enemy.r * 0.2, enemy.r * 0.14, 0, TAU);
      ctx.fill();
      break;
    }
    case 'burrower': {
      if (enemy.burrowed) break;
      ctx.rotate(time * 0.8);
      ctx.fillStyle = body;
      wavyBlob(ctx, enemy.r, time, enemy.wobble, 0.1);
      ctx.fill();
      ctx.strokeStyle = light;
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * enemy.r * 0.5, Math.sin(a) * enemy.r * 0.5);
        ctx.lineTo(Math.cos(a) * (enemy.r + 8), Math.sin(a) * (enemy.r + 8));
        ctx.stroke();
      }
      glow(ctx, 0, 0, enemy.r * 0.5, 'rgba(255,255,255,0.3)');
      break;
    }
    case 'splitter': {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(-enemy.r * 0.35, 0, enemy.r * 0.86, 0, TAU);
      ctx.arc(enemy.r * 0.35, 0, enemy.r * 0.86, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = light;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -enemy.r * 0.7);
      ctx.lineTo(0, enemy.r * 0.7);
      ctx.stroke();
      ctx.fillStyle = '#2a0f36';
      ctx.beginPath();
      ctx.arc(-enemy.r * 0.38, -enemy.r * 0.12, enemy.r * 0.13, 0, TAU);
      ctx.arc(enemy.r * 0.38, -enemy.r * 0.12, enemy.r * 0.13, 0, TAU);
      ctx.fill();
      break;
    }
    case 'shade': {
      ctx.rotate(angle);
      for (let g = 2; g >= 0; g -= 1) {
        ctx.globalAlpha = 0.12 + g * 0.1;
        ctx.fillStyle = '#8d3cff';
        ctx.beginPath();
        ctx.moveTo(-enemy.r * 1.6 - g * 9, 0);
        ctx.lineTo(-enemy.r * 0.4, -enemy.r * 0.8);
        ctx.lineTo(-enemy.r * 0.4, enemy.r * 0.8);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(enemy.r * 1.25, 0);
      ctx.lineTo(-enemy.r * 0.65, -enemy.r * 0.95);
      ctx.lineTo(-enemy.r * 0.1, 0);
      ctx.lineTo(-enemy.r * 0.65, enemy.r * 0.95);
      ctx.closePath();
      ctx.fill();
      glow(ctx, enemy.r * 0.1, 0, enemy.r * 0.28, 'rgba(255,255,255,0.4)');
      break;
    }
    case 'mini': {
      ctx.rotate(angle + time * 2);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(enemy.r, 0);
      ctx.lineTo(-enemy.r * 0.7, -enemy.r * 0.8);
      ctx.lineTo(-enemy.r * 0.3, 0);
      ctx.lineTo(-enemy.r * 0.7, enemy.r * 0.8);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: {
      ctx.rotate(time * 0.5 + enemy.wobble);
      ctx.fillStyle = body;
      wavyBlob(ctx, enemy.r, time, enemy.wobble, 0.16);
      ctx.fill();
      ctx.fillStyle = 'rgba(30, 8, 42, 0.72)';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.r * 0.55, 0, TAU);
      ctx.fill();
      glow(ctx, enemy.r * 0.12, -enemy.r * 0.08, enemy.r * 0.34, 'rgba(255,155,240,0.55)');
      ctx.fillStyle = '#ffe7ff';
      ctx.beginPath();
      ctx.arc(enemy.r * 0.12, -enemy.r * 0.08, enemy.r * 0.12, 0, TAU);
      ctx.fill();
      break;
    }
  }

  if (slowed) {
    ctx.strokeStyle = 'rgba(143,216,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r + 2, 0, TAU);
    ctx.stroke();
  }
  if (enemy.elite) {
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath();
    ctx.arc(enemy.r * 0.8, -enemy.r * 0.8, 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  if (enemy.elite && enemy.hp < enemy.maxHp) {
    const width = enemy.r * 2.2;
    const fraction = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(10,6,20,0.7)';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.r - 13, width, 4);
    ctx.fillStyle = '#ffe28a';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.r - 13, width * fraction, 4);
  }
}

function drawBossBody(ctx, world, boss) {
  const time = world.time;
  const flash = boss.hitFlash > 0;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  shadow(ctx, 0, 0, boss.r * 1.2);
  glow(ctx, 0, 0, boss.r * 2.6, 'rgba(224,90,255,0.16)');
  ctx.rotate(Math.sin(time * 0.5) * 0.1);

  if (boss.type === 'bramble') {
    ctx.fillStyle = flash ? '#ffffff' : '#3d1150';
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU;
      const radius = boss.r * (i % 2 === 0 ? 1.28 : 0.86);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x * 0.7, y * 0.7);
    }
    ctx.closePath();
    ctx.fill();
    for (let layer = 0; layer < 3; layer += 1) {
      const radius = boss.r * (0.9 - layer * 0.22);
      ctx.fillStyle = flash ? '#ffffff' : layer === 0 ? '#7a2bcf' : layer === 1 ? '#a44bf0' : '#d59bff';
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * TAU + layer * 0.4 + time * 0.15;
        const r = radius * (1 + Math.sin(time * 2 + i) * 0.08);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    glow(ctx, 0, 0, boss.r * 0.5, 'rgba(255,155,240,0.85)');
    ctx.fillStyle = '#2a0f36';
    ctx.beginPath();
    ctx.arc(0, 0, boss.r * 0.24, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,155,240,0.9)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * TAU + time * 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * boss.r * 0.9, Math.sin(angle) * boss.r * 0.9);
      ctx.lineTo(Math.cos(angle) * boss.r * 1.4, Math.sin(angle) * boss.r * 1.4);
      ctx.stroke();
    }
  } else if (boss.type === 'tyrant') {
    ctx.fillStyle = flash ? '#ffffff' : '#43215f';
    ctx.beginPath();
    ctx.roundRect(-boss.r * 0.28, -boss.r * 0.1, boss.r * 0.56, boss.r * 1.25, boss.r * 0.2);
    ctx.fill();
    const cap = ctx.createLinearGradient(0, -boss.r, 0, boss.r * 0.4);
    cap.addColorStop(0, flash ? '#ffffff' : '#b388ff');
    cap.addColorStop(1, flash ? '#ffffff' : '#5b2f9c');
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(0, -boss.r * 0.12, boss.r * 1.3, boss.r * 0.95, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.PI + 0.4 + (i / 4) * (Math.PI - 0.8);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * boss.r * 0.75, -boss.r * 0.12 + Math.sin(angle) * boss.r * 0.5, 3 + (i % 2) * 2, 0, TAU);
      ctx.fill();
    }
    glow(ctx, 0, boss.r * 0.2, boss.r * 0.55, 'rgba(229,201,255,0.8)');
    ctx.fillStyle = '#1d0b30';
    ctx.beginPath();
    ctx.arc(-boss.r * 0.12, boss.r * 0.16, boss.r * 0.1, 0, TAU);
    ctx.arc(boss.r * 0.12, boss.r * 0.16, boss.r * 0.1, 0, TAU);
    ctx.fill();
  } else {
    const phaseColor = boss.phase >= 3 ? '#ff5b4a' : boss.phase === 2 ? '#ff5bd0' : '#b388ff';
    ctx.fillStyle = flash ? '#ffffff' : '#2a0f42';
    ctx.beginPath();
    const spikes = 9;
    for (let i = 0; i < spikes * 2; i += 1) {
      const angle = (i / (spikes * 2)) * TAU + time * 0.2;
      const radius = i % 2 === 0 ? boss.r * 1.3 : boss.r * 0.72;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    glow(ctx, 0, 0, boss.r * 0.72, 'rgba(255,215,106,0.4)');
    ctx.fillStyle = '#100616';
    ctx.beginPath();
    ctx.arc(0, 0, boss.r * 0.55, 0, TAU);
    ctx.fill();
    ctx.fillStyle = phaseColor;
    for (let i = 0; i < 3; i += 1) {
      const angle = time * 0.7 + (i / 3) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * boss.r * 0.26, Math.sin(angle) * boss.r * 0.26, boss.r * 0.08, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(255,231,168,${0.4 + 0.3 * Math.sin(time * 3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, boss.r * 0.82, time, time + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStarseed(ctx, world) {
  const seed = world.starseed;
  const time = world.time;
  ctx.save();
  ctx.translate(seed.x, seed.y);
  const pulse = 1 + Math.sin(time * 1.4) * 0.035;
  const glowRadius = seed.r * (3.6 + Math.sin(time) * 0.15);
  const halo = ctx.createRadialGradient(0, 0, seed.r * 0.4, 0, 0, glowRadius);
  halo.addColorStop(0, 'rgba(255,243,196,0.34)');
  halo.addColorStop(0.35, 'rgba(255,196,74,0.13)');
  halo.addColorStop(1, 'rgba(255,196,74,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,215,106,0.5)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * TAU + Math.sin(time * 0.4 + i) * 0.1;
    const inner = seed.r * 1.05;
    const outer = seed.r * (1.5 + 0.12 * Math.sin(time * 1.2 + i * 2));
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.quadraticCurveTo(
      Math.cos(angle + 0.2) * (inner + outer) * 0.55,
      Math.sin(angle + 0.2) * (inner + outer) * 0.55,
      Math.cos(angle) * outer,
      Math.sin(angle) * outer,
    );
    ctx.stroke();
  }

  ctx.fillStyle = seed.hurtFlash > 0 ? '#fff3c4' : '#ffd76a';
  ctx.beginPath();
  ctx.moveTo(0, -seed.r * 1.15 * pulse);
  ctx.bezierCurveTo(seed.r * 0.95, -seed.r * 0.5, seed.r * 0.8, seed.r * 0.75, 0, seed.r * 1.1 * pulse);
  ctx.bezierCurveTo(-seed.r * 0.8, seed.r * 0.75, -seed.r * 0.95, -seed.r * 0.5, 0, -seed.r * 1.15 * pulse);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-seed.r * 0.2, -seed.r * 0.28, seed.r * 0.16, seed.r * 0.3, -0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,20,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -seed.r * 0.35);
  ctx.lineTo(0, seed.r * 0.65);
  ctx.stroke();

  if (seed.shield > 0) {
    ctx.strokeStyle = `rgba(126,200,255,${0.45 + 0.25 * Math.sin(time * 3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, seed.r + 16 + Math.sin(time * 2) * 3, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < seed.shield; i += 1) {
      ctx.fillStyle = '#7ec8ff';
      ctx.beginPath();
      ctx.arc(seed.r + 16, -10 + i * 20, 4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  if (seed.hurtFlash > 0) {
    glow(ctx, seed.x, seed.y, seed.r * 2, `rgba(255,91,74,${seed.hurtFlash * 0.5})`);
  }
}

function drawWarden(ctx, world, options = {}) {
  const warden = world.warden;
  const mods = world.mods;
  const time = world.time;
  const blink = warden.invulnerable > 0 && Math.floor(warden.invulnerable * 18) % 2 === 0;
  if (blink && warden.hp > 0) return;

  ctx.save();
  ctx.translate(warden.x, warden.y);
  shadow(ctx, 0, 0, warden.r * 1.2);
  const bob = Math.sin((warden.walkPhase ?? 0) + time * 2) * 1.6;
  ctx.translate(0, bob);

  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, warden.r * 3.6);
  halo.addColorStop(0, 'rgba(182,255,230,0.4)');
  halo.addColorStop(0.4, 'rgba(80,255,220,0.14)');
  halo.addColorStop(1, 'rgba(80,255,220,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, warden.r * 3.6, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(80,255,220,0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, warden.r * 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(warden.aimAngle + Math.PI / 2);
  ctx.fillStyle = warden.hitFlash > 0 ? '#ffffff' : PLAYER_COLOR;
  ctx.beginPath();
  ctx.moveTo(0, -warden.r * 1.25);
  ctx.quadraticCurveTo(warden.r * 1.0, -warden.r * 0.15, warden.r * 0.62, warden.r * 0.9);
  ctx.quadraticCurveTo(0, warden.r * 1.15, -warden.r * 0.62, warden.r * 0.9);
  ctx.quadraticCurveTo(-warden.r * 1.0, -warden.r * 0.15, 0, -warden.r * 1.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(234,255,248,0.85)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(234,255,248,0.92)';
  ctx.beginPath();
  ctx.ellipse(0, -warden.r * 0.34, warden.r * 0.2, warden.r * 0.32, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0a2a28';
  ctx.beginPath();
  ctx.arc(0, -warden.r * 0.3, warden.r * 0.1, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(143,247,200,0.95)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -warden.r * 1.15);
  ctx.quadraticCurveTo(warden.r * 0.55, -warden.r * 1.85, warden.r * 0.9, -warden.r * 1.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -warden.r * 1.15);
  ctx.quadraticCurveTo(-warden.r * 0.45, -warden.r * 1.75, -warden.r * 0.75, -warden.r * 1.3);
  ctx.stroke();
  ctx.restore();

  if (mods.orbit > 0) {
    for (let i = 0; i < mods.orbit; i += 1) {
      const angle = warden.orbitAngle + (i / mods.orbit) * TAU;
      const px = Math.cos(angle) * 56;
      const py = Math.sin(angle) * 56;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + time * 2);
      ctx.fillStyle = 'rgba(143,247,200,0.9)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 4.5, 0, 0, TAU);
      ctx.fill();
      glow(ctx, 0, 0, 13, 'rgba(143,247,200,0.25)');
      ctx.restore();
    }
  }

  // A thin, low-contrast aim line toward the cursor; the reticle is drawn by effects.js.
  if (options.aim !== false) {
    const aimX = Number.isFinite(warden.aimX) ? warden.aimX : warden.x + Math.cos(warden.aimAngle) * 160;
    const aimY = Number.isFinite(warden.aimY) ? warden.aimY : warden.y + Math.sin(warden.aimAngle) * 160;
    const adx = aimX - warden.x;
    const ady = aimY - warden.y;
    const alen = Math.hypot(adx, ady) || 1;
    const reach = Math.min(300, alen);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(126,247,224,0.18)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 11]);
    ctx.lineDashOffset = -time * 26;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo((adx / alen) * reach, (ady / alen) * reach);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  ctx.restore();
}

const PLAYER_COLOR = '#7ef7e0';

function drawPickups(ctx, world) {
  for (const mote of world.pickups) {
    const pulse = 0.75 + 0.25 * Math.sin(world.time * 6 + mote.phase);
    glow(ctx, mote.x, mote.y, mote.r * 3.4, `rgba(255,207,90,${0.16 + 0.1 * pulse})`);
    ctx.fillStyle = mote.glow ? '#fff3c4' : '#ffcf5a';
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.r * (0.85 + pulse * 0.2), 0, TAU);
    ctx.fill();
  }
}

function drawProjectiles(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const dart of world.darts) {
    ctx.save();
    ctx.translate(dart.x, dart.y);
    ctx.rotate(Math.atan2(dart.vy, dart.vx));
    ctx.fillStyle = 'rgba(169,255,232,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 0, dart.r * 2.6, dart.r * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#eafff8';
    ctx.beginPath();
    ctx.arc(dart.r * 0.6, 0, dart.r * 0.52, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  for (const bullet of world.bullets) {
    glow(ctx, bullet.x, bullet.y, bullet.r * 2.8, `${bullet.color}55`);
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(bullet.x - bullet.r * 0.2, bullet.y - bullet.r * 0.2, bullet.r * 0.34, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  for (const trail of world.trails) {
    const alpha = Math.max(0, trail.life / trail.maxLife);
    glow(ctx, trail.x, trail.y, trail.r * 2.2, `rgba(120,240,184,${0.2 * alpha})`);
    ctx.fillStyle = `rgba(143,247,200,${0.5 * alpha})`;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.r * 0.55, 0, TAU);
    ctx.fill();
  }
  for (const ring of world.lingerRings) {
    const alpha = Math.max(0, ring.life / ring.maxLife);
    ctx.strokeStyle = `rgba(182,255,230,${0.4 * alpha})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
    ctx.stroke();
  }
}

export function drawEntities(ctx, world, options = {}) {
  drawPickups(ctx, world);
  for (const enemy of world.enemies) {
    if (!enemy.dead) drawEnemyBody(ctx, world, enemy);
  }
  if (world.boss && !world.boss.dead) drawBossBody(ctx, world, world.boss);
  drawStarseed(ctx, world);
  if (options.projectiles !== false) drawProjectiles(ctx, world);
  if (options.warden !== false && (!world.outcome || world.outcome === 'victory')) drawWarden(ctx, world, options);
}

export { glow };
