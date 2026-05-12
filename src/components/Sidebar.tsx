import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import type { AppView } from '../services/types';
import { LayoutDashboard, Coins, Gem, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems: { view: AppView; label: string; icon: React.ReactNode }[] = [
  { view: 'portfolio', label: 'Portfolio', icon: <LayoutDashboard size={20} /> },
  { view: 'udt', label: 'UDT', icon: <Coins size={20} /> },
  { view: 'spore', label: 'DOBs', icon: <Gem size={20} /> },
  { view: 'transactions', label: 'Transactions', icon: <Activity size={20} /> },
];

export function Sidebar() {
  const { currentView, setView } = useApp();
  const { activePipelines } = useTransactions();

  return (
    <aside className="w-60 min-h-screen bg-background border-r border-border p-6 flex flex-col gap-1 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Zap size={18} className="text-primary-foreground" />
        </div>
        <div>
          <div className="font-bold text-base leading-tight">RGB++</div>
          <div className="text-[0.625rem] text-muted-foreground font-medium tracking-wider uppercase">
            Asset Manager
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ view, label, icon }) => {
          const isActive = currentView === view;
          const hasActivity = view === 'transactions' && activePipelines.length > 0;

          return (
            <button
              key={view}
              onClick={() => setView(view)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-left text-sm transition-all duration-150 relative",
                isActive
                  ? "bg-muted text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {icon}
              {label}
              {hasActivity && (
                <span className="ml-auto w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[0.625rem] font-bold flex items-center justify-center animate-pulse">
                  {activePipelines.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-3 border-t border-border">
        <div className="text-[0.625rem] text-muted-foreground uppercase tracking-wider">
          Testnet
        </div>
      </div>
    </aside>
  );
}
