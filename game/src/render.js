// Rendering: the night battlefield, the road, the crystal, towers, enemies,
// projectiles and effects. All art is drawn in code — no images, no fonts
// loaded over the network. The sidebar, banners and screens live in ui.js.

import { VIEW_W, VIEW_H, FIELD_W, CELL, COLS, ROWS, PALETTE, TOWERS } from './config.js';
import { ROAD, ROAD_CELLS, CRYSTAL_POS, cellCenter, isRoadCell, isCrystalCell, cellAt } from './map.js';
import { mulberry32, clamp } from './util.js';
import { towerStats } from './towers.js';
import { drawParticles, drawEmberMotes } from './particles.js';

// Decorations are fixed per seed so the field looks the same every run.
let decor = null;
function getDecor() {
  if (decor) return decor;
  const rng = mulberry32(20261116);
  decor = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (isRoadCell(col, row) || isCrystalCell(col, row)) continue;
      const r = rng();
      if (r < 0.3) {
        decor.push({
          col, row,
          kind: r < 0.12 ? 'rock' : r < 0.2 ? 'tuft' : 'shard',
          dx: (rng() - 0.5) * 44, dy: (rng() - 0.5) * 44,
          s: 0.7 + rng() * 0.6, rot: rng() * Math.PI,
        });
      }
    }
  }
  return decor;
}

function drawBackground(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, PALETTE.bgTop);
  g.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stars in the sky strip above the field edge.
  const rng = mulberry32(77);
  for (let i = 0; i < 40; i++) {
    const x = rng() * FIELD_W;
    const y = rng() * 90;
    const tw = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(state.time * 1.5 + i));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#cdd6ff';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawTiles(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.tileA : PALETTE.tileB;
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
  }
}

function drawRoad(ctx, state) {
  const pts = ROAD.points;
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  };
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = PALETTE.pathEdge;
  ctx.lineWidth = 56;
  trace();
  ctx.stroke();
  ctx.strokeStyle = PALETTE.path;
  ctx.lineWidth = 46;
  trace();
  ctx.stroke();
  // Animated marching dashes down the middle of the road.
  ctx.strokeStyle = PALETTE.pathLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 22]);
  ctx.lineDashOffset = -state.time * 30;
  trace();
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDecor(ctx) {
  for (const d of getDecor()) {
    const c = cellCenter(d.col, d.row);
    const x = c.x + d.dx;
    const y = c.y + d.dy;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(d.rot);
    ctx.scale(d.s, d.s);
    if (d.kind === 'rock') {
      ctx.fillStyle = '#2a3358';
      ctx.beginPath();
      ctx.moveTo(-9, 5); ctx.lineTo(-5, -6); ctx.lineTo(4, -8); ctx.lineTo(9, 2); ctx.lineTo(5, 7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#39467a';
      ctx.beginPath();
      ctx.moveTo(-5, -6); ctx.lineTo(4, -8); ctx.lineTo(6, -2); ctx.lineTo(-2, -1);
      ctx.closePath(); ctx.fill();
    } else if (d.kind === 'tuft') {
      ctx.strokeStyle = '#3f6b4f';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 4, 6);
        ctx.quadraticCurveTo(i * 6, -4, i * 8, -9);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#4a5b9e';
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7f95d8';
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(2, 0); ctx.lineTo(0, 8); ctx.lineTo(-2, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

function drawCrystal(ctx, state) {
  const { x, y } = CRYSTAL_POS;
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 2.2);
  const flash = state.crystalFlash > 0 ? clamp(state.crystalFlash * 2, 0, 1) : 0;
  // Glow halo.
  const halo = ctx.createRadialGradient(x, y, 8, x, y, 66);
  halo.addColorStop(0, flash > 0 ? 'rgba(255,46,99,' + (0.5 + 0.3 * flash) + ')' : 'rgba(255,179,71,' + (0.35 + 0.2 * pulse) + ')');
  halo.addColorStop(1, 'rgba(255,179,71,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 66, 0, Math.PI * 2);
  ctx.fill();
  // Pedestal.
  ctx.fillStyle = '#232c52';
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e3a68';
  ctx.beginPath();
  ctx.ellipse(x, y + 19, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // The crystal itself: a faceted shard that breathes.
  const h = 34 + pulse * 4;
  const w = 17;
  ctx.save();
  ctx.translate(x, y + 14);
  ctx.fillStyle = '#ff9a3d';
  ctx.beginPath();
  ctx.moveTo(0, -h); ctx.lineTo(w, -8); ctx.lineTo(w * 0.55, 8); ctx.lineTo(-w * 0.55, 8); ctx.lineTo(-w, -8);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(0, -h); ctx.lineTo(w * 0.45, -8); ctx.lineTo(0, 8); ctx.lineTo(-w * 0.45, -8);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -h + 6); ctx.lineTo(4, -h + 20); ctx.lineTo(0, -h + 26); ctx.lineTo(-3, -h + 18);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.font = 'bold 11px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('EMBER CRYSTAL', x, y + 44);
}

// --- Towers ---------------------------------------------------------------

function drawTowerBody(ctx, tower, time) {
  const { x, y } = tower;
  const def = tower.def;
  const bob = Math.sin(time * 2 + tower.col + tower.row) * 1.5;
  // Stone base.
  ctx.fillStyle = '#232c52';
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e3a68';
  ctx.beginPath();
  ctx.ellipse(x, y + 17, 21, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  if (tower.key === 'spark') {
    ctx.fillStyle = '#3a4a80';
    ctx.beginPath();
    ctx.moveTo(-10, 16); ctx.lineTo(-5, -16); ctx.lineTo(5, -16); ctx.lineTo(10, 16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, -20 + bob * 0.4, 8 + (tower.flash > 0 ? 2 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.arc(0, -20 + bob * 0.4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.key === 'frost') {
    ctx.fillStyle = '#35507e';
    ctx.beginPath();
    ctx.moveTo(-9, 16); ctx.lineTo(-6, -10); ctx.lineTo(0, -26); ctx.lineTo(6, -10); ctx.lineTo(9, 16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(0, -30 + bob * 0.3); ctx.lineTo(5, -14); ctx.lineTo(0, 6); ctx.lineTo(-5, -14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.moveTo(0, -28 + bob * 0.3); ctx.lineTo(2, -14); ctx.lineTo(0, 2); ctx.lineTo(-2, -14);
    ctx.closePath(); ctx.fill();
  } else if (tower.key === 'ember') {
    ctx.fillStyle = '#4a2c3a';
    ctx.beginPath();
    ctx.arc(0, 6, 16, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-16, 6, 32, 10);
    // Barrel aims at the target.
    ctx.save();
    ctx.translate(0, 2);
    ctx.rotate(tower.angle);
    ctx.fillStyle = '#6b3a2a';
    ctx.fillRect(0, -5, 26, 10);
    ctx.fillStyle = '#8a4a32';
    ctx.fillRect(18, -6, 8, 12);
    if (tower.flash > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(30, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(-6, -2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else { // storm
    ctx.fillStyle = '#3a2c5e';
    ctx.fillRect(-7, -22, 14, 38);
    ctx.fillStyle = '#4e3a7e';
    ctx.fillRect(-4, -22, 8, 38);
    // Prongs.
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -22); ctx.lineTo(-10, -32);
    ctx.moveTo(0, -24); ctx.lineTo(0, -34);
    ctx.moveTo(6, -22); ctx.lineTo(10, -32);
    ctx.stroke();
    // Crackling orb.
    const flick = 0.6 + 0.4 * Math.sin(time * 9 + tower.col * 3);
    ctx.globalAlpha = flick;
    ctx.fillStyle = def.glow;
    ctx.beginPath();
    ctx.arc(0, -36, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Level pips.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i <= tower.level ? def.color : '#39446e';
    ctx.beginPath();
    ctx.arc(x - 10 + i * 10, y + 27, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Enemies --------------------------------------------------------------

function drawEnemyBody(ctx, e, time) {
  const bob = Math.sin(time * 6 + e.wobble) * 2;
  const squash = 1 + 0.06 * Math.sin(time * 8 + e.wobble);
  ctx.save();
  ctx.translate(e.x, e.y + bob * 0.4);
  ctx.scale(1, squash);
  const c = e.def.color;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, e.radius * 0.8, e.radius * 0.9, e.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  if (e.type === 'skitter') {
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      const wig = Math.sin(time * 14 + e.wobble + i) * 3;
      ctx.beginPath();
      ctx.moveTo(i * 6, 0); ctx.lineTo(i * 9 + wig, e.radius);
      ctx.stroke();
    }
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, -e.radius); ctx.lineTo(e.radius, e.radius * 0.7); ctx.lineTo(-e.radius, e.radius * 0.7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a0d1d';
    ctx.beginPath(); ctx.arc(-4, -3, 2.4, 0, Math.PI * 2); ctx.arc(4, -3, 2.4, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'husk') {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a5a22';
    ctx.beginPath();
    ctx.arc(-5, -5, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5e3c14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 6); ctx.lineTo(-2, 1); ctx.lineTo(3, 7); ctx.lineTo(9, 2);
    ctx.stroke();
    ctx.fillStyle = '#0a0d1d';
    ctx.beginPath(); ctx.arc(-5, -2, 2.6, 0, Math.PI * 2); ctx.arc(6, -2, 2.6, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'wisp') {
    ctx.globalAlpha = 0.85;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, e.radius + 8);
    glow.addColorStop(0, '#e8fbff');
    glow.addColorStop(0.5, c);
    glow.addColorStop(1, 'rgba(123,223,242,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'golem') {
    ctx.fillStyle = '#8f8fa8';
    ctx.beginPath();
    ctx.moveTo(-e.radius, e.radius * 0.7); ctx.lineTo(-e.radius * 0.7, -e.radius * 0.8);
    ctx.lineTo(0, -e.radius); ctx.lineTo(e.radius * 0.8, -e.radius * 0.6);
    ctx.lineTo(e.radius, e.radius * 0.7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.6, e.radius * 0.4); ctx.lineTo(-e.radius * 0.4, -e.radius * 0.5);
    ctx.lineTo(e.radius * 0.3, -e.radius * 0.6); ctx.lineTo(e.radius * 0.6, e.radius * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(-5, -4, 3, 0, Math.PI * 2); ctx.arc(6, -4, 3, 0, Math.PI * 2); ctx.fill();
  } else { // brute and boss: horned brutes, boss bigger with a crown
    const big = e.type === 'boss';
    ctx.fillStyle = big ? '#8f1030' : '#7a2c4a';
    ctx.beginPath();
    ctx.moveTo(-e.radius, e.radius * 0.8); ctx.lineTo(-e.radius * 0.8, -e.radius * 0.4);
    ctx.lineTo(0, -e.radius * 0.9); ctx.lineTo(e.radius * 0.8, -e.radius * 0.4);
    ctx.lineTo(e.radius, e.radius * 0.8);
    ctx.closePath(); ctx.fill();
    // Horns.
    ctx.fillStyle = '#f5e9d0';
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.7, -e.radius * 0.4); ctx.lineTo(-e.radius * 1.15, -e.radius * 1.05); ctx.lineTo(-e.radius * 0.4, -e.radius * 0.7);
    ctx.closePath();
    ctx.moveTo(e.radius * 0.7, -e.radius * 0.4); ctx.lineTo(e.radius * 1.15, -e.radius * 1.05); ctx.lineTo(e.radius * 0.4, -e.radius * 0.7);
    ctx.closePath(); ctx.fill();
    if (big) {
      ctx.fillStyle = '#ffd166';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 10 - 4, -e.radius * 0.85); ctx.lineTo(i * 10, -e.radius * 1.25); ctx.lineTo(i * 10 + 4, -e.radius * 0.85);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(-6, -2, 3.2, 0, Math.PI * 2); ctx.arc(6, -2, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0d1d';
    ctx.beginPath(); ctx.arc(-6, -2, 1.5, 0, Math.PI * 2); ctx.arc(6, -2, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // Hit flash and slow tint.
  if (e.flash > 0) {
    ctx.globalAlpha = clamp(e.flash * 8, 0, 0.8);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (e.slowFactor > 0) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#aee9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Health bar.
  if (e.hp < e.maxHp) {
    const w = e.radius * 2;
    const ratio = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(5,8,18,0.8)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = ratio > 0.5 ? '#8aff80' : ratio > 0.25 ? '#ffd166' : '#ff5d5d';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * ratio, 5);
  }
}

// --- Projectiles, beams, ghost --------------------------------------------

function drawProjectiles(ctx, state) {
  for (const p of state.projectiles) {
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size * 2.4);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.35, p.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of state.beams) {
    const a = clamp(b.life / b.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    const mx = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 14;
    const my = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 14;
    ctx.lineTo(mx, my);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = a * 0.5;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(mx, my);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawRangeRing(ctx, x, y, range, color) {
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawBuildGhost(ctx, state) {
  if (!state.buildType || state.mouse.x >= FIELD_W) return;
  const { col, row } = cellAt(state.mouse.x, state.mouse.y);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  const def = TOWERS[state.buildType];
  const c = cellCenter(col, row);
  const ok = state.ghostOk;
  drawRangeRing(ctx, c.x, c.y, def.stats[0].range, def.color);
  ctx.fillStyle = ok ? 'rgba(138,255,128,0.25)' : 'rgba(255,93,93,0.3)';
  ctx.fillRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
  ctx.globalAlpha = 0.75;
  drawTowerBody(ctx, { key: state.buildType, def, level: 0, col, row, x: c.x, y: c.y, angle: -Math.PI / 2, flash: 0 }, state.time);
  ctx.globalAlpha = 1;
}

// --- Main field draw ------------------------------------------------------

export function drawField(ctx, state) {
  drawBackground(ctx, state);
  drawTiles(ctx);
  drawRoad(ctx, state);
  drawDecor(ctx);
  drawCrystal(ctx, state);
  // Range ring under everything else when a tower is selected.
  if (state.selected && state.mode === 'playing') {
    const stats = towerStats(state.selected);
    drawRangeRing(ctx, state.selected.x, state.selected.y, stats.range, state.selected.def.color);
  }
  drawBuildGhost(ctx, state);
  for (const t of state.towers) drawTowerBody(ctx, t, state.time);
  // Enemies sorted so lower ones overlap upper ones naturally.
  const sorted = state.enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of sorted) drawEnemyBody(ctx, e, state.time);
  drawProjectiles(ctx, state);
  drawParticles(ctx, state);
  drawEmberMotes(ctx, state.time, FIELD_W, VIEW_H, 1234);
}
