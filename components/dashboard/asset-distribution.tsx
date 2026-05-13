"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Coins, Image as ImageIcon } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { formatBalance } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";

/** Compact token summary for preview */
interface TokenSummary {
  name: string;
  symbol: string;
  decimals: number;
  totalBalance: bigint;
  chains: ("ckb" | "btc")[];
}

function summarizeTokens(
  udtAssets: { name: string; symbol: string; decimals: number; balance: bigint; location: "ckb" | "btc" }[]
): TokenSummary[] {
  const map = new Map<string, TokenSummary>();
  for (const a of udtAssets) {
    const key = `${a.symbol}:${a.decimals}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalBalance += a.balance;
      if (!existing.chains.includes(a.location)) existing.chains.push(a.location);
    } else {
      map.set(key, {
        name: a.name,
        symbol: a.symbol,
        decimals: a.decimals,
        totalBalance: a.balance,
        chains: [a.location],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.totalBalance > a.totalBalance) return 1;
    if (b.totalBalance < a.totalBalance) return -1;
    return 0;
  });
}

export function AssetDistribution() {
  const { isConnected } = useApp();
  const { udtAssets, sporeAssets, udtLoading, sporeLoading, enrichingDobs } = useAssets();
  const loading = udtLoading || sporeLoading;

  const tokens = useMemo(() => summarizeTokens(udtAssets), [udtAssets]);

  if (!isConnected) return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasTokens = tokens.length > 0;
  const hasDobs = sporeAssets.length > 0;

  if (!hasTokens && !hasDobs) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground text-sm">
          No assets found
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y divide-border">
        {/* Tokens Row */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Tokens</span>
            </div>
            <Link href="/tokens" className="text-xs text-primary hover:underline">
              View All →
            </Link>
          </div>
          {hasTokens ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {tokens.slice(0, 4).map((t) => (
                <span key={`${t.symbol}:${t.decimals}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-sm font-medium">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  {t.symbol}
                </span>
              ))}
              {tokens.length > 4 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{tokens.length - 4} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tokens</p>
          )}
        </div>

        {/* DOBs Row */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">DOBs</span>
            </div>
            <Link href="/dobs" className="text-xs text-primary hover:underline">
              View All →
            </Link>
          </div>
          {hasDobs ? (
            <div className="flex items-center gap-2 overflow-x-auto">
              {sporeAssets.slice(0, 6).map((dob) => (
                <div
                  key={dob.id}
                  className="size-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border/50"
                  title={dob.clusterName || dob.id.slice(0, 10)}
                >
                  {dob.dobSvg ? (
                    <div
                      className="size-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover"
                      dangerouslySetInnerHTML={{ __html: dob.dobSvg }}
                    />
                  ) : dob.dobImageUri ? (
                    <img
                      src={dob.dobImageUri}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : enrichingDobs ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="size-full bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center">
                      <ImageIcon className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {sporeAssets.length > 6 && (
                <Link
                  href="/dobs"
                  className="size-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                >
                  +{sporeAssets.length - 6}
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No DOBs</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
