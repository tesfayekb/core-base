
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Users, Activity, Shield, TrendingUp, AlertTriangle, Clock, BarChart3, Calendar } from 'lucide-react';
import { userAnalyticsService, TenantAnalytics, UserActivityMetric, UsagePattern, SecurityEvent, AnalyticsTimeRange } from '@/services/analytics/UserAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';

export function UserAnalyticsDashboard() {
  const { tenantId } = useAuth();
  const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);
  const [activityMetrics, setActivityMetrics] = useState<UserActivityMetric[]>([]);
  const [usagePatterns, setUsagePatterns] = useState<UsagePattern[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [tenantId, timeRange]);

  const loadAnalytics = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [analyticsData, activityData, patternsData, securityData] = await Promise.all([
        userAnalyticsService.getTenantAnalytics(tenantId, timeRange),
        userAnalyticsService.getUserActivityMetrics(tenantId, timeRange),
        userAnalyticsService.getUsagePatterns(tenantId, timeRange),
        userAnalyticsService.getSecurityEventCorrelation(tenantId, timeRange)
      ]);

      setAnalytics(analyticsData);
      setActivityMetrics(activityData);
      setUsagePatterns(patternsData);
      setSecurityEvents(securityData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (value: string) => {
    if (['7d', '30d', '90d', '1y'].includes(value)) {
      setTimeRange(value as AnalyticsTimeRange);
    }
  };

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="p-6">Failed to load analytics</div>;
  }

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Analytics</h2>
          <p className="text-muted-foreground">Comprehensive user activity and system insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
          <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  +{analytics.userGrowthRate}% from last period
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
                  {analytics.averageUserEngagement}% engagement rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.securityAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  Requiring attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(analytics.averageSessionDuration / 60)}m
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.topFeatures.length} features active
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Features</CardTitle>
                <CardDescription>Most used features by your users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topFeatures.map((feature, index) => (
                    <div key={feature.name} className="flex items-center justify-between">
                      <div className="font-medium">{feature.name}</div>
                      <div className="text-sm text-muted-foreground">{feature.usage} uses</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Response time and uptime metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Time</span>
                  <span className="font-medium">{analytics.performanceMetrics.avgResponseTime}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Uptime</span>
                  <span className="font-medium">{analytics.performanceMetrics.uptime}%</span>
                </div>
                <Progress value={analytics.performanceMetrics.uptime} className="h-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activityMetrics.reduce((sum, metric) => sum + metric.totalSessions, 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(activityMetrics.reduce((sum, metric) => sum + metric.averageSessionDuration, 0) / activityMetrics.length / 60)}m
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Actions Performed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activityMetrics.reduce((sum, metric) => sum + metric.actionsPerformed, 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Login Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activityMetrics.reduce((sum, metric) => sum + metric.loginFrequency, 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activityMetrics.reduce((sum, metric) => sum + metric.securityEvents, 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {activityMetrics.length > 0 ? new Date(activityMetrics[0].lastActivity).toLocaleDateString() : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {activityMetrics.length > 0 && activityMetrics[0].mostUsedFeatures.length > 0 
                    ? `Top: ${activityMetrics[0].mostUsedFeatures[0].name}`
                    : 'No features tracked'
                  }
                </div>
                {activityMetrics.length > 0 && activityMetrics[0].mostUsedFeatures.map((feature, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    {feature.name}: {feature.usage}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Activity Over Time</CardTitle>
              <CardDescription>Daily active users and session metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={activityMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Active Users"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newUsers" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Patterns</CardTitle>
                <CardDescription>Most popular features and usage statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={usagePatterns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usageCount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Growth Rates</CardTitle>
                <CardDescription>Growth trends for different features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usagePatterns.map((pattern, index) => (
                    <div key={pattern.feature} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{pattern.feature}</div>
                        <div className="text-sm text-muted-foreground">
                          {pattern.uniqueUsers} unique users
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          +{pattern.growthRate}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pattern.usageCount} uses
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {securityEvents.map((event, index) => (
              <Card key={event.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{event.eventType}</CardTitle>
                    <Badge variant={event.severity === 'high' ? 'destructive' : 'secondary'}>
                      {event.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Frequency:</span> {event.frequency}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Pattern:</span> {event.timePattern}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Risk Score:</span> {event.riskScore}/100
                  </div>
                  <Progress value={event.riskScore} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {event.correlatedEvents.length} related events
                  </div>
                  {event.correlatedEvents.map((relatedId, relatedIndex) => (
                    <div key={relatedIndex} className="text-xs text-blue-600">
                      Related: {relatedId}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Event Timeline</CardTitle>
              <CardDescription>Recent security events and their correlation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-red-500 pl-4 py-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{event.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge variant="outline">Risk: {event.riskScore}</Badge>
                      <Badge variant="outline">{event.severity}</Badge>
                      {event.userId && (
                        <Badge variant="outline">User: {event.userId}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
