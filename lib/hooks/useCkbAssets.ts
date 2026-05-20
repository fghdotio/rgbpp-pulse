"use client";

/**
 * Hook for lazy-loading CKB-native assets with client-side pagination.
 *
 * - Only fetches when explicitly activated (e.g. user selects CKB / All filter)
 * - UDTs: fetches all cells (required for correct balance aggregation),
 *   then paginates the display.
 * - Spores: fetches via async generator, yielding pages of N items at a time
 *   for true server-side pagination.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useApp } from "@/lib/context/app-context";
import {
  fetchCkbUdtAssets,
  generateCkbSporeAssets,
  enrichSporesWithDob,
} from "@/lib/services/assets";
import type { UdtAsset, SporeAsset } from "@/lib/services/types";

const UDT_PAGE_SIZE = 20;
const SPORE_PAGE_SIZE = 20;

// ─── CKB UDT Assets (client-side pagination) ──────────────

export function useCkbUdtAssets(enabled: boolean) {
  const { client, signer } = useApp();
  const [allAssets, setAllAssets] = useState<UdtAsset[]>([]);
  const [displayCount, setDisplayCount] = useState(UDT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !client || !signer || fetchedRef.current) return;

    let cancelled = false;
    fetchedRef.current = true;
    setLoading(true);

    fetchCkbUdtAssets(client, signer)
      .then((assets) => {
        if (!cancelled) setAllAssets(assets);
      })
      .catch((err) => {
        console.warn("CKB UDT lazy fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, client, signer]);

  // Reset when wallet changes
  useEffect(() => {
    fetchedRef.current = false;
    setAllAssets([]);
    setDisplayCount(UDT_PAGE_SIZE);
  }, [signer]);

  const displayed = allAssets.slice(0, displayCount);
  const hasMore = displayCount < allAssets.length;

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => prev + UDT_PAGE_SIZE);
  }, []);

  return {
    assets: displayed,
    allAssets,
    loading,
    hasMore,
    loadMore,
    totalCount: allAssets.length,
  };
}

// ─── CKB Spore Assets (generator-based pagination) ────────

export function useCkbSporeAssets(enabled: boolean) {
  const { client, signer } = useApp();
  const [assets, setAssets] = useState<SporeAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const genRef = useRef<AsyncGenerator<SporeAsset> | null>(null);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);

  const fetchPage = useCallback(
    async (isFirst: boolean) => {
      if (!client || !signer) return;

      if (isFirst) {
        setLoading(true);
        setAssets([]);
        setHasMore(true);
        cancelledRef.current = false;
        genRef.current = generateCkbSporeAssets(client, signer);
      } else {
        setLoadingMore(true);
      }

      const gen = genRef.current;
      if (!gen) return;

      const batch: SporeAsset[] = [];
      for (let i = 0; i < SPORE_PAGE_SIZE; i++) {
        const result = await gen.next();
        if (result.done) {
          setHasMore(false);
          break;
        }
        batch.push(result.value);
      }

      // Enrich spores with DOB traits + SVG rendering
      const enriched = batch.length > 0 ? await enrichSporesWithDob(batch) : batch;

      if (!cancelledRef.current) {
        if (isFirst) {
          setAssets(enriched);
          setLoading(false);
        } else {
          setAssets((prev) => [...prev, ...enriched]);
          setLoadingMore(false);
        }
      }
    },
    [client, signer],
  );

  // Auto-start when enabled
  useEffect(() => {
    if (!enabled || !client || !signer || startedRef.current) return;
    startedRef.current = true;
    fetchPage(true);
  }, [enabled, client, signer, fetchPage]);

  // Reset when wallet changes
  useEffect(() => {
    cancelledRef.current = true;
    genRef.current = null;
    startedRef.current = false;
    setAssets([]);
    setHasMore(true);
  }, [signer]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) fetchPage(false);
  }, [hasMore, loadingMore, fetchPage]);

  return { assets, loading, loadingMore, hasMore, loadMore };
}
