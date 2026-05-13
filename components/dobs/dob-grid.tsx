"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import { truncateAddress } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, Image as ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import type { SporeAsset } from "@/lib/services/types";
import { SporeTransactionDialog, type SporeDialogOperation } from "./spore-transaction-dialog";

export function DobGrid() {
  const { isConnected } = useApp();
  const { sporeAssets, loading, enrichingDobs } = useAssets();
  const [selectedDob, setSelectedDob] = useState<SporeAsset | null>(null);
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

  return (
    <>
      {enrichingDobs && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Loader2 className="size-3 animate-spin" />
          Decoding DOB traits…
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sporeAssets.map((dob) => (
          <Card
            key={dob.id}
            className={`overflow-hidden cursor-pointer transition-all hover:border-primary/50 ${selectedDob?.id === dob.id ? "border-primary ring-1 ring-primary" : ""}`}
            onClick={() => setSelectedDob(dob)}
          >
            <div className="aspect-square bg-secondary/50 flex items-center justify-center relative">
              {dob.dobSvg ? (
                <div dangerouslySetInnerHTML={{ __html: dob.dobSvg }} className="w-full h-full" />
              ) : dob.dobImageUri ? (
                <img src={dob.dobImageUri} alt={dob.clusterName || "DOB"} className="w-full h-full object-cover" />
              ) : (
                <div className="size-20 rounded-xl bg-gradient-to-br from-primary/30 to-chart-2/30 flex items-center justify-center">
                  <ImageIcon className="size-10 text-muted-foreground" />
                </div>
              )}
              <Badge variant={dob.location === "ckb" ? "default" : "secondary"} className="absolute top-2 right-2">
                {dob.location === "btc" ? "RGB++" : "CKB"}
              </Badge>
            </div>

            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-medium truncate">{dob.clusterName || "Unknown Collection"}</h3>
                <p className="text-xs text-muted-foreground font-mono">{truncateAddress(dob.id, 8, 6)}</p>
              </div>

              {dob.dobTraits && dob.dobTraits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dob.dobTraits.filter((t) => !t.name.startsWith("prev.")).slice(0, 2).map((trait, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {trait.name}: {trait.value}
                    </Badge>
                  ))}
                  {dob.dobTraits.filter((t) => !t.name.startsWith("prev.")).length > 2 && (
                    <Badge variant="outline" className="text-xs">+{dob.dobTraits.filter((t) => !t.name.startsWith("prev.")).length - 2}</Badge>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {dob.location === "ckb" ? (
                  <Button size="sm" className="flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(dob, "leap-to-btc"); }}><ArrowUpRight className="size-3.5" />Leap to BTC</Button>
                ) : (
                  <Button size="sm" className="flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openTxDialog(dob, "leap-to-ckb"); }}><ArrowDownLeft className="size-3.5" />Leap to CKB</Button>
                )}
                <Button size="sm" variant="outline" className="px-2.5"><ExternalLink className="size-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
