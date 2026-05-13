"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context/app-context";
import { usePipelines } from "@/lib/context/pipeline-context";
import { truncateAddress, formatRelativeTime } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowLeftRight as TransactionIcon,
  ExternalLink,
  Loader2,
  Inbox,
  CheckCircle2,
  Circle,
  XCircle,
  Zap,
  ChevronDown,
} from "lucide-react";
import {
  getAddressActivity,
  type ActivityTransaction,
} from "@/lib/services/api";
import type { TransactionPipeline } from "@/lib/services/types";
import type { StatusFilter, OperationFilter } from "./transaction-filters";

// ── TX type inference ───────────────────────────────────────

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

// ── Pipeline step progress ──────────────────────────────────

const stepStatusIcon: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  done: { icon: CheckCircle2, className: "text-green-500" },
  active: { icon: Loader2, className: "text-primary animate-spin" },
  error: { icon: XCircle, className: "text-destructive" },
  pending: { icon: Circle, className: "text-muted-foreground/30" },
};

function PipelineSteps({ pipeline }: { pipeline: TransactionPipeline }) {
  const [expanded, setExpanded] = useState(false);

  // Don't show progress for completed pipelines
  if (pipeline.status === "completed") return null;

  const currentStep = pipeline.steps.findIndex((s) => s.status === "active");
  const errorStep = pipeline.steps.findIndex((s) => s.status === "error");
  const totalSteps = pipeline.steps.length;
  const completedSteps = pipeline.steps.filter((s) => s.status === "done").length;

  const activeStep = currentStep >= 0 ? pipeline.steps[currentStep] : null;
  const failedStep = errorStep >= 0 ? pipeline.steps[errorStep] : null;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Progress bar — clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 group cursor-pointer"
      >
        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pipeline.status === "error"
                ? "bg-destructive"
                : "bg-primary animate-pulse"
            }`}
            style={{
              width: `${Math.max(
                (completedSteps / totalSteps) * 100,
                5
              )}%`,
            }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 group-hover:text-foreground transition-colors">
          {completedSteps}/{totalSteps}
          <ChevronDown className={`inline size-3 ml-0.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {/* Compact view: current step / error */}
      {!expanded && (
        <>
          {activeStep && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="size-3 animate-spin shrink-0" />
              <span className="truncate">{activeStep.label}</span>
              {activeStep.detail && (
                <span className="text-muted-foreground truncate">— {activeStep.detail}</span>
              )}
            </div>
          )}
          {failedStep && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="size-3 shrink-0" />
              <span className="truncate">
                {failedStep.label}: {failedStep.error}
              </span>
            </div>
          )}
        </>
      )}

      {/* Expanded view: full step timeline */}
      {expanded && (
        <div className="pl-1 pt-1 space-y-0">
          {pipeline.steps.map((step, i) => {
            const config = stepStatusIcon[step.status] || stepStatusIcon.pending;
            const StepIcon = config.icon;
            const isLast = i === pipeline.steps.length - 1;

            return (
              <div key={step.id} className="flex gap-2.5 relative">
                {/* Vertical connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-[6.5px] top-[16px] w-px h-[calc(100%-4px)] ${
                      step.status === "done" ? "bg-green-500/30" : "bg-border"
                    }`}
                  />
                )}

                {/* Status icon */}
                <div className="shrink-0 pt-[3px] z-10">
                  <StepIcon className={`size-[14px] ${config.className}`} />
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs ${
                        step.status === "done"
                          ? "text-muted-foreground"
                          : step.status === "active"
                          ? "text-foreground font-medium"
                          : step.status === "error"
                          ? "text-destructive"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* TX hash link */}
                  {step.txHash && step.status === "done" && (
                    <a
                      href={
                        step.chain === "btc"
                          ? `https://mempool.space/testnet/tx/${step.txHash}`
                          : `https://testnet.explorer.nervos.org/transaction/${step.txHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono mt-0.5"
                    >
                      {step.chain === "btc" ? "BTC" : "CKB"}{" "}
                      {truncateAddress(step.txHash, 8, 6)}
                      <ExternalLink className="size-2.5" />
                    </a>
                  )}

                  {/* Active step detail */}
                  {step.status === "active" && step.detail && (
                    <span className="text-[11px] text-muted-foreground">{step.detail}</span>
                  )}

                  {/* Error message */}
                  {step.status === "error" && step.error && (
                    <span className="text-[11px] text-destructive/80">{step.error}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Extract BTC txid from pipeline ──────────────────────────

function extractPipelineBtcTxId(pipeline: TransactionPipeline): string | undefined {
  for (const step of pipeline.steps) {
    if (step.chain === "btc" && step.txHash && step.status === "done") {
      return step.txHash;
    }
  }
  return undefined;
}

function extractPipelineCkbTxHash(pipeline: TransactionPipeline): string | undefined {
  for (const step of pipeline.steps) {
    if (step.chain === "ckb" && step.txHash && step.status === "done") {
      return step.txHash;
    }
  }
  return undefined;
}

// ── Pipeline status → badge ─────────────────────────────────

function pipelineStatusBadge(status: TransactionPipeline["status"]) {
  switch (status) {
    case "active":
      return <Badge variant="warning">processing</Badge>;
    case "pending":
      return <Badge variant="warning">pending</Badge>;
    case "completed":
      return <Badge variant="success">confirmed</Badge>;
    case "error":
      return <Badge variant="destructive">failed</Badge>;
  }
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
  const { pipelines } = usePipelines();

  const [allTxs, setAllTxs] = useState<ActivityTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Track what address we last fetched for, to avoid duplicate calls
  // when context re-renders cause the effect to re-fire with the same address.
  const lastFetchedAddr = useRef<string | null>(null);
  const fetchIdRef = useRef(0);

  // ── Initial fetch ─────────────────────────────────────────
  const fetchInitial = useCallback(async (force?: boolean) => {
    if (!btcAddress) return;

    // Skip if we already fetched for this address (unless forced)
    if (!force && lastFetchedAddr.current === btcAddress) return;

    const id = ++fetchIdRef.current;
    lastFetchedAddr.current = btcAddress;
    setLoading(true);
    setError(null);
    try {
      const result = await getAddressActivity(btcAddress, {
        rgbppOnly: true,
      });
      // Only apply results if this is still the latest fetch
      if (fetchIdRef.current !== id) return;
      setAllTxs(result.txs);
      setCursor(result.cursor);
      setHasMore(!!result.cursor && result.txs.length > 0);
    } catch (err) {
      if (fetchIdRef.current !== id) return;
      console.warn("Failed to load transactions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load transactions"
      );
    } finally {
      if (fetchIdRef.current === id) {
        setLoading(false);
      }
    }
  }, [btcAddress]);

  useEffect(() => {
    if (isConnected && btcAddress) {
      fetchInitial();
    } else {
      setAllTxs([]);
      setCursor(undefined);
      setHasMore(false);
      lastFetchedAddr.current = null;
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

  // ── Collect BTC txids from API results for dedup ──────────
  const remoteBtcTxIds = useMemo(
    () => new Set(allTxs.map((tx) => tx.btcTx.txid)),
    [allTxs]
  );

  // ── Local pipelines (not yet in API / still active) ───────
  // Only show pipelines that are still in-progress or errored.
  // Completed pipelines will appear in API results on next refresh.
  const localPipelines = useMemo(() => {
    return pipelines.filter((p) => {
      // Only show active, pending, or error pipelines
      if (p.status === "completed") return false;
      const btcTxId = extractPipelineBtcTxId(p);
      // If this pipeline's BTC txid already appears in API results, skip it
      if (btcTxId && remoteBtcTxIds.has(btcTxId)) return false;
      return true;
    });
  }, [pipelines, remoteBtcTxIds]);

  // ── Apply filters ─────────────────────────────────────────

  // Filter local pipelines
  const filteredPipelines = useMemo(() => {
    if (statusFilter === "confirmed") return []; // API = confirmed, pipelines = not confirmed
    return localPipelines.filter((p) => {
      // Status filter: "pending" shows active/pending/error pipelines; "all" shows everything
      // (confirmed pipelines that aren't in API are unusual but possible)

      // Operation filter
      if (operationFilter !== "all" && p.operation !== operationFilter) {
        return false;
      }

      return true;
    });
  }, [localPipelines, statusFilter, operationFilter]);

  // Filter API transactions (all confirmed since API only returns confirmed)
  const filteredApiTxs = useMemo(() => {
    if (statusFilter === "pending") return []; // API only has confirmed txs
    return allTxs.filter((tx) => {
      // Operation filter
      if (operationFilter !== "all") {
        const inferred = inferTxType(tx);
        if (inferred !== operationFilter) return false;
      }
      return true;
    });
  }, [allTxs, statusFilter, operationFilter]);

  const totalItems = filteredPipelines.length + filteredApiTxs.length;
  const totalAll = localPipelines.length + allTxs.length;

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

  if (loading && localPipelines.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading transactions…
        </CardContent>
      </Card>
    );
  }

  if (error && localPipelines.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchInitial(true)}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (totalAll === 0) {
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

  if (totalItems === 0) {
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
      {/* Local Pipelines (active/pending/error — not yet on-chain) */}
      {filteredPipelines.length > 0 && (
        <div className="space-y-3">
          {statusFilter !== "pending" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">
              <Zap className="size-3" />
              In Progress ({filteredPipelines.length})
            </div>
          )}
          {filteredPipelines.map((pipeline) => {
            const Icon = operationIcons[pipeline.operation] || ArrowLeftRight;
            const label = operationLabels[pipeline.operation] || "Unknown";
            const btcTxId = extractPipelineBtcTxId(pipeline);
            const ckbTxHash = extractPipelineCkbTxHash(pipeline);

            return (
              <Card
                key={pipeline.id}
                className="overflow-hidden transition-all hover:border-primary/50 border-l-2 border-l-warning"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="size-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-warning" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{label}</p>
                        {pipelineStatusBadge(pipeline.status)}
                        <Badge variant="outline" className="text-[10px]">
                          {pipeline.assetType === "spore" ? "DOB" : "UDT"}
                        </Badge>
                      </div>

                      {/* TX links */}
                      <div className="flex items-center gap-2 mt-1">
                        {btcTxId ? (
                          <a
                            href={`https://mempool.space/testnet/tx/${btcTxId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
                          >
                            BTC {truncateAddress(btcTxId, 10, 8)}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Awaiting BTC broadcast…
                          </span>
                        )}
                        {ckbTxHash && (
                          <>
                            <span className="text-border">·</span>
                            <a
                              href={`https://testnet.explorer.nervos.org/transaction/${ckbTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
                            >
                              CKB {truncateAddress(ckbTxHash, 6, 4)}
                              <ExternalLink className="size-3" />
                            </a>
                          </>
                        )}
                      </div>

                      {/* Step progress */}
                      <PipelineSteps pipeline={pipeline} />
                    </div>

                    {/* Right side: time */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(pipeline.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Separator between pipelines and API history */}
      {filteredPipelines.length > 0 && filteredApiTxs.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">
          <CheckCircle2 className="size-3" />
          Confirmed ({filteredApiTxs.length})
        </div>
      )}

      {/* API Transaction Cards (confirmed on-chain) */}
      {filteredApiTxs.length > 0 && (
        <div className="space-y-3">
          {filteredApiTxs.map((tx) => {
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
      )}

      {/* Load More */}
      {hasMore && statusFilter !== "pending" && (
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
        Showing {totalItems} transaction{totalItems !== 1 && "s"}
        {filteredPipelines.length > 0 &&
          ` (${filteredPipelines.length} in progress)`}
        {hasMore && statusFilter !== "pending" && " · more available"}
      </p>
    </div>
  );
}
