import React from 'react';
import { Calendar, Flag, Target, MapPin } from 'lucide-react';

interface SeasonOverviewProps {
  currentTier: string;
  nextRace: string;
  goal: string;
}

/**
 * SeasonOverview
 * Displays high-level season information.
 */
export const SeasonOverview: React.FC<SeasonOverviewProps> = ({ currentTier, nextRace, goal }) => {
  return (
    <div className="bg-card border border-border p-6 flex flex-col justify-between h-full gap-4">

      {/* Current Tier */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-secondary text-primary">
            <Flag size={24} />
        </div>
        <div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">Current Tier</div>
            <div className="text-xl font-bold">{currentTier}</div>
        </div>
      </div>

      {/* Next Race */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-secondary text-primary">
            <MapPin size={24} />
        </div>
        <div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">Next Race</div>
            <div className="text-xl font-bold">{nextRace}</div>
        </div>
      </div>

       {/* Season Goal */}
       <div className="flex items-start gap-4">
        <div className="p-3 bg-secondary text-primary">
            <Target size={24} />
        </div>
        <div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">Season Goal</div>
            <div className="text-xl font-bold text-emerald-400">{goal}</div>
        </div>
      </div>
    </div>
  );
};
