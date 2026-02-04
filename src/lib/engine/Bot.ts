import { Player } from "@/types";
import { TacticsManager, TeamSide } from "./TacticsManager";
import { GameMap } from "./GameMap";
import { Pathfinder } from "./Pathfinder";
import { ECONOMY, WEAPONS } from "./constants";
import { Bomb, BombStatus } from "./Bomb";
import { WeaponManager } from "./WeaponManager";
import { Weapon } from "@/types/Weapon";

export type BotStatus = "ALIVE" | "DEAD";

export interface BotAction {
  type: "MOVE" | "HOLD" | "IDLE" | "PLANT" | "DEFUSE";
  targetZoneId?: string;
}

export enum BotAIState {
  DEFAULT = "DEFAULT",
  PLANTING = "PLANTING",
  DEFUSING = "DEFUSING",
  SAVING = "SAVING",
  ROTATING = "ROTATING"
}

export class Bot {
  public id: string;
  public player: Player;
  public side: TeamSide;
  public status: BotStatus;
  public currentZoneId: string;
  public path: string[];
  public hasBomb: boolean = false;

  // Movement State
  public movementProgress: number = 0;
  public targetZoneId: string | null = null;
  public recoilBulletIndex: number = 0;

  // AI State
  public aiState: BotAIState = BotAIState.DEFAULT;
  public goalZoneId: string | null = null;
  public reactionTimer: number = 0; // Ticks to wait before acting on new goal

  get hp(): number {
    return this.player.health ?? 100;
  }
  set hp(value: number) {
    this.player.health = value;
  }

  get hasHelmet(): boolean {
    return this.player.hasHelmet ?? (this.player.inventory?.hasHelmet ?? false);
  }

  get hasVest(): boolean {
    return this.player.hasVest ?? (this.player.inventory?.hasKevlar ?? false);
  }

  constructor(player: Player, side: TeamSide, startZoneId: string) {
    this.id = player.id;
    this.player = player;
    this.side = side;

    // Initialize Health/Armor state
    if (this.player.health === undefined) this.player.health = 100;

    this.status = "ALIVE";
    this.currentZoneId = startZoneId;
    this.path = [];

    // Initialize Inventory if not present
    if (!this.player.inventory) {
      this.player.inventory = {
        money: ECONOMY.START_MONEY,
        hasKevlar: false,
        hasHelmet: false,
        hasKit: false,
        utilities: []
      };
    }

    // Ensure default pistol
    if (!this.player.inventory.secondaryWeapon) {
      this.player.inventory.secondaryWeapon = side === TeamSide.T ? "glock-18" : "usp-s";
    }
  }

  getEquippedWeapon(): Weapon | undefined {
    // Check primary first
    if (this.player.inventory?.primaryWeapon) {
      const weaponId = this.player.inventory.primaryWeapon;
      const weaponConst = WEAPONS[weaponId];
      if (weaponConst) {
        return WeaponManager.getWeapon(weaponConst.name);
      }
    }

    // Check secondary
    if (this.player.inventory?.secondaryWeapon) {
      const weaponId = this.player.inventory.secondaryWeapon;
      const weaponConst = WEAPONS[weaponId];
      if (weaponConst) {
        return WeaponManager.getWeapon(weaponConst.name);
      }
    }

    // Default or Knife? (JSON doesn't have Knife yet, return undefined or handle elsewhere)
    return undefined;
  }

  /**
   * Updates the bot's high-level goal based on match state, bomb, and tactics.
   * Run every tick.
   */
  updateGoal(map: GameMap, bomb: Bomb, tacticsManager: TacticsManager) {
    if (this.status === "DEAD") return;

    // Decrement reaction timer
    if (this.reactionTimer > 0) {
      this.reactionTimer--;
      return; // Waiting to react
    }

    let desiredGoal: string | null = null;
    let desiredState = BotAIState.DEFAULT;

    // --- CT LOGIC ---
    if (this.side === TeamSide.CT) {
      // 1. SAVE Logic (Point of No Return)
      // If bomb planted, time < 7s (14 ticks), and NO ONE is defusing
      if (bomb.status === BombStatus.PLANTED && bomb.timer < 14 && !bomb.defuserId) {
         // Switch to SAVE
         desiredState = BotAIState.SAVING;
         // Find furthest zone
         desiredGoal = Pathfinder.findFurthestZone(map, bomb.plantSite || this.currentZoneId);
      }
      // 2. DEFUSE Logic
      else if (bomb.status === BombStatus.PLANTED) {
         desiredState = BotAIState.DEFUSING; // Intent to defuse (or retake)
         desiredGoal = bomb.plantSite || null;

         // Priority: If I am ON the site, I should defuse unless someone else is
         if (this.currentZoneId === desiredGoal) {
             if (!bomb.defuserId || bomb.defuserId === this.id) {
                 // I should defuse
             } else {
                 // Someone else is defusing, I guard them (HOLD)
                 desiredState = BotAIState.DEFAULT; // Just hold site
             }
         }
      }
      // 3. DEFAULT / ROTATE
      else {
         desiredState = BotAIState.DEFAULT;
         desiredGoal = tacticsManager.getGoalZone(this.player, this.side);
      }
    }

    // --- T LOGIC ---
    else {
      // 1. PLANT Logic
      if (this.hasBomb) {
          const sites = map.data.bombSites;
          // Determine which site to go to (Tactic or default)
          desiredGoal = tacticsManager.getGoalZone(this.player, this.side);

          if (this.currentZoneId === sites.A || this.currentZoneId === sites.B) {
              // We are on a site, we should plant
              desiredState = BotAIState.PLANTING;
          } else {
              desiredState = BotAIState.DEFAULT; // Moving to site
          }
      }
      // 2. POST-PLANT / HUNT
      else if (bomb.status === BombStatus.PLANTED) {
          desiredState = BotAIState.DEFAULT;
          // Guard the bomb
          desiredGoal = bomb.plantSite || this.currentZoneId;
      }
      else {
          desiredState = BotAIState.DEFAULT;
          desiredGoal = tacticsManager.getGoalZone(this.player, this.side);
      }
    }

    // --- State Transition & Path Calculation ---

    // If goal changed substantially, calculate reaction delay
    if (desiredGoal && desiredGoal !== this.goalZoneId) {
        // Apply Reaction Delay based on Game Sense
        // Game Sense 0-100. Low sense = High delay.
        // Base delay 2 ticks (1s) + up to 10 ticks (5s) for bad sense?
        // 1 tick = 0.5s.
        // Let's say max delay 3 seconds (6 ticks).
        const gameSense = this.player.skills.mental.gameSense;
        const delay = Math.max(0, Math.floor((100 - gameSense) / 20)); // 0 to 5 ticks

        // Only apply delay if we were not already idle? Or always?
        // "CTs at B must wait for a 'Reaction Delay'" implies delay on change.
        if (this.side === TeamSide.CT && bomb.status !== BombStatus.PLANTED) {
             // Only delay rotations, not urgent defuses or saves?
             // Prompt: "Reaction Delay... before pathfinding to A".
             this.reactionTimer = delay;
        } else {
             this.reactionTimer = 0;
        }

        this.goalZoneId = desiredGoal;
        this.aiState = desiredState;

        // Recalculate Path
        const newPath = Pathfinder.findPath(map, this.currentZoneId, this.goalZoneId);
        if (newPath) {
             if (newPath[0] === this.currentZoneId) newPath.shift();
             this.path = newPath;
        } else {
            this.path = [];
        }
    } else if (desiredState !== this.aiState) {
        this.aiState = desiredState;
    }

    // Re-path if path empty but not at goal (dynamic updates?)
    if (this.goalZoneId && this.currentZoneId !== this.goalZoneId && this.path.length === 0) {
        const newPath = Pathfinder.findPath(map, this.currentZoneId, this.goalZoneId);
        if (newPath) {
             if (newPath[0] === this.currentZoneId) newPath.shift();
             this.path = newPath;
        }
    }
  }

  /**
   * Decides the next action for the bot based on state.
   */
  decideAction(map: GameMap): BotAction {
    if (this.status === "DEAD") return { type: "IDLE" };

    // Locked Actions
    if (this.aiState === BotAIState.PLANTING && this.hasBomb) {
         // Check if we are actually on a site to be safe
         const sites = map.data.bombSites;
         if (this.currentZoneId === sites.A || this.currentZoneId === sites.B) {
             return { type: "PLANT" };
         }
    }

    if (this.aiState === BotAIState.DEFUSING) {
         // If we are at the bomb site, try to defuse
         // (MatchSimulator checks if bomb is actually there and planted)
         if (this.goalZoneId && this.currentZoneId === this.goalZoneId) {
             return { type: "DEFUSE" };
         }
    }

    // Movement Logic
    if (this.reactionTimer > 0) {
        return { type: "IDLE" }; // Waiting to react
    }

    // If at goal
    if (this.goalZoneId && this.currentZoneId === this.goalZoneId) {
        return { type: "HOLD" };
    }

    // Move along path
    const moveChance = 0.1 + (this.player.skills.mental.aggression / 200) * 0.8;
    // Boost move chance if SAVING or DEFUSING (Urgent)
    const isUrgent = this.aiState === BotAIState.SAVING || this.aiState === BotAIState.DEFUSING;

    // Granular Movement: If already moving (targetZoneId set), continue moving (handled in Simulator)
    if (this.targetZoneId) {
      return { type: "MOVE", targetZoneId: this.targetZoneId };
    }

    if ((isUrgent || Math.random() < moveChance) && this.path.length > 0) {
      return { type: "MOVE", targetZoneId: this.path[0] };
    } else {
      return { type: "HOLD" };
    }
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.status = "DEAD";
    }
  }
}
