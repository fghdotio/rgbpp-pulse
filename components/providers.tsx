"use client";

import { type ReactNode } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { AppProvider } from "@/lib/context/app-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ccc.Provider>
      <AppProvider>{children}</AppProvider>
    </ccc.Provider>
  );
}
