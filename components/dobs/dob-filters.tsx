"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Grid3X3, List } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function DobFilters() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "ckb" | "btc">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Chain Filters */}
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-primary/15 text-primary" : ""}
            >
              All DOBs
            </Button>
            <Button
              variant={filter === "ckb" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("ckb")}
              className={filter === "ckb" ? "bg-primary/15 text-primary" : ""}
            >
              On CKB
            </Button>
            <Button
              variant={filter === "btc" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("btc")}
              className={filter === "btc" ? "bg-primary/15 text-primary" : ""}
            >
              On BTC
            </Button>
          </div>

          {/* View Toggle & Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "p-2 transition-colors",
                  view === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid3X3 className="size-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "p-2 transition-colors",
                  view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="size-4" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
