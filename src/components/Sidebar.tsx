import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import type { AppView } from '../services/types';
import { LayoutDashboard, Coins, Gem, Activity, Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems: { view: AppView; label: string; icon: React.ReactNode }[] = [
  { view: 'portfolio', label: 'Portfolio', icon: <LayoutDashboard size={20} /> },
  { view: 'udt', label: 'Tokens', icon: <Coins size={20} /> },
  { view: 'spore', label: 'DOBs', icon: <Gem size={20} /> },
  { view: 'transactions', label: 'Activity', icon: <Activity size={20} /> },
];

export function Sidebar() {
  const { currentView, setView } = useApp();
  const { activePipelines } = useTransactions();

  return (
    <aside className="w-64 min-h-screen bg-card/50 backdrop-blur-sm border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center glow-orange">
          <Hexagon size={22} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-bold text-lg leading-tight tracking-tight">RGB++</div>
          <div className="text-[0.6875rem] text-muted-foreground font-medium tracking-wide">
            Asset Manager
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        <div className="px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">
          Menu
        </div>
        {navItems.map(({ view, label, icon }) => {
          const isActive = currentView === view;
          const hasActivity = view === 'transactions' && activePipelines.length > 0;

          return (
            <button
              key={view}
              onClick={() => setView(view)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-sm transition-all duration-200 relative group",
                isActive
                  ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
              )}
            >
              <span className={cn(
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {icon}
              </span>
              {label}
              {hasActivity && (
                <span className="ml-auto w-5 h-5 rounded-full gradient-orange text-white text-[0.625rem] font-bold flex items-center justify-center shadow-lg"
                  style={{ animation: 'pipelinePulse 2s ease-in-out infinite' }}>
                  {activePipelines.length}
                </span>
              )}
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full bg-primary" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/30">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[0.6875rem] text-muted-foreground font-medium">
            Testnet
          </span>
        </div>
      </div>
    </aside>
  );
}
