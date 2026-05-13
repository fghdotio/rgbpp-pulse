"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { TransactionList } from "@/components/transactions/transaction-list";
import {
  TransactionFilters,
  type StatusFilter,
  type OperationFilter,
} from "@/components/transactions/transaction-filters";
import { RefreshButton } from "@/components/ui/refresh-button";

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [operationFilter, setOperationFilter] =
    useState<OperationFilter>("all");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">
              Your RGB++ transaction history
            </p>
          </div>
          <RefreshButton />
        </div>

        {/* Filters */}
        <TransactionFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          operationFilter={operationFilter}
          onOperationFilterChange={setOperationFilter}
        />

        {/* Transaction List */}
        <TransactionList
          statusFilter={statusFilter}
          operationFilter={operationFilter}
        />
      </div>
    </DashboardLayout>
  );
}
