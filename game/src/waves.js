// Waves: composition, spawn schedule, completion bonuses, and the victory
// condition. A wave is a queue of spawn events; the wave ends when the queue
// is empty and no enemies remain on the road.

import { WAVES, MAX_WAVES, waveClearBonus, earlyCallBonus } from './config.js';
import { spawnEnemy } from './enemies.js';
import { spawnFloat } from './particles.js';
import { sfx } from './audio.js';

export function setBanner(state, title, sub, seconds) {
  state.banner = { title, sub: sub || '', until: state.time + (seconds || 2.4) };
}

function buildQueue(wave) {
  const queue = [];
  let t = 0.6; // first enemy steps out shortly after the wave starts
  for (const [type, count, gap] of WAVES[wave - 1]) {
    for (let i = 0; i < count; i++) {
      queue.push({ type, at: t });
      t += gap;
    }
    t += 1.2; // pause between groups
  }
  return queue;
}

export function startWave(state) {
  if (state.mode !== 'playing' || state.waveActive) return false;
  if (state.wave >= MAX_WAVES) return false;
  // Calling the next wave early (while the field is clear) pays bonus gold.
  const early = state.enemies.length === 0 && state.wave > 0;
  state.wave++;
  state.waveActive = true;
  state.spawnQueue = buildQueue(state.wave);
  state.spawnElapsed = 0;
  const isBoss = state.wave === MAX_WAVES;
  const hasBrute = WAVES[state.wave - 1].some(([type]) => type === 'brute');
  setBanner(state, isBoss ? 'FINAL WAVE' : 'WAVE ' + state.wave,
    isBoss ? 'The Gloomlord walks the road.' : waveSummary(state.wave), 2.6);
  if (isBoss || hasBrute) sfx.bossWarn();
  else sfx.waveStart();
  if (early) {
    const bonus = earlyCallBonus(state.wave);
    state.gold += bonus;
    state.goldEarned += bonus;
    spawnFloat(state, 480, 120, 'Early call +' + bonus, '#ffd166', 17);
  }
  return true;
}

export function waveSummary(wave) {
  const parts = [];
  for (const [type, count] of WAVES[wave - 1]) {
    parts.push(count + 'x ' + type);
  }
  return parts.join('  ·  ');
}

export function updateWaves(state, dt) {
  if (!state.waveActive) return;
  state.spawnElapsed += dt;
  while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.spawnElapsed) {
    const ev = state.spawnQueue.shift();
    spawnEnemy(state, ev.type, state.wave);
  }
  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    if (state.wave >= MAX_WAVES) {
      state.score += state.lives * 50;
      state.mode = 'victory';
      sfx.victory();
      return;
    }
    const bonus = waveClearBonus(state.wave);
    state.gold += bonus;
    state.goldEarned += bonus;
    state.score += 100 + state.wave * 20;
    setBanner(state, 'WAVE ' + state.wave + ' CLEARED', '+' + bonus + ' gold bonus', 2.0);
    sfx.coin();
  }
}
