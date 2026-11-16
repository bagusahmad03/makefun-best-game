// Enemies: spawning, movement along the road, slows, damage and death. An
// enemy's progress is its distance along the road; towers target the enemy
// furthest along. Visuals live in render.js; this file is logic only.

import { ENEMIES, hpMultiplier } from './config.js';
import { ROAD, roadPosition } from './map.js';
import { spawnBurst, spawnFloat, addShake } from './particles.js';
import { sfx } from './audio.js';

let nextId = 1;

export function spawnEnemy(state, typeKey, wave) {
  const def = ENEMIES[typeKey];
  const hp = Math.round(def.hp * hpMultiplier(wave));
  const enemy = {
    id: nextId++,
    type: typeKey,
    def,
    name: def.name,
    hp,
    maxHp: hp,
    speed: def.speed,
    reward: def.reward,
    leak: def.leak,
    radius: def.radius,
    slowResist: def.slowResist,
    dist: 0,
    x: 0, y: 0, angle: 0,
    slowFactor: 0, // fraction of speed removed, 0..1
    slowUntil: 0,
    wobble: Math.random() * Math.PI * 2,
    flash: 0,
    dead: false,
    leaked: false,
  };
  const pos = roadPosition(0);
  enemy.x = pos.x;
  enemy.y = pos.y;
  enemy.angle = pos.angle;
  state.enemies.push(enemy);
  return enemy;
}

export function applySlow(enemy, factor, duration, now) {
  const effective = factor * (1 - enemy.slowResist);
  if (effective > enemy.slowFactor) enemy.slowFactor = effective;
  enemy.slowUntil = Math.max(enemy.slowUntil, now + duration);
}

export function damageEnemy(state, enemy, amount, source) {
  if (enemy.dead || enemy.leaked) return;
  enemy.hp -= amount;
  enemy.flash = 0.09;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    if (source && typeof source.kills === 'number') source.kills++;
    state.kills++;
    state.gold += enemy.reward;
    state.goldEarned += enemy.reward;
    state.score += enemy.reward * 10;
    spawnBurst(state, enemy.x, enemy.y, { count: 14, color: enemy.def.color, speed: 110, life: 0.55 });
    spawnFloat(state, enemy.x, enemy.y - 16, '+' + enemy.reward, '#ffd166', 15);
    sfx.enemyDown();
    if (enemy.type === 'boss' || enemy.type === 'brute') {
      addShake(state, 7);
      spawnBurst(state, enemy.x, enemy.y, { count: 30, color: '#ffffff', speed: 170, life: 0.7 });
    }
  }
}

export function updateEnemies(state, dt) {
  const now = state.time;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.dead) { state.enemies.splice(i, 1); continue; }
    if (now > e.slowUntil) e.slowFactor = 0;
    e.flash = Math.max(0, e.flash - dt);
    const speed = e.speed * (1 - e.slowFactor);
    e.dist += speed * dt;
    if (e.dist >= ROAD.total) {
      e.leaked = true;
      state.enemies.splice(i, 1);
      state.lives -= e.leak;
      state.leaked += e.leak;
      state.crystalFlash = 0.6;
      addShake(state, 6 + e.leak);
      spawnBurst(state, e.x, e.y, { count: 20, color: '#ff2e63', speed: 140, life: 0.6 });
      spawnFloat(state, e.x, e.y - 20, '-' + e.leak + (e.leak > 1 ? ' lives' : ' life'), '#ff6b81', 17);
      sfx.leak();
      if (state.lives <= 0) {
        state.lives = 0;
        state.mode = 'defeat';
        sfx.defeat();
      }
      continue;
    }
    const pos = roadPosition(e.dist);
    e.x = pos.x;
    e.y = pos.y;
    e.angle = pos.angle;
  }
}

// The enemy furthest along the road within range of (x, y), or null.
export function pickTarget(enemies, x, y, range) {
  let best = null;
  let bestDist = -1;
  const r2 = range * range;
  for (const e of enemies) {
    if (e.dead || e.leaked) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy <= r2 && e.dist > bestDist) {
      best = e;
      bestDist = e.dist;
    }
  }
  return best;
}
