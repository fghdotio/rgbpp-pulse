"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { useCkbUdtAssets } from "@/lib/hooks/useCkbAssets";
import { formatBalance, cn, getTokenInitial, getTokenColor } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Coins, Loader2, Search } from "lucide-react";
import type { UdtAsset } from "@/lib/services/types";
import { TransactionDialog, type TxDialogOperation } from "./transaction-dialog";
import { Input } from "@/components/ui/input";

export function TokenList() {
  const { isConnected } = useApp();
  const { udtAssets, udtLoading: btcLoading } = useAssets();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<"btc" | "ckb">("btc");
  const [txDialogToken, setTxDialogToken] = useState<UdtAsset | null>(null);
  const [txDialogOp, setTxDialogOp] = useState<TxDialogOperation>("leap-to-btc");
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lazy-load CKB assets only when CKB filter is active
  const {
    assets: ckbUdtAssets,
    loading: ckbLoading,
    hasMore: ckbHasMore,
    loadMore: ckbLoadMore,
  } = useCkbUdtAssets(filter === "ckb");

  const openTxDialog = useCallback((token: UdtAsset, op: TxDialogOperation) => {
    setTxDialogToken(token);
    setTxDialogOp(op);
    setTxDialogOpen(true);
  }, []);

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

  // Select data source based on active filter
  const sourceAssets = filter === "btc" ? udtAssets : ckbUdtAssets;
  const loading = filter === "btc" ? btcLoading : ckbLoading;

  if (loading && sourceAssets.length === 0) {
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
  const q = searchQuery.trim().toLowerCase();
  const filteredTokens = q
    ? sourceAssets.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.typeScriptArgs.toLowerCase().includes(q)
      )
    : sourceAssets;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {([
                { key: "btc" as const, label: "BTC" },
                { key: "ckb" as const, label: "CKB" },
              ]).map(({ key, label }) => (
                <Button
                  key={key}
                  variant={filter === key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(key)}
                  className={filter === key ? "bg-primary/15 text-primary" : ""}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or symbol…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Token cards ───────────────────────────────── */}
      {filteredTokens.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground text-sm">No tokens found</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTokens.map((token) => (
            <Card
              key={token.typeScriptArgs + token.location}
              className={cn(
                "transition-all hover:border-primary/50",
                selectedToken === token.typeScriptArgs + token.location && "border-primary"
              )}
              onClick={() => setSelectedToken(token.typeScriptArgs + token.location)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full flex items-center justify-center" style={{ backgroundColor: getTokenColor(token.symbol, token.name).bg }}>
                      <span className="text-sm font-bold" style={{ color: getTokenColor(token.symbol, token.name).fg }}>{getTokenInitial(token.symbol, token.name)}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{token.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{token.symbol}</p>
                    </div>
                  </div>
                  <Badge variant={token.location === "ckb" ? "default" : "secondary"}>{token.location === "btc" ? "BTC" : "CKB"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold font-mono">{formatBalance(token.balance, token.decimals)}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {token.location === "ckb" ? (
                    <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token, "leap-to-btc"); }}><ArrowUpRight className="size-4" />Leap to BTC</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token, "transfer-on-btc"); }}><ArrowLeftRight className="size-4" />Transfer on BTC</Button>
                      <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(token, "leap-to-ckb"); }}><ArrowDownLeft className="size-4" />Leap to CKB</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Load More (CKB pagination) ────────────────── */}
      {filter === "ckb" && ckbHasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={ckbLoadMore} className="gap-1.5">
            Load More
          </Button>
        </div>
      )}

      {/* ── CKB loading indicator ─────────────────────── */}
      {filter === "ckb" && ckbLoading && sourceAssets.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading CKB tokens…
        </div>
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
