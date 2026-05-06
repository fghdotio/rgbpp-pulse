
import { useTransactions } from '../context/TransactionContext';
import { useApp } from '../context/AppContext';
import { useActivityHistory } from '../hooks/useActivityHistory';
import { TransactionTracker } from '../components/TransactionTracker';
import { UnifiedTxRow } from '../components/UnifiedTxRow';
import { Activity, Zap, RefreshCw, Loader2 } from 'lucide-react';

export function Transactions() {
  const { activePipelines } = useTransactions();
  const { isConnected } = useApp();
  const { transactions, loading, loadingMore, hasMore, error, loadMore, refresh } = useActivityHistory();

  // Filter out active pipelines from the unified list to avoid duplicate display
  const activeIds = new Set(activePipelines.map((p) => p.id));
  const historyTransactions = transactions.filter(
    (tx) => !tx.localPipeline || !activeIds.has(tx.localPipeline.id),
  );

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Activity size={22} color="var(--green)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Transactions</h1>
      </div>

      {/* Active Pipelines */}
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

      {/* History — Unified list (local + on-chain) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            History
          </h3>
          {isConnected && (
            <button
              onClick={refresh}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: loading ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.6875rem',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'color 150ms ease',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.color = 'var(--green)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <RefreshCw size={12} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
              Refresh
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && historyTransactions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <div>Loading transaction history...</div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={{ background: 'rgba(243, 114, 127, 0.08)', borderRadius: 'var(--radius-lg)', padding: '16px', color: 'var(--text-negative)', fontSize: '0.8125rem', marginBottom: '12px' }}>
            Failed to load on-chain activity: {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && historyTransactions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {isConnected ? 'No transaction history yet' : 'Connect wallet to see transaction history'}
          </div>
        )}

        {/* Transaction list */}
        {historyTransactions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {historyTransactions.map((tx) => (
              <UnifiedTxRow key={tx.key} tx={tx} />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && historyTransactions.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-separator)',
                borderRadius: 'var(--radius-lg)',
                padding: '10px 24px',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: loadingMore ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 150ms ease',
                opacity: loadingMore ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loadingMore) {
                  e.currentTarget.style.borderColor = 'var(--green)';
                  e.currentTarget.style.color = 'var(--green)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-separator)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {loadingMore ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
