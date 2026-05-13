"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type StatusFilter = "all" | "confirmed" | "pending";
export type OperationFilter = "all" | "leap-to-btc" | "transfer-on-btc" | "leap-to-ckb";

interface TransactionFiltersProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  operationFilter: OperationFilter;
  onOperationFilterChange: (f: OperationFilter) => void;
}

export function TransactionFilters({
  statusFilter,
  onStatusFilterChange,
  operationFilter,
  onOperationFilterChange,
}: TransactionFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="flex gap-1">
              {(["all", "confirmed", "pending"] as StatusFilter[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onStatusFilterChange(status)}
                  className={statusFilter === status ? "bg-primary/15 text-primary" : ""}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Operation Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Operation:</span>
            <div className="flex gap-1">
              {([
                { key: "all" as const, label: "All" },
                { key: "leap-to-btc" as const, label: "Leap to BTC" },
                { key: "transfer-on-btc" as const, label: "Transfer on BTC" },
                { key: "leap-to-ckb" as const, label: "Leap to CKB" },
              ]).map(({ key, label }) => (
                <Button
                  key={key}
                  variant={operationFilter === key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onOperationFilterChange(key)}
                  className={operationFilter === key ? "bg-primary/15 text-primary" : ""}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
