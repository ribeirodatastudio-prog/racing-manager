import React from 'react';
import { Driver } from '@/lib/types';
import { User, Activity, Smile } from 'lucide-react';

interface DriverRosterProps {
  drivers: Driver[];
}

/**
 * DriverRoster
 * Displays a list of active drivers with their stats.
 */
export const DriverRoster: React.FC<DriverRosterProps> = ({ drivers }) => {
  return (
    <div className="bg-card border border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User size={20} />
          Active Roster
        </h2>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {drivers.map((driver) => (
          <div key={driver.id} className="border border-border p-3 bg-secondary/20">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-lg">{driver.name}</span>
              <div className="flex items-center gap-1 text-primary">
                <Activity size={16} />
                <span className="font-mono">{driver.rating} OVR</span>
              </div>
            </div>

            {/* Morale Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Smile size={12}/> Morale</span>
                <span>{driver.morale}%</span>
              </div>
              <div className="h-2 w-full bg-secondary border border-border overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${driver.morale}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
