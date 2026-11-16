// Emberhold — entry point. Owns the game state, the fixed-step loop, and the
// actions the input layer calls. Modules do the work; this file wires them.

import { VIEW_W, VIEW_H, START_GOLD, START_LIVES, TOWERS } from './config.js';
import { drawField } from './render.js';
import { drawSidebar, drawBanner, drawTitle, drawPaused, drawVictory, drawDefeat } from './ui.js';
import { attachInput } from './input.js';
import { updateTowers, upgradeTower, sellTower } from './towers.js';
import { updateEnemies } from './enemies.js';
import { updateProjectiles } from './projectiles.js';
import { updateParticles } from './particles.js';
import { updateWaves, startWave, setBanner } from './waves.js';
import { applyShot } from './shots.js';
import { runSelfTest } from './selftest.js';
import { setMuted, isMuted, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function loadBest() {
  try {
    return Number(window.localStorage.getItem('emberhold-best') || 0) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem('emberhold-best', String(score));
  } catch (err) { /* storage is a nicety, never load-bearing */ }
}

function freshState() {
  return {
    mode: 'title',
    time: 0,
    gold: START_GOLD,
    lives: START_LIVES,
    score: 0,
    wave: 0,
    waveActive: false,
    spawnQueue: [],
    spawnElapsed: 0,
    kills: 0,
    leaked: 0,
    goldEarned: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    beams: [],
    particles: [],
    floats: [],
    selected: null,
    buildType: null,
    ghostOk: false,
    mouse: { x: -100, y: -100 },
    hover: null,
    speed: 1,
    muted: isMuted(),
    shake: 0,
    banner: null,
    message: '',
    messageUntil: 0,
    crystalFlash: 0,
    bestScore: loadBest(),
    scored: false,
  };
}

const state = freshState();
window.__emberhold = state;

const actions = {
  startGame() {
    const keep = { bestScore: state.bestScore, muted: state.muted, speed: state.speed };
    Object.assign(state, freshState(), keep);
    state.mode = 'playing';
    setBanner(state, 'DEFEND THE CRYSTAL', 'Build towers, then start wave 1.', 2.6);
    sfx.waveStart();
  },
  restart() {
    actions.startGame();
  },
  togglePause() {
    if (state.mode === 'playing') { state.mode = 'paused'; sfx.click(); }
    else if (state.mode === 'paused') { state.mode = 'playing'; sfx.click(); }
  },
  cycleSpeed() {
    state.speed = state.speed === 1 ? 2 : 1;
    sfx.click();
  },
  toggleMute() {
    setMuted(!isMuted());
    state.muted = isMuted();
    sfx.click();
  },
  startWave() {
    startWave(state);
  },
  upgradeSelected() {
    if (!state.selected) return;
    const res = upgradeTower(state, state.selected);
    if (!res.ok) {
      actions.say(res.reason);
      sfx.error();
    }
  },
  sellSelected() {
    if (!state.selected) return;
    sellTower(state, state.selected);
  },
  say(text) {
    state.message = text;
    state.messageUntil = state.time + 2.5;
  },
  towerCost(key) {
    return TOWERS[key].cost;
  },
};

function step(dt) {
  if (state.mode === 'paused') return;
  state.time += dt;
  state.crystalFlash = Math.max(0, state.crystalFlash - dt);
  if (state.message && state.time > state.messageUntil) state.message = '';
  if (state.mode === 'playing') {
    updateWaves(state, dt);
    updateTowers(state, dt);
    updateEnemies(state, dt);
    updateProjectiles(state, dt);
    updateParticles(state, dt);
    if ((state.mode === 'victory' || state.mode === 'defeat') && !state.scored) {
      state.scored = true;
      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        saveBest(state.score);
      }
    }
  } else {
    // Title and end screens keep their ambient motion.
    updateParticles(state, dt);
  }
}

let lastStatusText = '';

function render() {
  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawField(ctx, state);
  ctx.restore();
  drawSidebar(ctx, state);
  drawBanner(ctx, state);
  if (state.mode === 'title') drawTitle(ctx, state);
  else if (state.mode === 'paused') drawPaused(ctx, state);
  else if (state.mode === 'victory') drawVictory(ctx, state);
  else if (state.mode === 'defeat') drawDefeat(ctx, state);
  // Screen-reader status line: write only when the text changes, so the
  // live region is not re-announced (or re-written) sixty times a second.
  const status = document.getElementById('status');
  if (status) {
    const text = 'Wave ' + state.wave + ' of 15. Gold ' + state.gold + '. Lives ' + state.lives + '. Score ' + state.score + '.';
    if (text !== lastStatusText) {
      lastStatusText = text;
      status.textContent = text;
    }
  }
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = Math.floor(VIEW_W * scale) + 'px';
  canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
}

window.addEventListener('resize', fitCanvas);
fitCanvas();
attachInput(canvas, state, actions);

const params = new URLSearchParams(window.location.search);
const isSelfTest = params.has('selftest');
if (!isSelfTest) applyShot(state, actions, params);

// Fixed-step loop: simulation at 60 Hz, rendering every animation frame.
// Speed 2x runs two simulation steps per tick.
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += elapsed;
  let steps = 0;
  while (acc >= STEP && steps < 8) {
    for (let s = 0; s < state.speed; s++) step(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === 8) acc = 0;
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (isSelfTest) {
  setTimeout(() => runSelfTest(state, actions, step, render), 60);
}
