
import { ArrowUp, Users, BarChart, ArrowRight } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline">Download Report</Button>
          <Button>Add New</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value="2,453"
          description="+12% from last month"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Active Projects"
          value="45"
          description="4 added this week"
          icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Revenue"
          value="$45,231"
          description="+18% from last month"
          icon={<ArrowUp className="h-4 w-4 text-emerald-500" />}
        />
        <StatsCard
          title="Conversion Rate"
          value="3.2%"
          description="+0.5% from last week"
          icon={<ArrowUp className="h-4 w-4 text-emerald-500" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <OverviewChart />
        <RecentActivity />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you can perform</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-between">
              Create new project <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between">
              Invite team members <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between">
              Update profile <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
