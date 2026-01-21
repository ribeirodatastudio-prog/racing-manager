import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/ui/StatCard';
import { DriverRoster } from '@/components/dashboard/DriverRoster';
import { StandingsTable } from '@/components/dashboard/StandingsTable';
import { MarketPreview } from '@/components/dashboard/MarketPreview';
import { SeasonOverview } from '@/components/dashboard/SeasonOverview';
import { dashboardData } from '@/lib/dummyData';
import { Trophy, Zap, Users } from 'lucide-react';

export default function DashboardPage() {
  const { team, standings, market } = dashboardData;
  const userStanding = standings.find((s) => s.isUser);

  return (
    <DashboardShell teamName={team.name} funds={team.funds}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Row 1: Season Overview & Key Stats */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 h-full">
          <SeasonOverview
            currentTier={team.currentTier}
            nextRace={team.nextRace}
            goal={team.goal}
          />
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatCard
            label="Season Points"
            value={userStanding?.points || 0}
            subValue={`Rank: #${userStanding?.rank || '-'}`}
            icon={<Trophy size={20} />}
            className="h-full"
          />
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatCard
            label="Fan Base"
            value="1.2M"
            subValue="+5% this week"
            icon={<Users size={20} />}
            className="h-full"
          />
        </div>

        {/* Row 2: Main Widgets */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <DriverRoster drivers={team.drivers} />
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2">
           <StandingsTable standings={standings} />
        </div>

        {/* Row 3: Market (below Driver Roster) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <MarketPreview drivers={market} />
        </div>

      </div>
    </DashboardShell>
  );
}
