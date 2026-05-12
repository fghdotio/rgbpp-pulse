"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";
import { truncateAddress, formatRelativeTime } from "@/lib/utils";

const activities = [
  {
    type: "leap-to-btc",
    asset: "RTT",
    amount: "1,000",
    status: "completed",
    timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  },
  {
    type: "transfer-on-btc",
    asset: "SCX",
    amount: "500",
    status: "pending",
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  },
  {
    type: "leap-to-ckb",
    asset: "TST",
    amount: "250",
    status: "completed",
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    txHash: "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
  },
];

const typeIcons = {
  "leap-to-btc": ArrowUpRight,
  "transfer-on-btc": ArrowLeftRight,
  "leap-to-ckb": ArrowDownLeft,
};

const typeLabels = {
  "leap-to-btc": "Leap to BTC",
  "transfer-on-btc": "Transfer on BTC",
  "leap-to-ckb": "Leap to CKB",
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <a href="/transactions" className="text-sm text-primary hover:underline">
            View All
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = typeIcons[activity.type as keyof typeof typeIcons];
            return (
              <div
                key={index}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="size-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {typeLabels[activity.type as keyof typeof typeLabels]}
                    </p>
                    <Badge
                      variant={activity.status === "completed" ? "success" : "warning"}
                    >
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activity.amount} {activity.asset} • {truncateAddress(activity.txHash, 8, 6)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
