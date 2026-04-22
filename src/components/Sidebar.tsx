import React from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import type { AppView } from '../services/types';
import { LayoutDashboard, Coins, Gem, Activity, Zap } from 'lucide-react';

const navItems: { view: AppView; label: string; icon: React.ReactNode }[] = [
  { view: 'portfolio', label: 'Portfolio', icon: <LayoutDashboard size={20} /> },
  { view: 'udt', label: 'UDT Assets', icon: <Coins size={20} /> },
  { view: 'spore', label: 'Spore NFTs', icon: <Gem size={20} /> },
  { view: 'transactions', label: 'Transactions', icon: <Activity size={20} /> },
];

export function Sidebar() {
  const { currentView, setView } = useApp();
  const { activePipelines } = useTransactions();

  return (
    <aside
      style={{
        width: '240px',
        minHeight: '100vh',
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border-separator)',
        padding: '24px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={18} color="#000" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>RGB++</div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Asset Manager
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ view, label, icon }) => {
          const isActive = currentView === view;
          const hasActivity = view === 'transactions' && activePipelines.length > 0;

          return (
            <button
              key={view}
              onClick={() => setView(view)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                color: isActive ? 'var(--text-base)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 400,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                width: '100%',
                textAlign: 'left',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-base)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {icon}
              {label}
              {hasActivity && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--green)',
                    color: '#000',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                >
                  {activePipelines.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid var(--border-separator)' }}>
        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Testnet
        </div>
      </div>
    </aside>
  );
}
