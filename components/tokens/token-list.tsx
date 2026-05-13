"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { formatBalance, truncateAddress, cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Coins, Copy, Check, Loader2 } from "lucide-react";
import type { UdtAsset } from "@/lib/services/types";
import { TransactionDialog, type TxDialogOperation } from "./transaction-dialog";

/** A merged view of the same UDT across CKB and RGB++ locations */
interface MergedToken {
  name: string;
  symbol: string;
  decimals: number;
  typeScriptArgs: string;
  typeScriptCodeHash: string;
  typeScriptHashType: string;
  totalBalance: bigint;
  ckb?: UdtAsset;
  rgbpp?: UdtAsset;
}

function mergeTokensByType(assets: UdtAsset[]): MergedToken[] {
  const map = new Map<string, MergedToken>();
  for (const t of assets) {
    const key = t.typeScriptArgs;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        name: t.name,
        symbol: t.symbol,
        decimals: t.decimals,
        typeScriptArgs: t.typeScriptArgs,
        typeScriptCodeHash: t.typeScriptCodeHash,
        typeScriptHashType: t.typeScriptHashType,
        totalBalance: BigInt(0),
      };
      map.set(key, entry);
    }
    entry.totalBalance += t.balance;
    if (t.location === "ckb") entry.ckb = t;
    else entry.rgbpp = t;
  }
  return Array.from(map.values());
}

export function TokenList() {
  const { isConnected } = useApp();
  const { udtAssets, loading } = useAssets();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "rgbpp" | "ckb">("all");
  const [txDialogToken, setTxDialogToken] = useState<UdtAsset | null>(null);
  const [txDialogOp, setTxDialogOp] = useState<TxDialogOperation>("leap-to-btc");
  const [txDialogOpen, setTxDialogOpen] = useState(false);

  const openTxDialog = useCallback((token: UdtAsset, op: TxDialogOperation) => {
    setTxDialogToken(token);
    setTxDialogOp(op);
    setTxDialogOpen(true);
  }, []);

  const merged = useMemo(() => mergeTokensByType(udtAssets), [udtAssets]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  /* ── Filtered data ─────────────────────────────────── */
  const filteredSingle = udtAssets.filter((t) => {
    if (filter === "rgbpp") return t.location === "btc";
    if (filter === "ckb") return t.location === "ckb";
    return true;
  });

  const filteredMerged = filter === "all" ? merged : [];

  /* ── Filter tab counts ─────────────────────────────── */
  const mergedCount = merged.length;
  const rgbppCount = udtAssets.filter((t) => t.location === "btc").length;
  const ckbCount = udtAssets.filter((t) => t.location === "ckb").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {([
                { key: "all" as const, label: "All", count: mergedCount },
                { key: "rgbpp" as const, label: "RGB++", count: rgbppCount },
                { key: "ckb" as const, label: "CKB", count: ckbCount },
              ]).map(({ key, label, count }) => (
                <Button
                  key={key}
                  variant={filter === key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(key)}
                  className={filter === key ? "bg-primary/15 text-primary" : ""}
                >
                  {label} ({count})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── All: merged view ─────────────────────────── */}
      {filter === "all" && (
        filteredMerged.length === 0 ? (
          <Card><CardContent className="text-center py-12 text-muted-foreground text-sm">No tokens found</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMerged.map((token) => {
              const hasBoth = !!token.ckb && !!token.rgbpp;
              return (
                <Card
                  key={token.typeScriptArgs}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedToken === token.typeScriptArgs && "border-primary"
                  )}
                  onClick={() => setSelectedToken(token.typeScriptArgs)}
                >
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
                      <div className="flex gap-1">
                        {token.ckb && <Badge variant="default" className="text-[10px] px-1.5">CKB</Badge>}
                        {token.rgbpp && <Badge variant="secondary" className="text-[10px] px-1.5">RGB++</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Total balance */}
                    <div>
                      <p className="text-2xl font-bold font-mono">{formatBalance(token.totalBalance, token.decimals)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Total Balance</p>
                    </div>

                    {/* Breakdown by location (only when both sides exist) */}
                    {hasBoth && (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-orange-500 inline-block" />RGB++
                          </span>
                          <span className="font-mono font-medium">{formatBalance(token.rgbpp!.balance, token.decimals)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-primary inline-block" />CKB
                          </span>
                          <span className="font-mono font-medium">{formatBalance(token.ckb!.balance, token.decimals)}</span>
                        </div>
                        {/* Balance ratio bar */}
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden flex mt-1">
                          <div
                            className="bg-orange-500 rounded-l-full transition-all"
                            style={{ width: `${Number(token.rgbpp!.balance * BigInt(100) / token.totalBalance)}%` }}
                          />
                          <div className="bg-primary rounded-r-full flex-1" />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {token.ckb && (
                        <Button size="sm" className="flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token.ckb!, "leap-to-btc"); }}>
                          <ArrowUpRight className="size-4" />Leap to BTC
                        </Button>
                      )}
                      {token.rgbpp && (
                        <>
                          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token.rgbpp!, "transfer-on-btc"); }}>
                            <ArrowLeftRight className="size-4" />Transfer on BTC
                          </Button>
                          <Button size="sm" className="flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token.rgbpp!, "leap-to-ckb"); }}>
                            <ArrowDownLeft className="size-4" />Leap to CKB
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ── RGB++ / CKB: single-location view ───────── */}
      {filter !== "all" && (
        filteredSingle.length === 0 ? (
          <Card><CardContent className="text-center py-12 text-muted-foreground text-sm">No tokens found</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSingle.map((token) => (
              <Card
                key={token.typeScriptArgs + token.location}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  selectedToken === token.typeScriptArgs + token.location && "border-primary"
                )}
                onClick={() => setSelectedToken(token.typeScriptArgs + token.location)}
              >
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
                  <div className="flex gap-2 pt-2">
                    {token.location === "ckb" ? (
                      <Button size="sm" className="flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token, "leap-to-btc"); }}><ArrowUpRight className="size-4" />Leap to BTC</Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token, "transfer-on-btc"); }}><ArrowLeftRight className="size-4" />Transfer on BTC</Button>
                        <Button size="sm" className="flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token, "leap-to-ckb"); }}><ArrowDownLeft className="size-4" />Leap to CKB</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Transaction Dialog */}
      {txDialogToken && (
        <TransactionDialog
          open={txDialogOpen}
          onClose={() => setTxDialogOpen(false)}
          token={txDialogToken}
          operation={txDialogOp}
        />
      )}
    </div>
  );
}
