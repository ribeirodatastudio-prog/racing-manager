import React from 'react';
import { Standing } from '@/lib/types';
import { Trophy } from 'lucide-react';

interface StandingsTableProps {
  standings: Standing[];
}

/**
 * StandingsTable
 * Displays the current championship standings.
 * Highlights the row corresponding to the user's team.
 */
export const StandingsTable: React.FC<StandingsTableProps> = ({ standings }) => {
  return (
    <div className="bg-card border border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy size={20} />
          Championship Standings
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {standings.map((row) => (
              <tr
                key={row.rank}
                className={`
                  hover:bg-muted/50 transition-colors
                  ${row.isUser ? 'bg-primary/10 border-l-4 border-l-primary' : ''}
                `}
              >
                <td className="px-4 py-3 font-mono">{row.rank}</td>
                <td className={`px-4 py-3 ${row.isUser ? 'font-bold text-primary' : ''}`}>
                  {row.teamName}
                </td>
                <td className="px-4 py-3 text-right font-mono">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
