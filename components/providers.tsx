"use client";

import { type ReactNode } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { AppProvider } from "@/lib/context/app-context";
import { AssetsProvider } from "@/lib/context/assets-context";
import { PipelineProvider } from "@/lib/context/pipeline-context";
import { useTransactionRecovery } from "@/lib/hooks/useTransactionRecovery";

/**
 * Runs the transaction recovery hook on mount.
 * Must be rendered inside both AppProvider and PipelineProvider.
 */
function TransactionRecoveryInitializer({ children }: { children: ReactNode }) {
  useTransactionRecovery();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ccc.Provider>
      <AppProvider>
        <AssetsProvider>
          <PipelineProvider>
            <TransactionRecoveryInitializer>
              {children}
            </TransactionRecoveryInitializer>
          </PipelineProvider>
        </AssetsProvider>
      </AppProvider>
    </ccc.Provider>
  );
}
