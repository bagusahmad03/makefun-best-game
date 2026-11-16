// Automated self-test: ?selftest=1 runs the real game loop headlessly and
// reports PASS/FAIL into the document (title + #selftest node) with zero
// reliance on wall-clock timing — the simulation is stepped manually at a
// fixed 1/60 s. Active ONLY with the query parameter; normal play never
// sees it. Documented in README.

import { START_GOLD, START_LIVES, TOWERS } from './config.js';
import { placeTower, upgradeTower, sellTower } from './towers.js';
import { spawnEnemy } from './enemies.js';
import { sfx } from './audio.js';

export function runSelfTest(state, actions, step, renderOne) {
  const results = [];
  const errors = [];
  const origError = console.error;
  console.error = (...args) => {
    errors.push(String(args[0]));
    origError.apply(console, args);
  };

  function check(name, fn) {
    try {
      const detail = fn();
      results.push({ name, pass: true, detail: detail || '' });
    } catch (err) {
      results.push({ name, pass: false, detail: String(err && err.message ? err.message : err) });
    }
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  function stepN(n) {
    for (let i = 0; i < n; i++) step(1 / 60);
  }

  check('boot shows title', () => {
    assert(state.mode === 'title', 'expected title, got ' + state.mode);
    return 'mode=' + state.mode;
  });

  check('start game resets economy', () => {
    actions.startGame();
    assert(state.mode === 'playing', 'mode ' + state.mode);
    assert(state.gold === START_GOLD, 'gold ' + state.gold);
    assert(state.lives === START_LIVES, 'lives ' + state.lives);
    assert(state.towers.length === 0 && state.enemies.length === 0, 'field not empty');
    return 'gold=' + state.gold + ' lives=' + state.lives;
  });

  check('place all four tower types', () => {
    state.gold = 10000;
    const spots = [['spark', 3, 0], ['frost', 5, 0], ['ember', 7, 0], ['storm', 9, 0]];
    for (const [key, col, row] of spots) {
      const res = placeTower(state, key, col, row);
      assert(res.ok, 'place ' + key + ' failed: ' + res.reason);
    }
    assert(state.towers.length === 4, 'towers=' + state.towers.length);
    const spent = 10000 - state.gold;
    const expect = TOWERS.spark.cost + TOWERS.frost.cost + TOWERS.ember.cost + TOWERS.storm.cost;
    assert(spent === expect, 'spent ' + spent + ' expected ' + expect);
    return 'spent=' + spent;
  });

  check('reject bad placements', () => {
    const onRoad = placeTower(state, 'spark', 5, 1);
    assert(!onRoad.ok, 'road placement accepted');
    const occupied = placeTower(state, 'spark', 3, 0);
    assert(!occupied.ok, 'occupied placement accepted');
    const saved = state.gold;
    state.gold = 0;
    const broke = placeTower(state, 'spark', 2, 0);
    assert(!broke.ok, 'unaffordable placement accepted');
    state.gold = saved;
    return 'road/occupied/broke all rejected';
  });

  check('upgrade and sell', () => {
    const spark = state.towers.find((t) => t.key === 'spark');
    const u1 = upgradeTower(state, spark);
    assert(u1.ok && spark.level === 1, 'upgrade 1 failed');
    const u2 = upgradeTower(state, spark);
    assert(u2.ok && spark.level === 2, 'upgrade 2 failed');
    const u3 = upgradeTower(state, spark);
    assert(!u3.ok, 'over-upgrade accepted');
    const frost = state.towers.find((t) => t.key === 'frost');
    const before = state.gold;
    const value = sellTower(state, frost);
    assert(state.gold === before + value, 'sell refund mismatch');
    assert(!state.towers.includes(frost), 'sold tower still present');
    return 'level=' + spark.level + ' refund=' + value;
  });

  check('wave simulates cleanly', () => {
    actions.startGame();
    state.gold = 10000;
    placeTower(state, 'spark', 3, 0);
    placeTower(state, 'ember', 5, 2);
    placeTower(state, 'storm', 8, 4);
    actions.startWave();
    assert(state.wave === 1 && state.waveActive, 'wave did not start');
    stepN(2400); // 40 simulated seconds
    for (const e of state.enemies) {
      assert(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.hp), 'enemy NaN');
    }
    for (const t of state.towers) {
      assert(Number.isFinite(t.cooldown), 'tower NaN');
    }
    assert(state.lives > 0, 'died during wave 1 sim');
    assert(state.towers.some((t) => t.kills > 0), 'no tower credited with a kill');
    // The wave may already have completed during the simulation (the towers
    // kill the whole wave fast); either the completion already paid out, or
    // forcing the last enemies away must complete it and pay the bonus.
    if (state.waveActive) {
      state.enemies.length = 0;
      state.spawnQueue = [];
      const goldBefore = state.gold;
      stepN(5);
      assert(!state.waveActive, 'wave did not complete');
      assert(state.gold > goldBefore, 'no clear bonus');
    } else {
      assert(state.goldEarned > 0, 'no earnings during wave');
    }
    return 'kills=' + state.kills + ' lives=' + state.lives;
  });

  check('victory path', () => {
    state.wave = 15;
    state.waveActive = true;
    state.spawnQueue = [];
    state.enemies.length = 0;
    stepN(5);
    assert(state.mode === 'victory', 'mode ' + state.mode);
    return 'score=' + state.score;
  });

  check('restart after victory', () => {
    actions.restart();
    assert(state.mode === 'playing', 'mode ' + state.mode);
    assert(state.wave === 0 && state.kills === 0, 'stale progress');
    assert(state.gold === START_GOLD, 'gold ' + state.gold);
    return 'fresh game';
  });

  check('defeat path', () => {
    state.lives = 1;
    const e = spawnEnemy(state, 'skitter', 1);
    e.dist = 1e9; // already at the crystal: next step leaks it
    stepN(3);
    assert(state.mode === 'defeat', 'mode ' + state.mode);
    assert(state.lives === 0, 'lives ' + state.lives);
    return 'leak ends the game';
  });

  check('restart after defeat', () => {
    actions.restart();
    assert(state.mode === 'playing' && state.lives === START_LIVES, 'restart broken');
    return 'fresh game';
  });

  check('all sounds run without throwing', () => {
    for (const name of Object.keys(sfx)) sfx[name]('spark');
    return Object.keys(sfx).length + ' sounds';
  });

  check('render one frame', () => {
    renderOne();
    return 'frame drawn';
  });

  console.error = origError;
  const passed = results.filter((r) => r.pass).length;
  const lines = results.map((r) => (r.pass ? 'PASS' : 'FAIL') + ' ' + r.name + (r.detail ? ' — ' + r.detail : ''));
  lines.push('SELFTEST ' + passed + '/' + results.length + ' PASS, console errors: ' + errors.length);
  const node = document.getElementById('selftest');
  if (node) node.textContent = lines.join('\n');
  document.title = 'SELFTEST_DONE';
  window.__selftest = { passed, total: results.length, errors: errors.length, lines };
  return window.__selftest;
}
