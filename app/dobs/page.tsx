"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DobGrid } from "@/components/dobs/dob-grid";
import { DobFilters } from "@/components/dobs/dob-filters";
import { RefreshButton } from "@/components/ui/refresh-button";
import type { DobChainFilter } from "@/lib/services/types";

export default function DobsPage() {
  const [filter, setFilter] = useState<DobChainFilter>("btc");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">DOBs</h1>
            <p className="text-muted-foreground">Your DOB collection across Bitcoin and CKB</p>
          </div>
          <RefreshButton />
        </div>

        {/* Filters */}
        <DobFilters
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* DOB Grid */}
        <DobGrid filter={filter} searchQuery={searchQuery} />
      </div>
    </DashboardLayout>
  );
}
