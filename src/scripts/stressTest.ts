import { MatchSimulator, SimulationState, PlayerStats } from "../lib/engine/MatchSimulator";
import { Player, TechnicalSkills, MentalSkills, PhysicalSkills } from "../types";
import { TeamSide, Tactic, TacticsManager } from "../lib/engine/TacticsManager";
import { Bot } from "../lib/engine/Bot";
import { MatchPhase, RoundEndReason } from "../lib/engine/types";
import { BombStatus } from "../lib/engine/Bomb";
import * as fs from "fs";

// --- Mock Data ---

const MOCK_SKILLS: { technical: TechnicalSkills; mental: MentalSkills; physical: PhysicalSkills } = {
  technical: { shooting: 150, crosshairPlacement: 150, sprayControl: 150, utilityUsage: 150, utility: 150, firstBulletPrecision: 150, movement: 150, clutching: 150 },
  mental: { positioning: 150, adaptability: 150, composure: 150, communication: 150, gameSense: 150, aggression: 100 },
  physical: { reactionTime: 150, dexterity: 150, consistency: 150, injuryResistance: 150 }
};

function createMockPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    age: 20,
    nationality: "US",
    role: "Rifler",
    skills: JSON.parse(JSON.stringify(MOCK_SKILLS)) // Clone
  };
}

const PLAYERS: Player[] = [
  createMockPlayer("t1", "T_Entry"), createMockPlayer("ct1", "CT_Anchor_A"),
  createMockPlayer("t2", "T_Support"), createMockPlayer("ct2", "CT_Anchor_B"),
  createMockPlayer("t3", "T_IGL"), createMockPlayer("ct3", "CT_Mid"),
  createMockPlayer("t4", "T_Lurker"), createMockPlayer("ct4", "CT_Rotator"),
  createMockPlayer("t5", "T_Sniper"), createMockPlayer("ct5", "CT_Sniper")
];

// --- Stats Interface ---

interface SimulationAudit {
  totalRounds: number;
  winRate: { T: number; CT: number };
  winType: Record<string, number>;
  weaponPerformance: Record<string, { kills: number }>;
  tradeRate: { firstDeaths: number; traded: number; rate: string };
  siteSuccess: Record<string, { attempts: number; wins: number; winRate: string }>;
  retakeSuccess: { attempts: number; success: number; rate: string };
  plantToDefuseTime: { totalTime: number; count: number; average: string };
  shotsFiredCT: number;
  anomalies: any[];
}

const AUDIT: SimulationAudit = {
  totalRounds: 0,
  winRate: { T: 0, CT: 0 },
  winType: {},
  weaponPerformance: {},
  tradeRate: { firstDeaths: 0, traded: 0, rate: "0%" },
  siteSuccess: {},
  retakeSuccess: { attempts: 0, success: 0, rate: "0%" },
  plantToDefuseTime: { totalTime: 0, count: 0, average: "0" },
  shotsFiredCT: 0,
  anomalies: []
};

// --- Helper Types ---

interface RoundTracking {
  firstDeath?: { victimId: string; killerId: string; tick: number; side: TeamSide };
  bombPlantTick?: number;
  bombPlanted: boolean;
  tStrategy?: string;
}

// --- Logic ---

const TOTAL_ROUNDS = 5000;
const MATCH_LENGTH = 24; // Reset every 24 rounds to simulate economy flow

async function runReal() {
    console.log(`Starting Stress Test: ${TOTAL_ROUNDS} rounds...`);
    let currentRoundTotal = 0;

    // Create Simulator
    let currentState: SimulationState | null = null;
    const sim = new MatchSimulator(PLAYERS, (state) => {
      currentState = state;
    });
    sim.setSpeed(100);

    while (currentRoundTotal < TOTAL_ROUNDS) {
        sim.reset();
        let roundsInMatch = 0;

        while (roundsInMatch < MATCH_LENGTH && currentRoundTotal < TOTAL_ROUNDS) {
            // Snapshot stats at start of round
            if (!currentState) { (sim as any).tick(); } // Ensure state init

            const startStats = JSON.parse(JSON.stringify(sim.stats)) as Record<string, PlayerStats>;
            const startEventCount = currentState!.events.length;

            // Strategies
            const tTactics: Tactic[] = ["RUSH_A", "RUSH_B", "EXECUTE_A", "EXECUTE_B", "CONTACT_A", "CONTACT_B", "SPLIT_A", "SPLIT_B", "DEFAULT"];
            const ctTactics: Tactic[] = ["STANDARD", "AGGRESSIVE_PUSH", "GAMBLE_STACK_A", "GAMBLE_STACK_B", "RETAKE_SETUP"];
            const tTactic = tTactics[Math.floor(Math.random() * tTactics.length)];
            const ctTactic = ctTactics[Math.floor(Math.random() * ctTactics.length)];

            sim.applyStrategies("HALF", tTactic, "HALF", ctTactic);

            const tracker = {
                bombPlanted: false,
                bombPlantTick: 0,
                firstDeath: null as ({ victimId: string; killerId: string; tick: number; side: TeamSide } | null),
                isTraded: false
            };

            let roundOver = false;
            let prevTickStats = JSON.parse(JSON.stringify(sim.stats)) as Record<string, PlayerStats>;

            while (!roundOver) {
                (sim as any).tick();
                const state = currentState!;

                if (state.matchState.phase === MatchPhase.ROUND_END || state.matchState.phase === MatchPhase.MATCH_END) {
                    roundOver = true;
                }

                const currentStats = state.stats;

                // First Death & Trade
                state.bots.forEach(bot => {
                    if (bot.status === "DEAD" && !tracker.firstDeath) {
                         if (prevTickStats[bot.id].deaths < currentStats[bot.id].deaths) {
                             const killer = state.bots.find(b => currentStats[b.id].kills > prevTickStats[b.id].kills);
                             if (killer) {
                                 tracker.firstDeath = {
                                     victimId: bot.id,
                                     killerId: killer.id,
                                     tick: state.tickCount,
                                     side: bot.side
                                 };
                             }
                         }
                    }
                });

                if (tracker.firstDeath && !tracker.isTraded) {
                    const fd = tracker.firstDeath;
                    const killer = state.bots.find(b => b.id === fd.killerId);
                    if (killer && killer.status === "DEAD") {
                        if (currentStats[killer.id].deaths > prevTickStats[killer.id].deaths) {
                            if (state.tickCount - fd.tick <= 50) {
                                const avenger = state.bots.find(b => currentStats[b.id].kills > prevTickStats[b.id].kills);
                                if (avenger && avenger.side === fd.side) {
                                    tracker.isTraded = true;
                                }
                            }
                        }
                    }
                }

                // Bomb
                if (state.bombState.status === BombStatus.PLANTED && !tracker.bombPlanted) {
                    tracker.bombPlanted = true;
                    tracker.bombPlantTick = state.tickCount;
                }

                prevTickStats = JSON.parse(JSON.stringify(currentStats));
            }

            // --- Post Round ---
            currentRoundTotal++;
            roundsInMatch++;
            AUDIT.totalRounds++;
            const state = currentState!;
            const history = state.matchState.roundHistory[state.matchState.roundHistory.length - 1];

            // Stats
            AUDIT.winRate[history.winner]++;
            AUDIT.winType[history.reason] = (AUDIT.winType[history.reason] || 0) + 1;

            // Site Success
            const finalTTactic = sim.tacticsManager.getTactic(TeamSide.T);
            const strategyName = tTactic === "DEFAULT" ? `DEFAULT->${finalTTactic}` : tTactic;
            if (!AUDIT.siteSuccess[strategyName]) AUDIT.siteSuccess[strategyName] = { attempts: 0, wins: 0, winRate: "0%" };
            AUDIT.siteSuccess[strategyName].attempts++;
            if (history.winner === TeamSide.T) AUDIT.siteSuccess[strategyName].wins++;

            // Trade
            if (tracker.firstDeath) {
                AUDIT.tradeRate.firstDeaths++;
                if (tracker.isTraded) AUDIT.tradeRate.traded++;
            }

            // Retake
            if (tracker.bombPlanted) {
                AUDIT.retakeSuccess.attempts++;
                if (history.winner === TeamSide.CT) {
                    AUDIT.retakeSuccess.success++;
                    if (history.reason === RoundEndReason.BOMB_DEFUSED) {
                         const t = state.tickCount - tracker.bombPlantTick;
                         AUDIT.plantToDefuseTime.totalTime += t;
                         AUDIT.plantToDefuseTime.count++;
                    }
                }
            }

            // CT Shots
            state.bots.forEach(b => {
                if (b.side === TeamSide.CT) {
                    AUDIT.shotsFiredCT += (state.stats[b.id].shotsFired - startStats[b.id].shotsFired);
                }
            });

            // Weapon Stats
            for (const ev of state.events) {
                if (ev.includes("Round Started")) break;
                 if (ev.includes("eliminated by")) {
                    const match = ev.match(/💀 \[(.*?)\]/);
                    if (match) {
                        const weaponName = match[1];
                        if (!AUDIT.weaponPerformance[weaponName]) AUDIT.weaponPerformance[weaponName] = { kills: 0 };
                        AUDIT.weaponPerformance[weaponName].kills++;
                    }
                 }
            }

            // Anomalies
            state.bots.forEach(b => {
                const killsThisRound = state.stats[b.id].kills - startStats[b.id].kills;
                if (killsThisRound >= 4) {
                    const roundEvents = state.events.slice(0, state.events.length - startEventCount);
                    AUDIT.anomalies.push({
                        round: currentRoundTotal,
                        player: b.player.name,
                        kills: killsThisRound,
                        weapon: b.getEquippedWeapon()?.name || "Unknown",
                        winner: history.winner,
                        log: roundEvents
                    });
                }
            });

            sim.nextRound();
        }
    }

    // Finalize
    AUDIT.tradeRate.rate = AUDIT.tradeRate.firstDeaths > 0 ? ((AUDIT.tradeRate.traded / AUDIT.tradeRate.firstDeaths) * 100).toFixed(2) + "%" : "0%";
    AUDIT.retakeSuccess.rate = AUDIT.retakeSuccess.attempts > 0 ? ((AUDIT.retakeSuccess.success / AUDIT.retakeSuccess.attempts) * 100).toFixed(2) + "%" : "0%";
    AUDIT.plantToDefuseTime.average = AUDIT.plantToDefuseTime.count > 0 ? (AUDIT.plantToDefuseTime.totalTime / AUDIT.plantToDefuseTime.count).toFixed(2) : "0";

    Object.keys(AUDIT.siteSuccess).forEach(k => {
        const s = AUDIT.siteSuccess[k];
        s.winRate = ((s.wins / s.attempts) * 100).toFixed(2) + "%";
    });

    fs.writeFileSync("simulation_audit.json", JSON.stringify(AUDIT, null, 2));
    console.log("Done.");
}

runReal();
