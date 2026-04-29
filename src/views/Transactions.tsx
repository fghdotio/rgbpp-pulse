
import { useTransactions } from '../context/TransactionContext';
import { TransactionTracker } from '../components/TransactionTracker';
import { TransactionHistory } from '../components/TransactionHistory';
import { Activity, Zap } from 'lucide-react';

export function Transactions() {
  const { activePipelines, historyPipelines, clearHistory } = useTransactions();

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Activity size={22} color="var(--green)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Transactions</h1>
      </div>

      {/* Active */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={12} color="var(--green)" />
          Active ({activePipelines.length})
        </h3>
        {activePipelines.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No active transactions
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activePipelines.map((p) => <TransactionTracker key={p.id} pipeline={p} />)}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: '12px' }}>
          History ({historyPipelines.length})
        </h3>
        <TransactionHistory pipelines={historyPipelines} onClear={clearHistory} />
      </section>
    </div>
  );
}
