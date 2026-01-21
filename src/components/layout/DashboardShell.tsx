import React from 'react';
import { LayoutDashboard, Users, Trophy, DollarSign, Settings, TrendingUp } from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
  teamName: string;
  funds: number;
}

/**
 * DashboardShell
 * Main layout wrapper containing the Sidebar and Top Bar.
 */
export const DashboardShell: React.FC<DashboardShellProps> = ({ children, teamName, funds }) => {
  // Formatter for currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="h-16 border-b border-border flex items-center px-6">
          <h1 className="text-xl font-bold tracking-tight">RACE MANAGER</h1>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <NavItem icon={<Users size={20} />} label="Drivers" />
          <NavItem icon={<Trophy size={20} />} label="Standings" />
          <NavItem icon={<TrendingUp size={20} />} label="Market" />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="font-semibold text-lg">{teamName}</div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono">
            <DollarSign size={18} />
            <span>{formatMoney(funds)}</span>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active }) => {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors
        ${active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};
