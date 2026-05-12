"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Coins, Image, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { useApp } from "@/lib/context/app-context";

const stats = [
  {
    label: "Total Value",
    value: "$12,847.32",
    change: "+12.5%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    label: "Token Balance",
    value: "8 Tokens",
    sublabel: "CKB + BTC",
    icon: Coins,
  },
  {
    label: "DOBs Owned",
    value: "24 DOBs",
    sublabel: "3 Collections",
    icon: Image,
  },
];

export function PortfolioOverview() {
  const { isConnected } = useApp();

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your RGB++ assets across CKB and Bitcoin networks.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                {stat.change && (
                  <div className="flex items-center gap-1">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="size-4 text-success" />
                    ) : (
                      <ArrowDownRight className="size-4 text-destructive" />
                    )}
                    <span
                      className={
                        stat.trend === "up" ? "text-success text-sm" : "text-destructive text-sm"
                      }
                    >
                      {stat.change}
                    </span>
                  </div>
                )}
                {stat.sublabel && (
                  <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
                )}
              </div>
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
