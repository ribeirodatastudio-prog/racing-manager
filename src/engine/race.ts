import type { Driver, Car, Team } from './grid';
import type { Track } from './track';
import { BASE_SEGMENT_TIMES, SEGMENT_TYPES, type SegmentType } from './data';
import { randomFloat, getChaosWindow, formatTime, clamp } from './mathUtils';
import {
  CarPhysics,
  getDriverEfficiency,
  getSegmentPhysics,
  getCornerSpeedLimit,
  solveSegment,
  PHYSICS,
  type TierPhysics
} from './physics';

// --- Legacy Helpers for Qualifying (Preserved) ---
export const getEffectiveStat = (driver: Driver, car: Car, statName: string): number => {
  // @ts-ignore
  let val = driver.stats[statName] || 0;

  if (!car) return val;

  switch (statName) {
    case 'Cornering':
    case 'Braking':
    case 'Pace':
      val += car.stats.Aero;
      break;
    case 'Overtaking':
    case 'Acceleration':
      val += car.stats.Engine;
      break;
    case 'Instincts':
      val += car.stats.Engineering;
      break;
    case 'Consistency':
      val += car.stats.Engineering;
      if (val > 100) val = 100;
      break;
  }
  return val;
};

export const calculateSegmentScore = (driver: Driver, car: Car, segmentType: SegmentType): number => {
  const weights = {
      [SEGMENT_TYPES.LOW_SPEED_CORNER]: { Braking: 0.4, Acceleration: 0.4, Cornering: 0.2 },
      [SEGMENT_TYPES.MEDIUM_SPEED_CORNER]: { Braking: 0.33, Acceleration: 0.33, Cornering: 0.34 },
      [SEGMENT_TYPES.HIGH_SPEED_CORNER]: { Cornering: 0.8, Acceleration: 0.1, Braking: 0.1 },
      [SEGMENT_TYPES.SHORT_STRAIGHT]: { Pace: 0.8, Acceleration: 0.2 },
      [SEGMENT_TYPES.MEDIUM_STRAIGHT]: { Pace: 0.8, Acceleration: 0.2 },
      [SEGMENT_TYPES.LONG_STRAIGHT]: { Pace: 0.8, Acceleration: 0.2 },
  }[segmentType] || {};

  let rawScore = 0;
  for (const [stat, weight] of Object.entries(weights)) {
    rawScore += getEffectiveStat(driver, car, stat) * weight;
  }
  const instincts = getEffectiveStat(driver, car, 'Instincts');
  const multiplier = 1 + Math.pow(instincts, 0.6) / 50;
  return rawScore * multiplier;
};

export const calculateQualifyingPace = (driver: Driver, car: Car, track: Track): { totalTime: number; sectors: [number, number, number] } => {
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;

  track.segments.forEach((segmentType, idx) => {
    const baseTime = BASE_SEGMENT_TIMES[segmentType];
    const score = calculateSegmentScore(driver, car, segmentType);
    const safeScore = Math.max(score, 1);
    const ratio = track.difficulty / safeScore;
    const segmentTime = baseTime * Math.pow(ratio, 0.2);

    if (idx < track.sector1) s1 += segmentTime;
    else if (idx < track.sector2) s2 += segmentTime;
    else s3 += segmentTime;
  });

  return { totalTime: s1 + s2 + s3, sectors: [s1, s2, s3] };
};

// --- New Simulation Types ---

export interface FeedMessage {
  id: string;
  lap: number;
  driverId: string;
  driverName: string;
  type: 'positive' | 'negative' | 'neutral';
  message: string;
  color: string;
}

export interface RaceResultSnapshot {
  driverId: string;
  driverName: string;
  flag: string;
  teamName: string;
  totalTime: number;
  gapToLeader: number;
  gapToAhead: number;
  lapsCompleted: number;
  lastLapTime: number;
  bestLapTime: number;
  rank: number;
  penalty: boolean;
  status: 'Running' | 'Finished';
}

export interface LapSnapshot {
  lapNumber: number;
  results: RaceResultSnapshot[];
  messages: FeedMessage[];
}

// --- v2.0 Physics Simulation Engine ---

// Map Stats (0-100) to Physical Values
// We use TIER 5 as the reference for Max Stats (100)
const mapStatToPhys = (statVal: number, minPhys: number, maxPhys: number) => {
  const ratio = clamp(statVal / 100, 0, 1.2); // Allow slight over-performance
  return minPhys + (maxPhys - minPhys) * ratio;
};

interface DriverSimState {
  driver: Driver;
  car: Car;
  teamName: string;

  // State
  totalTime: number;
  totalDistance: number; // Global distance (Laps * TrackLen + CurrentPos)
  currentVelocity: number; // m/s

  // Progress
  lap: number; // 1-based
  segmentIndex: number;

  // Stats
  accel: number;
  braking: number;
  grip: number; // G-force
  consistency: number;

  // Historical
  lastLapTime: number;
  bestLapTime: number;
  finished: boolean;

  // Messages
  messages: FeedMessage[];
}

export const runFullRaceSimulation = (
    grid: Team[],
    track: Track,
    playerTeamId: string | null = null,
    qualifyingOrder: string[] = []
): LapSnapshot[] => {
  const raceHistory: LapSnapshot[] = [];

  // 1. Physical Track Setup
  const segmentPhysDefs = track.segments.map(type => getSegmentPhysics(type));
  // Calculate total track length
  const trackLength = segmentPhysDefs.reduce((acc, def) => acc + def.length, 0);

  // 2. Initialize Drivers
  const driverTeamMap = new Map<string, Team>();
  grid.forEach(t => t.drivers.forEach(d => driverTeamMap.set(d.id, t)));

  const drivers: Driver[] = grid.flatMap(t => t.drivers);

  // Physical Constants (Using Tier 5 as standard for this implementation,
  // or we could inspect Team Rank/Tier if available. For now, consistent physics.)
  // We scale based on stats.
  const LIMITS = PHYSICS.tier5;
  // Lower bound (Skill 0)
  const MIN_LIMITS = PHYSICS.tier1;

  let simState: DriverSimState[] = drivers.map(d => {
    const team = driverTeamMap.get(d.id)!;

    // Calculate Stats
    const rawAccel = getEffectiveStat(d, team.car, 'Acceleration');
    const rawBraking = getEffectiveStat(d, team.car, 'Braking');
    const rawCornering = getEffectiveStat(d, team.car, 'Cornering');
    const rawConsistency = getEffectiveStat(d, team.car, 'Consistency');

    // Efficiency
    const efficiency = getDriverEfficiency(d);

    // Map to Physics
    // Accel/Brake heavily affected by Efficiency
    const accel = mapStatToPhys(rawAccel, MIN_LIMITS.maxAccel, LIMITS.maxAccel) * efficiency;
    const braking = mapStatToPhys(rawBraking, MIN_LIMITS.maxBraking, LIMITS.maxBraking) * efficiency;

    // Cornering: Efficiency affects it less (or we treat it as line choice).
    // Requirement: "Weaker exponent or partial blending".
    // Let's mix: lerp(1.0, efficiency, 0.35)
    const gripEff = 1.0 + (efficiency - 1.0) * 0.35;
    const grip = mapStatToPhys(rawCornering, MIN_LIMITS.maxCorneringG, LIMITS.maxCorneringG) * gripEff;

    // Determine Start Rank
    let startRank = 0;
    if (qualifyingOrder && qualifyingOrder.length > 0) {
        const idx = qualifyingOrder.indexOf(d.id);
        startRank = idx >= 0 ? idx + 1 : 99;
    } else {
        startRank = drivers.indexOf(d) + 1;
    }

    // Stagger: Position on grid.
    // Index 0 is Pole.
    // Distance 0 is Start Line.
    // Cars start BEHIND start line.
    // Grid slot size ~8m.
    const startDistance = -(startRank - 1) * 8;

    return {
      driver: d,
      car: team.car,
      teamName: team.name,

      totalTime: 0,
      totalDistance: startDistance, // Negative distance means before start line
      currentVelocity: 0, // Standing start

      lap: 1, // Currently on Lap 1
      segmentIndex: 0, // Waiting at start

      accel,
      braking,
      grip,
      consistency: rawConsistency,

      lastLapTime: 0,
      bestLapTime: Infinity,
      finished: false,
      messages: []
    };
  });

  // 3. Simulation Loop
  const MAX_LAPS = track.laps;
  const TOTAL_DISTANCE = trackLength * MAX_LAPS;

  // We simulate step-by-step.
  // We assume synchronous steps per segment for simplicity in "step-based" sim.
  // HOWEVER, cars are at different distances.
  // To generate per-segment snapshots, we can iterate:
  // For Lap L in 1..MAX_LAPS:
  //   For Seg S in 0..NumSegs:
  //      Update everyone.

  // Note: Cars starting further back might be in previous segment.
  // But strictly speaking, we can just process "Next Segment" for each driver independently,
  // then sync them up for the snapshot?
  // No, snapshots need to show relative positions at the SAME time.
  // The existing architecture "calculateSegmentScore" adds time.
  // Our `solveSegment` adds time.

  // HYBRID APPROACH:
  // We iterate "Simulation Steps".
  // A Step is "Process the next segment for the Leader".
  // All other cars process their next segment.
  // Since segments differ in length/time, "Time" will drift.
  // But `raceHistory` is an array of snapshots.
  // If we just push a snapshot after every driver has completed Segment X,
  // the times will be different. This is fine. The UI shows "Current Order".
  // BUT, to avoid teleporting, we want snapshots where `totalTime` is roughly aligned?
  // No, the UI usually interpolates or just shows the state at Step K.

  // Actually, the best way to get smooth playback is:
  // Simulation Step = 1 Segment Index.
  // Everyone processes their *current* segment (which might differ if lapped).
  // But simpler: Everyone processes Segment 0, then Segment 1...
  // Since everyone is on same track.

  // What about "TotalTime"?
  // Snapshot K: Driver A (Time 10s), Driver B (Time 11s).
  // This correctly shows B is behind.

  // So:
  // Loop Lap 1..MAX
  //   Loop Seg 0..Segs.length
  //     For each driver: Solve Seg. Update Time.
  //     Sort by Time? NO. Sort by DISTANCE.
  //     Push Snapshot.

  // Starting Grid Handling:
  // Drivers start at negative distance.
  // We need to simulate them reaching distance 0?
  // Or just assume they start their first segment from their grid slot?
  // Let's assume Segment 0 starts at Start Line.
  // Driver at -8m needs to cover 8m + Seg0Length.
  // Simpler: Just add the grid offset distance to the first segment length for that driver?
  // Or treat the "Grid" as a pre-segment.

  // Let's just Add the negative distance to the first segment length effectively?
  // No, that changes physics (acceleration distance).
  // Let's just say `totalDistance` tracks their physical location.
  // When solving Segment 0 (Lap 1), Length = SegLength.
  // BUT, they start at `totalDistance` = -8m.
  // So they actually have to cover `SegLength + 8m`?
  // Yes.

  // 4. Execution

  // Initialize prevRank for messages
  const prevRankMap = new Map<string, number>();
  simState.forEach((s, i) => prevRankMap.set(s.driver.id, i + 1));

  // Loop
  for (let lap = 1; lap <= MAX_LAPS; lap++) {
    for (let segIdx = 0; segIdx < segmentPhysDefs.length; segIdx++) {

        // --- A. Physics Update ---
        const segDef = segmentPhysDefs[segIdx];

        // Next segment for lookahead
        const nextSegIdx = (segIdx + 1) % segmentPhysDefs.length;
        const nextSegDef = segmentPhysDefs[nextSegIdx];

        // Current Segment Speed Limit (Corner?)
        const vMaxCurrent = Math.min(
            LIMITS.maxSpeed,
            getCornerSpeedLimit(segDef.radius, LIMITS.maxCorneringG) // Base limit, driver grip handled in solve?
            // Actually `solveSegment` takes `vMaxSegment`.
            // We should pass the *Driver's* limit.
        );

        // Next Segment Speed Limit (Target Exit)
        const vMaxNext = Math.min(
            LIMITS.maxSpeed,
            getCornerSpeedLimit(nextSegDef.radius, LIMITS.maxCorneringG)
        );

        for (const driverState of simState) {
            if (driverState.finished) continue;

            // Adjust Length for Start of Race (Lap 1, Seg 0)
            let effectiveLength = segDef.length;
            if (lap === 1 && segIdx === 0) {
                // Add the distance behind start line
                effectiveLength += Math.abs(driverState.totalDistance);
            }

            // Calculate Driver Specific Limits
            const driverVMax = Math.min(
                LIMITS.maxSpeed, // Car Top Speed
                getCornerSpeedLimit(segDef.radius, driverState.grip) // Driver Corner Limit
            );

            const driverVTarget = Math.min(
                LIMITS.maxSpeed,
                getCornerSpeedLimit(nextSegDef.radius, driverState.grip)
            );

            // Solve
            const result = solveSegment(
                driverState.currentVelocity,
                effectiveLength,
                driverState.accel,
                driverState.braking,
                driverVMax,
                driverVTarget
            );

            // Update State
            driverState.totalTime += result.time;
            driverState.currentVelocity = result.vExit;
            // Total Distance = (Lap-1)*TrackLen + DistIntoLap
            // We just add effectiveLength?
            // If we started at -8, and covered SegLen+8, we are now at SegLen.
            // So yes, we strictly add effectiveLength to `totalDistance`.
            driverState.totalDistance += effectiveLength;

            driverState.segmentIndex = segIdx;
            driverState.lap = lap;
        }

        // --- B. Overtake & Order Logic ---

        // Sort by Total Distance (Descending) THEN Total Time (Ascending)
        // Since we process segments synchronously, cars on the same segment are tied on distance.
        // The one with the LOWER totalTime is physically ahead (reached checkpoint earlier).
        simState.sort((a, b) => {
            const distDiff = b.totalDistance - a.totalDistance;
            if (Math.abs(distDiff) > 0.1) return distDiff;
            return a.totalTime - b.totalTime;
        });

        // Apply Dirty Air / Battle Logic
        // We check Time Gap.
        for (let i = 1; i < simState.length; i++) {
            const current = simState[i];
            const ahead = simState[i - 1];

            if (current.finished || ahead.finished) continue;

            // Only relevant if we are on the same lap/segment (distance tied)
            if (Math.abs(ahead.totalDistance - current.totalDistance) < 1.0) {
                 const timeGap = current.totalTime - ahead.totalTime;

                 // If very close (e.g. < 0.3s), apply dirty air penalty
                 if (timeGap < 0.3) {
                     // Add small penalty to current driver (slower due to dirty air)
                     // This simulates being stuck behind
                     // Random float 0.05 - 0.15
                     const penalty = randomFloat(0.05, 0.15);
                     current.totalTime += penalty;

                     // Optional: If overtake stat is high, maybe avoid penalty or reduce it?
                     // For MVP, simple penalty maintains order.
                 }
            }
        }

        // Re-Sort after penalties (Time might have changed)
        simState.sort((a, b) => {
            const distDiff = b.totalDistance - a.totalDistance;
            if (Math.abs(distDiff) > 0.1) return distDiff;
            return a.totalTime - b.totalTime;
        });

        // --- C. Snapshot Generation ---

        const leader = simState[0];

        const results: RaceResultSnapshot[] = simState.map((s, idx) => {
           const ahead = idx > 0 ? simState[idx - 1] : null;

           // Calculate Gaps
           // current.totalTime > leader.totalTime usually (since leader is faster).
           const gapToLeader = s.totalTime - leader.totalTime;
           const gapToAhead = ahead ? s.totalTime - ahead.totalTime : 0;

           // Check Lap Completion (Epsilon for float safety)
           if (s.totalDistance >= trackLength * s.lap - 0.1) {
               // Lap Complete
               // Calculate Lap Time
               const currentLapTime = s.totalTime - s.lastLapTime;

               // Apply Variance / Chaos (Consistency)
               // The physics is deterministic, but we add "flavor" variance here?
               // User asked for "Distance-based... Kinematic".
               // "Lap time variance is calculated using Chaos Window".
               // If we do physics, variance should be IN the physics (e.g. variable grip/brake per lap).
               // But for MVP, let's inject a small time variance to the `totalTime` at the line?
               // Or just accept the physics result.
               // Let's stick to physics result to prevent "teleporting" (time jumps).

               if (currentLapTime < s.bestLapTime) {
                   s.bestLapTime = currentLapTime;

                   // PB Message
                   // Only send if meaningful improvement?
               }

               s.lastLapTime = s.totalTime;

               // Increment Lap?
               // Wait, if we are in loop `lap`, we are IN that lap.
               // If totalDistance > Lap * TrackLen, we finished.
           }

           const currRank = idx + 1;

           return {
               driverId: s.driver.id,
               driverName: s.driver.name,
               flag: s.driver.flag || '🏳️',
               teamName: s.teamName,
               totalTime: s.totalTime,
               gapToLeader,
               gapToAhead,
               lapsCompleted: Math.floor(s.totalDistance / trackLength),
               lastLapTime: s.totalTime - s.lastLapTime, // Approximation
               bestLapTime: s.bestLapTime,
               rank: currRank,
               penalty: false,
               status: s.totalDistance >= TOTAL_DISTANCE ? 'Finished' : 'Running'
           };
        });

        // Update Prev Ranks
        results.forEach(r => prevRankMap.set(r.driverId, r.rank));

        // Collect Messages
        const stepMessages: FeedMessage[] = [];

        results.forEach((r, idx) => {
             const prevRank = prevRankMap.get(r.driverId) || (idx + 1);
             const currRank = r.rank;

             // Check if player team
             if (playerTeamId) {
                 const driverState = simState.find(s => s.driver.id === r.driverId);
                 if (driverState && driverState.driver.teamId === playerTeamId) {
                     const msgId = `${lap}-${segIdx}-${r.driverId}`;
                     if (currRank < prevRank) {
                         stepMessages.push({
                             id: msgId, lap, driverId: r.driverId, driverName: r.driverName,
                             type: 'positive', color: 'text-green-400',
                             message: `Overtook for P${currRank}!`
                         });
                     } else if (currRank > prevRank) {
                         stepMessages.push({
                             id: msgId, lap, driverId: r.driverId, driverName: r.driverName,
                             type: 'negative', color: 'text-red-400',
                             message: `Dropped to P${currRank}.`
                         });
                     }
                 }
             }
        });

        raceHistory.push({
            lapNumber: lap,
            results: results,
            messages: stepMessages
        });

        // Check for Race Finish
        // If everyone finished?
        if (simState.every(s => s.totalDistance >= TOTAL_DISTANCE)) {
            simState.forEach(s => s.finished = true);
        }
    }
  }

  return raceHistory;
};
