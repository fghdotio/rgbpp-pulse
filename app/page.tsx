import { DashboardLayout } from "@/components/dashboard-layout";
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview";
import { AssetDistribution } from "@/components/dashboard/asset-distribution";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your RGB++ assets across CKB and Bitcoin</p>
        </div>

        {/* Stats Cards */}
        <PortfolioOverview />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Distribution Chart */}
          <div className="lg:col-span-2">
            <AssetDistribution />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
}
