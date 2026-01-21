import React from 'react';
import { MarketDriver } from '@/lib/types';
import { TrendingUp, UserPlus } from 'lucide-react';

interface MarketPreviewProps {
  drivers: MarketDriver[];
}

/**
 * MarketPreview
 * Displays available drivers in the market.
 */
export const MarketPreview: React.FC<MarketPreviewProps> = ({ drivers }) => {
  // Formatter for salary
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(amount);
  };

  return (
    <div className="bg-card border border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp size={20} />
          Driver Market
        </h2>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {drivers.map((driver) => (
          <div key={driver.id} className="flex items-center justify-between border border-border p-3 bg-secondary/10">
            <div>
              <div className="font-bold">{driver.name}</div>
              <div className="text-xs text-muted-foreground">Rating: {driver.rating}</div>
              <div className="text-xs font-mono text-emerald-400">{formatMoney(driver.salaryCost)}/yr</div>
            </div>
            <button
              disabled
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <UserPlus size={14} />
              Sign
            </button>
          </div>
        ))}
      </div>
      <div className="p-4 mt-auto border-t border-border">
         <button className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-colors">
            View All Drivers
         </button>
      </div>
    </div>
  );
};
