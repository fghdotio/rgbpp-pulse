"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAssets } from "@/lib/context/assets-context";

export function RefreshButton() {
  const { refresh } = useAssets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refresh]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="gap-1.5"
    >
      <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
      Refresh
    </Button>
  );
}
