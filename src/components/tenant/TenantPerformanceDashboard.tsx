
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { TenantPerformanceMonitor } from '@/services/performance/TenantPerformanceMonitor';
import { 
  Database, 
  Clock, 
  Users, 
  Zap, 
  AlertTriangle, 
  TrendingUp,
  Activity,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface PerformanceMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  requestsPerMinute: number;
  errorRate: number;
  activeUsers: number;
}

interface TenantAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric?: string;
  value?: number;
  threshold?: number;
}

export function TenantPerformanceDashboard() {
  const { tenantId } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHitRate: 0,
    avgResponseTime: 0,
    activeConnections: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    requestsPerMinute: 0,
    errorRate: 0,
    activeUsers: 0
  });
  
  const [alerts, setAlerts] = useState<TenantAlert[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [tenantId, autoRefresh]);

  const loadMetrics = async () => {
    if (!tenantId) return;
    
    try {
      // Simulate loading tenant-specific metrics
      const mockMetrics: PerformanceMetrics = {
        cacheHitRate: 85 + Math.random() * 15,
        avgResponseTime: 8 + Math.random() * 12,
        activeConnections: Math.floor(150 + Math.random() * 100),
        memoryUsage: 45 + Math.random() * 30,
        cpuUsage: 25 + Math.random() * 40,
        requestsPerMinute: Math.floor(800 + Math.random() * 400),
        errorRate: Math.random() * 2,
        activeUsers: Math.floor(45 + Math.random() * 55)
      };
      
      setMetrics(mockMetrics);
      
      // Generate mock alerts based on metrics
      const newAlerts: TenantAlert[] = [];
      
      if (mockMetrics.cacheHitRate < 90) {
        newAlerts.push({
          id: `alert-${Date.now()}-cache`,
          type: 'warning',
          message: `Cache hit rate below 90%: ${mockMetrics.cacheHitRate.toFixed(1)}%`,
          timestamp: Date.now(),
          metric: 'cacheHitRate',
          value: mockMetrics.cacheHitRate,
          threshold: 90
        });
      }
      
      if (mockMetrics.avgResponseTime > 15) {
        newAlerts.push({
          id: `alert-${Date.now()}-response`,
          type: 'error',
          message: `Response time exceeds 15ms: ${mockMetrics.avgResponseTime.toFixed(1)}ms`,
          timestamp: Date.now(),
          metric: 'avgResponseTime',
          value: mockMetrics.avgResponseTime,
          threshold: 15
        });
      }
      
      if (mockMetrics.memoryUsage > 80) {
        newAlerts.push({
          id: `alert-${Date.now()}-memory`,
          type: 'warning',
          message: `High memory usage: ${mockMetrics.memoryUsage.toFixed(1)}%`,
          timestamp: Date.now(),
          metric: 'memoryUsage',
          value: mockMetrics.memoryUsage,
          threshold: 80
        });
      }
      
      setAlerts(newAlerts);
      
      // Generate historical data for charts
      const now = Date.now();
      const historical = Array.from({ length: 24 }, (_, i) => ({
        time: new Date(now - (23 - i) * 60 * 60 * 1000).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        cacheHitRate: Math.max(80, mockMetrics.cacheHitRate + (Math.random() - 0.5) * 10),
        responseTime: Math.max(5, mockMetrics.avgResponseTime + (Math.random() - 0.5) * 8),
        activeUsers: Math.max(10, mockMetrics.activeUsers + (Math.random() - 0.5) * 20),
        requestsPerMinute: Math.max(100, mockMetrics.requestsPerMinute + (Math.random() - 0.5) * 200)
      }));
      
      setHistoricalData(historical);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load tenant metrics:', error);
      setLoading(false);
    }
  };

  const getMetricColor = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    return isGood ? 'text-green-600' : value > threshold * 0.8 ? 'text-yellow-600' : 'text-red-600';
  };

  const getProgressColor = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    if (isGood) return 'bg-green-500';
    return value > threshold * 0.8 ? 'bg-yellow-500' : 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">Real-time tenant performance monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button onClick={loadMetrics} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.type === 'error' ? 'destructive' : 'default'}>
                      {alert.type}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricColor(metrics.cacheHitRate, 90)}`}>
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <Progress 
              value={metrics.cacheHitRate} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
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
            <div className={`text-2xl font-bold ${getMetricColor(metrics.avgResponseTime, 15, true)}`}>
              {metrics.avgResponseTime.toFixed(1)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Target: <15ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Current session count
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricColor(metrics.memoryUsage, 80, true)}`}>
              {metrics.memoryUsage.toFixed(1)}%
            </div>
            <Progress 
              value={metrics.memoryUsage} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Allocated memory usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Rate Trend</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="cacheHitRate" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.cpuUsage, 80, true)}`}>
                  {metrics.cpuUsage.toFixed(1)}%
                </div>
                <Progress value={metrics.cpuUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Requests/Min</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.requestsPerMinute.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current throughput
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.errorRate, 1, true)}`}>
                  {metrics.errorRate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: <1%
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization</CardTitle>
              <CardDescription>Current resource usage across different components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Database Connections</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics.activeConnections}/500
                    </span>
                  </div>
                  <Progress value={(metrics.activeConnections / 500) * 100} />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics.memoryUsage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.memoryUsage} />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics.cpuUsage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.cpuUsage} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>Active users over the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="activeUsers" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
