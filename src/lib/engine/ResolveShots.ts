import { Bot } from "./Bot";
import { EngagementContext } from "./engagement";
import { Weapon } from "@/types/Weapon";
import { calculateDamage, HitGroup } from "./DamageUtils";
import { ParticipantResult } from "./types";

// --- Types ---

export interface EngagementShootingState {
    elapsedMs: number;
    attackerShotsFired: number;
    defenderShotsFired: number;
    attackerShotAccumulator: number;
    defenderShotAccumulator: number;
    attackerSprayIndex: number;
    defenderSprayIndex: number;
    attackerHP: number;
    defenderHP: number;
}

export interface ShotResolutionResult {
    winnerId: string | null;
    attackerResult: ParticipantResult;
    defenderResult: ParticipantResult;
    timeSpentMs: number;
    events: string[];
    endedBecause: "death" | "timeout" | "disengage";
}

// --- Helpers ---

function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
}

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

// --- Core Logic ---

export function resolveShots(
    attacker: Bot,
    defender: Bot,
    attackerWeapon: Weapon,
    defenderWeapon: Weapon,
    context: EngagementContext,
    distance: number,
    tickMs: number = 100,
    maxMs: number = 1200
): ShotResolutionResult {
    const events: string[] = [];

    // 1. Initialize State
    const state: EngagementShootingState = {
        elapsedMs: 0,
        attackerShotsFired: 0,
        defenderShotsFired: 0,
        attackerShotAccumulator: 0.0,
        defenderShotAccumulator: 0.0,
        attackerSprayIndex: 0,
        defenderSprayIndex: 0,
        attackerHP: attacker.hp,
        defenderHP: defender.hp,
    };

    // Tracking for result
    const attackerLog: ParticipantResult = {
        id: attacker.id,
        damage: 0,
        hits: 0,
        timeTaken: Infinity,
        isHeadshot: false,
        bulletsFired: 0,
        fired: false
    };

    const defenderLog: ParticipantResult = {
        id: defender.id,
        damage: 0,
        hits: 0,
        timeTaken: Infinity,
        isHeadshot: false,
        bulletsFired: 0,
        fired: false
    };

    // 2. Calculate Start Delays (Initiative)
    const attackerStartDelay = calculateStartDelay(attacker, context, true);
    const defenderStartDelay = calculateStartDelay(defender, context, false);

    events.push(`Start Delays: ${attacker.player.name}=${attackerStartDelay}ms, ${defender.player.name}=${defenderStartDelay}ms`);

    // 3. Simulation Loop
    while (state.elapsedMs < maxMs) {

        // --- Attacker Logic ---
        if (state.elapsedMs >= attackerStartDelay && state.attackerHP > 0 && attackerWeapon.magazineSize > 0) {
            attackerLog.fired = true;
            processShootingStep(
                attacker, defender, attackerWeapon,
                state, context, distance,
                "attacker",
                tickMs,
                attackerLog
            );

            if (state.defenderHP <= 0) {
                attackerLog.timeTaken = state.elapsedMs;
                return {
                    winnerId: attacker.id,
                    attackerResult: attackerLog,
                    defenderResult: defenderLog,
                    timeSpentMs: state.elapsedMs,
                    events,
                    endedBecause: "death"
                };
            }
        }

        // --- Defender Logic ---
        if (state.elapsedMs >= defenderStartDelay && state.defenderHP > 0 && defenderWeapon.magazineSize > 0) {
            defenderLog.fired = true;
            processShootingStep(
                defender, attacker, defenderWeapon,
                state, context, distance,
                "defender",
                tickMs,
                defenderLog
            );

            if (state.attackerHP <= 0) {
                defenderLog.timeTaken = state.elapsedMs;
                return {
                    winnerId: defender.id,
                    attackerResult: attackerLog,
                    defenderResult: defenderLog,
                    timeSpentMs: state.elapsedMs,
                    events,
                    endedBecause: "death"
                };
            }
        }

        // Increment Time
        state.elapsedMs += tickMs;
    }

    // Timeout
    attackerLog.timeTaken = maxMs;
    defenderLog.timeTaken = maxMs;

    let winnerId = null;
    if (attackerLog.damage > defenderLog.damage) winnerId = attacker.id;
    else if (defenderLog.damage > attackerLog.damage) winnerId = defender.id;

    return {
        winnerId,
        attackerResult: attackerLog,
        defenderResult: defenderLog,
        timeSpentMs: maxMs,
        events,
        endedBecause: "timeout"
    };
}

function calculateStartDelay(bot: Bot, context: EngagementContext, isAttacker: boolean): number {
    // Stats 0..100
    const rt = bot.player.skills.physical.reactionTime;
    const rtFactor = 1 - (rt / 100);

    let delay = 120; // Base baseline
    delay += rtFactor * 120; // +0 to 120ms based on skill

    // Context Modifiers
    if (isAttacker) {
        // Attacker Peeking
        if (context.peekType === "WIDE" || context.peekType === "SWING") {
            delay += 15; // Moving into aim takes a split second
        }
    } else {
        // Defender
        if (context.defenderHolding && context.peekType !== "HOLD") {
            delay -= 30; // Holding angle bonus
        }
    }

    // Flash
    const flashedAmount = isAttacker ? context.flashedAttacker : context.flashedDefender;
    if (flashedAmount > 0) {
        delay += flashedAmount * 200;
    }

    return clamp(delay, 40, 500);
}

function processShootingStep(
    shooter: Bot,
    target: Bot,
    weapon: Weapon,
    state: EngagementShootingState,
    context: EngagementContext,
    distance: number,
    role: "attacker" | "defender",
    tickMs: number,
    log: ParticipantResult
) {
    const isAttacker = role === "attacker";

    // 1. Calculate shots for this tick
    const shotsPerSecond = weapon.rpm / 60;
    const shotsPerTickFloat = shotsPerSecond * (tickMs / 1000);

    let accumulator = isAttacker ? state.attackerShotAccumulator : state.defenderShotAccumulator;
    accumulator += shotsPerTickFloat;

    const shotsThisTick = Math.floor(accumulator);
    accumulator -= shotsThisTick;

    if (isAttacker) state.attackerShotAccumulator = accumulator;
    else state.defenderShotAccumulator = accumulator;

    if (shotsThisTick === 0) return;

    // 2. Resolve each shot
    for (let i = 0; i < shotsThisTick; i++) {
        // Increment spray index
        const sprayIndex = isAttacker ? state.attackerSprayIndex : state.defenderSprayIndex;
        if (isAttacker) state.attackerSprayIndex++;
        else state.defenderSprayIndex++;

        if (isAttacker) state.attackerShotsFired++;
        else state.defenderShotsFired++;
        log.bulletsFired++;

        // Calculate Hit Probability
        const pHit = calculateHitProb(shooter, weapon, context, distance, sprayIndex, isAttacker);

        if (Math.random() < pHit) {
            // Hit!
            log.hits++;

            // Head vs Body
            const targetCover = isAttacker ? context.defenderCover : context.attackerCover;
            const pHeadAdjusted = calculateHeadProb(shooter, weapon, targetCover, sprayIndex);

            let hitGroup: HitGroup = "CHEST";
            if (Math.random() < pHeadAdjusted) {
                hitGroup = "HEAD";
            } else {
                // Body distribution
                const roll = Math.random();
                if (roll < 0.6) hitGroup = "CHEST";
                else if (roll < 0.85) hitGroup = "STOMACH";
                else hitGroup = "LEGS";
            }

            // Damage
            const dmgResult = calculateDamage(weapon, hitGroup, target, distance);
            const dmg = dmgResult.damage;

            // Update State
            if (isAttacker) state.defenderHP -= dmg;
            else state.attackerHP -= dmg;

            log.damage += dmg;
            if (hitGroup === "HEAD") log.isHeadshot = true;

            if (isAttacker && state.defenderHP <= 0) return; // Target dead
            if (!isAttacker && state.attackerHP <= 0) return;
        } else {
            // Miss
        }
    }
}

function calculateHitProb(
    shooter: Bot,
    weapon: Weapon,
    context: EngagementContext,
    distance: number,
    sprayIndex: number,
    isAttacker: boolean
): number {
    // Stats 0..100
    const tech = shooter.player.skills.technical;
    const mental = shooter.player.skills.mental;

    const FB = tech.firstBulletPrecision / 100;
    const CH = tech.crosshairPlacement / 100;
    const POS = mental.positioning / 100;
    const CP = mental.composure / 100;
    // const MV = 0.5;

    const aimBase = 0.40 * CH + 0.35 * FB + 0.15 * POS + 0.10 * CP;

    // Penalties
    // const distPenalty = clamp01(distance / 2000) * 0.25;
    const distFactor = clamp01(distance / 2000) * 0.25;

    const targetCover = isAttacker ? context.defenderCover : context.attackerCover;
    const coverPenalty = targetCover * 0.30;

    // Movement Penalty
    const moving = isAttacker ? context.attackerMoving : context.defenderMoving;
    let movePenalty = 0;
    if (moving) {
        movePenalty = 0.25;
    }

    // Flash
    const flashed = isAttacker ? context.flashedAttacker : context.flashedDefender;
    const flashPenalty = flashed * 0.50;

    // Angle/Peek
    let anglePenalty = 0;
    if (isAttacker) {
        if (context.defenderHolding && context.peekType !== "HOLD") anglePenalty = 0.10;
    } else {
        if (context.defenderHolding && context.peekType !== "HOLD") anglePenalty = -0.05; // Bonus
    }

    // Cross Zone
    const crossPenalty = context.isCrossZone ? 0.05 : 0;

    // Spray Penalty
    let sprayPenalty = 0;
    if (sprayIndex > 0) {
        const growth = (sprayIndex <= 1) ? 0 : Math.pow(sprayIndex - 1, 1.15);
        const control = 0.55 * CP + 0.45 * 0.5;
        sprayPenalty = clamp01((growth / 25) * (1.15 - control)) * 0.35;
    }

    let prob = aimBase - (distFactor + coverPenalty + movePenalty + flashPenalty + crossPenalty + anglePenalty + sprayPenalty);

    // Weapon Inaccuracy Base
    // const weaponAcc = (100 - weapon.standingInaccuracy) / 100;
    const weaponFactor = clamp01(weapon.standingInaccuracy / 50); // 7/50 = 0.14 penalty
    prob -= weaponFactor;

    return clamp(prob, 0.02, 0.95);
}

function calculateHeadProb(
    shooter: Bot,
    weapon: Weapon,
    targetCover: number,
    sprayIndex: number
): number {
    const tech = shooter.player.skills.technical;
    const FB = tech.firstBulletPrecision / 100;
    const CH = tech.crosshairPlacement / 100;

    let pHead = 0.10 + 0.20 * FB + 0.10 * CH;

    // Spray Reduction
    pHead *= clamp01(1 - (sprayIndex / 12));

    // Cover Reduction
    pHead *= (1 - targetCover * 0.65);

    // Clamp
    return clamp(pHead, 0.02, 0.80);
}
