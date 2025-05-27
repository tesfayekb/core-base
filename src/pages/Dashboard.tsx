
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, Activity, Shield, Database, TrendingUp, 
  AlertTriangle, CheckCircle, Clock, Settings
} from 'lucide-react';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
  securityEvents: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

interface ActivityData {
  date: string;
  logins: number;
  registrations: number;
}

interface SecurityAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export default function Dashboard() {
  const { user, currentTenantId } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');

  // Mock data - replace with actual API calls
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics', currentTenantId, timeRange],
    queryFn: async (): Promise<DashboardMetrics> => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        totalUsers: 1247,
        activeUsers: 892,
        totalRoles: 8,
        totalPermissions: 24,
        securityEvents: 3,
        systemHealth: 'good'
      };
    },
    enabled: !!currentTenantId
  });

  const { data: activityData } = useQuery({
    queryKey: ['dashboard-activity', currentTenantId, timeRange],
    queryFn: async (): Promise<ActivityData[]> => {
      // Mock activity data
      return [
        { date: '2024-01-01', logins: 45, registrations: 12 },
        { date: '2024-01-02', logins: 52, registrations: 8 },
        { date: '2024-01-03', logins: 48, registrations: 15 },
        { date: '2024-01-04', logins: 61, registrations: 10 },
        { date: '2024-01-05', logins: 55, registrations: 18 },
        { date: '2024-01-06', logins: 67, registrations: 14 },
        { date: '2024-01-07', logins: 58, registrations: 11 }
      ];
    },
    enabled: !!currentTenantId
  });

  const { data: securityAlerts } = useQuery({
    queryKey: ['security-alerts', currentTenantId],
    queryFn: async (): Promise<SecurityAlert[]> => {
      return [
        {
          id: '1',
          type: 'warning',
          message: 'Multiple failed login attempts detected',
          timestamp: '2024-01-07T10:30:00Z'
        },
        {
          id: '2',
          type: 'info',
          message: 'New user registration from IP: 192.168.1.100',
          timestamp: '2024-01-07T09:15:00Z'
        },
        {
          id: '3',
          type: 'error',
          message: 'Database connection timeout in region us-east-1',
          timestamp: '2024-01-07T08:45:00Z'
        }
      ];
    },
    enabled: !!currentTenantId
  });

  const getHealthBadge = (health: string) => {
    const variants = {
      good: 'default',
      warning: 'secondary',
      critical: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[health as keyof typeof variants] || 'secondary'}>
        {health.charAt(0).toUpperCase() + health.slice(1)}
      </Badge>
    );
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const pieData = [
    { name: 'Active Users', value: metrics?.activeUsers || 0, color: '#0088FE' },
    { name: 'Inactive Users', value: (metrics?.totalUsers || 0) - (metrics?.activeUsers || 0), color: '#00C49F' }
  ];

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={timeRange === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('24h')}
          >
            24h
          </Button>
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7d
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30d
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalPermissions} permissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getHealthBadge(metrics?.systemHealth || 'good')}
            </div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>
                Daily login and registration activity over the past week
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Line 
                    type="monotone" 
                    dataKey="logins" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Logins"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="registrations" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Registrations"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>Active vs Inactive Users</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Monthly user registration trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Bar dataKey="registrations" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>Recent security events and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityAlerts?.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
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
