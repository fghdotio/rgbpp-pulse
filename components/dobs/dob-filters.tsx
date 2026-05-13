"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo } from "react";
import { useAssets } from "@/lib/context/assets-context";
import { Search } from "lucide-react";
import type { DobChainFilter } from "@/lib/services/types";

interface DobFiltersProps {
  filter: DobChainFilter;
  onFilterChange: (filter: DobChainFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DobFilters({ filter, onFilterChange, searchQuery, onSearchChange }: DobFiltersProps) {
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
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="relative ml-auto w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or ID…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
