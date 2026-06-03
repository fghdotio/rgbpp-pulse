import { DashboardLayout } from "@/components/dashboard-layout";
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function PortfolioPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">RGB++ Portfolio</h1>
          <p className="text-muted-foreground">Manage RGB++ assets across Bitcoin and CKB</p>
        </div>

        {/* Assets Overview */}
        <PortfolioOverview />

        {/* Recent Activity */}
        <RecentActivity />

        {/* Network Status */}
        <QuickActions />
      </div>
    </DashboardLayout>
  );
}
