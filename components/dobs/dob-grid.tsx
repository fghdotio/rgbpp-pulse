"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { truncateAddress } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Image as ImageIcon, Loader2, Copy, Check } from "lucide-react";
import type { SporeAsset } from "@/lib/services/types";
import { SporeTransactionDialog, type SporeDialogOperation } from "./spore-transaction-dialog";
import type { DobChainFilter } from "@/lib/services/types";

interface DobGridProps {
  filter: DobChainFilter;
  searchQuery?: string;
}

export function DobGrid({ filter, searchQuery = "" }: DobGridProps) {
  const { isConnected } = useApp();
  const { sporeAssets, sporeLoading: loading, enrichingDobs } = useAssets();

  const filteredAssets = useMemo(() => {
    let result: typeof sporeAssets;
    if (filter === "all") result = [...sporeAssets].sort((a, b) => (a.location === "btc" ? -1 : 1) - (b.location === "btc" ? -1 : 1));
    else if (filter === "rgbpp") result = sporeAssets.filter((s) => s.location === "btc");
    else result = sporeAssets.filter((s) => s.location === "ckb");

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) =>
        (s.clusterName || "").toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sporeAssets, filter, searchQuery]);

  const [detailDob, setDetailDob] = useState<SporeAsset | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [txDialogSpore, setTxDialogSpore] = useState<SporeAsset | null>(null);
  const [txDialogOp, setTxDialogOp] = useState<SporeDialogOperation>("leap-to-btc");
  const [txDialogOpen, setTxDialogOpen] = useState(false);

  const openTxDialog = useCallback((spore: SporeAsset, op: SporeDialogOperation) => {
    setTxDialogSpore(spore);
    setTxDialogOp(op);
    setTxDialogOpen(true);
  }, []);

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <ImageIcon className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Connect your wallet to view your DOB collection.</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading DOBs…
        </CardContent>
      </Card>
    );
  }

  if (sporeAssets.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground text-sm">
          No DOBs found for this wallet
        </CardContent>
      </Card>
    );
  }

  if (filteredAssets.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground text-sm">
          No {filter === "rgbpp" ? "RGB++" : "CKB"} DOBs found
        </CardContent>
      </Card>
    );
  }

  const visibleTraits = detailDob?.dobTraits?.filter((t) => !t.name.startsWith("prev.")) ?? [];

  return (
    <>
      {enrichingDobs && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Loader2 className="size-3 animate-spin" />
          Decoding DOB traits…
        </div>
      )}

      {/* ── Card Grid ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        {filteredAssets.map((dob) => (
          <Card
            key={dob.id}
            className="overflow-hidden transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="aspect-square bg-secondary/50 relative overflow-hidden cursor-pointer" onClick={() => setDetailDob(dob)}>
              {(dob.dobSvg || dob.dobImageUri) ? (
                <img
                  src={dob.dobSvg
                    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dob.dobSvg)}`
                    : dob.dobImageUri!}
                  alt={dob.clusterName || "DOB"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-14 rounded-lg bg-gradient-to-br from-primary/30 to-chart-2/30 flex items-center justify-center">
                    <ImageIcon className="size-7 text-muted-foreground" />
                  </div>
                </div>
              )}
              <Badge variant={dob.location === "ckb" ? "default" : "secondary"} className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0">
                {dob.location === "btc" ? "RGB++" : "CKB"}
              </Badge>
            </div>

            <CardContent className="p-3 space-y-2">
              <div>
                <h3 className="text-sm font-medium truncate">{dob.clusterName || "Unknown Collection"}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">{truncateAddress(dob.id, 6, 4)}</p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {dob.location === "ckb" ? (
                  <Button size="sm" className="gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); openTxDialog(dob, "leap-to-btc"); }}><ArrowUpRight className="size-3" />Leap to BTC</Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); openTxDialog(dob, "transfer-on-btc"); }}><ArrowLeftRight className="size-3" />Transfer on BTC</Button>
                    <Button size="sm" className="gap-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); openTxDialog(dob, "leap-to-ckb"); }}><ArrowDownLeft className="size-3" />Leap to CKB</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── DOB Detail Modal ─────────────────────────── */}
      {detailDob && (
        <Dialog open={!!detailDob} onClose={() => { setDetailDob(null); setCopiedId(false); }}>
          <DialogContent>
            <DialogHeader onClose={() => { setDetailDob(null); setCopiedId(false); }}>
              <DialogTitle>{detailDob.clusterName || "Unknown Collection"}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              {/* Image */}
              <div className="aspect-square rounded-lg overflow-hidden bg-secondary/50 relative">
                {(detailDob.dobSvg || detailDob.dobImageUri) ? (
                  <img
                    src={detailDob.dobSvg
                      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(detailDob.dobSvg)}`
                      : detailDob.dobImageUri!}
                    alt={detailDob.clusterName || "DOB"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="size-16 text-muted-foreground" />
                  </div>
                )}
                <Badge variant={detailDob.location === "ckb" ? "default" : "secondary"} className="absolute top-2 right-2">
                  {detailDob.location === "btc" ? "RGB++" : "CKB"}
                </Badge>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Spore ID</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono" title={detailDob.id}>{truncateAddress(detailDob.id, 10, 8)}</span>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(detailDob.id); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }}
                      className="shrink-0 p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {copiedId ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>

                {detailDob.clusterName && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Cluster</span>
                    <span className="text-sm">{detailDob.clusterName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Content Type</span>
                  <Badge variant="outline">{detailDob.contentType || "unknown"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Cell Capacity</span>
                  <span className="text-sm font-mono">
                    {detailDob.capacity
                      ? `${(Number(BigInt(detailDob.capacity)) / 1e8).toLocaleString()} CKBytes`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Traits */}
              {visibleTraits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider">Traits</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleTraits.map((trait, idx) => (
                      <div key={idx} className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">{trait.name}</p>
                        <p className="text-sm font-medium truncate">{trait.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {detailDob.location === "ckb" ? (
                  <Button size="sm" className="gap-1.5" onClick={() => { setDetailDob(null); openTxDialog(detailDob, "leap-to-btc"); }}>
                    <ArrowUpRight className="size-4" />Leap to BTC
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setDetailDob(null); openTxDialog(detailDob, "transfer-on-btc"); }}>
                      <ArrowLeftRight className="size-4" />Transfer on BTC
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => { setDetailDob(null); openTxDialog(detailDob, "leap-to-ckb"); }}>
                      <ArrowDownLeft className="size-4" />Leap to CKB
                    </Button>
                  </>
                )}
              </div>
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Spore Transaction Dialog */}
      {txDialogSpore && (
        <SporeTransactionDialog
          open={txDialogOpen}
          onClose={() => setTxDialogOpen(false)}
          spore={txDialogSpore}
          operation={txDialogOp}
        />
      )}
    </>
  );
}
