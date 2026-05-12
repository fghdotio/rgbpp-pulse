import { DashboardLayout } from "@/components/dashboard-layout";
import { DobGrid } from "@/components/dobs/dob-grid";
import { DobFilters } from "@/components/dobs/dob-filters";

export default function DobsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">DOBs</h1>
          <p className="text-muted-foreground">Your Spore DOB collection across CKB and Bitcoin</p>
        </div>

        {/* Filters */}
        <DobFilters />

        {/* DOB Grid */}
        <DobGrid />
      </div>
    </DashboardLayout>
  );
}
