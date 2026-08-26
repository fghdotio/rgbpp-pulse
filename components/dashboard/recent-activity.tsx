"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Loader2, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { truncateAddress, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import {
  activityConfirmed,
  activityFee,
  activityOperation,
  activityTimestamp,
  type ActivityOperation,
} from "@/lib/services/activity";

const typeConfig: Record<
  ActivityOperation,
  { icon: typeof ArrowUpRight; label: string; description: string; color: string }
> = {
  "leap-to-btc": {
    icon: ArrowUpRight,
    label: "Leap to BTC",
    description: "Crossed assets to Bitcoin",
    color: "text-warning",
  },
  "transfer-on-btc": {
    icon: ArrowLeftRight,
    label: "RGB++ Transfer",
    description: "Transferred on Bitcoin",
    color: "text-primary",
  },
  "leap-to-ckb": {
    icon: ArrowDownLeft,
    label: "Leap to CKB",
    description: "Crossed assets to CKB",
    color: "text-chart-2",
  },
  exit: {
    icon: ArrowLeftRight,
    label: "Left RGB++",
    description: "Consumed RGB++ cells with no RGB++ output",
    color: "text-muted-foreground",
  },
};

export function RecentActivity() {
  const { isConnected } = useApp();
  const { recentActivity, activityLoading: loading } = useAssets();

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
          <div className="space-y-1">
            {recentActivity.slice(0, 5).map((activity, index) => {
              const config = typeConfig[activityOperation(activity)];
              const Icon = config.icon;
              const isConfirmed = activityConfirmed(activity);
              const timestamp = activityTimestamp(activity) ?? Date.now();
              const fee = activityFee(activity);
              const btcTxid = activity.btc?.txid;

              return (
                <div
                  key={activity.ckbTxHash || index}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <div className={`size-10 rounded-lg bg-secondary flex items-center justify-center`}>
                    <Icon className={`size-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{config.label}</p>
                      <Badge variant={isConfirmed ? "success" : "warning"}>
                        {isConfirmed ? "confirmed" : "pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                      {fee !== null && fee > 0 && ` · Fee: ${fee} sat`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(timestamp)}
                    </p>
                    {btcTxid && (
                      <a
                        href={`https://mempool.space/testnet/tx/${btcTxid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {truncateAddress(btcTxid, 4, 4)}
                        <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
