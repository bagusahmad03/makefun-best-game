// The battlefield: grid, road, crystal position, and build rules. The road is
// a polyline of waypoints; enemies walk it by distance travelled, which also
// decides targeting (furthest along the road is "first").

import { CELL, COLS, ROWS, PATH_CELLS, CRYSTAL_CELL } from './config.js';

export function cellCenter(col, row) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

export function cellAt(x, y) {
  return { col: Math.floor(x / CELL), row: Math.floor(y / CELL) };
}

// Build the road once: pixel waypoints, cumulative lengths, total length.
function buildRoad() {
  const points = PATH_CELLS.map(([c, r]) => cellCenter(c, r));
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  return { points, cum, total: cum[cum.length - 1] };
}

export const ROAD = buildRoad();

export function roadPosition(distance) {
  const { points, cum, total } = ROAD;
  const d = Math.max(0, Math.min(distance, total));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const segLen = cum[i] - cum[i - 1] || 1;
  const t = (d - cum[i - 1]) / segLen;
  const x = points[i - 1].x + (points[i].x - points[i - 1].x) * t;
  const y = points[i - 1].y + (points[i].y - points[i - 1].y) * t;
  const angle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
  return { x, y, angle };
}

// Every grid cell the road passes through, so towers cannot be built on it.
function buildRoadCells() {
  const cells = new Set();
  const { points } = ROAD;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2));
    for (let s = 0; s <= steps; s++) {
      const x = a.x + ((b.x - a.x) * s) / steps;
      const y = a.y + ((b.y - a.y) * s) / steps;
      const { col, row } = cellAt(x, y);
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) cells.add(col + ',' + row);
    }
  }
  return cells;
}

export const ROAD_CELLS = buildRoadCells();
export const CRYSTAL_POS = cellCenter(CRYSTAL_CELL[0], CRYSTAL_CELL[1]);

export function isRoadCell(col, row) {
  return ROAD_CELLS.has(col + ',' + row);
}

export function isCrystalCell(col, row) {
  return col === CRYSTAL_CELL[0] && row === CRYSTAL_CELL[1];
}

export function isBuildable(state, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (isRoadCell(col, row) || isCrystalCell(col, row)) return false;
  return !state.towers.some((t) => t.col === col && t.row === row);
}
