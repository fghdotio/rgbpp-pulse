"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
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
import { formatBalance, truncateAddress, cn, getTokenInitial, getTokenColor } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Loader2,
  CircleDot,
  Wallet,
} from "lucide-react";
import type { UdtAsset, TransactionPipeline } from "@/lib/services/types";
import { usePipelines } from "@/lib/context/pipeline-context";
import {
  udtLeapToBtc,
  udtTransferOnBtc,
  udtLeapToCkb,
} from "@/src/services/rgbpp";

export type TxDialogOperation = "leap-to-btc" | "transfer-on-btc" | "leap-to-ckb";

interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  token: UdtAsset;
  operation: TxDialogOperation;
}

const operationConfig: Record<
  TxDialogOperation,
  {
    title: string;
    description: string;
    icon: typeof ArrowUpRight;
    addressLabel: string;
    addressPlaceholder: string;
    myAddressType: 'btc' | 'ckb';
    amountLabel: string;
    submitLabel: string;
  }
> = {
  "leap-to-btc": {
    title: "Leap to BTC",
    description: "Transfer UDT from CKB to BTC via RGB++ binding",
    icon: ArrowUpRight,
    addressLabel: "Recipient BTC Address",
    addressPlaceholder: "tb1q... or bc1q...",
    myAddressType: 'btc',
    amountLabel: "Amount",
    submitLabel: "Leap to BTC",
  },
  "transfer-on-btc": {
    title: "Transfer on BTC",
    description: "Transfer RGB++ UDT to another BTC address",
    icon: ArrowLeftRight,
    addressLabel: "Recipient BTC Address",
    addressPlaceholder: "tb1q... or bc1q...",
    myAddressType: 'btc',
    amountLabel: "Amount",
    submitLabel: "Transfer",
  },
  "leap-to-ckb": {
    title: "Leap to CKB",
    description: "Transfer RGB++ UDT from BTC to CKB",
    icon: ArrowDownLeft,
    addressLabel: "Recipient CKB Address",
    addressPlaceholder: "ckt1... or ckb1...",
    myAddressType: 'ckb',
    amountLabel: "Amount",
    submitLabel: "Leap to CKB",
  },
};

export function TransactionDialog({
  open,
  onClose,
  token,
  operation,
}: TransactionDialogProps) {
  const { signer, client, btcAddress, walletAddress, notify } = useApp();
  const { createOnUpdate } = usePipelines();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const config = operationConfig[operation];
  const Icon = config.icon;

  const myAddress = config.myAddressType === 'btc' ? btcAddress : walletAddress;

  const parseAmount = (val: string): bigint => {
    const parts = val.split(".");
    const intPart = parts[0] || "0";
    let fracPart = parts[1] || "";
    if (fracPart.length > token.decimals) {
      fracPart = fracPart.slice(0, token.decimals);
    } else {
      fracPart = fracPart.padEnd(token.decimals, "0");
    }
    return BigInt(intPart + fracPart);
  };

  const isValidAmount = (): boolean => {
    if (!amount || isNaN(Number(amount))) return false;
    try {
      const parsed = parseAmount(amount);
      return parsed > BigInt(0) && parsed <= token.balance;
    } catch {
      return false;
    }
  };

  const canSubmit = isValidAmount() && address.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const parsedAmount = parseAmount(amount);

    // Two-phase onUpdate:
    // Phase 1 (dialog open): buffer updates, don't add to transactions yet
    // Phase 2 (after first broadcast): flush to context, close dialog, show toast
    let signed = false;
    const contextOnUpdate = createOnUpdate();

    const wrappedOnUpdate = (p: TransactionPipeline) => {
      const hasBroadcast = p.steps.some((s) => s.status === "done" && s.txHash);

      if (!signed && hasBroadcast) {
        signed = true;
        contextOnUpdate(p);
        handleClose();
        notify("info", "Transaction Signed", `${config.title} for ${token.symbol} is processing.`, {
          actionLabel: "View Progress",
          actionHref: "/transactions",
        });
      } else if (!signed && p.status === "error") {
        // Pre-signing error reported by the service — show inline
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
        await udtLeapToBtc(
          { udtScriptArgs: token.typeScriptArgs, amount: parsedAmount, signer, client },
          wrappedOnUpdate
        );
      } else if (operation === "transfer-on-btc") {
        await udtTransferOnBtc(
          {
            udtScriptArgs: token.typeScriptArgs,
            receivers: [{ address, amount: parsedAmount }],
            signer,
            client,
          },
          wrappedOnUpdate
        );
      } else if (operation === "leap-to-ckb") {
        await udtLeapToCkb(
          {
            udtScriptArgs: token.typeScriptArgs,
            receivers: [{ address, amount: parsedAmount }],
            signer,
            client,
          },
          wrappedOnUpdate
        );
      }
      notify("info", "Transaction Completed", `${config.title} for ${token.symbol} completed successfully.`, {
        actionLabel: "View Details",
        actionHref: "/transactions",
      });
    } catch (err) {
      console.error("Transaction failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (!signed) {
        // Pre-signing error — stay in dialog, show error, allow retry
        setSubmitting(false);
        setError(msg);
      } else {
        // Post-signing error — dialog already closed, use toast
        notify("error", "Transaction Failed", `${config.title} for ${token.symbol} failed.`, {
          actionLabel: "View Details",
          actionHref: "/transactions",
        });
      }
    }
  };

  const handleClose = () => {
    setAmount("");
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

          {/* Token info card */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full flex items-center justify-center" style={{ backgroundColor: getTokenColor(token.symbol, token.name).bg }}>
                <span className="text-sm font-bold" style={{ color: getTokenColor(token.symbol, token.name).fg }}>
                  {getTokenInitial(token.symbol, token.name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[0.9375rem]">{token.symbol}</p>
                <p className="text-xs text-muted-foreground">{token.name}</p>
              </div>
              <Badge variant={token.location === "ckb" ? "default" : "secondary"}>
                {token.location === "btc" ? "RGB++" : "CKB"}
              </Badge>
            </div>

            <div className="space-y-2 pt-1">
              {/* Balance */}
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Balance</span>
                <span className="text-base font-bold font-mono">
                  {formatBalance(token.balance, token.decimals)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{token.symbol}</span>
                </span>
              </div>
              {/* Decimals */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Decimals</span>
                <span className="text-sm font-mono">{token.decimals}</span>
              </div>
              {/* Type Args */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Type Args</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono" title={token.typeScriptArgs}>
                    {truncateAddress(token.typeScriptArgs, 8, 6)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(token.typeScriptArgs);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="shrink-0 p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    title="Copy Type Args"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-green-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
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

          {/* Amount input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {config.amountLabel}
            </label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) setAmount(val);
                }}
                disabled={submitting}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-xs text-muted-foreground">{token.symbol}</span>
              </div>
            </div>
            {amount && !isValidAmount() && (
              <p className="text-xs text-destructive">
                {Number(amount) <= 0
                  ? "Amount must be greater than 0"
                  : "Amount exceeds available balance"}
              </p>
            )}
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
