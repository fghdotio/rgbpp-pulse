"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context/app-context";
import { truncateAddress } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CircleDot,
  Image as ImageIcon,
  Wallet,
} from "lucide-react";
import type { SporeAsset, TransactionPipeline } from "@/lib/services/types";
import { usePipelines } from "@/lib/context/pipeline-context";
import {
  sporeLeapToBtc,
  sporeLeapToCkb,
} from "@/src/services/rgbpp";

export type SporeDialogOperation = "leap-to-btc" | "leap-to-ckb";

interface SporeTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  spore: SporeAsset;
  operation: SporeDialogOperation;
}

const operationConfig: Record<
  SporeDialogOperation,
  {
    title: string;
    description: string;
    icon: typeof ArrowUpRight;
    addressLabel: string;
    addressPlaceholder: string;
    myAddressType: 'btc' | 'ckb';
    submitLabel: string;
  }
> = {
  "leap-to-btc": {
    title: "Leap DOB to BTC",
    description: "Transfer this Spore/DOB from CKB to BTC via RGB++ binding",
    icon: ArrowUpRight,
    addressLabel: "Recipient BTC Address",
    addressPlaceholder: "tb1q... or bc1q...",
    myAddressType: 'btc',
    submitLabel: "Leap to BTC",
  },
  "leap-to-ckb": {
    title: "Leap DOB to CKB",
    description: "Transfer this Spore/DOB from BTC back to CKB via RGB++ unbinding",
    icon: ArrowDownLeft,
    addressLabel: "Recipient CKB Address",
    addressPlaceholder: "ckt1... or ckb1...",
    myAddressType: 'ckb',
    submitLabel: "Leap to CKB",
  },
};

export function SporeTransactionDialog({
  open,
  onClose,
  spore,
  operation,
}: SporeTransactionDialogProps) {
  const { signer, client, btcAddress, walletAddress, notify } = useApp();
  const { createOnUpdate } = usePipelines();
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = operationConfig[operation];
  const Icon = config.icon;
  const myAddress = config.myAddressType === 'btc' ? btcAddress : walletAddress;

  const canSubmit = address.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    // Two-phase onUpdate: buffer until first signing step completes
    let signed = false;
    const contextOnUpdate = createOnUpdate();

    const wrappedOnUpdate = (p: TransactionPipeline) => {
      const hasBroadcast = p.steps.some((s) => s.status === "done" && s.txHash);

      if (!signed && hasBroadcast) {
        signed = true;
        contextOnUpdate(p);
        handleClose();
        notify("info", "Transaction Signed", `${config.title} is processing.`, {
          actionLabel: "View Progress",
          actionHref: "/transactions",
        });
      } else if (!signed && p.status === "error") {
        const failedStep = p.steps.find((s) => s.status === "error");
        const msg = failedStep?.error || "Transaction failed";
        setSubmitting(false);
        setError(msg);
      } else if (signed) {
        contextOnUpdate(p);
      }
    };

    try {
      if (operation === "leap-to-btc") {
        await sporeLeapToBtc(
          { sporeTypeArgs: spore.id, signer, client },
          wrappedOnUpdate
        );
      } else if (operation === "leap-to-ckb") {
        await sporeLeapToCkb(
          { ckbAddress: address, sporeTypeArgs: spore.id, signer, client },
          wrappedOnUpdate
        );
      }
      notify("info", "Transaction Completed", `${config.title} completed successfully.`, {
        actionLabel: "View Details",
        actionHref: "/transactions",
      });
    } catch (err) {
      console.error("Spore transaction failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (!signed) {
        setSubmitting(false);
        setError(msg);
      } else {
        notify("error", "Transaction Failed", `${config.title} failed.`, {
          actionLabel: "View Details",
          actionHref: "/transactions",
        });
      }
    }
  };

  const handleClose = () => {
    setAddress("");
    setSubmitting(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : handleClose}>
      <DialogContent>
        <DialogHeader onClose={submitting ? undefined : handleClose}>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Status banner */}
          {error && (
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <CircleDot className="size-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {submitting && !error && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning/20">
              <Loader2 className="size-4 text-warning animate-spin shrink-0" />
              <p className="text-sm text-warning">Awaiting wallet signature…</p>
            </div>
          )}

          {/* DOB info header */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="size-12 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden">
              {spore.dobSvg ? (
                <div dangerouslySetInnerHTML={{ __html: spore.dobSvg }} className="w-full h-full" />
              ) : spore.dobImageUri ? (
                <img src={spore.dobImageUri} alt={spore.clusterName || "DOB"} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{spore.clusterName || "Unknown DOB"}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {truncateAddress(spore.id, 8, 6)}
              </p>
            </div>
            <Badge variant={spore.location === "ckb" ? "default" : "secondary"}>
              {spore.location === "btc" ? "RGB++" : "CKB"}
            </Badge>
          </div>

          {/* Address input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {config.addressLabel}
              </label>
              {myAddress && !submitting && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  onClick={() => setAddress(myAddress)}
                >
                  <Wallet className="size-3" />
                  My Address
                </button>
              )}
            </div>
            <Input
              type="text"
              placeholder={config.addressPlaceholder}
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              disabled={submitting}
            />
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5">
            <CircleDot className="size-3.5 shrink-0 mt-0.5" />
            <span>{config.description}</span>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing…
              </>
            ) : (
              <>
                <Icon className="size-4" />
                {config.submitLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
