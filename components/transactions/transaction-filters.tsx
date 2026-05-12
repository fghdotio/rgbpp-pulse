"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type StatusFilter = "all" | "active" | "completed" | "error";
type OperationFilter = "all" | "leap-to-btc" | "transfer-on-btc" | "leap-to-ckb";

export function TransactionFilters() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [operationFilter, setOperationFilter] = useState<OperationFilter>("all");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="flex gap-1">
              {(["all", "active", "completed", "error"] as StatusFilter[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
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
              <Button
                variant={operationFilter === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setOperationFilter("all")}
                className={operationFilter === "all" ? "bg-primary/15 text-primary" : ""}
              >
                All
              </Button>
              <Button
                variant={operationFilter === "leap-to-btc" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setOperationFilter("leap-to-btc")}
                className={operationFilter === "leap-to-btc" ? "bg-primary/15 text-primary" : ""}
              >
                Leap to BTC
              </Button>
              <Button
                variant={operationFilter === "transfer-on-btc" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setOperationFilter("transfer-on-btc")}
                className={operationFilter === "transfer-on-btc" ? "bg-primary/15 text-primary" : ""}
              >
                Transfer
              </Button>
              <Button
                variant={operationFilter === "leap-to-ckb" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setOperationFilter("leap-to-ckb")}
                className={operationFilter === "leap-to-ckb" ? "bg-primary/15 text-primary" : ""}
              >
                Leap to CKB
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
