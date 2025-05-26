
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, Activity, Settings, TrendingUp } from 'lucide-react';
import { TenantMetrics } from './TenantMetrics';
import { TenantContextIndicator } from './TenantContextIndicator';
import { enhancedTenantManagementService } from '@/services/tenant/EnhancedTenantManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantDashboard() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [tenantId]);

  const loadDashboardData = async () => {
    if (!tenantId) return;

    try {
      const data = await enhancedTenantManagementService.getTenantDashboardData(tenantId);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Dashboard</h1>
          <p className="text-muted-foreground">Overview of your tenant's performance and usage</p>
        </div>
        <TenantContextIndicator showDetails />
      </div>

      {/* Welcome Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Building2 className="h-12 w-12 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold">
                Welcome to {dashboardData?.tenant?.name || 'Your Tenant'}
              </h2>
              <p className="text-muted-foreground">
                {dashboardData?.tenant?.domain || 'Tenant dashboard'}
              </p>
              <Badge variant="default" className="mt-2">
                {dashboardData?.tenant?.status || 'Active'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Quotas</p>
                  <p className="text-2xl font-bold">{dashboardData.totalQuotas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Warning Quotas</p>
                  <p className="text-2xl font-bold text-yellow-600">{dashboardData.warningQuotas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dashboardData.warningQuotas === 0 ? '100%' : '85%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Metrics */}
      <TenantMetrics />

      {/* Quota Overview */}
      {dashboardData?.quotaUsage && (
        <Card>
          <CardHeader>
            <CardTitle>Resource Quota Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.quotaUsage.map((quota: any) => (
                <div key={quota.resource_type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">
                      {quota.resource_type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {quota.current_usage} / {quota.quota_limit}
                      </span>
                      {quota.warning && (
                        <Badge variant="destructive">Warning</Badge>
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(quota.usage_percentage, 100)} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
