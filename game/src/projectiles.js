// Projectiles and lightning. Projectiles home toward their target's current
// position; splash shells explode on arrival; chain lightning strikes
// instantly and leaves fading beam segments for the renderer.

import { damageEnemy, applySlow } from './enemies.js';
import { spawnBurst } from './particles.js';
import { sfx } from './audio.js';
import { dist } from './util.js';

export function spawnProjectile(state, from, target, opts) {
  state.projectiles.push({
    x: from.x,
    y: from.y,
    target,
    lastX: target.x,
    lastY: target.y,
    speed: opts.speed || 420,
    damage: opts.damage,
    kind: opts.kind, // 'spark' | 'frost' | 'ember'
    color: opts.color,
    splash: opts.splash || 0,
    slow: opts.slow || 0,
    slowTime: opts.slowTime || 0,
    size: opts.size || 5,
    source: opts.source || null,
    trail: 0,
  });
}

// Chain lightning: jumps from `from` through `targets` in order, damaging
// each. Beam segments fade in the renderer; damage is instant.
export function strikeChain(state, from, targets, damage, color, source) {
  let px = from.x;
  let py = from.y;
  for (const target of targets) {
    state.beams.push({ x1: px, y1: py, x2: target.x, y2: target.y, life: 0.16, maxLife: 0.16, color });
    spawnBurst(state, target.x, target.y, { count: 6, color, speed: 70, life: 0.3, size: 2.5 });
    damageEnemy(state, target, damage, source);
    px = target.x;
    py = target.y;
  }
  if (state.beams.length > 60) state.beams.splice(0, state.beams.length - 60);
}

function explode(state, p, x, y) {
  spawnBurst(state, x, y, { count: 18, color: '#ff6b35', speed: 150, life: 0.5, size: 4 });
  spawnBurst(state, x, y, { count: 8, color: '#ffd166', speed: 90, life: 0.35, size: 3 });
  sfx.explosion();
  if (p.splash > 0) {
    for (const e of state.enemies) {
      if (e.dead || e.leaked) continue;
      if (dist(x, y, e.x, e.y) <= p.splash + e.radius) damageEnemy(state, e, p.damage, p.source);
    }
  }
}

export function updateProjectiles(state, dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    const t = p.target;
    if (t && !t.dead && !t.leaked) {
      p.lastX = t.x;
      p.lastY = t.y;
    }
    const dx = p.lastX - p.x;
    const dy = p.lastY - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + 6) {
      // Arrived: direct hit if the target is still there, else ground impact.
      const hitTarget = t && !t.dead && !t.leaked && dist(p.lastX, p.lastY, t.x, t.y) <= t.radius + 10;
      if (p.kind === 'ember') {
        explode(state, p, p.lastX, p.lastY);
      } else if (hitTarget) {
        if (p.slow > 0) applySlow(t, p.slow, p.slowTime, state.time);
        damageEnemy(state, t, p.damage, p.source);
        spawnBurst(state, t.x, t.y, { count: 5, color: p.color, speed: 60, life: 0.3, size: 2.5 });
        sfx.hit();
      } else {
        spawnBurst(state, p.lastX, p.lastY, { count: 3, color: p.color, speed: 40, life: 0.25, size: 2 });
      }
      state.projectiles.splice(i, 1);
      continue;
    }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    p.trail += dt;
    if (p.trail > 0.03) {
      p.trail = 0;
      state.particles.push({
        x: p.x, y: p.y, vx: 0, vy: 0, life: 0.18, maxLife: 0.18,
        size: p.size * 0.45, color: p.color, gravity: 0,
      });
    }
  }
  for (let i = state.beams.length - 1; i >= 0; i--) {
    state.beams[i].life -= dt;
    if (state.beams[i].life <= 0) state.beams.splice(i, 1);
  }
}
