
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, Shield, Activity, Clock } from 'lucide-react';
import { userAnalyticsService } from '@/services/analytics/UserAnalyticsService';
import { permissionAnalyticsService } from '@/services/rbac/PermissionAnalyticsService';

interface AnalyticsOverviewProps {
  tenantId: string;
}

export function AnalyticsOverview({ tenantId }: AnalyticsOverviewProps) {
  // Fetch tenant analytics
  const { data: tenantAnalytics, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-analytics', tenantId],
    queryFn: () => userAnalyticsService.getTenantAnalytics(tenantId),
    enabled: !!tenantId
  });

  // Fetch permission analytics
  const { data: permissionReport, isLoading: permissionLoading } = useQuery({
    queryKey: ['permission-analytics', tenantId],
    queryFn: () => permissionAnalyticsService.generateAnalyticsReport(),
    enabled: !!tenantId
  });

  if (tenantLoading || permissionLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Analytics Overview</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Analytics Overview</h2>
      </div>

      {/* Key Metrics */}
      {tenantAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{tenantAnalytics.activeUsers}</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{tenantAnalytics.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">{tenantAnalytics.performanceMetrics.averageResponseTime}ms</p>
                  <p className="text-xs text-muted-foreground">System performance</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Security Alerts</p>
                  <p className="text-2xl font-bold">{tenantAnalytics.securityAlerts}</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Permission Analytics Summary */}
      {permissionReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Permission System Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{permissionReport.summary.totalPermissionChecks}</div>
                  <div className="text-sm text-muted-foreground">Total Checks</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{Math.round(permissionReport.summary.averageResponseTime)}ms</div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{Math.round(permissionReport.summary.successRate * 100)}%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{permissionReport.summary.totalUsers}</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Top Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tenantAnalytics && tenantAnalytics.topFeatures.length > 0 ? (
                <div className="space-y-3">
                  {tenantAnalytics.topFeatures.map((feature, index) => (
                    <div key={feature} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="w-8 h-6 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Most used
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No usage data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Most Used Permissions */}
      {permissionReport && permissionReport.topPermissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Used Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {permissionReport.topPermissions.slice(0, 5).map((permission, index) => (
                <div key={permission.permissionKey} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-8 h-6 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">{permission.permissionKey}</div>
                      <div className="text-sm text-muted-foreground">
                        {permission.usageCount} checks • {Math.round(permission.averageResponseTime)}ms avg
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {Math.round(permission.successRate * 100)}% success
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last used: {permission.lastUsed.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
