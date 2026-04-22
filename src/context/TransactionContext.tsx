import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { TransactionPipeline } from '../services/types';

const STORAGE_KEY = 'rgbpp_transaction_pipelines';

/**
 * Serialize pipelines to localStorage.
 * BigInt values are not expected in TransactionPipeline so JSON.stringify is safe.
 */
function savePipelines(pipelines: TransactionPipeline[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
  } catch {
    // localStorage might be full or disabled — silently ignore
  }
}

/**
 * Load pipelines from localStorage.
 */
function loadPipelines(): TransactionPipeline[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TransactionPipeline[];
  } catch {
    return [];
  }
}

interface TransactionContextValue {
  /** Active + historical pipelines */
  pipelines: TransactionPipeline[];
  /** Add or update a pipeline */
  upsertPipeline: (pipeline: TransactionPipeline) => void;
  /** Get active pipelines */
  activePipelines: TransactionPipeline[];
  /** Get completed/errored pipelines */
  historyPipelines: TransactionPipeline[];
  /** Clear history */
  clearHistory: () => void;
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [pipelines, setPipelines] = useState<TransactionPipeline[]>(() => loadPipelines());

  // Persist to localStorage whenever pipelines change
  useEffect(() => {
    savePipelines(pipelines);
  }, [pipelines]);

  const upsertPipeline = useCallback((pipeline: TransactionPipeline) => {
    setPipelines((prev) => {
      const idx = prev.findIndex((p) => p.id === pipeline.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pipeline;
        return next;
      }
      return [pipeline, ...prev];
    });
  }, []);

  const activePipelines = pipelines.filter((p) => p.status === 'active' || p.status === 'pending');
  const historyPipelines = pipelines.filter((p) => p.status === 'completed' || p.status === 'error');

  const clearHistory = useCallback(() => {
    setPipelines((prev) => prev.filter((p) => p.status === 'active' || p.status === 'pending'));
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        pipelines,
        upsertPipeline,
        activePipelines,
        historyPipelines,
        clearHistory,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used inside TransactionProvider');
  return ctx;
}
