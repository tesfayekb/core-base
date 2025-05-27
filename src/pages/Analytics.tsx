import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { UserAnalyticsDashboard } from "@/components/analytics/UserAnalyticsDashboard";
import { PermissionAnalyticsDashboard } from "@/components/analytics/PermissionAnalyticsDashboard";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";
import { useAuthCompat } from "@/contexts/AuthContext";

export default function Analytics() {
  const { tenantId } = useAuthCompat();
  
  console.log('📊 Analytics page rendering, tenantId:', tenantId);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">View detailed metrics and performance data</p>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full max-w-[600px] grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <AnalyticsOverview />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <PermissionBoundary action="view" resource="analytics">
            <UserAnalyticsDashboard />
          </PermissionBoundary>
        </TabsContent>
        
        <TabsContent value="permissions" className="space-y-4">
          <PermissionBoundary action="view" resource="analytics">
            {tenantId && <PermissionAnalyticsDashboard tenantId={tenantId} />}
          </PermissionBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
