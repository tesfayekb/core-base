
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, Shield, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { userAnalyticsService, TenantAnalytics, AnalyticsTimeRange } from '@/services/analytics/UserAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsOverviewProps {
  timeRange?: AnalyticsTimeRange;
  className?: string;
}

export function AnalyticsOverview({ timeRange = '30d', className }: AnalyticsOverviewProps) {
  const { tenantId } = useAuth();
  const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [tenantId, timeRange]);

  const loadAnalytics = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await userAnalyticsService.getTenantAnalytics(tenantId, timeRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics overview:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!analytics) {
    return (
      <div className={`p-6 text-center text-muted-foreground ${className}`}>
        Failed to load analytics data
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.userGrowthRate}% growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((analytics.activeUsers / analytics.totalUsers) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.performanceMetrics.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              {analytics.performanceMetrics.uptime}% uptime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.securityAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Active alerts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission System Health</CardTitle>
            <CardDescription>Current system status and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Response Time</span>
              <Badge variant="outline">{analytics.performanceMetrics.avgResponseTime}ms</Badge>
            </div>
            <Progress value={Math.max(0, 100 - (analytics.performanceMetrics.avgResponseTime / 10))} className="h-2" />
            
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Features</CardTitle>
            <CardDescription>Most utilized system features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topFeatures.slice(0, 5).map((feature, index) => (
                <div key={feature.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium">{feature.name}</span>
                  </div>
                  <Badge variant="secondary">{feature.usage}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Stats</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Avg Session</div>
                <div className="text-lg font-bold">
                  {Math.round(analytics.averageSessionDuration / 60)}m
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Total Sessions</div>
                <div className="text-lg font-bold">{analytics.totalSessions}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Security Alerts</div>
                <div className="text-lg font-bold text-red-600">{analytics.securityAlerts}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
