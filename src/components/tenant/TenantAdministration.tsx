
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Database,
  Activity
} from 'lucide-react';
import { enhancedTenantManagementService } from '@/services/tenant/EnhancedTenantManagementService';
import { tenantManagementService } from '@/services/tenant/TenantManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface TenantHealthMetrics {
  tenantId: string;
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  errorRate: number;
  activeUsers: number;
  lastHealthCheck: string;
}

interface SystemTenant {
  id: string;
  name: string;
  domain?: string;
  status: string;
  userCount: number;
  quotaUsage: number;
  lastActivity: string;
}

export function TenantAdministration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<SystemTenant[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<TenantHealthMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      const tenantsData = await tenantManagementService.getAllTenants();
      
      // Transform and enrich tenant data
      const systemTenants: SystemTenant[] = await Promise.all(
        tenantsData.map(async (tenant) => {
          const analytics = await tenantManagementService.getTenantUsageAnalytics(tenant.id);
          const health = await tenantManagementService.getTenantHealthStatus(tenant.id);
          
          return {
            id: tenant.id,
            name: tenant.name,
            domain: tenant.domain,
            status: tenant.status,
            userCount: analytics.totalUsers,
            quotaUsage: health.metrics.resourceUsage,
            lastActivity: analytics.lastActivity.toISOString()
          };
        })
      );

      // Generate health metrics
      const healthData: TenantHealthMetrics[] = await Promise.all(
        tenantsData.map(async (tenant) => {
          const health = await tenantManagementService.getTenantHealthStatus(tenant.id);
          const analytics = await tenantManagementService.getTenantUsageAnalytics(tenant.id);
          
          return {
            tenantId: tenant.id,
            status: health.status,
            responseTime: health.metrics.responseTime,
            errorRate: health.metrics.errorRate,
            activeUsers: analytics.activeUsers,
            lastHealthCheck: health.lastChecked.toISOString()
          };
        })
      );

      setTenants(systemTenants);
      setHealthMetrics(healthData);
    } catch (error) {
      console.error('Failed to load system data:', error);
      toast({
        title: "Error",
        description: "Failed to load system administration data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTenantStatusChange = async (tenantId: string, newStatus: string) => {
    try {
      await tenantManagementService.updateTenantConfiguration(tenantId, {
        status: newStatus as any
      });

      await loadSystemData();
      
      toast({
        title: "Status updated",
        description: "Tenant status has been updated successfully."
      });
    } catch (error) {
      console.error('Failed to update tenant status:', error);
      toast({
        title: "Error",
        description: "Failed to update tenant status.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const getHealthStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
    }
  };

  const getHealthIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="p-6">Loading system administration...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            System Administration
          </h1>
          <p className="text-muted-foreground">Manage all tenants and system health</p>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold">{tenants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">
                  {tenants.reduce((sum, t) => sum + t.userCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Healthy Tenants</p>
                <p className="text-2xl font-bold">
                  {healthMetrics.filter(h => h.status === 'healthy').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">
                  {healthMetrics.reduce((sum, h) => sum + h.activeUsers, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant List */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tenants.map((tenant) => {
              const health = healthMetrics.find(h => h.tenantId === tenant.id);
              
              return (
                <div key={tenant.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold">{tenant.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {tenant.domain || `ID: ${tenant.id.slice(0, 8)}...`}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(tenant.status)}>
                          {tenant.status}
                        </Badge>
                        
                        {health && (
                          <div className={`flex items-center gap-1 ${getHealthStatusColor(health.status)}`}>
                            {getHealthIcon(health.status)}
                            <span className="text-sm capitalize">{health.status}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        <span className="block">{tenant.userCount} users</span>
                        <span className="block">{tenant.quotaUsage.toFixed(1)}% quota</span>
                      </div>

                      <div className="flex gap-2">
                        {tenant.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTenantStatusChange(tenant.id, 'suspended')}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleTenantStatusChange(tenant.id, 'active')}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {health && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Response Time:</span>
                          <span className="ml-2 font-medium">{health.responseTime.toFixed(0)}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Error Rate:</span>
                          <span className="ml-2 font-medium">{health.errorRate.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Active Users:</span>
                          <span className="ml-2 font-medium">{health.activeUsers}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {tenants.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tenants found in the system.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
