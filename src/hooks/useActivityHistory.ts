/**
 * Hook to fetch on-chain activity and merge with local pipelines.
 *
 * Returns a unified, de-duplicated, time-sorted transaction list
 * combining local TransactionContext pipelines with the
 * btc-assets-api /:btc_address/activity endpoint.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { getAddressActivity, type ActivityTransaction } from '../services/api';
import { mergeTransactions, type UnifiedTransaction } from '../services/mergeTransactions';

export function useActivityHistory() {
  const { btcAddress } = useApp();
  const { pipelines } = useTransactions();

  const [remoteActivity, setRemoteActivity] = useState<ActivityTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the first page of activity.
   */
  const fetchActivity = useCallback(async () => {
    if (!btcAddress) return;

    setLoading(true);
    setError(null);
    try {
      const res = await getAddressActivity(btcAddress, { rgbppOnly: true });
      setRemoteActivity(res.txs);
      setCursor(res.cursor);
      setHasMore(!!res.cursor && res.txs.length > 0);
    } catch (err) {
      console.error('[useActivityHistory] Failed to fetch activity:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [btcAddress]);

  /**
   * Load the next page of activity (append).
   */
  const loadMore = useCallback(async () => {
    if (!btcAddress || !cursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const res = await getAddressActivity(btcAddress, {
        rgbppOnly: true,
        afterBtcTxid: cursor,
      });
      setRemoteActivity((prev) => [...prev, ...res.txs]);
      setCursor(res.cursor);
      setHasMore(!!res.cursor && res.txs.length > 0);
    } catch (err) {
      console.error('[useActivityHistory] Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [btcAddress, cursor, loadingMore]);

  /**
   * Refresh (refetch first page).
   */
  const refresh = useCallback(() => {
    setRemoteActivity([]);
    setCursor(undefined);
    setHasMore(true);
    fetchActivity();
  }, [fetchActivity]);

  // Auto-fetch on mount and when address changes
  useEffect(() => {
    if (btcAddress) {
      fetchActivity();
    } else {
      setRemoteActivity([]);
      setCursor(undefined);
      setHasMore(true);
    }
  }, [btcAddress, fetchActivity]);

  // Merge local pipelines with remote activity
  const unified: UnifiedTransaction[] = useMemo(
    () => mergeTransactions(pipelines, remoteActivity),
    [pipelines, remoteActivity],
  );

  return {
    /** Merged, de-duplicated, sorted transaction list */
    transactions: unified,
    /** Initial loading state */
    loading,
    /** Loading more pages */
    loadingMore,
    /** Whether more pages are available */
    hasMore,
    /** Error message if fetch failed */
    error,
    /** Load the next page */
    loadMore,
    /** Refresh from scratch */
    refresh,
  };
}
