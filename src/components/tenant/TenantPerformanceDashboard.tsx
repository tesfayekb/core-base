
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Database, Cpu, HardDrive, Users, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { tenantPerformanceMonitor, TenantPerformanceMetrics, TenantPerformanceAlert } from "@/services/monitoring/TenantPerformanceMonitor";

export function TenantPerformanceDashboard() {
  const { tenantId } = useAuth();
  const [metrics, setMetrics] = useState<TenantPerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<TenantPerformanceAlert[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [resourceReport, setResourceReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  useEffect(() => {
    if (tenantId) {
      loadPerformanceData();
      const interval = setInterval(loadPerformanceData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [tenantId, timeRange]);

  const loadPerformanceData = async () => {
    if (!tenantId) return;

    try {
      // Get time range
      const now = Date.now();
      const timeRanges = {
        '1h': now - (60 * 60 * 1000),
        '24h': now - (24 * 60 * 60 * 1000),
        '7d': now - (7 * 24 * 60 * 60 * 1000)
      };

      const metricsData = tenantPerformanceMonitor.getTenantMetrics(tenantId, {
        start: timeRanges[timeRange],
        end: now
      });

      const summaryData = tenantPerformanceMonitor.getTenantPerformanceSummary(tenantId);
      const resourceReportData = tenantPerformanceMonitor.getResourceUsageReport(tenantId);

      setMetrics(metricsData);
      setAlerts(summaryData.alerts);
      setSummary(summaryData);
      setResourceReport(resourceReportData);
      setLoading(false);

      // Start monitoring if not already started
      tenantPerformanceMonitor.startMonitoring();
    } catch (error) {
      console.error('Error loading performance data:', error);
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'degrading') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'degrading':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertSeverityColor = (severity: TenantPerformanceAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading performance data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenant Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor resource usage, performance metrics, and system health for your tenant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="1h">1 Hour</TabsTrigger>
              <TabsTrigger value="24h">24 Hours</TabsTrigger>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="grid gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Alerts ({alerts.length})
          </h3>
          <div className="grid gap-2">
            {alerts.slice(0, 5).map((alert) => (
              <Alert key={alert.id} variant={getAlertSeverityColor(alert.severity) as any}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>{alert.message}</span>
                    <Badge variant="outline">{alert.severity}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {alert.currentValue.toFixed(2)}, Threshold: {alert.threshold}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Cache
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Performance Summary Cards */}
            {summary && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                    {getTrendIcon(summary.trends.cacheHitRate)}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary.averageMetrics.cacheMetrics.hitRate.toFixed(1)}%
                    </div>
                    <Progress value={summary.averageMetrics.cacheMetrics.hitRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                    {getTrendIcon(summary.trends.permissionResolutionTime)}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary.averageMetrics.permissionMetrics.avgResolutionTime.toFixed(1)}ms
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Peak: {summary.averageMetrics.permissionMetrics.peakResolutionTime.toFixed(1)}ms
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                    {getTrendIcon(summary.trends.cpuUsage)}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary.averageMetrics.resourceUsage.cpuUsage.toFixed(1)}%
                    </div>
                    <Progress value={summary.averageMetrics.resourceUsage.cpuUsage} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(summary.averageMetrics.userActivity.activeUsers)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(summary.averageMetrics.userActivity.sessionCount)} sessions
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Permission resolution time and cache performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.slice(-20)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    formatter={(value, name) => [
                      name === 'avgResolutionTime' ? `${value}ms` : `${value}%`,
                      name === 'avgResolutionTime' ? 'Resolution Time' : 'Cache Hit Rate'
                    ]}
                  />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="permissionMetrics.avgResolutionTime" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="avgResolutionTime"
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="cacheMetrics.hitRate" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="hitRate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Permission System Performance</CardTitle>
                <CardDescription>Detailed performance metrics for permission resolution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                      formatter={(value, name) => [`${value}ms`, name === 'avgResolutionTime' ? 'Avg Time' : 'Peak Time']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="permissionMetrics.avgResolutionTime" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                      name="avgResolutionTime"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="permissionMetrics.peakResolutionTime" 
                      stackId="2" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      fillOpacity={0.6}
                      name="peakResolutionTime"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>Active users and request patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                      formatter={(value, name) => [value, name === 'activeUsers' ? 'Active Users' : 'Requests']}
                    />
                    <Bar dataKey="userActivity.activeUsers" fill="#8884d8" name="activeUsers" />
                    <Bar dataKey="userActivity.requestCount" fill="#82ca9d" name="requestCount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          {resourceReport && (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{resourceReport.current.cpuUsage.toFixed(1)}%</div>
                    <Progress value={resourceReport.quotaUsage.cpuUsage} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {resourceReport.quotaUsage.cpuUsage.toFixed(1)}% of quota
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatBytes(resourceReport.current.memoryUsage)}</div>
                    <Progress value={resourceReport.quotaUsage.memoryUsage} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {resourceReport.quotaUsage.memoryUsage.toFixed(1)}% of quota
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Database Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{resourceReport.current.databaseQueries}</div>
                    <Progress value={resourceReport.quotaUsage.databaseQueries} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      per minute
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatBytes(resourceReport.current.storageUsage)}</div>
                    <Progress value={resourceReport.quotaUsage.storageUsage} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {resourceReport.quotaUsage.storageUsage.toFixed(1)}% of quota
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Usage Trends</CardTitle>
                  <CardDescription>CPU and memory usage over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                        formatter={(value, name) => [
                          name === 'cpuUsage' ? `${value}%` : formatBytes(value),
                          name === 'cpuUsage' ? 'CPU Usage' : 'Memory Usage'
                        ]}
                      />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="resourceUsage.cpuUsage" 
                        stroke="#ff7300" 
                        strokeWidth={2}
                        name="cpuUsage"
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="resourceUsage.memoryUsage" 
                        stroke="#413ea0" 
                        strokeWidth={2}
                        name="memoryUsage"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cache">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>Cache hit rate, memory usage, and efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                      formatter={(value, name) => [
                        `${value}%`,
                        name === 'hitRate' ? 'Hit Rate' : name === 'missRate' ? 'Miss Rate' : 'Eviction Rate'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cacheMetrics.hitRate" 
                      stackId="1" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      fillOpacity={0.8}
                      name="hitRate"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cacheMetrics.missRate" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.8}
                      name="missRate"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cacheMetrics.evictionRate" 
                      stackId="1" 
                      stroke="#ff7300" 
                      fill="#ff7300" 
                      fillOpacity={0.8}
                      name="evictionRate"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Cache Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summary && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm">Hit Rate</span>
                        <span className="font-medium">{summary.averageMetrics.cacheMetrics.hitRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Miss Rate</span>
                        <span className="font-medium">{summary.averageMetrics.cacheMetrics.missRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Eviction Rate</span>
                        <span className="font-medium">{summary.averageMetrics.cacheMetrics.evictionRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Memory Usage</span>
                        <span className="font-medium">{formatBytes(summary.averageMetrics.cacheMetrics.memoryUsage)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Entry Count</span>
                        <span className="font-medium">{Math.round(summary.averageMetrics.cacheMetrics.entryCount)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cache Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={metrics.slice(-5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                        formatter={(value) => [`${value}`, 'Entries']}
                      />
                      <Bar dataKey="cacheMetrics.entryCount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
