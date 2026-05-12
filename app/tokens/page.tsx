import { DashboardLayout } from "@/components/dashboard-layout";
import { TokenList } from "@/components/tokens/token-list";
import { TokenActions } from "@/components/tokens/token-actions";

export default function TokensPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tokens</h1>
            <p className="text-muted-foreground">Manage your xUDT and RGB++ tokens</p>
          </div>
          <TokenActions />
        </div>

        {/* Token List */}
        <TokenList />
      </div>
    </DashboardLayout>
  );
}
