"use client";

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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import type { TransactionPipeline, TransactionStep } from "@/lib/services/types";

// Mock data
const mockPipelines: TransactionPipeline[] = [
  {
    id: "pipe-1",
    operation: "leap-to-btc",
    assetType: "udt",
    assetName: "RTT",
    status: "completed",
    createdAt: Date.now() - 1000 * 60 * 30,
    completedAt: Date.now() - 1000 * 60 * 25,
    steps: [
      { id: "s1", label: "Building BTC Seal PSBT", status: "done", timestamp: Date.now() - 1000 * 60 * 30, chain: "btc" },
      { id: "s2", label: "Signing & Broadcasting BTC TX", status: "done", timestamp: Date.now() - 1000 * 60 * 29, txHash: "0xbtc123...", chain: "btc" },
      { id: "s3", label: "Waiting for BTC Confirmation", status: "done", timestamp: Date.now() - 1000 * 60 * 28, chain: "btc" },
      { id: "s4", label: "Building RGB++ Lock", status: "done", timestamp: Date.now() - 1000 * 60 * 27, chain: "ckb" },
      { id: "s5", label: "Composing CKB Transaction", status: "done", timestamp: Date.now() - 1000 * 60 * 26, chain: "ckb" },
      { id: "s6", label: "Broadcasting to CKB", status: "done", timestamp: Date.now() - 1000 * 60 * 25, txHash: "0xckb456...", chain: "ckb" },
    ],
  },
  {
    id: "pipe-2",
    operation: "transfer-on-btc",
    assetType: "udt",
    assetName: "SCX",
    status: "active",
    createdAt: Date.now() - 1000 * 60 * 5,
    steps: [
      { id: "s1", label: "Building BTC Transaction", status: "done", timestamp: Date.now() - 1000 * 60 * 5, chain: "btc" },
      { id: "s2", label: "Building CKB Partial TX", status: "done", timestamp: Date.now() - 1000 * 60 * 4, chain: "ckb" },
      { id: "s3", label: "Signing BTC Transaction", status: "active", chain: "btc" },
      { id: "s4", label: "Broadcasting BTC TX", status: "pending", chain: "btc" },
      { id: "s5", label: "Finalizing CKB TX", status: "pending", chain: "ckb" },
    ],
  },
  {
    id: "pipe-3",
    operation: "leap-to-ckb",
    assetType: "spore",
    assetName: "Nervape #42",
    status: "error",
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    steps: [
      { id: "s1", label: "Building BTC Transaction", status: "done", chain: "btc" },
      { id: "s2", label: "Building CKB Partial TX", status: "done", chain: "ckb" },
      { id: "s3", label: "Signing BTC Transaction", status: "error", error: "User rejected the request", chain: "btc" },
    ],
  },
];

const operationIcons = {
  "leap-to-btc": ArrowUpRight,
  "transfer-on-btc": ArrowLeftRight,
  "leap-to-ckb": ArrowDownLeft,
};

const operationLabels = {
  "leap-to-btc": "Leap to BTC",
  "transfer-on-btc": "Transfer on BTC",
  "leap-to-ckb": "Leap to CKB",
};

const statusColors = {
  completed: "success",
  active: "warning",
  error: "destructive",
  pending: "secondary",
} as const;

function StepIcon({ status }: { status: TransactionStep["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="size-4 text-success" />;
    case "active":
      return <Loader2 className="size-4 text-warning animate-spin" />;
    case "error":
      return <XCircle className="size-4 text-destructive" />;
    default:
      return <Clock className="size-4 text-muted-foreground" />;
  }
}

export function TransactionList() {
  const { isConnected } = useApp();
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      {mockPipelines.map((pipeline) => {
        const Icon = operationIcons[pipeline.operation];
        const isExpanded = expandedPipeline === pipeline.id;

        return (
          <Card key={pipeline.id} className="overflow-hidden">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {operationLabels[pipeline.operation]}
                      </CardTitle>
                      <Badge variant={statusColors[pipeline.status]}>
                        {pipeline.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pipeline.assetName} ({pipeline.assetType.toUpperCase()}) •{" "}
                      {formatRelativeTime(pipeline.createdAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedPipeline(isExpanded ? null : pipeline.id)}
                >
                  {isExpanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-4">
                <div className="border-t border-border pt-4">
                  <div className="space-y-3">
                    {pipeline.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <StepIcon status={step.status} />
                          {idx < pipeline.steps.length - 1 && (
                            <div className="w-px h-6 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{step.label}</p>
                            {step.chain && (
                              <Badge variant="outline" className="text-xs">
                                {step.chain.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          {step.error && (
                            <p className="text-xs text-destructive mt-1">{step.error}</p>
                          )}
                          {step.txHash && (
                            <a
                              href="#"
                              className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                            >
                              {truncateAddress(step.txHash, 10, 8)}
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
