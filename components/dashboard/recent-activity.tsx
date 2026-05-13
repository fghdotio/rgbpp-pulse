"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Loader2 } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { truncateAddress, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

const typeIcons = {
  "leap-to-btc": ArrowUpRight,
  "transfer-on-btc": ArrowLeftRight,
  "leap-to-ckb": ArrowDownLeft,
};

const typeLabels: Record<string, string> = {
  "leap-to-btc": "Leap to BTC",
  "transfer-on-btc": "Transfer on BTC",
  "leap-to-ckb": "Leap to CKB",
};

/**
 * Infer transaction type from activity data.
 * If the tx has isomorphic data (RGB++ tx), we classify it;
 * otherwise it's a plain BTC transfer.
 */
function inferTxType(tx: { isRgbpp: boolean }): string {
  // Without deep inspection of inputs/outputs lock scripts,
  // we mark all RGB++ txs as "transfer-on-btc" by default.
  return tx.isRgbpp ? "transfer-on-btc" : "transfer-on-btc";
}

export function RecentActivity() {
  const { isConnected } = useApp();
  const { recentActivity, loading } = useAssets();

  if (!isConnected) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Link href="/transactions" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.slice(0, 5).map((activity, index) => {
              const txType = inferTxType(activity);
              const Icon = typeIcons[txType as keyof typeof typeIcons] || ArrowLeftRight;
              const isConfirmed = activity.btcTx.status.confirmed;
              const timestamp = activity.btcTx.status.block_time
                ? activity.btcTx.status.block_time * 1000
                : Date.now();

              return (
                <div
                  key={activity.btcTx.txid || index}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="size-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {activity.isRgbpp ? "RGB++ Transaction" : "BTC Transaction"}
                      </p>
                      <Badge variant={isConfirmed ? "success" : "warning"}>
                        {isConfirmed ? "confirmed" : "pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {truncateAddress(activity.btcTx.txid, 8, 6)}
                      {activity.btcTx.fee > 0 && ` • Fee: ${activity.btcTx.fee} sat`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(timestamp)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
