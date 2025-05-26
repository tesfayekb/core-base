
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Clock, 
  Users, 
  Zap, 
  Activity, 
  BarChart3, 
  AlertTriangle,
  TrendingUp,
  Server,
  Memory
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

interface PerformanceMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  activeConnections: number;
  memoryUsage: number;
  queryCount: number;
  errorRate: number;
}

interface ChartDataPoint {
  time: string;
  responseTime: number;
  cacheHitRate: number;
  connections: number;
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  storage: number;
  bandwidth: number;
}

export function TenantPerformanceDashboard() {
  const { tenantId } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHitRate: 94.2,
    avgResponseTime: 12.5,
    activeConnections: 28,
    memoryUsage: 68.5,
    queryCount: 1247,
    errorRate: 0.3
  });

  const [resourceUsage, setResourceUsage] = useState<ResourceUsage>({
    cpu: 35.2,
    memory: 62.8,
    storage: 45.1,
    bandwidth: 28.7
  });

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    // Simulate real-time data updates
    const generateChartData = () => {
      const data: ChartDataPoint[] = [];
      const now = new Date();
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        data.push({
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          responseTime: 8 + Math.random() * 15,
          cacheHitRate: 85 + Math.random() * 15,
          connections: 15 + Math.random() * 25
        });
      }
      return data;
    };

    setChartData(generateChartData());

    const interval = setInterval(() => {
      // Update metrics with some variation
      setMetrics(prev => ({
        cacheHitRate: Math.max(85, Math.min(100, prev.cacheHitRate + (Math.random() - 0.5) * 2)),
        avgResponseTime: Math.max(5, Math.min(30, prev.avgResponseTime + (Math.random() - 0.5) * 3)),
        activeConnections: Math.max(10, Math.min(50, prev.activeConnections + Math.floor((Math.random() - 0.5) * 6))),
        memoryUsage: Math.max(30, Math.min(90, prev.memoryUsage + (Math.random() - 0.5) * 4)),
        queryCount: prev.queryCount + Math.floor(Math.random() * 10),
        errorRate: Math.max(0, Math.min(5, prev.errorRate + (Math.random() - 0.5) * 0.2))
      }));

      setResourceUsage(prev => ({
        cpu: Math.max(10, Math.min(80, prev.cpu + (Math.random() - 0.5) * 5)),
        memory: Math.max(20, Math.min(90, prev.memory + (Math.random() - 0.5) * 3)),
        storage: Math.max(20, Math.min(95, prev.storage + (Math.random() - 0.5) * 1)),
        bandwidth: Math.max(5, Math.min(70, prev.bandwidth + (Math.random() - 0.5) * 8))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }, inverse = false) => {
    if (inverse) {
      if (value >= thresholds.critical) return 'text-red-600';
      if (value >= thresholds.warning) return 'text-yellow-600';
      return 'text-green-600';
    } else {
      if (value <= thresholds.critical) return 'text-red-600';
      if (value <= thresholds.warning) return 'text-yellow-600';
      return 'text-green-600';
    }
  };

  const getProgressColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'bg-red-500';
    if (value >= thresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Please select a tenant to view performance metrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Cache Performance
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Resource Usage
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(metrics.cacheHitRate, { warning: 90, critical: 85 })}`}>
                  {metrics.cacheHitRate.toFixed(1)}%
                </div>
                <Progress value={metrics.cacheHitRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: ≥95%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(metrics.avgResponseTime, { warning: 20, critical: 30 }, true)}`}>
                  {metrics.avgResponseTime.toFixed(1)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: ≤15ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.activeConnections}
                </div>
                <p className="text-xs text-muted-foreground">
                  Concurrent database connections
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(metrics.errorRate, { warning: 1, critical: 2 }, true)}`}>
                  {metrics.errorRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: ≤0.5%
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Real-time performance metrics over the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Response Time (ms)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="cacheHitRate" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Cache Hit Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance Details</CardTitle>
                <CardDescription>
                  Detailed cache performance metrics and optimization suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Hit Rate</Label>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.cacheHitRate.toFixed(1)}%
                    </div>
                    <Progress value={metrics.cacheHitRate} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total Queries</Label>
                    <div className="text-2xl font-bold">
                      {metrics.queryCount.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Last 24 hours</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Memory Usage</Label>
                    <div className="text-2xl font-bold">
                      {metrics.memoryUsage.toFixed(1)}%
                    </div>
                    <Progress value={metrics.memoryUsage} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Optimization Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Cache hit rate is performing well</p>
                      <p className="text-sm text-muted-foreground">
                        Current rate of {metrics.cacheHitRate.toFixed(1)}% exceeds the 90% threshold
                      </p>
                    </div>
                  </div>
                  
                  {metrics.avgResponseTime > 15 && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Response time could be improved</p>
                        <p className="text-sm text-muted-foreground">
                          Consider optimizing frequently accessed queries or increasing cache size
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resourceUsage.cpu.toFixed(1)}%
                  </div>
                  <Progress 
                    value={resourceUsage.cpu} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <Memory className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resourceUsage.memory.toFixed(1)}%
                  </div>
                  <Progress 
                    value={resourceUsage.memory} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resourceUsage.storage.toFixed(1)}%
                  </div>
                  <Progress 
                    value={resourceUsage.storage} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bandwidth Usage</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {resourceUsage.bandwidth.toFixed(1)}%
                  </div>
                  <Progress 
                    value={resourceUsage.bandwidth} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage Over Time</CardTitle>
                <CardDescription>
                  Track resource consumption patterns to optimize performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="connections" fill="#8884d8" name="Connections" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Advanced analytics and insights for performance optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Advanced analytics coming soon...</p>
                <p className="text-sm">
                  This will include detailed performance reports, trend analysis, and optimization recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
