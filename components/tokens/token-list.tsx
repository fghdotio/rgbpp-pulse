"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { formatBalance, truncateAddress, cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Coins, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import type { UdtAsset } from "@/lib/services/types";

export function TokenList() {
  const { isConnected } = useApp();
  const { udtAssets, loading, refresh } = useAssets();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<UdtAsset | null>(null);
  const [filter, setFilter] = useState<"all" | "rgbpp" | "ckb">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Connect your wallet to view and manage your tokens.</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading tokens…
        </CardContent>
      </Card>
    );
  }

  const filtered = udtAssets.filter((t) => {
    if (filter === "rgbpp") return t.location === "btc";
    if (filter === "ckb") return t.location === "ckb";
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {(["all", "rgbpp", "ckb"] as const).map((f) => {
                const count = f === "all" ? udtAssets.length : udtAssets.filter((t) => t.location === (f === "rgbpp" ? "btc" : "ckb")).length;
                const label = f === "all" ? "All" : f === "rgbpp" ? "RGB++" : "CKB";
                return (
                  <Button key={f} variant={filter === f ? "secondary" : "ghost"} size="sm" onClick={() => setFilter(f)} className={filter === f ? "bg-primary/15 text-primary" : ""}>
                    {label} ({count})
                  </Button>
                );
              })}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground text-sm">No tokens found</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((token) => (
            <Card key={token.typeScriptArgs + token.location} className={`cursor-pointer transition-all hover:border-primary/50 ${selectedToken?.typeScriptArgs === token.typeScriptArgs ? "border-primary" : ""}`} onClick={() => setSelectedToken(token)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{(token.symbol || token.name).slice(0, 2)}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{token.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{token.symbol}</p>
                    </div>
                  </div>
                  <Badge variant={token.location === "ckb" ? "default" : "secondary"}>{token.location === "btc" ? "RGB++" : "CKB"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold font-mono">{formatBalance(token.balance, token.decimals)}</p>
                  <p className="text-sm text-muted-foreground">{token.symbol}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type Args</span>
                  <button onClick={(e) => { e.stopPropagation(); copyToClipboard(token.typeScriptArgs, token.typeScriptArgs); }} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <span className="font-mono">{truncateAddress(token.typeScriptArgs, 6, 4)}</span>
                    {copiedId === token.typeScriptArgs ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                  </button>
                </div>
                <div className="flex gap-2 pt-2">
                  {token.location === "ckb" ? (
                    <Button size="sm" className="flex-1 gap-1.5"><ArrowUpRight className="size-4" />Leap to BTC</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5"><ArrowLeftRight className="size-4" />Transfer</Button>
                      <Button size="sm" className="flex-1 gap-1.5"><ArrowDownLeft className="size-4" />Leap to CKB</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
