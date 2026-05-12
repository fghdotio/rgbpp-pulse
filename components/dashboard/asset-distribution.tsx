"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const assets = [
  { name: "CKB", symbol: "CKB", balance: "125,847.32", chain: "ckb", percentage: 45 },
  { name: "RGB++ Token", symbol: "RTT", balance: "10,000.00", chain: "btc", percentage: 25 },
  { name: "Stable Coin X", symbol: "SCX", balance: "5,000.00", chain: "ckb", percentage: 18 },
  { name: "Test Token", symbol: "TST", balance: "2,500.00", chain: "btc", percentage: 12 },
];

export function AssetDistribution() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Asset Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {assets.map((asset) => (
          <div key={asset.symbol} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {asset.symbol.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm">{asset.balance}</p>
                <Badge variant={asset.chain === "ckb" ? "default" : "secondary"} className="mt-1">
                  {asset.chain.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${asset.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
