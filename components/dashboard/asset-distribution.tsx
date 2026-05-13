"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { formatBalance } from "@/lib/utils";

export function AssetDistribution() {
  const { isConnected } = useApp();
  const { udtAssets, loading } = useAssets();

  if (!isConnected) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Asset Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (udtAssets.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Asset Distribution</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground text-sm">
          No tokens found
        </CardContent>
      </Card>
    );
  }

  // Sort by balance descending (approximate—doesn't account for price)
  const sorted = [...udtAssets].sort((a, b) => {
    // Compare raw balances (normalized would require prices, so just compare raw)
    if (b.balance > a.balance) return 1;
    if (b.balance < a.balance) return -1;
    return 0;
  });

  // Calculate rough percentages by relative balance magnitude
  // Since we don't have prices, use the formatted display value count for simple visual bars
  const maxBalance = sorted[0]?.balance ?? BigInt(1);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Asset Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((asset) => {
          const pct =
            maxBalance > BigInt(0)
              ? Number((asset.balance * BigInt(100)) / maxBalance)
              : 0;

          return (
            <div key={asset.typeScriptArgs + asset.location} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {(asset.symbol || asset.name).slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm font-mono">
                    {formatBalance(asset.balance, asset.decimals)}
                  </p>
                  <Badge
                    variant={asset.location === "ckb" ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {asset.location === "btc" ? "RGB++" : "CKB"}
                  </Badge>
                </div>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
