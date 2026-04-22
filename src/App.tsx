import React from 'react';
import { Sidebar } from './components/Sidebar';
import { WalletConnect } from './components/WalletConnect';
import { Notifications } from './components/Notifications';
import { ToastContainer } from './components/Toast';
import { Portfolio } from './views/Portfolio';
import { UdtManager } from './views/UdtManager';
import { DobsManager } from './views/DobsManager';
import { Transactions } from './views/Transactions';
import { useApp } from './context/AppContext';
import { useTransactionRecovery } from './hooks/useTransactionRecovery';

function ViewRouter() {
  const { currentView } = useApp();

  switch (currentView) {
    case 'portfolio': return <Portfolio />;
    case 'udt': return <UdtManager />;
    case 'spore': return <DobsManager />;
    case 'transactions': return <Transactions />;
    default: return <Portfolio />;
  }
}

export default function App() {
  // Resume any interrupted CKB confirmations on page load
  useTransactionRecovery();

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-separator)',
            background: 'var(--bg-base)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <WalletConnect />
        </header>

        {/* Main content */}
        <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          <ViewRouter />
        </main>
      </div>

      <Notifications />
      <ToastContainer />
    </div>
  );
}
