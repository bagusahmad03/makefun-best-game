// Screenshot staging: ?shot=<scene> sets up a real game state for captures.
// Active ONLY when the query parameter is present; normal play never sees
// it. Scenes: title, action, upgrade, victory, defeat. Documented in README.
// Every staged state is built through the game's own APIs (placeTower,
// spawnEnemy, startWave) so the capture shows genuine game states, not mocks.

import { placeTower, upgradeTower } from './towers.js';
import { spawnEnemy } from './enemies.js';
import { setBanner } from './waves.js';
import { spawnBurst } from './particles.js';

function stageTowers(state) {
  state.gold = 100000;
  const spots = [
    ['spark', 3, 0], ['spark', 8, 0], ['frost', 5, 2],
    ['ember', 3, 4], ['spark', 8, 4], ['storm', 5, 6],
    ['frost', 8, 6], ['ember', 3, 2],
  ];
  const placed = [];
  for (const [key, col, row] of spots) {
    const res = placeTower(state, key, col, row);
    if (res.ok) placed.push(res.tower);
  }
  // A couple of upgraded towers for the action shots.
  if (placed[2]) upgradeTower(state, placed[2]);
  if (placed[3]) { upgradeTower(state, placed[3]); upgradeTower(state, placed[3]); }
  if (placed[5]) upgradeTower(state, placed[5]);
  // Staging feedback (LEVEL floats, placement bursts) is noise in a capture;
  // the sim generates its own feedback from here on.
  state.floats.length = 0;
  return placed;
}

function stageEnemies(state, wave, spreads) {
  for (const [type, dist] of spreads) {
    const e = spawnEnemy(state, type, wave);
    e.dist = dist;
  }
}

export function applyShot(state, actions, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  actions.startGame();
  state.time = 12; // let ambient animation settle into a natural pose
  if (shot === 'title') {
    stageTowers(state);
    state.mode = 'title';
    state.gold = 200;
    return true;
  }
  if (shot === 'action') {
    stageTowers(state);
    state.wave = 6;
    state.waveActive = true;
    state.spawnQueue = [
      { type: 'husk', at: 2 }, { type: 'skitter', at: 3 }, { type: 'husk', at: 4 },
      { type: 'skitter', at: 5 }, { type: 'wisp', at: 6 },
    ];
    state.spawnElapsed = 0;
    stageEnemies(state, 6, [
      ['skitter', 300], ['skitter', 520], ['husk', 900], ['skitter', 1150],
      ['wisp', 1500], ['husk', 1850], ['skitter', 2200], ['golem', 2600],
      ['skitter', 2900], ['wisp', 3150],
    ]);
    state.gold = 340;
    state.lives = 18;
    state.kills = 47;
    state.score = 2450;
    setBanner(state, 'WAVE 6', '8x skitter  ·  6x husk  ·  6x wisp', 3.0);
    return true;
  }
  if (shot === 'upgrade') {
    const placed = stageTowers(state);
    state.wave = 11;
    state.waveActive = true;
    state.spawnQueue = [{ type: 'golem', at: 2 }, { type: 'wisp', at: 3.5 }];
    state.spawnElapsed = 0;
    stageEnemies(state, 11, [
      ['golem', 500], ['wisp', 800], ['golem', 1300], ['wisp', 1700],
      ['golem', 2100], ['wisp', 2500], ['golem', 2900],
    ]);
    const storm = placed.find((t) => t.key === 'storm');
    if (storm) state.selected = storm;
    state.gold = 520;
    state.lives = 14;
    state.kills = 132;
    state.score = 8120;
    spawnBurst(state, 400, 200, { count: 8, color: '#c77dff', speed: 80, life: 0.5 });
    return true;
  }
  if (shot === 'victory') {
    stageTowers(state);
    state.wave = 15;
    state.waveActive = false;
    state.gold = 640;
    state.lives = 11;
    state.kills = 214;
    state.goldEarned = 3120;
    state.score = 12480;
    state.mode = 'victory';
    return true;
  }
  if (shot === 'defeat') {
    stageTowers(state);
    state.wave = 9;
    state.waveActive = true;
    stageEnemies(state, 9, [['wisp', 3300], ['husk', 3100]]);
    state.gold = 45;
    state.lives = 0;
    state.kills = 96;
    state.goldEarned = 1480;
    state.score = 4230;
    state.mode = 'defeat';
    return true;
  }
  return false;
}
