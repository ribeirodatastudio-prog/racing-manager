import { COLLISION_GRID, GRID_SIZE, MAP_WIDTH, MAP_HEIGHT } from "./maps/dust2_collisions";
import { Point } from "./types";

const CELL_SIZE = MAP_WIDTH / GRID_SIZE; // 5

export class Pathfinder {
  static worldToGrid(p: Point): { x: number; y: number } {
    return {
      x: Math.floor(Math.max(0, Math.min(MAP_WIDTH - 1, p.x)) / CELL_SIZE),
      y: Math.floor(Math.max(0, Math.min(MAP_HEIGHT - 1, p.y)) / CELL_SIZE),
    };
  }

  static gridToWorld(gx: number, gy: number): Point {
    return {
      x: (gx * CELL_SIZE) + (CELL_SIZE / 2),
      y: (gy * CELL_SIZE) + (CELL_SIZE / 2),
    };
  }

  static isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;

    const gx = Math.floor(x / CELL_SIZE);
    const gy = Math.floor(y / CELL_SIZE);

    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return false;

    return COLLISION_GRID[gy * GRID_SIZE + gx] === 0;
  }

  static findPath(start: Point, end: Point): Point[] {
    const startGrid = this.worldToGrid(start);
    const endGrid = this.worldToGrid(end);

    if (!this.isWalkable(end.x, end.y)) {
    }

    const openSet: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
        x: startGrid.x,
        y: startGrid.y,
        g: 0,
        h: this.heuristic(startGrid, endGrid),
        parent: null
    };

    openSet.push(startNode);

    while (openSet.length > 0) {
        openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
        const current = openSet.shift()!;

        const key = `${current.x},${current.y}`;
        if (closedSet.has(key)) continue;
        closedSet.add(key);

        if (current.x === endGrid.x && current.y === endGrid.y) {
            return this.reconstructPath(current);
        }

        const neighbors = [
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: -1, y: -1 }, { x: 1, y: -1 },
            { x: -1, y: 1 }, { x: 1, y: 1 }
        ];

        for (const n of neighbors) {
            const nx = current.x + n.x;
            const ny = current.y + n.y;

            if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

            if (COLLISION_GRID[ny * GRID_SIZE + nx] === 1) continue;

            if (n.x !== 0 && n.y !== 0) {
                if (COLLISION_GRID[current.y * GRID_SIZE + nx] === 1 ||
                    COLLISION_GRID[ny * GRID_SIZE + current.x] === 1) {
                    continue;
                }
            }

            const moveCost = (n.x !== 0 && n.y !== 0) ? 1.414 : 1;
            const g = current.g + moveCost;

            const h = this.heuristic({x: nx, y: ny}, endGrid);

            openSet.push({
                x: nx,
                y: ny,
                g,
                h,
                parent: current
            });
        }
    }

    return [];
  }

  private static heuristic(a: {x: number, y: number}, b: {x: number, y: number}): number {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx*dx + dy*dy);
  }

  private static reconstructPath(node: Node): Point[] {
      const path: Point[] = [];
      let current: Node | null = node;

      while (current) {
          path.unshift(this.gridToWorld(current.x, current.y));
          current = current.parent;
      }

      return this.smoothPath(path);
  }

  private static smoothPath(path: Point[]): Point[] {
      if (path.length <= 2) return path;

      const smoothed: Point[] = [path[0]];
      let currentIdx = 0;

      while (currentIdx < path.length - 1) {
          let nextIdx = currentIdx + 1;
          for (let i = path.length - 1; i > currentIdx + 1; i--) {
              if (this.hasLineOfSight(path[currentIdx], path[i])) {
                  nextIdx = i;
                  break;
              }
          }
          smoothed.push(path[nextIdx]);
          currentIdx = nextIdx;
      }

      return smoothed;
  }

  static hasLineOfSight(start: Point, end: Point): boolean {
      const x0 = Math.floor(start.x / CELL_SIZE);
      const y0 = Math.floor(start.y / CELL_SIZE);
      const x1 = Math.floor(end.x / CELL_SIZE);
      const y1 = Math.floor(end.y / CELL_SIZE);

      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = (x0 < x1) ? 1 : -1;
      const sy = (y0 < y1) ? 1 : -1;
      let err = dx - dy;

      let x = x0;
      let y = y0;

      while (true) {
          // Range check
          if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
             if (COLLISION_GRID[y * GRID_SIZE + x] === 1) return false;
          }

          if (x === x1 && y === y1) break;
          const e2 = 2 * err;
          if (e2 > -dy) { err -= dy; x += sx; }
          if (e2 < dx) { err += dx; y += sy; }
      }

      return true;
  }
}

interface Node {
    x: number;
    y: number;
    g: number;
    h: number;
    parent: Node | null;
}
