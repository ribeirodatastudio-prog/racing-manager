
import fs from 'fs';
import { MatchSimulator, SimulationState } from '../lib/engine/MatchSimulator';
import { Player } from '../types';
import { TeamSide, Tactic } from '../lib/engine/TacticsManager';
import { MatchPhase, RoundEndReason } from '../lib/engine/types';
import { Bot } from '../lib/engine/Bot';
import { WeaponManager } from '../lib/engine/WeaponManager';

// --- Configuration ---
const ROUNDS_TO_SIMULATE = 5000;
const TRADE_WINDOW_TICKS = 50; // 5 seconds
const OUTPUT_FILE = 'simulation_audit.json';

// --- Mock Data ---
const mockPlayers: Player[] = Array.from({ length: 10 }, (_, i) => ({
  id: `player_${i}`,
  name: `Player ${i}`,
  age: 20,
  nationality: 'US',
  role: 'Rifler',
  skills: {
    technical: {
      shooting: 50,
      crosshairPlacement: 50,
      sprayControl: 50,
      utilityUsage: 50,
      utility: 50,
      firstBulletPrecision: 50,
      movement: 50,
      clutching: 50
    },
    mental: {
      positioning: 50,
      adaptability: 50,
      composure: 50,
      communication: 50,
      gameSense: 50,
      aggression: 50
    },
    physical: {
      reactionTime: 200,
      dexterity: 50,
      consistency: 50,
      injuryResistance: 50
    }
  }
}));

// --- Tactics ---
const T_TACTICS: Tactic[] = [
  "RUSH_A", "RUSH_B", "EXECUTE_A", "EXECUTE_B",
  "CONTACT_A", "CONTACT_B", "SPLIT_A", "SPLIT_B", "DEFAULT"
];
const CT_TACTICS: Tactic[] = [
  "STANDARD", "AGGRESSIVE_PUSH", "GAMBLE_STACK_A", "GAMBLE_STACK_B", "RETAKE_SETUP"
];

// --- Stats Storage ---
interface AuditStats {
  totalRounds: number;
  winRate: { T: number; CT: number; tWinPct: number };
  winTypes: Record<string, number>;
  weaponPerformance: Record<string, { kills: number; avgKillsPerRound: number }>;
  tradeStats: { totalKills: number; tradedKills: number; tradeRate: number };
  siteSuccess: {
    A: { attempts: number; wins: number; winRate: number };
    B: { attempts: number; wins: number; winRate: number };
  };
  anomalies: { round: number; playerId: string; kills: number; tactics: { T: string; CT: string } }[];
}

const stats: AuditStats = {
  totalRounds: 0,
  winRate: { T: 0, CT: 0, tWinPct: 0 },
  winTypes: {},
  weaponPerformance: {},
  tradeStats: { totalKills: 0, tradedKills: 0, tradeRate: 0 },
  siteSuccess: {
    A: { attempts: 0, wins: 0, winRate: 0 },
    B: { attempts: 0, wins: 0, winRate: 0 }
  },
  anomalies: []
};

// --- Helpers ---
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Simulation Setup ---
// We need a dummy update callback
const simulator = new MatchSimulator(mockPlayers, (state: SimulationState) => {});

// --- Runtime Tracking Variables ---
let recentKills: { killerId: string; victimId: string; tick: number; weapon: string }[] = [];

const eventManager = simulator.eventManagerInstance;

eventManager.subscribe("TEAMMATE_DIED", (event: any) => {
    // event: { type, zoneId, timestamp, victimId, killerId }
    stats.tradeStats.totalKills++;

    if (event.killerId) {
        // Track for Trade Logic
        recentKills.push({
            killerId: event.killerId,
            victimId: event.victimId,
            tick: event.timestamp,
            weapon: "Unknown" // We need to fetch weapon from stats or bot
        });

        // Weapon Stats
        const killerBot = simulator.bots.find(b => b.id === event.killerId);
        if (killerBot) {
            const weapon = killerBot.getEquippedWeapon();
            const weaponName = weapon ? weapon.name : "Unknown";

            // Update Weapon Stats
            if (!stats.weaponPerformance[weaponName]) {
                stats.weaponPerformance[weaponName] = { kills: 0, avgKillsPerRound: 0 };
            }
            stats.weaponPerformance[weaponName].kills++;

            // Update recentKill record
            recentKills[recentKills.length - 1].weapon = weaponName;
        }

        // Check for Trades
        const victimAsKiller = recentKills.filter(k => k.killerId === event.victimId);
        victimAsKiller.forEach(k => {
             if (event.timestamp - k.tick <= TRADE_WINDOW_TICKS) {
                 const originalVictimBot = simulator.bots.find(b => b.id === k.victimId);
                 const avengerBot = simulator.bots.find(b => b.id === event.killerId);

                 if (originalVictimBot && avengerBot && originalVictimBot.side === avengerBot.side) {
                      stats.tradeStats.tradedKills++;
                 }
             }
        });
    }
});


// --- Main Loop ---
console.log(`Starting stress test: ${ROUNDS_TO_SIMULATE} rounds...`);
const startTime = Date.now();

for (let i = 0; i < ROUNDS_TO_SIMULATE; i++) {
    if (i > 0 && i % 500 === 0) console.log(`Simulating round ${i}...`);

    // 1. Reset
    simulator.reset();
    recentKills = []; // Clear for new round

    // 2. Force Money (Full Buy)
    simulator.bots.forEach(b => {
        if (b.player.inventory) {
            b.player.inventory.money = 16000;
        }
    });

    // 3. Pick Strategies
    const tTactic = getRandomItem(T_TACTICS);
    const ctTactic = getRandomItem(CT_TACTICS);

    // 4. Apply Strategies
    simulator.applyStrategies("FULL", tTactic, "FULL", ctTactic);

    // 5. Run Round
    // Loop until Round End
    let safetyCounter = 0;
    while (simulator.matchState.phase !== MatchPhase.ROUND_END && safetyCounter < 3000) { // 300s max
        simulator.tick();
        safetyCounter++;
    }

    if (safetyCounter >= 3000) {
        console.warn(`Round ${i} timed out (Safety limit)! Phase: ${simulator.matchState.phase}`);
        // We still count stats if it ended? Or skip?
        // If it timed out in script but simulator didn't trigger round end, something stuck.
        // Skip collecting end-round stats but continue.
        continue;
    }

    // 6. Collect Round End Stats
    const history = simulator.matchState.roundHistory;
    if (history.length === 0) continue;

    const lastRound = history[history.length - 1];
    const winner = lastRound.winner;
    const reason = lastRound.reason;

    // Win Counts
    stats.totalRounds++;
    stats.winRate[winner]++;
    stats.winTypes[reason] = (stats.winTypes[reason] || 0) + 1;

    // Site Success
    if (tTactic.includes("_A")) {
        stats.siteSuccess.A.attempts++;
        if (winner === TeamSide.T) stats.siteSuccess.A.wins++;
    } else if (tTactic.includes("_B")) {
        stats.siteSuccess.B.attempts++;
        if (winner === TeamSide.T) stats.siteSuccess.B.wins++;
    }

    // Anomalies (4+ Kills)
    // simulator.stats is cumulative in simulator BUT we call reset() every loop.
    // So stats[b.id].kills is for THIS round.
    simulator.bots.forEach(b => {
        const s = simulator.stats[b.id];
        if (s && s.kills >= 4) {
            stats.anomalies.push({
                round: i + 1,
                playerId: b.player.name,
                kills: s.kills,
                tactics: { T: tTactic, CT: ctTactic }
            });
        }
    });

}

// --- Final Calculation ---
if (stats.totalRounds > 0) {
    stats.winRate.tWinPct = (stats.winRate.T / stats.totalRounds) * 100;
    stats.tradeStats.tradeRate = (stats.tradeStats.tradedKills / stats.tradeStats.totalKills) * 100;
    stats.siteSuccess.A.winRate = (stats.siteSuccess.A.wins / stats.siteSuccess.A.attempts) * 100;
    stats.siteSuccess.B.winRate = (stats.siteSuccess.B.wins / stats.siteSuccess.B.attempts) * 100;

    Object.keys(stats.weaponPerformance).forEach(w => {
        stats.weaponPerformance[w].avgKillsPerRound = stats.weaponPerformance[w].kills / stats.totalRounds;
    });
}

const duration = (Date.now() - startTime) / 1000;
console.log(`Simulation complete in ${duration.toFixed(2)}s.`);

// --- Output ---
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2));
console.log(`Results written to ${OUTPUT_FILE}`);
