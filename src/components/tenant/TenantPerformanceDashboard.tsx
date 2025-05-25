
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  Clock, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Zap,
  BarChart3
} from 'lucide-react';

interface TenantMetrics {
  tenantId: string;
  cacheHitRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  activeUsers: number;
  requestCount: number;
  errorRate: number;
}

interface PerformanceData {
  timestamp: string;
  responseTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  activeUsers: number;
}

interface ResourceUsage {
  category: string;
  usage: number;
  limit: number;
  percentage: number;
}

interface AlertData {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

export function TenantPerformanceDashboard() {
  const [selectedTenant, setSelectedTenant] = useState<string>('tenant-1');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantMetrics();
    loadPerformanceData();
    loadResourceUsage();
    loadAlerts();
  }, [selectedTenant, timeRange]);

  const loadTenantMetrics = async () => {
    try {
      // Simulate API call
      const mockMetrics: TenantMetrics = {
        tenantId: selectedTenant,
        cacheHitRate: 94.5,
        avgResponseTime: 12.3,
        memoryUsage: 67.8,
        activeUsers: 142,
        requestCount: 15847,
        errorRate: 0.12
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load tenant metrics:', error);
    }
  };

  const loadPerformanceData = async () => {
    try {
      // Generate mock time series data
      const now = new Date();
      const data: PerformanceData[] = Array.from({ length: 24 }, (_, i) => {
        const timestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        return {
          timestamp: timestamp.toISOString().slice(11, 16),
          responseTime: Math.random() * 20 + 5,
          cacheHitRate: Math.random() * 10 + 90,
          memoryUsage: Math.random() * 20 + 60,
          activeUsers: Math.floor(Math.random() * 50 + 100)
        };
      });
      setPerformanceData(data);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  };

  const loadResourceUsage = async () => {
    try {
      const mockResourceUsage: ResourceUsage[] = [
        { category: 'Memory', usage: 6.8, limit: 10, percentage: 68 },
        { category: 'CPU', usage: 3.2, limit: 8, percentage: 40 },
        { category: 'Storage', usage: 45.6, limit: 100, percentage: 46 },
        { category: 'Bandwidth', usage: 12.3, limit: 50, percentage: 25 },
        { category: 'API Calls', usage: 15847, limit: 50000, percentage: 32 }
      ];
      setResourceUsage(mockResourceUsage);
    } catch (error) {
      console.error('Failed to load resource usage:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const mockAlerts: AlertData[] = [
        {
          id: '1',
          type: 'warning',
          message: 'Cache hit rate below 95% threshold',
          timestamp: '10:30 AM'
        },
        {
          id: '2',
          type: 'info',
          message: 'Performance optimization completed',
          timestamp: '09:15 AM'
        }
      ];
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'text-green-600';
    if (value >= threshold * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pieData = resourceUsage.map((item, index) => ({
    name: item.category,
    value: item.percentage,
    color: [
      '#8884d8',
      '#82ca9d', 
      '#ffc658',
      '#ff7300',
      '#00ff00'
    ][index % 5]
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenant Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor performance metrics and resource usage for tenant: {selectedTenant}
          </p>
        </div>
        <div className="flex gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={() => window.location.reload()} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id}>
              <div className="flex items-center gap-2">
                {getAlertIcon(alert.type)}
                <AlertDescription>
                  {alert.message} - {alert.timestamp}
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {metrics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getStatusColor(metrics.cacheHitRate, 95)}`}>
                {metrics.cacheHitRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Target: 95%+
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getStatusColor(50 - metrics.avgResponseTime, 35)}`}>
                {metrics.avgResponseTime.toFixed(1)}ms
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &lt;15ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getStatusColor(100 - metrics.memoryUsage, 20)}`}>
                {metrics.memoryUsage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &lt;80%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.activeUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Real-time count
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance Trends
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resource Usage
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
                <CardDescription>
                  Average response times over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}ms`, 'Response Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>
                  Cache hit rate percentage over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[85, 100]} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Hit Rate']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cacheHitRate" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage Overview</CardTitle>
                <CardDescription>
                  Current resource consumption across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resourceUsage.map((resource) => (
                    <div key={resource.category} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{resource.category}</span>
                        <span className="text-sm text-muted-foreground">
                          {resource.category === 'API Calls' 
                            ? `${resource.usage.toLocaleString()} / ${resource.limit.toLocaleString()}`
                            : `${resource.usage} / ${resource.limit} GB`
                          }
                        </span>
                      </div>
                      <Progress value={resource.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {resource.percentage}% utilized
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Distribution</CardTitle>
                <CardDescription>
                  Percentage breakdown of resource usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Optimization Recommendations</CardTitle>
                <CardDescription>
                  AI-powered suggestions to improve tenant performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Cache Optimization</Badge>
                      <span className="text-sm text-green-600">High Impact</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Consider implementing cache warming for frequently accessed permissions. 
                      Current hit rate of 94.5% could be improved to 98%+ with optimized warming strategies.
                    </p>
                    <Button size="sm" className="mt-2">Apply Optimization</Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Memory Management</Badge>
                      <span className="text-sm text-yellow-600">Medium Impact</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Memory usage is at 67.8%. Consider implementing LRU eviction policies 
                      and optimizing permission object structures to reduce memory footprint.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Schedule Optimization
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Query Optimization</Badge>
                      <span className="text-sm text-blue-600">Low Impact</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Database query patterns show room for improvement. Consider adding 
                      composite indexes for tenant-specific permission lookups.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Review Queries
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
