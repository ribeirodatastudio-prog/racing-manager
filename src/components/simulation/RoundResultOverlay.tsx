import React from "react";
import { MatchState } from "@/lib/engine/types";
import { Bot } from "@/lib/engine/Bot";
import { PlayerStats } from "@/lib/engine/MatchSimulator";
import { ArrowRight } from "lucide-react";

interface RoundResultOverlayProps {
    matchState: MatchState;
    bots: Bot[];
    stats: Record<string, PlayerStats>;
    onNextRound: () => void;
}

export const RoundResultOverlay: React.FC<RoundResultOverlayProps> = ({
    matchState,
    bots,
    stats,
    onNextRound,
}) => {
    const lastRound = matchState.roundHistory[matchState.roundHistory.length - 1];
    const winner = lastRound?.winner;
    const reason = lastRound?.reason;

    // Sort bots by Kills (desc) then Damage (desc)
    const tBots = bots.filter(b => b.side === "T").sort((a, b) => {
        const statsA = stats[a.player.id];
        const statsB = stats[b.player.id];
        if (statsA.kills !== statsB.kills) return statsB.kills - statsA.kills;
        return statsB.damageDealt - statsA.damageDealt;
    });

    const ctBots = bots.filter(b => b.side === "CT").sort((a, b) => {
        const statsA = stats[a.player.id];
        const statsB = stats[b.player.id];
        if (statsA.kills !== statsB.kills) return statsB.kills - statsA.kills;
        return statsB.damageDealt - statsA.damageDealt;
    });

    const renderTeamTable = (teamBots: Bot[], side: "T" | "CT") => {
        return (
            <div className={`w-full ${side === "T" ? "border-yellow-600" : "border-blue-600"} border-t-4 bg-zinc-900/90`}>
                <div className={`px-4 py-2 flex justify-between items-center ${side === "T" ? "bg-yellow-900/20" : "bg-blue-900/20"}`}>
                    <span className={`font-bold ${side === "T" ? "text-yellow-500" : "text-blue-500"}`}>
                        {side === "T" ? "TERRORISTS" : "COUNTER-TERRORISTS"}
                    </span>
                    <span className="text-white font-mono text-xl">{matchState.scores[side]}</span>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
                        <tr>
                            <th className="px-4 py-2">Player</th>
                            <th className="px-2 py-2 text-right">K</th>
                            <th className="px-2 py-2 text-right">D</th>
                            <th className="px-2 py-2 text-right">A</th>
                            <th className="px-2 py-2 text-right">K/D</th>
                            <th className="px-2 py-2 text-right">DMG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamBots.map(bot => {
                            const s = stats[bot.player.id];
                            const kd = s.deaths === 0 ? s.kills : (s.kills / s.deaths).toFixed(2);
                            return (
                                <tr key={bot.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                                    <td className="px-4 py-2 font-medium text-white flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${bot.status === "ALIVE" ? "bg-green-500" : "bg-red-500"}`} />
                                        {bot.player.name}
                                    </td>
                                    <td className="px-2 py-2 text-right text-white font-bold">{s.kills}</td>
                                    <td className="px-2 py-2 text-right text-zinc-400">{s.deaths}</td>
                                    <td className="px-2 py-2 text-right text-zinc-400">{s.assists}</td>
                                    <td className="px-2 py-2 text-right text-zinc-300 font-mono">{kd}</td>
                                    <td className="px-2 py-2 text-right text-zinc-300 font-mono">{Math.floor(s.damageDealt)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
            <div className="w-[900px] max-h-[90vh] flex flex-col gap-6 p-8 bg-zinc-950 border border-zinc-700 shadow-2xl overflow-y-auto">

                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold uppercase tracking-widest text-white mb-2">
                        Round {matchState.round - 1} Ended
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-xl font-bold">
                        {winner === "T" ? (
                            <span className="text-yellow-500">TERRORISTS WIN</span>
                        ) : (
                            <span className="text-blue-500">CT WIN</span>
                        )}
                        <span className="text-zinc-500 text-sm font-normal uppercase tracking-wide">
                            via {reason?.replace(/_/g, " ")}
                        </span>
                    </div>
                </div>

                {/* Scoreboard */}
                <div className="flex flex-col gap-4">
                    {renderTeamTable(ctBots, "CT")}
                    {renderTeamTable(tBots, "T")}
                </div>

                {/* MVP / Summary (Optional Placeholder) */}
                <div className="flex justify-between items-center bg-zinc-900 p-4 border border-zinc-800">
                     <div className="text-zinc-400 text-sm">
                        Total Damage: <span className="text-white">{Object.values(stats).reduce((a,b) => a + b.damageDealt, 0).toFixed(0)}</span>
                     </div>
                     <button
                        onClick={onNextRound}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105"
                     >
                        Next Round <ArrowRight size={20} />
                     </button>
                </div>

            </div>
        </div>
    );
};
