import { SEGMENT_TYPES, type SegmentType } from './data';
import { type Driver, type Car } from './grid';
import { clamp } from './mathUtils';

// --- A) Core Physics Constants & Tiers ---

export interface TierPhysics {
  maxSpeed: number; // m/s
  maxAccel: number; // m/s²
  maxBraking: number; // m/s²
  maxCorneringG: number; // G-force
}

export const PHYSICS: Record<string, TierPhysics> = {
  tier1: { maxSpeed: 80, maxAccel: 8, maxBraking: 15, maxCorneringG: 3.0 },
  tier2: { maxSpeed: 85, maxAccel: 9, maxBraking: 18, maxCorneringG: 3.5 },
  tier3: { maxSpeed: 90, maxAccel: 10, maxBraking: 22, maxCorneringG: 4.0 },
  tier4: { maxSpeed: 95, maxAccel: 11, maxBraking: 26, maxCorneringG: 4.5 },
  tier5: { maxSpeed: 105, maxAccel: 13, maxBraking: 30, maxCorneringG: 5.5 }, // Increased cap for top tier
};

export class CarPhysics {
  static getPhysicalLimits(tierName: string = 'tier1'): TierPhysics {
    return PHYSICS[tierName] || PHYSICS.tier1;
  }
}

// --- B) Driver Efficiency ---

// Maps skill points (0..380) to Efficiency (0.70..1.05)
export const getDriverEfficiency = (driver: Driver): number => {
  // Use totalStats as proxy for SkillPoints if not explicitly defined
  const points = driver.totalStats || 0;

  // Linear mapping for MVP
  // Min: 0 -> 0.70
  // Max: 380 -> 1.05
  const minEff = 0.70;
  const maxEff = 1.05;
  const maxPoints = 380;

  const ratio = clamp(points / maxPoints, 0, 1);
  return minEff + (maxEff - minEff) * ratio;
};

// --- C) Track Segment Physics ---

export interface SegmentPhysicsDef {
  length: number; // meters
  radius?: number; // meters (Infinity if straight)
  camber?: number; // degrees (bonus grip)
  maxSpeedLimit?: number; // Optional hard limit (e.g. pit lane)
}

// Define physical properties for named segment types
const SEGMENT_DEFS: Record<SegmentType, SegmentPhysicsDef> = {
  [SEGMENT_TYPES.LOW_SPEED_CORNER]: { length: 100, radius: 30 },
  [SEGMENT_TYPES.MEDIUM_SPEED_CORNER]: { length: 200, radius: 80 },
  [SEGMENT_TYPES.HIGH_SPEED_CORNER]: { length: 300, radius: 200 },
  [SEGMENT_TYPES.SHORT_STRAIGHT]: { length: 250 },
  [SEGMENT_TYPES.MEDIUM_STRAIGHT]: { length: 500 },
  [SEGMENT_TYPES.LONG_STRAIGHT]: { length: 900 },
};

export const getSegmentPhysics = (type: SegmentType): SegmentPhysicsDef => {
  return SEGMENT_DEFS[type] || { length: 100 };
};

// Calculate Max Cornering Speed based on Grip (G) and Radius (m)
// v = sqrt(R * G * 9.81)
export const getCornerSpeedLimit = (radius: number | undefined, gripG: number): number => {
  if (!radius || radius === Infinity) return Infinity;
  return Math.sqrt(radius * gripG * 9.81);
};

// --- D) Solver Engine ---

export interface SegmentResult {
  time: number;
  vExit: number;
  avgSpeed: number;
}

/**
 * Solves traversal for a single segment using kinematics.
 *
 * @param vEntry Entry velocity (m/s)
 * @param length Segment length (m)
 * @param accel Effective acceleration (m/s²)
 * @param braking Effective braking (m/s²) (>0)
 * @param vMaxSegment Max achievable speed in this segment (Car Max vs Corner Limit)
 * @param vTargetExit Target exit speed (limit of next segment)
 */
export const solveSegment = (
  vEntry: number,
  length: number,
  accel: number,
  braking: number,
  vMaxSegment: number,
  vTargetExit: number
): SegmentResult => {
  // 1. Determine Effective Limit for this segment
  // We can accelerate up to vMaxSegment, but must exit at <= vTargetExit

  // Case A: Braking required immediately?
  // If vEntry > vTargetExit, we might need to brake.
  // Actually, check if vEntry > vMaxSegment (e.g. coming from fast straight into slow corner entry?)
  // No, vMaxSegment is the limit *of this segment*.
  // If this is a corner, vMaxSegment is low. If vEntry > vMaxSegment, we must brake *during* this segment
  // (or ideally before, but simpler model: brake in segment).
  // But usually vTargetExit is the constraint for the *end* of the segment.

  // Refined Logic:
  // We want to reach the highest possible speed, but ensure v_final <= vTargetExit.
  // AND at no point can we exceed vMaxSegment (if it's a corner limit).
  // Actually, if it's a corner, vMaxSegment applies throughout.

  // Simplification:
  // The effective speed cap for the *cruise* phase is vMaxSegment.
  // The effective speed cap for the *exit* is vTargetExit.

  // We simulate in phases: Accel -> Cruise -> Brake.
  // Or: Brake -> Cruise/Accel.

  let currentV = vEntry;
  let remainingDist = length;
  let totalTime = 0;

  // Step 1: Enforce Segment Limit immediately?
  // If we enter a corner faster than its limit, we must scrub speed.
  // Realistically drivers brake *before*.
  // Model: If vEntry > vMaxSegment, we are "Hot". Apply braking penalty or assume braking happened in previous segment?
  // The "Look Ahead" logic in the caller should pass vTargetExit = CurrentSegmentCornerSpeed for the *previous* segment.
  // So vEntry should already be <= vMaxSegment ideally.
  // If not (e.g. first implementation), we brake immediately.

  if (currentV > vMaxSegment) {
    // Forced braking to limit
    const vTarget = vMaxSegment;
    const distBrake = (currentV * currentV - vTarget * vTarget) / (2 * braking);

    if (distBrake > remainingDist) {
      // Crash / Overshoot logic? For now, just clamp and add penalty time?
      // Or just standard kinematic braking for the whole distance
      const t = (currentV - vTarget) / braking; // approximate
      // Let's stick to standard kinematic updates.
    }

    // Calculate time to brake
    const tBrake = (currentV - vTarget) / braking;
    // We consume some distance
    // d = (v + u)/2 * t
    const dBrake = ((currentV + vTarget) / 2) * tBrake;

    // If dBrake > remainingDist, we overshoot.
    // For MVP, just assume we brake as much as possible within dist.
    const effectiveDist = Math.min(dBrake, remainingDist);
    // Recalc time if distance constrained?
    // Let's keep it simple: consume distance, update time.

    if (effectiveDist >= remainingDist) {
        // We spend the whole segment braking
        // d = (v^2 - vf^2)/(2a) -> vf = sqrt(v^2 - 2ad)
        // vf = sqrt(currentV^2 - 2 * braking * remainingDist)
        const vExitCalc = Math.sqrt(Math.max(0, currentV * currentV - 2 * braking * remainingDist));
        const t = (2 * remainingDist) / (currentV + vExitCalc);
        return { time: t, vExit: vExitCalc, avgSpeed: remainingDist/t };
    }

    totalTime += tBrake;
    remainingDist -= effectiveDist;
    currentV = vTarget;
  }

  // Now currentV <= vMaxSegment.

  // Step 2: Can we accelerate?
  // We want to exit at vTargetExit.
  // But we can reach vMaxSegment in between.

  // Calculate distance needed to brake from vMaxSegment to vTargetExit
  // d_brake_end = (vMax^2 - vTarget^2) / (2b)
  // If vTargetExit >= vMaxSegment, then d_brake_end = 0.

  // If vTargetExit < currentV, we just need to brake more?
  // (Handled by checking logic below)

  // Define vPeak = vMaxSegment.

  // Distance to accel from currentV to vPeak
  // d_accel = (vPeak^2 - currentV^2) / (2a)

  // Distance to brake from vPeak to vTargetExit
  // d_brake = (vPeak^2 - vTargetExit^2) / (2b) (Only if vPeak > vTargetExit)

  // If d_accel + d_brake <= remainingDist:
  // We can reach max speed, cruise, then brake.

  // If not, we don't reach vPeak. We reach vApex.
  // Distance to accel to vApex + Distance to brake to vTarget = remainingDist
  // (vApex^2 - v0^2)/2a + (vApex^2 - vExit^2)/2b = D
  // vApex^2 (1/2a + 1/2b) = D + v0^2/2a + vExit^2/2b
  // Solve for vApex.

  const finalTarget = Math.min(vTargetExit, vMaxSegment);

  // Check if we are already faster than final target and need to brake
  if (currentV > finalTarget) {
      // We are in 'Brake' mode (or Coast then Brake).
      // Assuming we can't accelerate since we are above target?
      // Actually we might be below vMaxSegment, but above vTargetExit.
      // e.g. vCurrent=80, vMax=100, vExit=50.
      // Can we accel to 100 then brake to 50?
      // Yes, if distance allows.
  }

  let vApex = vMaxSegment;

  const distToAccelMax = (currentV < vMaxSegment)
    ? (vMaxSegment * vMaxSegment - currentV * currentV) / (2 * accel)
    : 0;

  const distToBrakeFromMax = (vMaxSegment > finalTarget)
    ? (vMaxSegment * vMaxSegment - finalTarget * finalTarget) / (2 * braking)
    : 0;

  if (distToAccelMax + distToBrakeFromMax <= remainingDist) {
      // Phase 1: Accel to Max
      if (distToAccelMax > 0) {
          const t = (vMaxSegment - currentV) / accel;
          totalTime += t;
          remainingDist -= distToAccelMax;
          currentV = vMaxSegment;
      }

      // Phase 2: Cruise
      const cruiseDist = remainingDist - distToBrakeFromMax;
      if (cruiseDist > 0) {
          const t = cruiseDist / vMaxSegment;
          totalTime += t;
          remainingDist -= cruiseDist;
      }

      // Phase 3: Brake
      if (distToBrakeFromMax > 0) {
          const t = (vMaxSegment - finalTarget) / braking;
          totalTime += t;
          remainingDist -= distToBrakeFromMax;
          currentV = finalTarget;
      }
  } else {
      // Cannot reach Max. Calculate Apex speed.
      // (vApex^2 - currentV^2)/(2a) + (vApex^2 - finalTarget^2)/(2b) = remainingDist
      // vApex^2 * (1/2a + 1/2b) = remainingDist + currentV^2/2a + finalTarget^2/2b
      // Let K = (1/2a + 1/2b)
      // RHS = remainingDist + currentV^2/2a + finalTarget^2/2b
      // vApex = sqrt(RHS / K)

      // Handle edge case where accel or brake is 0? (Should limit inputs)
      const safeAccel = Math.max(accel, 0.1);
      const safeBrake = Math.max(braking, 0.1);

      const K = (1 / (2 * safeAccel)) + (1 / (2 * safeBrake));
      const RHS = remainingDist + (currentV * currentV) / (2 * safeAccel) + (finalTarget * finalTarget) / (2 * safeBrake);

      vApex = Math.sqrt(RHS / K);

      // Cap at vMaxSegment (should logically be handled, but floating point safety)
      vApex = Math.min(vApex, vMaxSegment);

      // Phase 1: Accel to Apex
      // Note: If vApex < currentV, this logic implies we brake?
      // The formula handles "accel" as change in energy.
      // If vApex < currentV, (vApex^2 - v0^2) is negative, implying negative distance?
      // No, distance is absolute.
      // If vApex < currentV, it means we must brake ENTIRELY.
      // The formula assumes Accel Up then Brake Down.

      if (vApex >= currentV) {
          const d1 = (vApex * vApex - currentV * currentV) / (2 * safeAccel);
          const t1 = (vApex - currentV) / safeAccel;

          const d2 = (vApex * vApex - finalTarget * finalTarget) / (2 * safeBrake);
          const t2 = (vApex - finalTarget) / safeBrake;

          totalTime += t1 + t2;
          currentV = finalTarget;
      } else {
          // We started too fast for even the apex solution. Just brake all the way.
          // d = (v^2 - vf^2)/2b
          // We need to cover 'remainingDist'.
          // vf = sqrt(v^2 - 2bd)
          const vf = Math.sqrt(Math.max(0, currentV * currentV - 2 * safeBrake * remainingDist));
          const t = (currentV - vf) / safeBrake; // approximation
          const realT = (2 * remainingDist) / (currentV + vf);
          totalTime += realT;
          currentV = vf;
      }
  }

  return {
    time: totalTime,
    vExit: currentV,
    avgSpeed: length / totalTime
  };
};
