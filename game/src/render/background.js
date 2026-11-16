// The nocturnal garden behind the arena. Biome changes repaint the sky, the horizon silhouettes
// (meadow hills, fungal caps, crystal shards), the grass and the ambient fireflies, while the
// glade ring and vignette keep the action reading clearly even in a small screenshot.
import { BIOMES, FIELD } from '../config.js';

const TAU = Math.PI * 2;

function drawStars(ctx, world) {
  const stars = world.decor.stars;
  ctx.save();
  for (const star of stars) {
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(world.time * star.twinkle + star.phase));
    ctx.globalAlpha = 0.18 + twinkle * 0.5;
    ctx.fillStyle = star.size > 1.2 ? '#dff8ff' : '#b9e4ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawMeadow(ctx, world, biome) {
  ctx.save();
  const layers = [
    { base: 330, amp: 62, color: 'rgba(13, 44, 62, 0.75)', speed: 0.06 },
    { base: 388, amp: 48, color: 'rgba(10, 34, 50, 0.85)', speed: 0.09 },
    { base: 452, amp: 36, color: 'rgba(8, 24, 40, 0.95)', speed: 0.14 },
  ];
  for (const layer of layers) {
    ctx.beginPath();
    ctx.moveTo(-40, FIELD.height);
    for (let x = -40; x <= FIELD.width + 40; x += 40) {
      const y = layer.base + Math.sin(x * 0.006 + world.time * layer.speed) * layer.amp + Math.sin(x * 0.017) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(FIELD.width + 40, FIELD.height);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
  }
  ctx.restore();
}

function drawFungal(ctx, world) {
  ctx.save();
  const caps = world.decor.hills;
  for (let i = 0; i < caps.length; i += 1) {
    const cap = caps[i];
    const x = cap.x;
    const baseY = 372 + cap.depth * 90;
    const h = 40 + cap.height * 0.5;
    const w = 34 + cap.width * 0.22;
    const sway = Math.sin(world.time * 0.4 + cap.phase) * 3;
    ctx.strokeStyle = 'rgba(52, 30, 82, 0.85)';
    ctx.lineWidth = 12 + cap.depth * 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + sway, baseY - h * 0.6, x + sway * 1.4, baseY - h);
    ctx.stroke();
    ctx.fillStyle = i % 3 === 0 ? 'rgba(74, 36, 116, 0.85)' : 'rgba(48, 28, 88, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x + sway * 1.4, baseY - h, w, w * 0.48, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(179, 136, 255, 0.3)';
    for (let dot = 0; dot < 3; dot += 1) {
      const dotAngle = Math.PI + (dot + 1) * 0.7;
      ctx.beginPath();
      ctx.arc(x + sway * 1.4 + Math.cos(dotAngle) * w * 0.55, baseY - h + Math.sin(dotAngle) * w * 0.26, 3 + cap.depth * 2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCrystal(ctx, world) {
  ctx.save();
  const shards = world.decor.hills;
  for (let i = 0; i < shards.length; i += 1) {
    const shard = shards[i];
    const baseY = 400 + shard.depth * 110;
    const h = 50 + shard.height * 0.9;
    const w = 20 + shard.width * 0.12;
    const lean = Math.sin(world.time * 0.2 + shard.phase) * 5;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(62, 74, 150, 0.42)' : 'rgba(94, 54, 146, 0.36)';
    ctx.beginPath();
    ctx.moveTo(shard.x, baseY);
    ctx.lineTo(shard.x - w * 0.5, baseY - h * 0.55);
    ctx.lineTo(shard.x + lean, baseY - h);
    ctx.lineTo(shard.x + w * 0.5, baseY - h * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(143, 216, 255, 0.22)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrass(ctx, world, biome) {
  const grass = world.decor.grass;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < grass.length; i += 1) {
    const blade = grass[i];
    const sway = Math.sin(world.time * 0.9 + blade.phase) * 6;
    const lit = blade.shade > 0.55;
    ctx.strokeStyle = lit ? 'rgba(50, 120, 104, 0.5)' : 'rgba(18, 54, 62, 0.7)';
    ctx.lineWidth = 2 + blade.shade * 2.4;
    ctx.beginPath();
    ctx.moveTo(blade.x, blade.base);
    ctx.quadraticCurveTo(
      blade.x + blade.lean * 0.4 + sway * 0.5,
      blade.base - blade.height * 0.55,
      blade.x + blade.lean + sway,
      blade.base - blade.height,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlade(ctx, world, biome) {
  const seed = world.starseed;
  ctx.save();
  ctx.translate(seed.x, seed.y);
  const pulse = 0.5 + 0.5 * Math.sin(world.time * 1.1);
  const glow = ctx.createRadialGradient(0, 0, seed.r * 0.4, 0, 0, 300);
  glow.addColorStop(0, 'rgba(255, 215, 106, 0.16)');
  glow.addColorStop(0.45, 'rgba(255, 196, 74, 0.05)');
  glow.addColorStop(1, 'rgba(255, 196, 74, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 300, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = biome.accent;
  ctx.globalAlpha = 0.12 + pulse * 0.05;
  ctx.lineWidth = 1.4;
  for (let ring = 0; ring < 2; ring += 1) {
    const radius = 128 + ring * 74;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
    const ticks = 16 + ring * 8;
    for (let i = 0; i < ticks; i += 1) {
      const angle = (i / ticks) * TAU + world.time * (ring === 0 ? 0.05 : -0.035);
      const inner = radius - 6;
      const outer = radius + 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFireflies(ctx, world, biome) {
  const fireflies = world.decor.fireflies;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < fireflies.length; i += 1) {
    const fly = fireflies[i];
    const x = fly.x + Math.sin(world.time * fly.pace + fly.phase) * fly.drift;
    const y = fly.y + Math.cos(world.time * fly.pace * 0.8 + fly.phase) * fly.drift * 0.6;
    const glow = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(world.time * 2.1 + fly.phase * 3));
    const color = fly.warm ? '255, 215, 106' : '126, 232, 255';
    ctx.fillStyle = `rgba(${color}, ${0.1 * glow})`;
    ctx.beginPath();
    ctx.arc(x, y, fly.size * 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(${color}, ${0.7 * glow})`;
    ctx.beginPath();
    ctx.arc(x, y, fly.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBackground(ctx, world) {
  const biome = BIOMES[world.biomeIndex] ?? BIOMES[0];
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, biome.sky[0]);
  sky.addColorStop(0.55, biome.sky[1]);
  sky.addColorStop(1, biome.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  drawStars(ctx, world);
  if (biome.hills === 0) drawMeadow(ctx, world, biome);
  else if (biome.hills === 1) drawFungal(ctx, world);
  else drawCrystal(ctx, world);

  const ground = ctx.createLinearGradient(0, 520, 0, FIELD.height);
  ground.addColorStop(0, 'rgba(5, 14, 24, 0)');
  ground.addColorStop(0.5, 'rgba(5, 14, 24, 0.6)');
  ground.addColorStop(1, 'rgba(3, 9, 18, 0.92)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 500, FIELD.width, FIELD.height - 500);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const mote of world.decor.motes) {
    const x = mote.x + Math.sin(world.time * mote.speed + mote.phase) * 34;
    const y = mote.y + Math.cos(world.time * mote.speed * 0.7 + mote.phase) * 20;
    ctx.fillStyle = `rgba(255, 215, 106, ${0.035 + 0.03 * (0.5 + 0.5 * Math.sin(world.time + mote.phase))})`;
    ctx.beginPath();
    ctx.arc(x, y, mote.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  drawGrass(ctx, world, biome);
  drawGlade(ctx, world, biome);
  drawFireflies(ctx, world, biome);

  const vignette = ctx.createRadialGradient(FIELD.width / 2, FIELD.height * 0.48, 180, FIELD.width / 2, FIELD.height * 0.5, 760);
  vignette.addColorStop(0, 'rgba(2, 5, 15, 0)');
  vignette.addColorStop(0.62, 'rgba(2, 5, 15, 0.18)');
  vignette.addColorStop(1, 'rgba(1, 3, 10, 0.78)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}
