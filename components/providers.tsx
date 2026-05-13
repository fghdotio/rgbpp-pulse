"use client";

import { type ReactNode } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { AppProvider } from "@/lib/context/app-context";
import { AssetsProvider } from "@/lib/context/assets-context";
import { PipelineProvider } from "@/lib/context/pipeline-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ccc.Provider>
      <AppProvider>
        <AssetsProvider>
          <PipelineProvider>{children}</PipelineProvider>
        </AssetsProvider>
      </AppProvider>
    </ccc.Provider>
  );
}
