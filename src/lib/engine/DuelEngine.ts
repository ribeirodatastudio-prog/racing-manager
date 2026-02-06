import { Bot } from "./Bot";
import { EngagementContext } from "./engagement";
import { resolveShots } from "./ResolveShots";
import { DuelResult, ParticipantResult } from "./types";

export class DuelEngine {
  /**
   * Calculates the outcome of a duel between an initiator (Attacker) and a target (Defender).
   * Uses time-based simulation (resolveShots).
   */
  public static calculateOutcome(
      initiator: Bot,
      target: Bot,
      distance: number,
      isCrossZone: boolean = false,
      targetCanFire: boolean = true,
      context?: EngagementContext
  ): DuelResult {

    // 1. Resolve Weapons
    const initiatorWeapon = initiator.getEquippedWeapon();
    let targetWeapon = target.getEquippedWeapon();

    // Fallback if no weapon (shouldn't happen for active bots)
    if (!initiatorWeapon) {
        // Give a default knife/hands?
        // Or just fail.
        return this.createEmptyResult(initiator, target, ["Initiator has no weapon"]);
    }
    if (!targetWeapon) {
        // If target has no weapon, they can't fire.
        targetCanFire = false;
        // Mock weapon to prevent crashes in resolveShots if it assumes weapon exists
        targetWeapon = { ...initiatorWeapon, rpm: 0, magazineSize: 0, name: "Hands" };
    }

    // Handle targetCanFire = false by disabling their weapon
    if (!targetCanFire) {
        targetWeapon = { ...targetWeapon, rpm: 0, magazineSize: 0 };
    }

    // 2. Ensure Context
    const safeContext: EngagementContext = context || {
        isCrossZone,
        peekType: "HOLD",
        defenderHolding: false,
        attackerMoving: false,
        defenderMoving: false,
        attackerCover: 0,
        defenderCover: 0,
        flashedAttacker: 0,
        flashedDefender: 0,
        smoked: false,
        distance
    };

    // 3. Run Simulation
    const result = resolveShots(initiator, target, initiatorWeapon, targetWeapon, safeContext, distance);

    // 4. Map Result
    return {
        winnerId: result.winnerId,
        log: result.events,
        publicLog: result.events, // Filter if needed?
        initiator: result.attackerResult,
        target: result.defenderResult
    };
  }

  public static getWinProbability(initiator: Bot, target: Bot, distance: number, iterations: number = 10): { initiatorWinRate: number, targetWinRate: number } {
    let initiatorWins = 0;
    const isCrossZone = distance > 200;

    // We assume standard conditions for probability check
    const context: EngagementContext = {
        isCrossZone,
        peekType: "HOLD",
        defenderHolding: false,
        attackerMoving: false,
        defenderMoving: false,
        attackerCover: 0,
        defenderCover: 0,
        flashedAttacker: 0,
        flashedDefender: 0,
        smoked: false,
        distance
    };

    for (let i = 0; i < iterations; i++) {
        const res = this.calculateOutcome(initiator, target, distance, isCrossZone, true, context);
        if (res.winnerId === initiator.id) {
            initiatorWins++;
        }
    }

    const initiatorWinRate = initiatorWins / iterations;
    return {
      initiatorWinRate,
      targetWinRate: 1 - initiatorWinRate
    };
  }

  private static createEmptyResult(initiator: Bot, target: Bot, log: string[]): DuelResult {
      return {
          winnerId: null,
          log,
          publicLog: log,
          initiator: {
              id: initiator.id,
              damage: 0,
              hits: 0,
              timeTaken: Infinity,
              isHeadshot: false,
              bulletsFired: 0,
              fired: false
          },
          target: {
              id: target.id,
              damage: 0,
              hits: 0,
              timeTaken: Infinity,
              isHeadshot: false,
              bulletsFired: 0,
              fired: false
          }
      };
  }
}
