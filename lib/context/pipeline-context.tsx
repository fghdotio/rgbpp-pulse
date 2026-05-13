"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { TransactionPipeline } from "@/lib/services/types";

interface PipelineContextValue {
  /** All pipelines (active + completed + error) */
  pipelines: TransactionPipeline[];
  /** Number of currently active pipelines */
  activeCount: number;
  /** Add a new pipeline and return its ID */
  addPipeline: (pipeline: TransactionPipeline) => void;
  /** Update an existing pipeline (called by the service onUpdate callback) */
  updatePipeline: (pipeline: TransactionPipeline) => void;
  /** Remove a pipeline by ID */
  removePipeline: (id: string) => void;
  /** Get the onUpdate callback (to pass to service functions) */
  createOnUpdate: () => (p: TransactionPipeline) => void;
}

const PipelineContext = createContext<PipelineContextValue | undefined>(
  undefined
);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [pipelines, setPipelines] = useState<TransactionPipeline[]>([]);

  const addPipeline = useCallback((pipeline: TransactionPipeline) => {
    setPipelines((prev) => [pipeline, ...prev]);
  }, []);

  const updatePipeline = useCallback((pipeline: TransactionPipeline) => {
    setPipelines((prev) =>
      prev.map((p) => (p.id === pipeline.id ? pipeline : p))
    );
  }, []);

  const removePipeline = useCallback((id: string) => {
    setPipelines((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const createOnUpdate = useCallback(
    () => {
      return (p: TransactionPipeline) => {
        setPipelines((prev) => {
          const exists = prev.some((x) => x.id === p.id);
          if (exists) {
            return prev.map((x) => (x.id === p.id ? p : x));
          }
          return [p, ...prev];
        });
      };
    },
    []
  );

  const activeCount = pipelines.filter((p) => p.status === "active").length;

  return (
    <PipelineContext.Provider
      value={{
        pipelines,
        activeCount,
        addPipeline,
        updatePipeline,
        removePipeline,
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
