import React, { useState, useEffect } from 'react';
import { Bot } from '@/lib/engine/Bot';
import { MatchState, BuyStrategy } from '@/lib/engine/types';
import { TeamEconomyManager } from '@/lib/engine/TeamEconomyManager';
import { TeamSide, ECONOMY } from '@/lib/engine/constants';
import { Tactic } from '@/lib/engine/TacticsManager';

interface SituationRoomProps {
  bots: Bot[];
  matchState: MatchState;
  onConfirm: (tStrategy: BuyStrategy, tTactic: Tactic, ctStrategy: BuyStrategy, ctTactic: Tactic, roleOverrides: Record<string, string>) => void;
}

const BUY_STRATEGIES: BuyStrategy[] = ["FULL", "FORCE", "HALF", "ECO", "BONUS", "HERO"];
const ROLES = ["Entry Fragger", "Support", "AWPer", "Lurker", "IGL", "Rifler"];
const T_TACTICS: Tactic[] = ["DEFAULT", "RUSH_A", "RUSH_B", "EXECUTE_A", "EXECUTE_B", "SPLIT_A", "SPLIT_B", "CONTACT_A", "CONTACT_B"];
const CT_TACTICS: Tactic[] = ["STANDARD", "AGGRESSIVE_PUSH", "GAMBLE_STACK_A", "GAMBLE_STACK_B", "RETAKE_SETUP"];

export const SituationRoom: React.FC<SituationRoomProps> = ({ bots, matchState, onConfirm }) => {
  const [activeTab, setActiveTab] = useState<TeamSide>(TeamSide.T);
  const [tStrategy, setTStrategy] = useState<BuyStrategy>("FULL");
  const [ctStrategy, setCtStrategy] = useState<BuyStrategy>("FULL");
  const [tTactic, setTTactic] = useState<Tactic>("DEFAULT");
  const [ctTactic, setCtTactic] = useState<Tactic>("STANDARD");
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});

  // Economy Stats State
  const [stats, setStats] = useState({
      totalBank: 0,
      estimatedSpend: 0,
      minNextRound: 0
  });

  // Initialize roles from bots
  useEffect(() => {
      const initialRoles: Record<string, string> = {};
      bots.forEach(b => {
          initialRoles[b.id] = b.player.role;
      });
      setRoleOverrides(initialRoles);
  }, [bots]); // Only on mount/bots change

  // Calculate Economy when inputs change
  useEffect(() => {
      const sideBots = bots.filter(b => b.side === activeTab);
      // Update bots with temporary roles for calculation
      sideBots.forEach(b => {
          if (roleOverrides[b.id]) b.roundRole = roleOverrides[b.id];
      });

      const strategy = activeTab === TeamSide.T ? tStrategy : ctStrategy;
      const lossBonus = matchState.lossBonus[activeTab];

      const calculated = TeamEconomyManager.calculateEconomyStats(sideBots, activeTab, strategy, lossBonus);
      setStats(calculated);

  }, [activeTab, tStrategy, ctStrategy, roleOverrides, bots, matchState]);

  const handleRoleChange = (botId: string, newRole: string) => {
      setRoleOverrides(prev => ({
          ...prev,
          [botId]: newRole
      }));
  };

  const handleConfirm = () => {
      onConfirm(tStrategy, tTactic, ctStrategy, ctTactic, roleOverrides);
  };

  const activeBots = bots.filter(b => b.side === activeTab);
  const activeStrategy = activeTab === TeamSide.T ? tStrategy : ctStrategy;
  const setStrategy = activeTab === TeamSide.T ? setTStrategy : setCtStrategy;

  const activeTactic = activeTab === TeamSide.T ? tTactic : ctTactic;
  const setTactic = activeTab === TeamSide.T ? setTTactic : setCtTactic;
  const AVAILABLE_TACTICS = activeTab === TeamSide.T ? T_TACTICS : CT_TACTICS;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
             <div>
                 <h1 className="text-xl font-bold text-white tracking-wider">SITUATION ROOM</h1>
                 <p className="text-xs text-gray-400">Round {matchState.round} Planning Phase</p>
             </div>
             <div className="flex gap-2">
                 <button
                    onClick={() => setActiveTab(TeamSide.T)}
                    className={`px-4 py-2 rounded font-bold ${activeTab === TeamSide.T ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                 >
                    TERRORISTS
                 </button>
                 <button
                    onClick={() => setActiveTab(TeamSide.CT)}
                    className={`px-4 py-2 rounded font-bold ${activeTab === TeamSide.CT ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                 >
                    COUNTER-TERRORISTS
                 </button>
             </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 grid grid-cols-3 gap-6">

             {/* Left: Strategy & Economy */}
             <div className="col-span-1 space-y-6">
                 {/* Strategy Selector */}
                 <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                     <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase">Buy Strategy</h3>
                     <div className="grid grid-cols-2 gap-2">
                         {BUY_STRATEGIES.map(strat => (
                             <button
                                key={strat}
                                onClick={() => setStrategy(strat)}
                                className={`px-2 py-2 text-sm rounded transition-colors ${activeStrategy === strat
                                    ? (activeTab === TeamSide.T ? 'bg-yellow-600 text-white' : 'bg-blue-600 text-white')
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                             >
                                {strat}
                             </button>
                         ))}
                     </div>
                 </div>

                 {/* Tactic Selector */}
                 <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                     <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase">Tactic</h3>
                     <select
                        value={activeTactic}
                        onChange={(e) => setTactic(e.target.value as Tactic)}
                        className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500"
                     >
                        {AVAILABLE_TACTICS.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                     </select>
                 </div>

                 {/* Economy Stats */}
                 <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 space-y-3">
                     <h3 className="text-sm font-semibold text-gray-300 mb-1 uppercase">Projected Economy</h3>

                     <div className="flex justify-between items-center">
                         <span className="text-gray-400 text-sm">Total Bank:</span>
                         <span className="text-green-400 font-mono font-bold">${stats.totalBank}</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-gray-400 text-sm">Est. Spend:</span>
                         <span className="text-red-400 font-mono font-bold">-${stats.estimatedSpend}</span>
                     </div>
                     <div className="h-px bg-gray-600 my-2"></div>
                     <div className="flex justify-between items-center">
                         <span className="text-gray-400 text-sm">Min Next Round:</span>
                         <span className={`font-mono font-bold ${stats.minNextRound < 2000 ? 'text-red-500' : 'text-yellow-400'}`}>
                             ${stats.minNextRound}
                         </span>
                     </div>
                     <p className="text-xs text-gray-500 italic mt-2">
                        *Assumes round loss (+${ECONOMY.LOSS_BONUS_START + (Math.min(4, matchState.lossBonus[activeTab] + 1) * ECONOMY.LOSS_BONUS_INCREMENT)} bonus)
                     </p>
                 </div>
             </div>

             {/* Right: Roster & Roles */}
             <div className="col-span-2 bg-gray-700/30 rounded-lg border border-gray-600 overflow-hidden">
                 <table className="w-full text-left">
                     <thead className="bg-gray-700 text-gray-300 text-xs uppercase">
                         <tr>
                             <th className="p-3">Player</th>
                             <th className="p-3">Money</th>
                             <th className="p-3">Weapon (Current)</th>
                             <th className="p-3">Round Role</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-600">
                         {activeBots.map(bot => (
                             <tr key={bot.id} className="hover:bg-gray-700/50">
                                 <td className="p-3 font-medium text-white">{bot.player.name}</td>
                                 <td className="p-3 font-mono text-green-400">${bot.player.inventory?.money}</td>
                                 <td className="p-3 text-gray-300 text-sm">
                                     {bot.player.inventory?.primaryWeapon || bot.player.inventory?.secondaryWeapon || "Knife"}
                                 </td>
                                 <td className="p-3">
                                     <select
                                        value={roleOverrides[bot.id] || bot.player.role}
                                        onChange={(e) => handleRoleChange(bot.id, e.target.value)}
                                        className="bg-gray-800 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                                     >
                                         {ROLES.map(role => (
                                             <option key={role} value={role}>{role}</option>
                                         ))}
                                     </select>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900 p-4 border-t border-gray-700 flex justify-end">
             <button
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded shadow-lg transform transition-transform hover:scale-105"
             >
                CONFIRM STRATEGY & START ROUND
             </button>
        </div>
      </div>
    </div>
  );
};
