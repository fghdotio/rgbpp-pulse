"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Coins, Image, TrendingUp, Loader2, Wallet } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";

export function PortfolioOverview() {
  const { isConnected, openConnector } = useApp();
  const { udtAssets, sporeAssets, loading } = useAssets();

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your RGB++ assets across Bitcoin and CKB networks.
          </p>
          <button
            onClick={openConnector}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Wallet className="size-4" />
            Connect Wallet
          </button>
        </div>
      </Card>
    );
  }

  const btcUdts = udtAssets.filter((a) => a.location === "btc");
  const ckbUdts = udtAssets.filter((a) => a.location === "ckb");
  const btcSpores = sporeAssets.filter((a) => a.location === "btc");
  const ckbSpores = sporeAssets.filter((a) => a.location === "ckb");

  const stats = [
    {
      label: "RGB++ Assets",
      value: loading ? "…" : `${btcUdts.length + btcSpores.length}`,
      sublabel: "Bound to Bitcoin",
      icon: TrendingUp,
    },
    {
      label: "Token Balance",
      value: loading ? "…" : `${udtAssets.length} Token${udtAssets.length !== 1 ? "s" : ""}`,
      sublabel: `${ckbUdts.length} CKB + ${btcUdts.length} BTC`,
      icon: Coins,
    },
    {
      label: "DOBs Owned",
      value: loading ? "…" : `${sporeAssets.length} DOB${sporeAssets.length !== 1 ? "s" : ""}`,
      sublabel: `${ckbSpores.length} CKB + ${btcSpores.length} BTC`,
      icon: Image,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {loading && (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  )}
                  {stat.value}
                </p>
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
