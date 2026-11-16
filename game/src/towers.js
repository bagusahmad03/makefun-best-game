// Towers: placement, upgrades, selling, targeting and firing. A tower is a
// plain object on the state; its behaviour comes from its config definition
// plus its level. Targeting always picks the enemy furthest along the road.

import { TOWERS, SELL_REFUND } from './config.js';
import { cellCenter, isBuildable } from './map.js';
import { pickTarget } from './enemies.js';
import { spawnProjectile, strikeChain } from './projectiles.js';
import { spawnBurst, spawnFloat } from './particles.js';
import { sfx } from './audio.js';
import { dist } from './util.js';

export function towerStats(tower) {
  return tower.def.stats[tower.level];
}

export function upgradeCost(tower) {
  if (tower.level >= tower.def.stats.length - 1) return null;
  return tower.def.stats[tower.level + 1].cost;
}

export function sellValue(tower) {
  return Math.floor(tower.invested * SELL_REFUND);
}

export function placeTower(state, key, col, row) {
  const def = TOWERS[key];
  if (!def) return { ok: false, reason: 'Unknown tower.' };
  if (!isBuildable(state, col, row)) return { ok: false, reason: 'Cannot build there.' };
  if (state.gold < def.cost) return { ok: false, reason: 'Not enough gold.' };
  const pos = cellCenter(col, row);
  state.gold -= def.cost;
  const tower = {
    key, def, level: 0, col, row,
    x: pos.x, y: pos.y,
    cooldown: 0,
    invested: def.cost,
    kills: 0,
    angle: -Math.PI / 2,
    flash: 0,
    born: state.time,
  };
  state.towers.push(tower);
  spawnBurst(state, pos.x, pos.y, { count: 12, color: def.color, speed: 80, life: 0.4 });
  sfx.place();
  return { ok: true, tower };
}

export function upgradeTower(state, tower) {
  const cost = upgradeCost(tower);
  if (cost === null) return { ok: false, reason: 'Fully upgraded.' };
  if (state.gold < cost) return { ok: false, reason: 'Not enough gold.' };
  state.gold -= cost;
  tower.invested += cost;
  tower.level++;
  spawnBurst(state, tower.x, tower.y, { count: 20, color: '#ffffff', speed: 110, life: 0.5 });
  spawnFloat(state, tower.x, tower.y - 30, 'LEVEL ' + (tower.level + 1), '#ffffff', 15);
  sfx.upgrade();
  return { ok: true };
}

export function sellTower(state, tower) {
  const value = sellValue(tower);
  state.gold += value;
  spawnFloat(state, tower.x, tower.y - 30, '+' + value, '#ffd166', 16);
  spawnBurst(state, tower.x, tower.y, { count: 10, color: '#9aa5c8', speed: 70, life: 0.4 });
  sfx.sell();
  state.towers.splice(state.towers.indexOf(tower), 1);
  if (state.selected === tower) state.selected = null;
  return value;
}

function fireSparkOrFrost(state, tower, stats, target) {
  const kind = tower.key;
  spawnProjectile(state, { x: tower.x, y: tower.y - 18 }, target, {
    kind,
    damage: stats.damage,
    color: tower.def.color,
    speed: kind === 'frost' ? 340 : 460,
    slow: stats.slow || 0,
    slowTime: stats.slowTime || 0,
    size: kind === 'frost' ? 6 : 5,
    source: tower,
  });
  sfx.shoot(kind);
}

function fireEmber(state, tower, stats, target) {
  spawnProjectile(state, { x: tower.x, y: tower.y - 20 }, target, {
    kind: 'ember',
    damage: stats.damage,
    color: tower.def.color,
    speed: 300,
    splash: stats.splash,
    size: 7,
    source: tower,
  });
  sfx.shoot('ember');
}

function fireStorm(state, tower, stats, target) {
  const chained = [target];
  let from = target;
  const range = stats.range;
  while (chained.length < stats.chains) {
    let next = null;
    let nextD = Infinity;
    for (const e of state.enemies) {
      if (e.dead || e.leaked || chained.includes(e)) continue;
      const d = dist(from.x, from.y, e.x, e.y);
      if (d <= 130 && d < nextD) { next = e; nextD = d; }
    }
    if (!next) break;
    if (dist(tower.x, tower.y, next.x, next.y) > range + 130) break;
    chained.push(next);
    from = next;
  }
  strikeChain(state, { x: tower.x, y: tower.y - 22 }, chained, stats.damage, tower.def.color, tower);
  sfx.shoot('storm');
}

export function updateTowers(state, dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    tower.flash = Math.max(0, tower.flash - dt);
    const stats = towerStats(tower);
    const target = pickTarget(state.enemies, tower.x, tower.y, stats.range);
    if (target) {
      tower.angle = Math.atan2(target.y - (tower.y - 18), target.x - tower.x);
      if (tower.cooldown <= 0) {
        tower.cooldown = 1 / stats.rate;
        tower.flash = 0.08;
        if (tower.key === 'ember') fireEmber(state, tower, stats, target);
        else if (tower.key === 'storm') fireStorm(state, tower, stats, target);
        else fireSparkOrFrost(state, tower, stats, target);
      }
    }
  }
}
