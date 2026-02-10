import { Point } from "./types";
import { enhancedNavMeshManager, NavNode } from "./EnhancedNavMeshManager";
import { DUST2_COORDINATES } from "./cs2Constants";
import { TeamSide } from "./TacticsManager";

// Interface for a grid node in the tactical system
export interface GridNode {
  id: number;
  worldPos: Point; // World coordinates (NavMesh coords)
  gridX: number;
  gridY: number;
  isWalkable: boolean;
  baseDanger: number; // 0-15, based on static map properties or cover
  sectorDataT: number; // Danger detected BY T side (enemies are CT)
  sectorDataCT: number; // Danger detected BY CT side (enemies are T)
  closestNavNode: NavNode | null; // Linked NavMesh node for visibility checks
}

// Interface for enemy data needed for calculations
export interface TacticalEnemy {
  id: string;
  pos: Point;
  isAlive: boolean;
  team: TeamSide;
}

export class TacticalGridManager {
  private static instance: TacticalGridManager;

  // Grid configuration
  private readonly CELL_SIZE = 50;
  private width: number = 0;
  private height: number = 0;
  private minX: number = 0;
  private minY: number = 0;

  private grid: GridNode[] = [];
  private isInitialized = false;

  public get ready(): boolean { return this.isInitialized; }

  private constructor() {}

  static getInstance(): TacticalGridManager {
    if (!TacticalGridManager.instance) {
      TacticalGridManager.instance = new TacticalGridManager();
    }
    return TacticalGridManager.instance;
  }

  /**
   * Initialize the grid based on map bounds
   */
  initializeGrid(): void {
    if (this.isInitialized) return;

    // Use Dust2 bounds from constants
    this.minX = DUST2_COORDINATES.NAV_MIN_X;
    const maxX = DUST2_COORDINATES.NAV_MAX_X;
    this.minY = DUST2_COORDINATES.NAV_MIN_Y;
    const maxY = DUST2_COORDINATES.NAV_MAX_Y;

    // Calculate grid dimensions
    this.width = Math.ceil((maxX - this.minX) / this.CELL_SIZE);
    this.height = Math.ceil((maxY - this.minY) / this.CELL_SIZE);

    console.log(`Initializing Tactical Grid: ${this.width}x${this.height} (${this.width * this.height} nodes)`);

    this.grid = new Array(this.width * this.height);

    // Generate nodes
    let walkableCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const worldX = this.minX + (x * this.CELL_SIZE) + (this.CELL_SIZE / 2);
        const worldY = this.minY + (y * this.CELL_SIZE) + (this.CELL_SIZE / 2);
        const worldPos = { x: worldX, y: worldY };

        // Check walkability against NavMesh
        // We use a slightly larger threshold to ensure we snap to valid mesh
        const isWalkable = enhancedNavMeshManager.isWalkable(worldPos, this.CELL_SIZE);

        let closestNavNode: NavNode | null = null;
        if (isWalkable) {
          closestNavNode = enhancedNavMeshManager.getClosestNode(worldPos);
          walkableCount++;
        }

        const node: GridNode = {
          id: y * this.width + x,
          gridX: x,
          gridY: y,
          worldPos,
          isWalkable,
          baseDanger: 0,
          sectorDataT: 0,
          sectorDataCT: 0,
          closestNavNode
        };

        this.grid[node.id] = node;
      }
    }

    console.log(`Tactical Grid Initialized: ${walkableCount} walkable nodes out of ${this.grid.length}`);
    this.isInitialized = true;
  }

  /**
   * Update sector data for all nodes based on enemy positions
   * This is called once per tick or throttled
   */
  updateSectorData(enemies: TacticalEnemy[]): void {
    if (!this.isInitialized) return;

    // Reset sector data
    for (let i = 0; i < this.grid.length; i++) {
        this.grid[i].sectorDataT = 0;
        this.grid[i].sectorDataCT = 0;
    }

    // Optimization: Pre-calculate enemy nav nodes
    const enemyNodes: { enemy: TacticalEnemy, node: NavNode }[] = [];
    for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const node = enhancedNavMeshManager.getClosestNode(enemy.pos);
        if (node) {
            enemyNodes.push({ enemy, node });
        }
    }

    // Iterate through all WALKABLE grid nodes
    for (let i = 0; i < this.grid.length; i++) {
      const gridNode = this.grid[i];
      if (!gridNode.isWalkable || !gridNode.closestNavNode) continue;

      // Check against each enemy
      for (const { enemy, node: enemyNavNode } of enemyNodes) {
        // Visibility Check
        const isVisible = gridNode.closestNavNode.id === enemyNavNode.id ||
                          gridNode.closestNavNode.visibleNodes?.has(enemyNavNode.id);

        if (isVisible) {
           this.applyDangerToNode(gridNode, enemy);
        }
      }
    }
  }

  /**
   * Calculate and apply danger to a specific node from an enemy
   */
  private applyDangerToNode(node: GridNode, enemy: TacticalEnemy): void {
      const dx = enemy.pos.x - node.worldPos.x;
      const dy = enemy.pos.y - node.worldPos.y;

      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const sector = Math.floor(angle / 45) % 8;
      const distSq = dx*dx + dy*dy;

      let dangerScore = 1;
      if (distSq < 500 * 500) dangerScore = 3;
      else if (distSq < 1500 * 1500) dangerScore = 2;

      const shift = sector * 4;

      // Update correct danger map
      // If enemy is CT, they cause danger to T (sectorDataT)
      // If enemy is T, they cause danger to CT (sectorDataCT)
      if (enemy.team === TeamSide.CT) {
          const currentVal = (node.sectorDataT >> shift) & 0xF;
          const newVal = Math.min(15, Math.max(currentVal, dangerScore));
          node.sectorDataT = (node.sectorDataT & ~(0xF << shift)) | (newVal << shift);
      } else {
          const currentVal = (node.sectorDataCT >> shift) & 0xF;
          const newVal = Math.min(15, Math.max(currentVal, dangerScore));
          node.sectorDataCT = (node.sectorDataCT & ~(0xF << shift)) | (newVal << shift);
      }
  }

  getGridNode(pos: Point): GridNode | null {
      if (!this.isInitialized) return null;

      const col = Math.floor((pos.x - this.minX) / this.CELL_SIZE);
      const row = Math.floor((pos.y - this.minY) / this.CELL_SIZE);

      if (col < 0 || col >= this.width || row < 0 || row >= this.height) return null;

      return this.grid[row * this.width + col];
  }

  getNeighbors(node: GridNode): GridNode[] {
      const neighbors: GridNode[] = [];
      const dirs = [
          { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
          { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
          { dx: 1, dy: 1 }, { dx: 1, dy: -1 },
          { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
      ];

      for (const dir of dirs) {
          const nx = node.gridX + dir.dx;
          const ny = node.gridY + dir.dy;

          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
              const neighbor = this.grid[ny * this.width + nx];
              if (neighbor.isWalkable) {
                  neighbors.push(neighbor);
              }
          }
      }
      return neighbors;
  }

  getGrid(): GridNode[] {
      return this.grid;
  }

  /**
   * Find a tactical path using A* with exposure and cover mechanics
   */
  findTacticalPath(start: Point, end: Point, team: TeamSide, options?: { dangerPenalty?: number }): Point[] {
    if (!this.isInitialized) return [];

    const startNode = this.getGridNode(start);
    const endNode = this.getGridNode(end);

    // If start/end are invalid, try finding closest valid nodes or abort
    if (!startNode || !endNode || !startNode.isWalkable || !endNode.isWalkable) {
        // Fallback: simple NavMesh path if grid nodes aren't found (e.g. off grid)
        // For now, return empty to indicate failure, caller can fallback
        return [];
    }

    const openSet: GridNode[] = [startNode];
    const cameFrom = new Map<number, number>(); // node.id -> parent.id

    // gScore: Cost to reach node
    const gScore = new Map<number, number>();
    gScore.set(startNode.id, 0);

    // fScore: gScore + heuristic
    const fScore = new Map<number, number>();
    fScore.set(startNode.id, this.heuristic(startNode, endNode, team));

    // cumulativeExposure: How much danger accumulated on path to this node
    const cumulativeExposure = new Map<number, number>();
    cumulativeExposure.set(startNode.id, 0);

    const dangerPenalty = options?.dangerPenalty ?? 50; // High penalty for danger

    while (openSet.length > 0) {
        // Get node with lowest fScore
        // Simple O(N) sort for now, optimize with Heap if needed
        openSet.sort((a, b) => (fScore.get(a.id) ?? Infinity) - (fScore.get(b.id) ?? Infinity));
        const current = openSet.shift()!;

        if (current.id === endNode.id) {
            return this.reconstructPath(cameFrom, current);
        }

        const currentExposure = cumulativeExposure.get(current.id) ?? 0;
        const neighbors = this.getNeighbors(current);

        for (const neighbor of neighbors) {
            // Calculate danger of neighbor
            const neighborDanger = this.getNodeDanger(neighbor, team);

            // Calculate exposure cost
            let newExposure = currentExposure;
            let stepCost = 0;

            if (neighborDanger > 0) {
                // Exposure Cost: Accumulate danger
                const addedExposure = neighborDanger * dangerPenalty;
                newExposure += addedExposure;
                stepCost = addedExposure;
            } else {
                // Cover Refund: If safe (Zero Danger), subtract accumulated exposure from path cost
                // This encourages sprinting from cover to cover
                stepCost = -currentExposure;
                newExposure = 0; // Reset stress
            }

            const dist = this.distance(current, neighbor);
            const tentativeG = (gScore.get(current.id) ?? Infinity) + dist + stepCost;

            if (tentativeG < (gScore.get(neighbor.id) ?? Infinity)) {
                cameFrom.set(neighbor.id, current.id);
                gScore.set(neighbor.id, tentativeG);
                fScore.set(neighbor.id, tentativeG + this.heuristic(neighbor, endNode, team));
                cumulativeExposure.set(neighbor.id, newExposure);

                if (!openSet.some(n => n.id === neighbor.id)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return []; // No path found
  }

  private distance(a: GridNode, b: GridNode): number {
      const dx = a.worldPos.x - b.worldPos.x;
      const dy = a.worldPos.y - b.worldPos.y;
      return Math.sqrt(dx*dx + dy*dy);
  }

  private heuristic(a: GridNode, b: GridNode, team: TeamSide): number {
      const dist = this.distance(a, b);
      const targetDanger = this.getNodeDanger(b, team);
      return dist + (targetDanger * 100); // Heavily penalize dangerous targets
  }

  private getNodeDanger(node: GridNode, team: TeamSide): number {
      const data = team === TeamSide.T ? node.sectorDataT : node.sectorDataCT;
      let maxDanger = 0;
      for (let i = 0; i < 8; i++) {
          const val = (data >> (i * 4)) & 0xF;
          if (val > maxDanger) maxDanger = val;
      }
      return maxDanger;
  }

  private reconstructPath(cameFrom: Map<number, number>, current: GridNode): Point[] {
      const path: Point[] = [current.worldPos];
      let currId = current.id;

      while (cameFrom.has(currId)) {
          currId = cameFrom.get(currId)!;
          const node = this.grid[currId];
          path.unshift(node.worldPos);
      }

      // Basic smoothing could be added here, but grid movement is fine for now
      return path;
  }
}

export const tacticalGridManager = TacticalGridManager.getInstance();
