"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context/app-context";
import { truncateAddress, formatRelativeTime } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowLeftRight as TransactionIcon,
  ExternalLink,
  Loader2,
  Inbox,
} from "lucide-react";
import {
  getAddressActivity,
  type ActivityTransaction,
} from "@/lib/services/api";
import type { StatusFilter, OperationFilter } from "./transaction-filters";

// ── TX type inference (shared with RecentActivity) ──────────

type TxOperation = "leap-to-btc" | "transfer-on-btc" | "leap-to-ckb" | "unknown";

const operationIcons: Record<TxOperation, typeof ArrowLeftRight> = {
  "leap-to-btc": ArrowUpRight,
  "transfer-on-btc": ArrowLeftRight,
  "leap-to-ckb": ArrowDownLeft,
  "unknown": ArrowLeftRight,
};

const operationLabels: Record<TxOperation, string> = {
  "leap-to-btc": "Leap to BTC",
  "transfer-on-btc": "RGB++ Transfer",
  "leap-to-ckb": "Leap to CKB",
  "unknown": "Unknown",
};

function inferTxType(tx: ActivityTransaction): TxOperation {
  if (!tx.isRgbpp || !tx.isomorphicTx) return "transfer-on-btc";

  const { inputs, outputs } = tx.isomorphicTx;

  const RGBPP_LOCK_CODE_HASH =
    "0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248";

  const hasRgbppInput = inputs?.some((o) =>
    o.lock?.codeHash?.startsWith(RGBPP_LOCK_CODE_HASH)
  );
  const hasRgbppOutput = outputs?.some((o) =>
    o.lock?.codeHash?.startsWith(RGBPP_LOCK_CODE_HASH)
  );

  if (hasRgbppOutput && !hasRgbppInput) return "leap-to-btc";
  if (hasRgbppInput && !hasRgbppOutput) return "leap-to-ckb";
  if (hasRgbppInput && hasRgbppOutput) return "transfer-on-btc";
  return "unknown";
}

/** Spore type script code_hashes (testnet + mainnet) */
const KNOWN_SPORE_CODE_HASHES = [
  "0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002130a0d",
  "0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5",
  "0x5e063b4c0e7abeaa6a428df3b693521a3050934cf3b0ae97a800d1bc31449398",
];

/** Infer asset type (UDT or DOB) from isomorphic tx inputs/outputs' type script */
function inferAssetType(tx: ActivityTransaction): "UDT" | "DOB" | null {
  if (!tx.isRgbpp || !tx.isomorphicTx) return null;
  const allCells = [
    ...(tx.isomorphicTx.inputs ?? []),
    ...(tx.isomorphicTx.outputs ?? []),
  ];
  const hasSpore = allCells.some(
    (o) => o.type && KNOWN_SPORE_CODE_HASHES.includes(o.type.codeHash)
  );
  if (hasSpore) return "DOB";
  const hasType = allCells.some((o) => !!o.type);
  return hasType ? "UDT" : null;
}

// ── Component ───────────────────────────────────────────────

interface TransactionListProps {
  statusFilter: StatusFilter;
  operationFilter: OperationFilter;
}

export function TransactionList({
  statusFilter,
  operationFilter,
}: TransactionListProps) {
  const { isConnected, btcAddress } = useApp();

  const [allTxs, setAllTxs] = useState<ActivityTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // ── Initial fetch ─────────────────────────────────────────
  const fetchInitial = useCallback(async () => {
    if (!btcAddress) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAddressActivity(btcAddress, {
        rgbppOnly: true,
      });
      setAllTxs(result.txs);
      setCursor(result.cursor);
      setHasMore(!!result.cursor && result.txs.length > 0);
    } catch (err) {
      console.warn("Failed to load transactions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load transactions"
      );
    } finally {
      setLoading(false);
    }
  }, [btcAddress]);

  useEffect(() => {
    if (isConnected && btcAddress) {
      fetchInitial();
    } else {
      setAllTxs([]);
      setCursor(undefined);
      setHasMore(false);
    }
  }, [isConnected, btcAddress, fetchInitial]);

  // ── Load more ─────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!btcAddress || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getAddressActivity(btcAddress, {
        rgbppOnly: true,
        afterBtcTxid: cursor,
      });
      setAllTxs((prev) => [...prev, ...result.txs]);
      setCursor(result.cursor);
      setHasMore(!!result.cursor && result.txs.length > 0);
    } catch (err) {
      console.warn("Failed to load more transactions:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [btcAddress, cursor, loadingMore]);

  // ── Apply filters ─────────────────────────────────────────
  const filteredTxs = useMemo(() => {
    return allTxs.filter((tx) => {
      // Status filter
      if (statusFilter === "confirmed" && !tx.btcTx.status.confirmed)
        return false;
      if (statusFilter === "pending" && tx.btcTx.status.confirmed)
        return false;

      // Operation filter
      if (operationFilter !== "all") {
        const inferred = inferTxType(tx);
        if (inferred !== operationFilter) return false;
      }

      return true;
    });
  }, [allTxs, statusFilter, operationFilter]);

  // ── Render states ─────────────────────────────────────────

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <TransactionIcon className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Connect your wallet to view your transaction history.
          </p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading transactions…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchInitial}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (allTxs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Inbox className="size-10 text-muted-foreground/40" />
          <p className="text-sm">No transactions yet</p>
          <p className="text-xs">
            RGB++ transactions for this address will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (filteredTxs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground text-sm">
          No transactions match the current filters
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Transaction Cards */}
      <div className="space-y-3">
        {filteredTxs.map((tx) => {
          const txType = inferTxType(tx);
          const Icon = operationIcons[txType];
          const label = operationLabels[txType];
          const assetType = inferAssetType(tx);
          const isConfirmed = tx.btcTx.status.confirmed;
          const timestamp = tx.btcTx.status.block_time
            ? tx.btcTx.status.block_time * 1000
            : Date.now();

          return (
            <Card
              key={tx.btcTx.txid}
              className="overflow-hidden transition-all hover:border-primary/50"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="size-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{label}</p>
                      <Badge
                        variant={isConfirmed ? "success" : "warning"}
                      >
                        {isConfirmed ? "confirmed" : "pending"}
                      </Badge>
                      {!tx.isRgbpp && (
                        <Badge variant="outline" className="text-[10px]">
                          non-RGB++
                        </Badge>
                      )}
                      {assetType && (
                        <Badge variant="outline" className="text-[10px]">
                          {assetType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`https://mempool.space/testnet/tx/${tx.btcTx.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
                      >
                        BTC {truncateAddress(tx.btcTx.txid, 10, 8)}
                        <ExternalLink className="size-3" />
                      </a>
                      {tx.isomorphicTx?.ckbTx?.hash && (
                        <>
                          <span className="text-border">·</span>
                          <a
                            href={`https://testnet.explorer.nervos.org/transaction/${tx.isomorphicTx.ckbTx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
                          >
                            CKB {truncateAddress(tx.isomorphicTx.ckbTx.hash, 6, 4)}
                            <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: time + fee */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(timestamp)}
                    </p>
                    {tx.btcTx.fee > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Fee: {tx.btcTx.fee.toLocaleString()} sat
                      </p>
                    )}
                    {isConfirmed && tx.btcTx.status.block_height && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        #{tx.btcTx.status.block_height.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="gap-2"
          >
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            Load More
          </Button>
        </div>
      )}

      {/* Summary */}
      <p className="text-center text-xs text-muted-foreground">
        Showing {filteredTxs.length} of {allTxs.length} transaction
        {allTxs.length !== 1 && "s"}
        {hasMore && " (more available)"}
      </p>
    </div>
  );
}
