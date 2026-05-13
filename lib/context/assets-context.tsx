"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useApp } from "./app-context";
import {
  fetchUdtAssets,
  fetchSporeAssets,
  enrichSporesWithDob,
} from "@/lib/services/assets";
import { getAddressActivity, type ActivityTransaction } from "@/lib/services/api";
import type { UdtAsset, SporeAsset } from "@/lib/services/types";

interface AssetsContextValue {
  /** UDT token assets */
  udtAssets: UdtAsset[];
  /** Spore/DOB assets */
  sporeAssets: SporeAsset[];
  /** Recent RGB++ transactions */
  recentActivity: ActivityTransaction[];
  /** Whether UDT tokens are loading */
  udtLoading: boolean;
  /** Whether Spore/DOB assets are loading */
  sporeLoading: boolean;
  /** Whether activity data is loading */
  activityLoading: boolean;
  /** Whether DOB enrichment is in progress */
  enrichingDobs: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => void;
}

const AssetsContext = createContext<AssetsContextValue | undefined>(undefined);

export function AssetsProvider({ children }: { children: ReactNode }) {
  const { isConnected, btcAddress, signer, client } = useApp();

  const [udtAssets, setUdtAssets] = useState<UdtAsset[]>([]);
  const [sporeAssets, setSporeAssets] = useState<SporeAsset[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityTransaction[]>([]);
  const [udtLoading, setUdtLoading] = useState(false);
  const [sporeLoading, setSporeLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [enrichingDobs, setEnrichingDobs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setUdtAssets([]);
      setSporeAssets([]);
      setRecentActivity([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setError(null);

    // ── UDT fetch (independent) ──────────────────────
    setUdtLoading(true);
    fetchUdtAssets(btcAddress, client, signer)
      .then((udts) => {
        if (!cancelled) setUdtAssets(udts);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("Failed to load UDT assets:", err);
          setError(err instanceof Error ? err.message : "Failed to load UDT assets");
        }
      })
      .finally(() => {
        if (!cancelled) setUdtLoading(false);
      });

    // ── Spore fetch (independent, with DOB enrichment phase 2) ──
    if (btcAddress) {
      setSporeLoading(true);
      fetchSporeAssets(btcAddress, client, signer)
        .then(async (spores) => {
          if (cancelled) return;
          setSporeAssets(spores);

          // Enrich DOBs asynchronously (phase 2)
          if (spores.length > 0) {
            setEnrichingDobs(true);
            try {
              const enriched = await enrichSporesWithDob(spores);
              if (!cancelled) setSporeAssets([...enriched]);
            } finally {
              if (!cancelled) setEnrichingDobs(false);
            }
          }
        })
        .catch((err) => {
          if (!cancelled) {
            console.warn("Failed to load Spore assets:", err);
            setError(err instanceof Error ? err.message : "Failed to load Spore assets");
          }
        })
        .finally(() => {
          if (!cancelled) setSporeLoading(false);
        });
    }

    // ── Activity fetch (independent) ─────────────────
    if (btcAddress) {
      setActivityLoading(true);
      getAddressActivity(btcAddress, { rgbppOnly: true })
        .then((r) => {
          if (!cancelled) setRecentActivity(r.txs.slice(0, 10));
        })
        .catch(() => {
          if (!cancelled) setRecentActivity([]);
        })
        .finally(() => {
          if (!cancelled) setActivityLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [isConnected, btcAddress, signer, client, refreshKey]);

  return (
    <AssetsContext.Provider
      value={{
        udtAssets,
        sporeAssets,
        recentActivity,
        udtLoading,
        sporeLoading,
        activityLoading,
        enrichingDobs,
        error,
        refresh,
      }}
    >
      {children}
    </AssetsContext.Provider>
  );
}

export function useAssets() {
  const ctx = useContext(AssetsContext);
  if (!ctx) throw new Error("useAssets must be used inside AssetsProvider");
  return ctx;
}
