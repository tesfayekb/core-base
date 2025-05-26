
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { tenantManagementService, TenantConfig, TenantUsageAnalytics, TenantHealthStatus } from '@/services/tenant/TenantManagementService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Users, 
  Activity, 
  HardDrive, 
  Zap,
  AlertCircle,
  CheckCircle,
  Settings,
  Plus,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantDashboardProps {
  className?: string;
}

export function TenantDashboard({ className }: TenantDashboardProps) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantConfig | null>(null);
  const [analytics, setAnalytics] = useState<TenantUsageAnalytics | null>(null);
  const [healthStatus, setHealthStatus] = useState<TenantHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadTenants();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTenant) {
      loadTenantDetails(selectedTenant.id);
    }
  }, [selectedTenant]);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const tenantsData = await tenantManagementService.getAllTenants();
      setTenants(tenantsData);
      if (tenantsData.length > 0) {
        setSelectedTenant(tenantsData[0]);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenantDetails = async (tenantId: string) => {
    setIsRefreshing(true);
    try {
      const [analyticsData, healthData] = await Promise.all([
        tenantManagementService.getTenantUsageAnalytics(tenantId),
        tenantManagementService.getTenantHealthStatus(tenantId)
      ]);
      setAnalytics(analyticsData);
      setHealthStatus(healthData);
    } catch (error) {
      console.error('Failed to load tenant details:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6 p-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor your tenants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTenants} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Tenant
          </Button>
        </div>
      </div>

      {/* Tenant Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Tenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Card
                key={tenant.id}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-accent',
                  selectedTenant?.id === tenant.id && 'ring-2 ring-primary'
                )}
                onClick={() => setSelectedTenant(tenant)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{tenant.name}</h3>
                      <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                    </div>
                    <Badge variant={getStatusColor(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedTenant && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Health Status */}
            {healthStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(healthStatus.status)}
                    Tenant Health Status
                  </CardTitle>
                  <CardDescription>
                    Last checked: {healthStatus.lastChecked.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Response Time</p>
                      <p className="text-2xl font-bold">{healthStatus.metrics.responseTime.toFixed(0)}ms</p>
                      <Progress value={Math.min(healthStatus.metrics.responseTime / 2, 100)} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Error Rate</p>
                      <p className="text-2xl font-bold">{healthStatus.metrics.errorRate.toFixed(1)}%</p>
                      <Progress value={healthStatus.metrics.errorRate * 20} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Active Connections</p>
                      <p className="text-2xl font-bold">{healthStatus.metrics.activeConnections}</p>
                      <Progress value={healthStatus.metrics.activeConnections} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Resource Usage</p>
                      <p className="text-2xl font-bold">{healthStatus.metrics.resourceUsage.toFixed(0)}%</p>
                      <Progress value={healthStatus.metrics.resourceUsage} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Usage Analytics */}
            {analytics && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.activeUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      of {analytics.totalUsers} total users
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.storageUsed} MB</div>
                    <p className="text-xs text-muted-foreground">
                      of {selectedTenant.settings.storageQuota || 1000} MB quota
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.apiCalls.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      this month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Features</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTenant.settings.features.length}</div>
                    <p className="text-xs text-muted-foreground">
                      enabled features
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users within {selectedTenant.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">User management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Settings</CardTitle>
                <CardDescription>
                  Configure settings for {selectedTenant.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Settings interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Detailed analytics for {selectedTenant.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Advanced analytics coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
