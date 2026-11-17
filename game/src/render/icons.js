// UI-facing icon API. The upgrade-icon art itself is injected by main at boot, so the HUD,
// draft and results depend on this small API instead of the full path set in icons-art.js.
let upgradeIconPainter = null;

export function setUpgradeIconPainter(painter) {
  upgradeIconPainter = painter;
}

export function drawUpgradeIcon(ctx, icon, cx, cy, size, color = '#b6ffe6', time = 0) {
  if (upgradeIconPainter) upgradeIconPainter(ctx, icon, cx, cy, size, color, time);
}

export function starPath(ctx, cx, cy, outer, inner, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** The results screen's chunky star, filled or outlined. */
export function drawStar(ctx, cx, cy, radius, filled, color = '#ffe9a8') {
  starPath(ctx, cx, cy, radius, radius * 0.45);
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.stroke();
}
