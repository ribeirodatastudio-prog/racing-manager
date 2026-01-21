import React from 'react';

interface StatCardProps {
  /** The label for the statistic (e.g., "Funds", "Current Tier") */
  label: string;
  /** The main value to display */
  value: string | number;
  /** Optional sub-text or secondary metric */
  subValue?: string;
  /** Optional icon component */
  icon?: React.ReactNode;
  /** Optional class name for custom styling */
  className?: string;
}

/**
 * StatCard
 * Displays a single metric in a high-contrast card.
 */
export const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon, className = '' }) => {
  return (
    <div className={`bg-card text-card-foreground border border-border p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
    </div>
  );
};
