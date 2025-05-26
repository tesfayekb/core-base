
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Users, 
  Database, 
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { enhancedTenantManagementService } from '@/services/tenant/EnhancedTenantManagementService';
import { useAuth } from '@/contexts/AuthContext';

interface TenantMetrics {
  activeUsers: { current: number; change: number };
  resourceUsage: { storage: number; api: number; bandwidth: number };
  performance: { avgResponseTime: number; uptime: number };
  quotaStatus: { used: number; total: number; percentage: number };
  recentActivity: Array<{ action: string; timestamp: string; user: string }>;
}

export function TenantMetrics() {
  const { tenantId } = useAuth();
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [tenantId]);

  const loadMetrics = async () => {
    if (!tenantId) return;

    try {
      // Mock metrics data - replace with actual service calls
      const mockMetrics: TenantMetrics = {
        activeUsers: { current: 142, change: 8 },
        resourceUsage: { storage: 65, api: 78, bandwidth: 45 },
        performance: { avgResponseTime: 245, uptime: 99.8 },
        quotaStatus: { used: 1250, total: 2000, percentage: 62.5 },
        recentActivity: [
          { action: 'User login', timestamp: '2024-01-15T10:30:00Z', user: 'john.doe@acme.com' },
          { action: 'File uploaded', timestamp: '2024-01-15T10:25:00Z', user: 'jane.smith@acme.com' },
          { action: 'Report generated', timestamp: '2024-01-15T10:20:00Z', user: 'admin@acme.com' },
          { action: 'Settings updated', timestamp: '2024-01-15T10:15:00Z', user: 'admin@acme.com' }
        ]
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load tenant metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  if (loading) {
    return <div className="p-6">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="p-6">Failed to load metrics</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{metrics.activeUsers.current}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics.activeUsers.change)}
                <span className="text-sm text-muted-foreground">
                  {metrics.activeUsers.change > 0 ? '+' : ''}{metrics.activeUsers.change}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Quota Usage</p>
                <p className="text-2xl font-bold">{metrics.quotaStatus.percentage.toFixed(1)}%</p>
                <Progress value={metrics.quotaStatus.percentage} className="h-2 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{metrics.performance.avgResponseTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">{metrics.performance.uptime}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage Details */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage</span>
              <div className="flex items-center gap-2">
                <Progress value={metrics.resourceUsage.storage} className="w-32 h-2" />
                <Badge className={getUsageColor(metrics.resourceUsage.storage)}>
                  {metrics.resourceUsage.storage}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Calls</span>
              <div className="flex items-center gap-2">
                <Progress value={metrics.resourceUsage.api} className="w-32 h-2" />
                <Badge className={getUsageColor(metrics.resourceUsage.api)}>
                  {metrics.resourceUsage.api}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Bandwidth</span>
              <div className="flex items-center gap-2">
                <Progress value={metrics.resourceUsage.bandwidth} className="w-32 h-2" />
                <Badge className={getUsageColor(metrics.resourceUsage.bandwidth)}>
                  {metrics.resourceUsage.bandwidth}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {metrics.quotaStatus.percentage > 80 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Quota Warning</p>
                <p className="text-sm text-yellow-700">
                  You've used {metrics.quotaStatus.percentage.toFixed(1)}% of your quota. 
                  Consider upgrading or optimizing usage.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
