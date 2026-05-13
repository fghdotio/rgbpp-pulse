"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useAssets } from "@/lib/context/assets-context";
import type { DobChainFilter } from "@/lib/services/types";

interface DobFiltersProps {
  filter: DobChainFilter;
  onFilterChange: (filter: DobChainFilter) => void;
}

export function DobFilters({ filter, onFilterChange }: DobFiltersProps) {
  const { sporeAssets } = useAssets();

  const counts = useMemo(() => {
    const all = sporeAssets.length;
    const rgbpp = sporeAssets.filter((s) => s.location === "btc").length;
    const ckb = sporeAssets.filter((s) => s.location === "ckb").length;
    return { all, rgbpp, ckb };
  }, [sporeAssets]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("all")}
            className={filter === "all" ? "bg-primary/15 text-primary" : ""}
          >
            All DOBs ({counts.all})
          </Button>
          <Button
            variant={filter === "rgbpp" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("rgbpp")}
            className={filter === "rgbpp" ? "bg-primary/15 text-primary" : ""}
          >
            RGB++ ({counts.rgbpp})
          </Button>
          <Button
            variant={filter === "ckb" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("ckb")}
            className={filter === "ckb" ? "bg-primary/15 text-primary" : ""}
          >
            CKB ({counts.ckb})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
