// Emberhold — balance and layout constants. Every number the game tunes lives here.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const FIELD_W = 960; // play field; the sidebar takes the rest
export const CELL = 80;
export const COLS = 12;
export const ROWS = 9;
export const SIDEBAR_X = FIELD_W;
export const SIDEBAR_W = VIEW_W - FIELD_W;

export const START_GOLD = 200;
export const START_LIVES = 20;
export const MAX_WAVES = 15;
export const SELL_REFUND = 0.7;

// The enemy road, as [column, row] waypoints. It enters off the left edge and
// ends at the Ember Crystal's cell. Rows and columns are 0-based.
export const PATH_CELLS = [
  [-1, 1], [10, 1], [10, 3], [1, 3], [1, 5], [10, 5], [10, 7], [1, 7],
];
export const CRYSTAL_CELL = [1, 7];

// Palette: a cold indigo night, warm ember gold, frost teal, storm violet.
export const PALETTE = {
  bgTop: '#131a33',
  bgBottom: '#0a0d1d',
  tileA: '#1b2342',
  tileB: '#18203c',
  path: '#3a2f4a',
  pathEdge: '#57456b',
  pathLine: '#6b5a82',
  sidebar: '#10152b',
  panel: '#1a2140',
  panelEdge: '#2c3a67',
  text: '#e8ecf9',
  dim: '#9aa5c8',
  gold: '#ffd166',
  lives: '#ff6b81',
  crystal: '#ffb347',
};

// Towers: stats[0] is the base level; stats[1] and stats[2] are upgrades,
// each with the gold cost to buy that level from the previous one.
export const TOWERS = {
  spark: {
    key: 'spark', name: 'Spark Spire', hotkey: '1', cost: 50,
    color: '#ffd166', glow: '#ffedb0',
    desc: 'Rapid bolts. Cheap, quick, reliable.',
    stats: [
      { damage: 6, rate: 4.0, range: 135 },
      { damage: 10, rate: 4.6, range: 145, cost: 40 },
      { damage: 16, rate: 5.4, range: 155, cost: 65 },
    ],
  },
  frost: {
    key: 'frost', name: 'Frost Obelisk', hotkey: '2', cost: 75,
    color: '#7bdff2', glow: '#d8f6ff',
    desc: 'Chilling bolts slow enemies down.',
    stats: [
      { damage: 9, rate: 1.2, range: 125, slow: 0.45, slowTime: 1.6 },
      { damage: 15, rate: 1.35, range: 135, slow: 0.5, slowTime: 1.8, cost: 60 },
      { damage: 24, rate: 1.5, range: 145, slow: 0.55, slowTime: 2.0, cost: 95 },
    ],
  },
  ember: {
    key: 'ember', name: 'Ember Cannon', hotkey: '3', cost: 120,
    color: '#ff6b35', glow: '#ffc4a3',
    desc: 'Explosive shells. Splash damage.',
    stats: [
      { damage: 24, rate: 0.7, range: 155, splash: 60 },
      { damage: 38, rate: 0.78, range: 165, splash: 70, cost: 95 },
      { damage: 60, rate: 0.85, range: 175, splash: 80, cost: 150 },
    ],
  },
  storm: {
    key: 'storm', name: 'Storm Pylon', hotkey: '4', cost: 150,
    color: '#c77dff', glow: '#ecd8ff',
    desc: 'Lightning chains between foes.',
    stats: [
      { damage: 15, rate: 1.0, range: 165, chains: 3 },
      { damage: 24, rate: 1.1, range: 175, chains: 4, cost: 115 },
      { damage: 38, rate: 1.2, range: 185, chains: 5, cost: 180 },
    ],
  },
};
export const TOWER_ORDER = ['spark', 'frost', 'ember', 'storm'];

// Enemies. slowResist is the fraction of a slow effect the enemy shrugs off.
export const ENEMIES = {
  skitter: { key: 'skitter', name: 'Skitter', hp: 30, speed: 72, reward: 8, leak: 1, radius: 13, color: '#8aff80', slowResist: 0 },
  husk: { key: 'husk', name: 'Husk', hp: 130, speed: 40, reward: 12, leak: 2, radius: 17, color: '#e0a458', slowResist: 0.2 },
  wisp: { key: 'wisp', name: 'Wisp', hp: 60, speed: 62, reward: 11, leak: 1, radius: 12, color: '#7bdff2', slowResist: 0.6 },
  golem: { key: 'golem', name: 'Golem', hp: 420, speed: 30, reward: 26, leak: 3, radius: 21, color: '#b8b8d0', slowResist: 0.4 },
  brute: { key: 'brute', name: 'Hollow Brute', hp: 950, speed: 28, reward: 70, leak: 5, radius: 24, color: '#ff5d8f', slowResist: 0.5 },
  boss: { key: 'boss', name: 'Gloomlord', hp: 2600, speed: 25, reward: 220, leak: 10, radius: 30, color: '#ff2e63', slowResist: 0.7 },
};

// Waves: groups of [enemy key, count, seconds between spawns]. Groups run in
// order with a short pause between them. Enemy health scales with the wave.
export const WAVES = [
  [['skitter', 8, 0.8]],
  [['skitter', 12, 0.7]],
  [['skitter', 8, 0.7], ['husk', 4, 1.0]],
  [['skitter', 10, 0.6], ['husk', 6, 0.9]],
  [['wisp', 6, 0.8], ['skitter', 8, 0.6]],
  [['husk', 12, 0.8], ['skitter', 6, 0.5]],
  [['wisp', 10, 0.7], ['husk', 8, 0.8]],
  [['golem', 6, 1.2], ['skitter', 10, 0.5]],
  [['wisp', 14, 0.6], ['husk', 6, 0.8]],
  [['brute', 1, 0], ['husk', 10, 0.8]],
  [['golem', 12, 0.9], ['wisp', 8, 0.6]],
  [['skitter', 20, 0.4], ['golem', 8, 0.9]],
  [['wisp', 16, 0.55], ['golem', 10, 0.85], ['husk', 4, 0.8]],
  [['brute', 2, 3.0], ['wisp', 12, 0.55], ['golem', 8, 0.8]],
  [['golem', 10, 0.8], ['wisp', 12, 0.55], ['boss', 1, 0], ['golem', 6, 0.9]],
];

export function hpMultiplier(wave) {
  return 1 + (wave - 1) * 0.22;
}

export function waveClearBonus(wave) {
  return 40 + wave * 5;
}

export function earlyCallBonus(wave) {
  return 15 + wave * 3;
}
