import { useTransactions } from '../context/TransactionContext';
import { useApp } from '../context/AppContext';
import { useActivityHistory } from '../hooks/useActivityHistory';
import { TransactionTracker } from '../components/TransactionTracker';
import { UnifiedTxRow } from '../components/UnifiedTxRow';
import { Activity, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
    <div className="animate-fade-in">
      <div className="flex items-center gap-2.5 mb-6">
        <Activity size={22} className="text-primary" />
        <h1 className="text-2xl font-bold">Transactions</h1>
      </div>

      {/* Active Pipelines */}
      <section className="mb-8">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap size={12} className="text-primary" />
          Active ({activePipelines.length})
        </h3>
        {activePipelines.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            No active transactions
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {activePipelines.map((p) => <TransactionTracker key={p.id} pipeline={p} />)}
          </div>
        )}
      </section>

      {/* History — Unified list (local + on-chain) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            History
          </h3>
          {isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="text-[0.6875rem] h-7 text-muted-foreground hover:text-primary"
            >
              <RefreshCw size={12} className={cn(loading && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>

        {/* Loading state */}
        {loading && historyTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
            <div>Loading transaction history...</div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <Card className="p-4 mb-3 bg-destructive/10 border-destructive/20 text-destructive text-[0.8125rem]">
            Failed to load on-chain activity: {error}
          </Card>
        )}

        {/* Empty state */}
        {!loading && historyTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {isConnected ? 'No transaction history yet' : 'Connect wallet to see transaction history'}
          </div>
        )}

        {/* Transaction list */}
        {historyTransactions.length > 0 && (
          <div className="flex flex-col gap-1">
            {historyTransactions.map((tx) => (
              <UnifiedTxRow key={tx.key} tx={tx} />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && historyTransactions.length > 0 && (
          <div className="text-center mt-4">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
              className="gap-1.5"
            >
              {loadingMore ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
