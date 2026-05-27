"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { TransactionPipeline } from "@/lib/services/types";
import { networkedKey } from "@/lib/services/network";

// Per-network so testnet pipelines can never be read back inside a mainnet
// session after a switch (and vice versa).
const STORAGE_KEY = networkedKey("rgbpp_transaction_pipelines");

/**
 * Serialize pipelines to localStorage.
 * Uses a BigInt replacer as a safety net in case BigInt leaks into pipeline data.
 */
function savePipelines(pipelines: TransactionPipeline[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(pipelines, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v
      )
    );
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

interface PipelineContextValue {
  /** All pipelines (active + completed + error) */
  pipelines: TransactionPipeline[];
  /** Number of currently active pipelines */
  activeCount: number;
  /** Active pipelines */
  activePipelines: TransactionPipeline[];
  /** Completed/errored pipelines */
  historyPipelines: TransactionPipeline[];
  /** Add a new pipeline and return its ID */
  addPipeline: (pipeline: TransactionPipeline) => void;
  /** Update an existing pipeline (called by the service onUpdate callback) */
  updatePipeline: (pipeline: TransactionPipeline) => void;
  /** Add or update a pipeline */
  upsertPipeline: (pipeline: TransactionPipeline) => void;
  /** Remove a pipeline by ID */
  removePipeline: (id: string) => void;
  /** Clear completed/errored pipelines */
  clearHistory: () => void;
  /** Get the onUpdate callback (to pass to service functions) */
  createOnUpdate: () => (p: TransactionPipeline) => void;
}

const PipelineContext = createContext<PipelineContextValue | undefined>(
  undefined
);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [pipelines, setPipelines] = useState<TransactionPipeline[]>(() =>
    loadPipelines()
  );

  // Persist to localStorage whenever pipelines change
  useEffect(() => {
    savePipelines(pipelines);
  }, [pipelines]);

  const addPipeline = useCallback((pipeline: TransactionPipeline) => {
    setPipelines((prev) => [pipeline, ...prev]);
  }, []);

  const updatePipeline = useCallback((pipeline: TransactionPipeline) => {
    setPipelines((prev) =>
      prev.map((p) => (p.id === pipeline.id ? pipeline : p))
    );
  }, []);

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

  const removePipeline = useCallback((id: string) => {
    setPipelines((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setPipelines((prev) =>
      prev.filter((p) => p.status === "active" || p.status === "pending")
    );
  }, []);

  const createOnUpdate = useCallback(() => {
    return (p: TransactionPipeline) => {
      setPipelines((prev) => {
        const exists = prev.some((x) => x.id === p.id);
        if (exists) {
          return prev.map((x) => (x.id === p.id ? p : x));
        }
        return [p, ...prev];
      });
    };
  }, []);

  const activeCount = pipelines.filter((p) => p.status === "active").length;
  const activePipelines = pipelines.filter(
    (p) => p.status === "active" || p.status === "pending"
  );
  const historyPipelines = pipelines.filter(
    (p) => p.status === "completed" || p.status === "error"
  );

  return (
    <PipelineContext.Provider
      value={{
        pipelines,
        activeCount,
        activePipelines,
        historyPipelines,
        addPipeline,
        updatePipeline,
        upsertPipeline,
        removePipeline,
        clearHistory,
        createOnUpdate,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipelines() {
  const ctx = useContext(PipelineContext);
  if (!ctx)
    throw new Error("usePipelines must be used inside PipelineProvider");
  return ctx;
}
