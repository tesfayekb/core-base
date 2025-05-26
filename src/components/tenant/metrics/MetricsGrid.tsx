
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Database, Clock, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TenantMetricsData {
  activeUsers: { current: number; change: number };
  resourceUsage: { storage: number; api: number; bandwidth: number };
  performance: { avgResponseTime: number; uptime: number };
  quotaStatus: { used: number; total: number; percentage: number };
}

interface MetricsGridProps {
  metrics: TenantMetricsData;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  return (
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
  );
}
