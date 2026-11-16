// Input: mouse and keyboard. Clicks resolve through the UI's hit-testing so
// buttons and the field share one source of truth; keys mirror the buttons.
// Every gesture also wakes the audio context (browsers require one).

import { FIELD_W, TOWER_ORDER } from './config.js';
import { cellAt, isBuildable } from './map.js';
import { placeTower } from './towers.js';
import { hitTest } from './ui.js';
import { ensureAudio, sfx } from './audio.js';

function toGameCoords(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * canvas.width,
    y: ((clientY - r.top) / r.height) * canvas.height,
  };
}

export function attachInput(canvas, state, actions) {
  canvas.addEventListener('mousemove', (ev) => {
    const p = toGameCoords(canvas, ev.clientX, ev.clientY);
    state.mouse.x = p.x;
    state.mouse.y = p.y;
    const hit = hitTest(state, p.x, p.y);
    state.hover = hit ? hit.kind : null;
    if (state.buildType && p.x < FIELD_W) {
      const { col, row } = cellAt(p.x, p.y);
      state.ghostOk = isBuildable(state, col, row) && state.gold >= actions.towerCost(state.buildType);
    }
  });

  canvas.addEventListener('click', (ev) => {
    ensureAudio();
    const p = toGameCoords(canvas, ev.clientX, ev.clientY);
    const hit = hitTest(state, p.x, p.y);
    if (!hit) {
      state.buildType = null;
      state.selected = null;
      return;
    }
    switch (hit.kind) {
      case 'start':
        actions.startGame();
        break;
      case 'restart':
        actions.restart();
        break;
      case 'card':
        state.buildType = state.buildType === hit.key ? null : hit.key;
        state.selected = null;
        sfx.click();
        break;
      case 'upgrade':
        actions.upgradeSelected();
        break;
      case 'sell':
        actions.sellSelected();
        break;
      case 'wave':
        actions.startWave();
        break;
      case 'speed':
        actions.cycleSpeed();
        break;
      case 'pause':
        actions.togglePause();
        break;
      case 'mute':
        actions.toggleMute();
        break;
      case 'field': {
        if (state.mode !== 'playing') break;
        const { col, row } = cellAt(hit.x, hit.y);
        if (state.buildType) {
          const res = placeTower(state, state.buildType, col, row);
          if (!res.ok) {
            actions.say(res.reason);
            sfx.error();
          } else if (!ev.shiftKey) {
            state.buildType = null;
          }
        } else {
          const tower = state.towers.find((t) => t.col === col && t.row === row);
          state.selected = tower || null;
          if (tower) sfx.click();
        }
        break;
      }
      default:
        break;
    }
  });

  // Right-click cancels a build choice or a selection.
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    state.buildType = null;
    state.selected = null;
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    ensureAudio();
    const k = ev.key;
    if (k >= '1' && k <= '4') {
      const key = TOWER_ORDER[Number(k) - 1];
      if (state.mode === 'playing') {
        state.buildType = state.buildType === key ? null : key;
        state.selected = null;
        sfx.click();
      }
      return;
    }
    switch (k) {
      case 'Escape':
        state.buildType = null;
        state.selected = null;
        break;
      case ' ':
      case 'Enter':
        ev.preventDefault();
        if (state.mode === 'title') actions.startGame();
        else if (state.mode === 'victory' || state.mode === 'defeat') actions.restart();
        else if (state.mode === 'paused') actions.togglePause();
        else if (!state.waveActive) actions.startWave();
        else actions.togglePause();
        break;
      case 'p':
      case 'P':
        if (state.mode === 'playing' || state.mode === 'paused') actions.togglePause();
        break;
      case 'f':
      case 'F':
        actions.cycleSpeed();
        break;
      case 'm':
      case 'M':
        actions.toggleMute();
        break;
      case 'r':
      case 'R':
        if (state.mode !== 'title') actions.restart();
        break;
      case 'u':
      case 'U':
        actions.upgradeSelected();
        break;
      default:
        break;
    }
  });
}
