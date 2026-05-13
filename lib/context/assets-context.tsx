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
  /** Whether assets are currently loading */
  loading: boolean;
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
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setError(null);

    const loadAssets = async () => {
      try {
        // Fetch UDTs, Spores, and Activity in parallel
        const [udts, spores, activity] = await Promise.all([
          fetchUdtAssets(btcAddress, client, signer),
          btcAddress
            ? fetchSporeAssets(btcAddress, client, signer)
            : Promise.resolve([]),
          btcAddress
            ? getAddressActivity(btcAddress, { rgbppOnly: true })
                .then((r) => r.txs.slice(0, 10))
                .catch(() => [] as ActivityTransaction[])
            : Promise.resolve([] as ActivityTransaction[]),
        ]);

        if (cancelled) return;

        setUdtAssets(udts);
        setSporeAssets(spores);
        setRecentActivity(activity);

        // Enrich DOBs asynchronously (phase 2)
        if (spores.length > 0) {
          setEnrichingDobs(true);
          try {
            const enriched = await enrichSporesWithDob(spores);
            if (!cancelled) {
              setSporeAssets([...enriched]);
            }
          } finally {
            if (!cancelled) setEnrichingDobs(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to load assets:", err);
          setError(err instanceof Error ? err.message : "Failed to load assets");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAssets();

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
        loading,
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
