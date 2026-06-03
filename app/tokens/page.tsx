import { DashboardLayout } from "@/components/dashboard-layout";
import { TokenList } from "@/components/tokens/token-list";
import { RefreshButton } from "@/components/ui/refresh-button";

export default function TokensPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">UDT Tokens</h1>
            <p className="text-muted-foreground">Your RGB++ UDT tokens across Bitcoin and CKB</p>
          </div>
          <RefreshButton />
        </div>

        {/* Token List */}
        <TokenList />
      </div>
    </DashboardLayout>
  );
}
