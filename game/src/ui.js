// Interface: the sidebar (resources, build cards, selected tower, wave
// controls), the wave banner, and the title / pause / victory / defeat
// screens. Layout rects are computed by one pure function so drawing and
// click hit-testing always agree.

import { VIEW_W, VIEW_H, FIELD_W, SIDEBAR_X, SIDEBAR_W, TOWERS, TOWER_ORDER, MAX_WAVES, START_LIVES } from './config.js';
import { PALETTE } from './config.js';
import { towerStats, upgradeCost, sellValue } from './towers.js';
import { waveSummary } from './waves.js';
import { fmt, clamp } from './util.js';

const CARD_H = 58;
const CARD_GAP = 6;

export function layoutUI(state) {
  const x = SIDEBAR_X + 12;
  const w = SIDEBAR_W - 24;
  const L = {};
  let y = 106;
  L.cards = TOWER_ORDER.map((key, i) => ({
    key,
    rect: { x, y: y + i * (CARD_H + CARD_GAP), w, h: CARD_H },
  }));
  const afterCards = y + TOWER_ORDER.length * (CARD_H + CARD_GAP) + 4;
  L.info = { x, y: afterCards, w, h: 118 };
  L.upgradeBtn = { x, y: afterCards + 84, w: (w - 8) / 2, h: 30 };
  L.sellBtn = { x: x + (w - 8) / 2 + 8, y: afterCards + 84, w: (w - 8) / 2, h: 30 };
  L.waveBtn = { x, y: afterCards + 132, w, h: 44 };
  const bw = (w - 16) / 3;
  L.speedBtn = { x, y: afterCards + 186, w: bw, h: 32 };
  L.pauseBtn = { x: x + bw + 8, y: afterCards + 186, w: bw, h: 32 };
  L.muteBtn = { x: x + 2 * (bw + 8), y: afterCards + 186, w: bw, h: 32 };
  L.startBtn = { x: VIEW_W / 2 - 130, y: 468, w: 260, h: 54 };
  L.againBtn = { x: VIEW_W / 2 - 130, y: 512, w: 260, h: 54 };
  return L;
}

function inRect(px, py, r) {
  return r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Returns an action descriptor for a click at (x, y), or null.
export function hitTest(state, x, y) {
  const L = layoutUI(state);
  if (state.mode === 'title' && inRect(x, y, L.startBtn)) return { kind: 'start' };
  if ((state.mode === 'victory' || state.mode === 'defeat') && inRect(x, y, L.againBtn)) return { kind: 'restart' };
  if (state.mode !== 'playing' && state.mode !== 'paused') return null;
  if (x < FIELD_W) {
    return { kind: 'field', x, y };
  }
  for (const c of L.cards) {
    if (inRect(x, y, c.rect)) return { kind: 'card', key: c.key };
  }
  if (state.selected) {
    if (inRect(x, y, L.upgradeBtn)) return { kind: 'upgrade' };
    if (inRect(x, y, L.sellBtn)) return { kind: 'sell' };
  }
  if (inRect(x, y, L.waveBtn)) return { kind: 'wave' };
  if (inRect(x, y, L.speedBtn)) return { kind: 'speed' };
  if (inRect(x, y, L.pauseBtn)) return { kind: 'pause' };
  if (inRect(x, y, L.muteBtn)) return { kind: 'mute' };
  return null;
}

function panel(ctx, r, fill) {
  ctx.fillStyle = fill || PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.stroke();
}

function button(ctx, r, label, opts) {
  const o = opts || {};
  const hover = o.hover;
  ctx.fillStyle = o.disabled ? '#232a47' : hover ? o.hoverFill || '#3a4a80' : o.fill || '#2c3a67';
  ctx.strokeStyle = o.edge || PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = o.disabled ? '#6a7396' : o.text || PALETTE.text;
  ctx.font = 'bold ' + (o.font || 15) + 'px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawTowerIcon(ctx, def, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#232c52';
  ctx.beginPath();
  ctx.ellipse(0, 14, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (def.key === 'spark') {
    ctx.fillStyle = '#3a4a80';
    ctx.beginPath();
    ctx.moveTo(-7, 12); ctx.lineTo(-3, -10); ctx.lineTo(3, -10); ctx.lineTo(7, 12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(0, -14, 6, 0, Math.PI * 2); ctx.fill();
  } else if (def.key === 'frost') {
    ctx.fillStyle = '#35507e';
    ctx.beginPath();
    ctx.moveTo(-6, 12); ctx.lineTo(0, -18); ctx.lineTo(6, 12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(3.5, -8); ctx.lineTo(0, 6); ctx.lineTo(-3.5, -8);
    ctx.closePath(); ctx.fill();
  } else if (def.key === 'ember') {
    ctx.fillStyle = '#4a2c3a';
    ctx.beginPath(); ctx.arc(0, 4, 12, Math.PI, 0); ctx.fill();
    ctx.fillRect(-12, 4, 24, 8);
    ctx.fillStyle = '#6b3a2a';
    ctx.fillRect(2, -2, 16, 7);
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(-4, -2, 3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#3a2c5e';
    ctx.fillRect(-5, -14, 10, 26);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -14); ctx.lineTo(-7, -20);
    ctx.moveTo(0, -15); ctx.lineTo(0, -22);
    ctx.moveTo(4, -14); ctx.lineTo(7, -20);
    ctx.stroke();
    ctx.fillStyle = def.glow;
    ctx.beginPath(); ctx.arc(0, -24, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawSidebar(ctx, state) {
  const L = layoutUI(state);
  ctx.fillStyle = PALETTE.sidebar;
  ctx.fillRect(FIELD_W, 0, SIDEBAR_W, VIEW_H);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(FIELD_W, 0, 2, VIEW_H);

  // Header: title + wave pips.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 22px Verdana, sans-serif';
  ctx.fillText('EMBERHOLD', SIDEBAR_X + 14, 30);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '12px Verdana, sans-serif';
  ctx.fillText('Wave ' + Math.max(1, state.wave) + ' / ' + MAX_WAVES + (state.waveActive ? '  —  fighting' : '  —  build phase'), SIDEBAR_X + 14, 50);

  // Resources.
  const rx = SIDEBAR_X + 14;
  ctx.font = 'bold 15px Verdana, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('◉ ' + fmt(state.gold), rx, 78);
  ctx.fillStyle = PALETTE.lives;
  ctx.fillText('♥ ' + state.lives, rx + 110, 78);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('★ ' + fmt(state.score), rx + 190, 78);

  // Build cards.
  ctx.fillStyle = PALETTE.dim;
  ctx.font = 'bold 11px Verdana, sans-serif';
  ctx.fillText('BUILD  (click a card, then click the field)', SIDEBAR_X + 14, 100);
  for (const c of L.cards) {
    const def = TOWERS[c.key];
    const afford = state.gold >= def.cost;
    const selected = state.buildType === c.key;
    panel(ctx, c.rect, selected ? '#2b3a6e' : afford ? PALETTE.panel : '#161c36');
    if (selected) {
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(c.rect.x, c.rect.y, c.rect.w, c.rect.h, 8);
      ctx.stroke();
    }
    drawTowerIcon(ctx, def, c.rect.x + 34, c.rect.y + 29, 1.0);
    ctx.textAlign = 'left';
    ctx.fillStyle = afford ? PALETTE.text : '#6a7396';
    ctx.font = 'bold 14px Verdana, sans-serif';
    ctx.fillText(def.name, c.rect.x + 62, c.rect.y + 20);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '11px Verdana, sans-serif';
    ctx.fillText(def.desc, c.rect.x + 62, c.rect.y + 36);
    ctx.fillStyle = afford ? PALETTE.gold : '#6a7396';
    ctx.font = 'bold 13px Verdana, sans-serif';
    ctx.fillText('◉ ' + def.cost, c.rect.x + 62, c.rect.y + 52);
    ctx.fillStyle = '#5a6488';
    ctx.font = '11px Verdana, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('[' + def.hotkey + ']', c.rect.x + c.rect.w - 10, c.rect.y + 20);
    ctx.textAlign = 'left';
  }

  // Selected tower info, or the next-wave preview.
  panel(ctx, L.info);
  if (state.selected) {
    const t = state.selected;
    const stats = towerStats(t);
    const cost = upgradeCost(t);
    ctx.fillStyle = t.def.color;
    ctx.font = 'bold 14px Verdana, sans-serif';
    ctx.fillText(t.def.name + '  ·  Level ' + (t.level + 1), L.info.x + 12, L.info.y + 22);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '12px Verdana, sans-serif';
    let line = 'Damage ' + stats.damage + '   ·   ' + stats.rate.toFixed(1) + '/s   ·   Range ' + stats.range;
    if (stats.splash) line += '   ·   Splash ' + stats.splash;
    if (stats.slow) line += '   ·   Slow ' + Math.round(stats.slow * 100) + '%';
    if (stats.chains) line += '   ·   Chains ' + stats.chains;
    ctx.fillText(line, L.info.x + 12, L.info.y + 42);
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('Kills here: ' + (t.kills || 0) + '    Invested: ◉ ' + t.invested, L.info.x + 12, L.info.y + 60);
    button(ctx, L.upgradeBtn, cost === null ? 'MAX LEVEL' : 'Upgrade ◉ ' + cost, {
      disabled: cost === null || state.gold < cost,
      fill: '#3a5a2e', hoverFill: '#4a7038', hover: state.hover === 'upgrade',
    });
    button(ctx, L.sellBtn, 'Sell ◉ ' + sellValue(t), {
      fill: '#5e2e2e', hoverFill: '#753838', hover: state.hover === 'sell',
    });
  } else {
    ctx.fillStyle = PALETTE.dim;
    ctx.font = 'bold 11px Verdana, sans-serif';
    ctx.fillText(state.wave >= MAX_WAVES ? 'ALL WAVES SENT' : 'NEXT WAVE', L.info.x + 12, L.info.y + 22);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '12px Verdana, sans-serif';
    const lines = state.wave >= MAX_WAVES
      ? ['Hold the line until', 'the road is clear.']
      : ['Wave ' + (state.wave + 1) + ': ' + waveSummary(state.wave + 1), 'Click a tower on the field', 'to upgrade or sell it.'];
    lines.forEach((ln, i) => ctx.fillText(ln, L.info.x + 12, L.info.y + 44 + i * 18));
  }

  // Wave button.
  if (state.waveActive) {
    button(ctx, L.waveBtn, 'WAVE ' + state.wave + ' — ' + state.enemies.length + ' LEFT', { disabled: true });
  } else if (state.wave >= MAX_WAVES) {
    button(ctx, L.waveBtn, 'FINAL WAVE DONE', { disabled: true });
  } else {
    const early = state.enemies.length === 0 && state.wave > 0;
    button(ctx, L.waveBtn, '▶  START WAVE ' + (state.wave + 1) + (early ? '  (+bonus)' : ''), {
      fill: '#8a5a1e', hoverFill: '#a86e22', hover: state.hover === 'wave', font: 16,
    });
  }

  button(ctx, L.speedBtn, state.speed === 2 ? '⏩ 2x' : '▶ 1x', { hover: state.hover === 'speed' });
  button(ctx, L.pauseBtn, state.mode === 'paused' ? 'Resume' : 'Pause', { hover: state.hover === 'pause' });
  button(ctx, L.muteBtn, state.muted ? 'Muted' : 'Sound', { hover: state.hover === 'mute' });

  // Help footer.
  ctx.fillStyle = '#5a6488';
  ctx.font = '11px Verdana, sans-serif';
  const helpY = L.muteBtn.y + 52;
  ctx.fillText('1-4 select tower · Space: wave / pause', SIDEBAR_X + 14, helpY);
  ctx.fillText('F speed · M sound · Esc cancel · R restart', SIDEBAR_X + 14, helpY + 16);
  ctx.fillText('Defend the Ember Crystal for 15 waves.', SIDEBAR_X + 14, helpY + 32);
  if (state.message) {
    ctx.fillStyle = '#ff9a9a';
    ctx.font = 'bold 12px Verdana, sans-serif';
    ctx.fillText(state.message, SIDEBAR_X + 14, helpY + 52);
  }
}

export function drawBanner(ctx, state) {
  if (!state.banner || state.time > state.banner.until) return;
  const remain = state.banner.until - state.time;
  const alpha = clamp(remain / 0.5, 0, 1) * clamp((2.6 - remain) / 0.25 + 0.2, 0, 1);
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px Verdana, sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(5,8,18,0.9)';
  ctx.strokeText(state.banner.title, FIELD_W / 2, 150);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(state.banner.title, FIELD_W / 2, 150);
  ctx.font = '15px Verdana, sans-serif';
  ctx.strokeStyle = 'rgba(5,8,18,0.9)';
  ctx.lineWidth = 4;
  ctx.strokeText(state.banner.sub, FIELD_W / 2, 178);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(state.banner.sub, FIELD_W / 2, 178);
  ctx.restore();
}

function dimScreen(ctx, alpha) {
  ctx.fillStyle = 'rgba(6,8,18,' + alpha + ')';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centerPanel(ctx, w, h) {
  const x = VIEW_W / 2 - w / 2;
  const y = VIEW_H / 2 - h / 2;
  ctx.fillStyle = 'rgba(16,21,43,0.96)';
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  return { x, y, w, h };
}

export function drawTitle(ctx, state) {
  dimScreen(ctx, 0.45);
  ctx.textAlign = 'center';
  // Title with ember glow.
  ctx.save();
  ctx.shadowColor = '#ff9a3d';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 72px Verdana, sans-serif';
  ctx.fillText('EMBERHOLD', VIEW_W / 2, 170);
  ctx.restore();
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px Verdana, sans-serif';
  ctx.fillText('The Gloom is coming for the Ember Crystal. Hold the road.', VIEW_W / 2, 208);
  const p = centerPanel(ctx, 520, 168);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '15px Verdana, sans-serif';
  const lines = [
    'Build towers beside the road. Four kinds, three levels each.',
    'Enemies follow the road to the crystal. Stop all 15 waves.',
    'Earn gold for every kill. Call waves early for bonus gold.',
    'Frost slows, Ember splashes, Storm chains lightning.',
  ];
  lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, p.y + 38 + i * 30));
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillText('Mouse to build · 1-4 tower keys · Space starts a wave', VIEW_W / 2, p.y + 38 + 4 * 30);
  const L = layoutUI(state);
  button(ctx, L.startBtn, '▶  DEFEND THE CRYSTAL', {
    fill: '#8a5a1e', hoverFill: '#a86e22', hover: state.hover === 'start', font: 18,
  });
  if (state.bestScore > 0) {
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px Verdana, sans-serif';
    ctx.fillText('Best score: ' + fmt(state.bestScore), VIEW_W / 2, L.startBtn.y + 82);
  }
}

export function drawPaused(ctx, state) {
  dimScreen(ctx, 0.55);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 48px Verdana, sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '16px Verdana, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Press Space or P to resume · R to restart', VIEW_W / 2, VIEW_H / 2 + 26);
}

function drawEndScreen(ctx, state, won) {
  dimScreen(ctx, 0.6);
  const p = centerPanel(ctx, 560, 300);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.gold : '#ff6b81';
  ctx.font = 'bold 46px Verdana, sans-serif';
  ctx.fillText(won ? 'THE CRYSTAL HOLDS!' : 'THE CRYSTAL FALLS', VIEW_W / 2, p.y + 62);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px Verdana, sans-serif';
  ctx.fillText(
    won ? 'All 15 waves broken. The Gloom retreats into the dark.'
      : 'The Gloom reached the Ember Crystal on wave ' + Math.max(1, state.wave) + '.',
    VIEW_W / 2, p.y + 94);
  const rows = [
    ['Final score', fmt(state.score)],
    ['Enemies destroyed', fmt(state.kills)],
    ['Gold earned', fmt(state.goldEarned)],
    ['Lives remaining', state.lives + ' / ' + START_LIVES],
    ['Waves survived', (won ? MAX_WAVES : Math.max(0, state.wave - (state.waveActive ? 1 : 0))) + ' / ' + MAX_WAVES],
  ];
  ctx.font = '15px Verdana, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = p.y + 130 + i * 26;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(label, VIEW_W / 2 - 16, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, VIEW_W / 2 + 16, y);
  });
  ctx.textAlign = 'center';
  const L = layoutUI(state);
  button(ctx, L.againBtn, won ? '↻  PLAY AGAIN' : '↻  TRY AGAIN', {
    fill: '#8a5a1e', hoverFill: '#a86e22', hover: state.hover === 'restart', font: 18,
  });
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillText('or press R', VIEW_W / 2, L.againBtn.y + 78);
}

export function drawVictory(ctx, state) {
  drawEndScreen(ctx, state, true);
}

export function drawDefeat(ctx, state) {
  drawEndScreen(ctx, state, false);
}
