
// Performance-optimized analytics overview component
import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, Shield, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { TenantAnalytics, AnalyticsTimeRange } from '@/services/analytics/UserAnalyticsService';
import { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';
import { AnalyticsErrorBoundary } from './core/AnalyticsErrorBoundary';

interface OptimizedAnalyticsOverviewProps {
  timeRange?: AnalyticsTimeRange;
  className?: string;
}

// Memoized metric card component
const MetricCard = memo<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}>>(({ title, value, subtitle, icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </CardContent>
  </Card>
));

// Memoized feature list component
const FeaturesList = memo<{ features: Array<{ name: string; usage: number }> }>(
  ({ features }) => (
    <div className="space-y-3">
      {features.slice(0, 5).map((feature, index) => (
        <div key={feature.name} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium">{feature.name}</span>
          </div>
          <Badge variant="secondary">{feature.usage}</Badge>
        </div>
      ))}
    </div>
  )
);

// Memoized progress section component
const ProgressSection = memo<{ analytics: TenantAnalytics }>(({ analytics }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">System Health</CardTitle>
      <CardDescription>Current system status and performance</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Response Time</span>
        <Badge variant="outline">{analytics.performanceMetrics.avgResponseTime}ms</Badge>
      </div>
      <Progress 
        value={Math.max(0, 100 - (analytics.performanceMetrics.avgResponseTime / 10))} 
        className="h-2" 
      />
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">System Uptime</span>
        <Badge variant="outline">{analytics.performanceMetrics.uptime}%</Badge>
      </div>
      <Progress value={analytics.performanceMetrics.uptime} className="h-2" />
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">User Engagement</span>
        <Badge variant="outline">{analytics.averageUserEngagement}%</Badge>
      </div>
      <Progress value={analytics.averageUserEngagement} className="h-2" />
    </CardContent>
  </Card>
));

function OptimizedAnalyticsOverviewComponent({ timeRange = '30d', className }: OptimizedAnalyticsOverviewProps) {
  const { analytics, loading, error } = useAnalyticsData(timeRange);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={`p-6 text-center text-muted-foreground ${className}`}>
        {error || 'Failed to load analytics data'}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold">Analytics Overview</h3>
        <p className="text-sm text-muted-foreground">
          Key metrics and system performance insights
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={analytics.totalUsers}
          subtitle={`+${analytics.userGrowthRate}% growth`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        
        <MetricCard
          title="Active Users"
          value={analytics.activeUsers}
          subtitle={`${Math.round((analytics.activeUsers / analytics.totalUsers) * 100)}% of total`}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        
        <MetricCard
          title="Performance"
          value={`${analytics.performanceMetrics.avgResponseTime}ms`}
          subtitle={`${analytics.performanceMetrics.uptime}% uptime`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        
        <MetricCard
          title="Security"
          value={analytics.securityAlerts}
          subtitle="Active alerts"
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ProgressSection analytics={analytics} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Features</CardTitle>
            <CardDescription>Most utilized system features</CardDescription>
          </CardHeader>
          <CardContent>
            <FeaturesList features={analytics.topFeatures} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const OptimizedAnalyticsOverview = memo(OptimizedAnalyticsOverviewComponent);
