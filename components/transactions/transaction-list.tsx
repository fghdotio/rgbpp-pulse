"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Inbox,
} from "lucide-react";
import { useState } from "react";
import type { TransactionStep } from "@/lib/services/types";

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
  const { pipelines } = usePipelines();
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

  if (pipelines.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Inbox className="size-10 text-muted-foreground/40" />
          <p className="text-sm">No transactions yet</p>
          <p className="text-xs">
            Transactions you submit from the Tokens or DOBs pages will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pipelines.map((pipeline) => {
        const Icon = operationIcons[pipeline.operation] || ArrowLeftRight;
        const isExpanded = expandedPipeline === pipeline.id;

        // Auto-expand active pipelines
        const shouldShow = isExpanded || pipeline.status === "active";

        return (
          <Card key={pipeline.id} className="overflow-hidden">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-secondary flex items-center justify-center">
                    {pipeline.status === "active" ? (
                      <Loader2 className="size-5 text-warning animate-spin" />
                    ) : (
                      <Icon className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {operationLabels[pipeline.operation] || pipeline.operation}
                      </CardTitle>
                      <Badge variant={statusColors[pipeline.status]}>
                        {pipeline.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pipeline.assetName} ({pipeline.assetType?.toUpperCase() || "UDT"}) •{" "}
                      {formatRelativeTime(pipeline.createdAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedPipeline(shouldShow && !pipeline.status.match(/active/) ? null : pipeline.id)}
                >
                  {shouldShow ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
              </div>
            </CardHeader>

            {shouldShow && pipeline.steps && pipeline.steps.length > 0 && (
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
                              href={
                                step.chain === "btc"
                                  ? `https://mempool.space/testnet/tx/${step.txHash}`
                                  : `https://testnet.explorer.nervos.org/transaction/${step.txHash}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
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
