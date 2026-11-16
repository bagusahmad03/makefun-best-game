// Particles, floating combat text, and screen shake. Pure feedback: nothing
// here affects gameplay, so it can be tuned freely without touching logic.

import { clamp } from './util.js';

export function spawnBurst(state, x, y, opts) {
  const o = opts || {};
  const count = o.count || 10;
  const color = o.color || '#ffd166';
  const speed = o.speed || 90;
  const size = o.size || 3;
  const life = o.life || 0.5;
  const gravity = o.gravity || 0;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.9);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: life * (0.6 + Math.random() * 0.7),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
      color,
      gravity,
    });
  }
  if (state.particles.length > 600) state.particles.splice(0, state.particles.length - 600);
}

export function spawnFloat(state, x, y, text, color, size) {
  state.floats.push({ x, y, text, color: color || '#ffffff', size: size || 15, life: 1.0, maxLife: 1.0 });
  if (state.floats.length > 40) state.floats.shift();
}

export function addShake(state, amount) {
  state.shake = Math.min(16, state.shake + amount);
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
  }
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) state.floats.splice(i, 1);
  }
  state.shake = Math.max(0, state.shake - 30 * dt);
}

export function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * a), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of state.floats) {
    const a = clamp(f.life / f.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = 'bold ' + f.size + 'px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,8,18,0.85)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// Ambient ember motes drifting up over the field. Seeded per frame-time so
// the title screen always looks alive without storing mote state.
export function drawEmberMotes(ctx, time, width, height, rngSeed) {
  let seed = rngSeed;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 26; i++) {
    const bx = rand() * width;
    const speed = 12 + rand() * 22;
    const sway = 14 + rand() * 20;
    const y = height - ((time * speed + rand() * height) % (height + 40)) + 20;
    const x = bx + Math.sin(time * 0.7 + i * 1.7) * sway * 0.4;
    const tw = 0.35 + 0.35 * Math.sin(time * 2 + i * 2.3);
    ctx.globalAlpha = Math.max(0.05, tw);
    ctx.fillStyle = i % 3 === 0 ? '#7bdff2' : '#ffb347';
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + rand() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
