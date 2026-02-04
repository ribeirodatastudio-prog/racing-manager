import { Player } from "@/types";
import { TeamSide } from "./constants";

export { TeamSide };
export type Tactic = "RUSH_A" | "RUSH_B" | "MID_CONTROL" | "DEFAULT" | "FOCUS_A" | "FOCUS_B" | "SPLIT" | "MID_AGGRESSION";

interface TeamStrategy {
  tactic: Tactic;
}

export class TacticsManager {
  private strategies: Record<TeamSide, TeamStrategy>;

  constructor() {
    this.strategies = {
      T: { tactic: "DEFAULT" },
      CT: { tactic: "DEFAULT" }, // CT Default usually means spread out
    };
  }

  setTactic(side: TeamSide, tactic: Tactic) {
    this.strategies[side].tactic = tactic;
  }

  getTactic(side: TeamSide): Tactic {
    return this.strategies[side].tactic;
  }

  /**
   * Returns the target zone ID for a given player based on the current team tactic.
   */
  getGoalZone(player: Player, side: TeamSide): string {
    const tactic = this.strategies[side].tactic;

    if (side === "T") {
      switch (tactic) {
        case "RUSH_B":
        case "FOCUS_B":
          return "b_site";
        case "RUSH_A":
        case "FOCUS_A":
          return "a_site";
        case "MID_CONTROL":
        case "MID_AGGRESSION":
          return "mid";
        case "SPLIT":
          // Simple split: Entry/IGL to A, Support/Lurker to B, AWPer to Mid
          if (player.role === "Entry Fragger" || player.role === "IGL") return "a_site";
          if (player.role === "Support" || player.role === "Lurker") return "b_site";
          return "top_mid";
        case "DEFAULT":
        default:
          // Simple default distribution based on roles
          if (player.role === "Entry Fragger") return "long_doors";
          if (player.role === "Star AWPer") return "top_mid";
          if (player.role === "Support") return "outside_tunnels";
          // Fallback to searching for kills or holding
          return "top_mid";
      }
    } else {
      // CT Side Defaults (Defensive holds)
      switch (tactic) {
        case "FOCUS_A":
          // Stack A: 3-4 players A, 1 B?
          if (player.role === "Lurker") return "b_site"; // 1 B anchor
          return "a_site";
        case "FOCUS_B":
          // Stack B
          if (player.role === "Entry Fragger") return "a_site"; // 1 A anchor
          return "b_site";
        case "MID_AGGRESSION":
          if (player.role === "Star AWPer") return "top_mid"; // Push top mid
          if (player.role === "Entry Fragger") return "lower_tunnels";
          return "mid_doors";
        case "SPLIT":
        case "DEFAULT":
        case "RUSH_A":
        case "RUSH_B":
        default:
          // Simple 2-1-2 setup logic (or similar) based on roles
          if (player.role === "Star AWPer") return "mid_doors"; // Hold mid
          if (player.role === "Entry Fragger") return "long_a"; // Aggressive long
          if (player.role === "Support") return "b_site"; // Anchor B
          if (player.role === "IGL") return "a_site"; // Anchor A
          if (player.role === "Lurker") return "b_tunnels"; // Push B? Or hold B

          // Fallback
          return "ct_spawn";
      }
    }
  }
}
