import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Shield, 
  Activity, 
  Settings, 
  Building2, 
  BarChart3,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  recentAuditEvents: number;
}

export default function Dashboard() {
  const { user, currentTenantId } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTenants: 0,
    recentAuditEvents: 0
  });

  useEffect(() => {
    // TODO: Fetch real stats from API
    setStats({
      totalUsers: 156,
      activeUsers: 89,
      totalTenants: 12,
      recentAuditEvents: 1234
    });
  }, [currentTenantId]);

  const quickActions = [
    {
      title: "User Management",
      description: "Manage users, roles and permissions",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      path: "/users",
      permission: { action: "read", resource: "users" }
    },
    {
      title: "Tenant Settings",
      description: "Configure tenant settings and features",
      icon: Building2,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      path: "/tenant-management",
      permission: { action: "read", resource: "tenants" }
    },
    {
      title: "Analytics",
      description: "View system analytics and reports",
      icon: BarChart3,
      color: "text-green-600",
      bgColor: "bg-green-100",
      path: "/analytics",
      permission: { action: "read", resource: "analytics" }
    },
    {
      title: "Audit Logs",
      description: "Review system activity and compliance",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      path: "/audit",
      permission: { action: "read", resource: "audit_logs" }
    }
  ];

  const statsCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      change: "+12%",
      changeType: "positive" as const
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: Activity,
      change: "+5%",
      changeType: "positive" as const
    },
    {
      title: "Tenants",
      value: stats.totalTenants,
      icon: Building2,
      change: "+2",
      changeType: "neutral" as const
    },
    {
      title: "Recent Events",
      value: stats.recentAuditEvents,
      icon: FileText,
      change: "Last 24h",
      changeType: "neutral" as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User'}
        </h2>
        <p className="text-muted-foreground">
          Here's what's happening in your system today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                <p className={`text-xs flex items-center ${
                  stat.changeType === 'positive' ? 'text-green-600' : 
                  stat.changeType === 'negative' ? 'text-red-600' : 
                  'text-muted-foreground'
                }`}>
                  {(stat.changeType === 'positive' || stat.changeType === 'negative') && (stat.changeType === 'positive' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1 rotate-180" />)}
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <PermissionBoundary
                key={index}
                action={action.permission.action}
                resource={action.permission.resource}
                fallback={null}
              >
                <Card 
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => navigate(action.path)}
                >
                  <CardHeader>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.bgColor} mb-2`}>
                      <Icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </PermissionBoundary>
            );
          })}
        </div>
      </div>

      {/* Recent Activity & System Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <PermissionBoundary action="read" resource="audit_logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New user registered</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Role permissions updated</p>
                    <p className="text-xs text-muted-foreground">3 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Settings className="h-4 w-4 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">System settings changed</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="link" 
                className="mt-4 p-0 h-auto"
                onClick={() => navigate('/audit')}
              >
                View all activity →
              </Button>
            </CardContent>
          </Card>
        </PermissionBoundary>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">API Services</span>
                </div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Database</span>
                </div>
                <span className="text-sm text-green-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Queue Processing</span>
                </div>
                <span className="text-sm text-yellow-600">High Load</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Authentication</span>
                </div>
                <span className="text-sm text-green-600">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
