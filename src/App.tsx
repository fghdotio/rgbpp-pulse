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
    <div className="flex w-full min-h-screen gradient-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          </div>
          <WalletConnect />
        </header>

        {/* Main content */}
        <main className="flex-1 p-8 overflow-auto">
          <ViewRouter />
        </main>
      </div>

      <Notifications />
      <ToastContainer />
    </div>
  );
}
