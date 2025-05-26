
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Settings, BarChart3 } from 'lucide-react';
import { tenantManagementService, TenantConfig, TenantUsageAnalytics, TenantHealthStatus } from '@/services/tenant/TenantManagementService';
import { useAuth } from '@/contexts/AuthContext';

export function TenantDashboard() {
  const { tenantId } = useAuth();
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [analytics, setAnalytics] = useState<TenantUsageAnalytics | null>(null);
  const [health, setHealth] = useState<TenantHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTenantData = async () => {
      if (!tenantId) return;

      try {
        const [tenantData, analyticsData, healthData] = await Promise.all([
          tenantManagementService.getTenant(tenantId),
          tenantManagementService.getTenantUsageAnalytics(tenantId),
          tenantManagementService.getTenantHealthStatus(tenantId)
        ]);

        setTenant(tenantData);
        setAnalytics(analyticsData);
        setHealth(healthData);
      } catch (error) {
        console.error('Failed to load tenant data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTenantData();
  }, [tenantId]);

  if (loading) {
    return <div className="p-6">Loading tenant dashboard...</div>;
  }

  if (!tenant) {
    return <div className="p-6">Tenant not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          <p className="text-muted-foreground">Tenant Dashboard</p>
        </div>
        <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
          {tenant.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.totalUsers || 0} total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.storageUsed || 0} MB</div>
            <p className="text-xs text-muted-foreground">
              of {tenant.settings.storageQuota || 1000} MB quota
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.apiCalls || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={health?.status === 'healthy' ? 'default' : 'destructive'}>
              {health?.status || 'unknown'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.metrics.responseTime?.toFixed(0)}ms avg response
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Name:</span> {tenant.name}
            </div>
            <div>
              <span className="font-medium">Slug:</span> {tenant.slug}
            </div>
            {tenant.domain && (
              <div>
                <span className="font-medium">Domain:</span> {tenant.domain}
              </div>
            )}
            <div>
              <span className="font-medium">Created:</span> {tenant.createdAt.toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tenant.settings.features.map((feature) => (
                <Badge key={feature} variant="outline">
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
