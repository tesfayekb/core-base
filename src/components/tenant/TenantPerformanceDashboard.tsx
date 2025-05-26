import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Clock, 
  HardDrive, 
  Users, 
  Database, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Timer
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TenantPerformanceMetrics {
  tenantId: string;
  tenantName: string;
  cacheHitRate: number;
  permissionResolutionTime: number;
  activeUsers: number;
  requestCount: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  lastUpdated: string;
}

interface CacheMetrics {
  timestamp: string;
  hitRate: number;
  missRate: number;
  invalidations: number;
  memoryUsage: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
  metric: string;
  value: number;
  threshold: number;
}

const mockTenantMetrics: TenantPerformanceMetrics = {
  tenantId: 'tenant-1',
  tenantName: 'Acme Corporation',
  cacheHitRate: 94.5,
  permissionResolutionTime: 12,
  activeUsers: 847,
  requestCount: 15420,
  errorRate: 0.2,
  memoryUsage: 68.3,
  cpuUsage: 42.1,
  diskUsage: 78.9,
  lastUpdated: new Date().toISOString()
};

const mockCacheMetrics: CacheMetrics[] = [
  { timestamp: '00:00', hitRate: 92, missRate: 8, invalidations: 5, memoryUsage: 65 },
  { timestamp: '04:00', hitRate: 94, missRate: 6, invalidations: 3, memoryUsage: 67 },
  { timestamp: '08:00', hitRate: 96, missRate: 4, invalidations: 2, memoryUsage: 70 },
  { timestamp: '12:00', hitRate: 95, missRate: 5, invalidations: 4, memoryUsage: 72 },
  { timestamp: '16:00', hitRate: 93, missRate: 7, invalidations: 6, memoryUsage: 69 },
  { timestamp: '20:00', hitRate: 94, missRate: 6, invalidations: 3, memoryUsage: 68 }
];

const mockPerformanceAlerts: PerformanceAlert[] = [
  {
    id: '1',
    type: 'warning',
    message: 'Cache hit rate below 95%',
    timestamp: '2 minutes ago',
    metric: 'cacheHitRate',
    value: 94.5,
    threshold: 95
  },
  {
    id: '2',
    type: 'info',
    message: 'Permission resolution time optimized',
    timestamp: '15 minutes ago',
    metric: 'permissionResolutionTime',
    value: 12,
    threshold: 15
  }
];

const resourceUsageData = [
  { name: 'CPU', usage: 42, limit: 100, color: '#8884d8' },
  { name: 'Memory', usage: 68, limit: 100, color: '#82ca9d' },
  { name: 'Disk', usage: 79, limit: 100, color: '#ffc658' },
  { name: 'Network', usage: 35, limit: 100, color: '#ff7c7c' }
];

const permissionMetrics = [
  { time: '00:00', resolutionTime: 15, cacheHits: 890, cacheMisses: 45 },
  { time: '04:00', resolutionTime: 12, cacheHits: 920, cacheMisses: 38 },
  { time: '08:00', resolutionTime: 10, cacheHits: 950, cacheMisses: 25 },
  { time: '12:00', resolutionTime: 8, cacheHits: 980, cacheMisses: 20 },
  { time: '16:00', resolutionTime: 11, cacheHits: 945, cacheMisses: 30 },
  { time: '20:00', resolutionTime: 12, cacheHits: 935, cacheMisses: 35 }
];

const tenantActivityData = [
  { hour: '00:00', users: 234, requests: 1200, errors: 2 },
  { hour: '04:00', users: 189, requests: 890, errors: 1 },
  { hour: '08:00', users: 567, requests: 3400, errors: 5 },
  { hour: '12:00', users: 847, requests: 5600, errors: 3 },
  { hour: '16:00', users: 923, requests: 6200, errors: 4 },
  { hour: '20:00', users: 756, requests: 4800, errors: 2 }
];

export function TenantPerformanceDashboard() {
  const [metrics, setMetrics] = useState<TenantPerformanceMetrics>(mockTenantMetrics);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics[]>(mockCacheMetrics);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>(mockPerformanceAlerts);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setMetrics({
        ...metrics,
        cacheHitRate: 93.2 + Math.random() * 4,
        permissionResolutionTime: 10 + Math.random() * 8,
        activeUsers: 800 + Math.floor(Math.random() * 200),
        requestCount: 15000 + Math.floor(Math.random() * 2000),
        lastUpdated: new Date().toISOString()
      });
      setIsRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (value: number, threshold: number, isReverse = false) => {
    if (isReverse) {
      return value <= threshold ? 'text-green-600' : value <= threshold * 1.2 ? 'text-yellow-600' : 'text-red-600';
    }
    return value >= threshold ? 'text-green-600' : value >= threshold * 0.8 ? 'text-yellow-600' : 'text-red-600';
  };

  const getProgressColor = (value: number, threshold: number) => {
    if (value >= 80) return 'bg-red-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenant Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor performance metrics and resource usage for {metrics.tenantName}
          </p>
        </div>
        <Button onClick={refreshMetrics} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Performance Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={alert.type === 'error' ? 'destructive' : alert.type === 'warning' ? 'secondary' : 'default'}>
                      {alert.type}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(metrics.cacheHitRate, 95)}`}>
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: ≥95%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permission Resolution</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(metrics.permissionResolutionTime, 15, true)}`}>
              {metrics.permissionResolutionTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Target: ≤15ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Current session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(metrics.errorRate, 1, true)}`}>
              {metrics.errorRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: ≤1%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cache" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="resources">Resource Usage</TabsTrigger>
          <TabsTrigger value="permissions">Permission Metrics</TabsTrigger>
          <TabsTrigger value="activity">Tenant Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Rate Trend</CardTitle>
                <CardDescription>Cache performance over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cacheMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="hitRate" stroke="#8884d8" strokeWidth={2} name="Hit Rate %" />
                    <Line type="monotone" dataKey="missRate" stroke="#82ca9d" strokeWidth={2} name="Miss Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Memory Usage</CardTitle>
                <CardDescription>Memory consumption and invalidations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cacheMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="memoryUsage" stackId="1" stroke="#8884d8" fill="#8884d8" name="Memory Usage %" />
                    <Area type="monotone" dataKey="invalidations" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Invalidations" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>Current system resource usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resourceUsageData.map((resource) => (
                    <div key={resource.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          <span className="text-sm font-medium">{resource.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{resource.usage}%</span>
                      </div>
                      <Progress 
                        value={resource.usage} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage Distribution</CardTitle>
                <CardDescription>Breakdown of resource consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resourceUsageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="usage"
                    >
                      {resourceUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Resolution Performance</CardTitle>
              <CardDescription>RBAC system performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={permissionMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="resolutionTime" stroke="#8884d8" strokeWidth={2} name="Resolution Time (ms)" />
                  <Line yAxisId="right" type="monotone" dataKey="cacheHits" stroke="#82ca9d" strokeWidth={2} name="Cache Hits" />
                  <Line yAxisId="right" type="monotone" dataKey="cacheMisses" stroke="#ffc658" strokeWidth={2} name="Cache Misses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Activity Overview</CardTitle>
              <CardDescription>User activity and request patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={tenantActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="users" fill="#8884d8" name="Active Users" />
                  <Bar yAxisId="right" dataKey="requests" fill="#82ca9d" name="Requests" />
                  <Bar yAxisId="right" dataKey="errors" fill="#ff7c7c" name="Errors" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
