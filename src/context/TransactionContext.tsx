import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { TransactionPipeline } from '../services/types';

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
  const [pipelines, setPipelines] = useState<TransactionPipeline[]>([]);

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
