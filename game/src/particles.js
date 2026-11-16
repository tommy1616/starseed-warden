// Visual debris only: sparks, ink flakes, pollen bursts, expanding rings, short lightning
// arcs, floating damage numbers and dash after-images. Nothing here touches the rules. The
// simulation owns the lists and culls them; the renderer only reads them.
import { FEEL } from './config.js';

export function createParticles() {
  return {
    list: [],
    numbers: [],
    rings: [],
    arcs: [],
    afterimages: [],
    numberPhase: 0,
  };
}

function pushParticle(particles, particle) {
  if (particles.list.length >= FEEL.maxParticles) particles.list.shift();
  particles.list.push(particle);
}

export function addParticle(particles, x, y, vx, vy, life, size, color, options = {}) {
  pushParticle(particles, {
    x, y, vx, vy,
    life,
    maxLife: life,
    size,
    color,
    drag: options.drag ?? 2.1,
    gravity: options.gravity ?? 0,
    glow: options.glow ?? true,
    shape: options.shape ?? 'dot',
    spin: options.spin ?? 0,
    angle: options.angle ?? 0,
  });
}

/** A burst of debris, e.g. an enemy's death or a dart's impact. */
export function burst(particles, rng, x, y, color, count, options = {}) {
  const speed = options.speed ?? 170;
  const life = options.life ?? 0.5;
  const size = options.size ?? 3;
  for (let i = 0; i < count; i += 1) {
    const angle = rng.next() * Math.PI * 2;
    const pace = speed * (0.35 + rng.next() * 0.85);
    addParticle(
      particles,
      x, y,
      Math.cos(angle) * pace,
      Math.sin(angle) * pace,
      life * (0.6 + rng.next() * 0.8),
      size * (0.55 + rng.next() * 0.9),
      color,
      { drag: options.drag ?? 2.3, gravity: options.gravity ?? 22, shape: options.shape ?? 'dot', glow: options.glow ?? true },
    );
  }
}

export function addNumber(particles, x, y, text, color, size = 18) {
  // A deterministic jitter (not Math.random) so a seeded shot frame always looks the same.
  particles.numberPhase = (particles.numberPhase + 1) % 997;
  const jitter = Math.sin(particles.numberPhase * 12.9898) * 0.5;
  particles.numbers.push({
    x, y,
    vy: -46 - jitter * 4,
    vx: jitter * 16,
    text: String(text),
    color,
    size,
    life: 0.7,
    maxLife: 0.7,
  });
  if (particles.numbers.length > 80) particles.numbers.shift();
}

export function addRing(particles, x, y, from, to, color, life, width = 4) {
  particles.rings.push({ x, y, from, to, radius: from, color, life, maxLife: life, width });
  if (particles.rings.length > 40) particles.rings.shift();
}

export function addArc(particles, x1, y1, x2, y2, color, life = 0.13) {
  particles.arcs.push({ x1, y1, x2, y2, color, life, maxLife: life });
  if (particles.arcs.length > 30) particles.arcs.shift();
}

export function addAfterimage(particles, x, y, radius, angle) {
  particles.afterimages.push({ x, y, radius, angle, life: 0.32, maxLife: 0.32 });
  if (particles.afterimages.length > 24) particles.afterimages.shift();
}

export function updateParticles(particles, dt) {
  const list = particles.list;
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    const damping = Math.max(0, 1 - p.drag * dt);
    p.vx *= damping;
    p.vy = p.vy * damping + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.angle += p.spin * dt;
    list[write] = p;
    write += 1;
  }
  list.length = write;

  const nums = particles.numbers;
  write = 0;
  for (let i = 0; i < nums.length; i += 1) {
    const n = nums[i];
    n.life -= dt;
    if (n.life <= 0) continue;
    n.y += n.vy * dt;
    n.x += n.vx * dt;
    n.vy *= Math.max(0, 1 - 2.4 * dt);
    nums[write] = n;
    write += 1;
  }
  nums.length = write;

  const rings = particles.rings;
  write = 0;
  for (let i = 0; i < rings.length; i += 1) {
    const ring = rings[i];
    ring.life -= dt;
    if (ring.life <= 0) continue;
    const t = 1 - ring.life / ring.maxLife;
    ring.radius = ring.from + (ring.to - ring.from) * (1 - (1 - t) * (1 - t));
    rings[write] = ring;
    write += 1;
  }
  rings.length = write;

  const arcs = particles.arcs;
  write = 0;
  for (let i = 0; i < arcs.length; i += 1) {
    arcs[i].life -= dt;
    if (arcs[i].life <= 0) continue;
    arcs[write] = arcs[i];
    write += 1;
  }
  arcs.length = write;

  const ghosts = particles.afterimages;
  write = 0;
  for (let i = 0; i < ghosts.length; i += 1) {
    ghosts[i].life -= dt;
    if (ghosts[i].life <= 0) continue;
    ghosts[write] = ghosts[i];
    write += 1;
  }
  ghosts.length = write;
}
