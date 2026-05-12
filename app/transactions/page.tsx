import { DashboardLayout } from "@/components/dashboard-layout";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionFilters } from "@/components/transactions/transaction-filters";

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground">Track your RGB++ transaction history and pipelines</p>
        </div>

        {/* Filters */}
        <TransactionFilters />

        {/* Transaction List */}
        <TransactionList />
      </div>
    </DashboardLayout>
  );
}
