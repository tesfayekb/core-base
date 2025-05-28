
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantMetrics } from "@/components/tenant/TenantMetrics";
import { SecurityStatus } from "@/components/security/SecurityStatus";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Users, Shield } from "lucide-react";

export default function Dashboard() {
  const { user, currentTenantId } = useAuth();

  // Mock data for demonstration
  const systemHealth = {
    status: "healthy" as const,
    uptime: 99.9,
    responseTime: 45,
    activeUsers: 1247
  };

  const securityAlerts = [
    {
      id: 1,
      type: "warning" as const,
      message: "Unusual login pattern detected",
      timestamp: "2 hours ago"
    },
    {
      id: 2,
      type: "info" as const,
      message: "Security policy updated",
      timestamp: "1 day ago"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back{user?.email ? `, ${user.email}` : ''}
        </p>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {getStatusIcon(systemHealth.status)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(systemHealth.status)}`}>
              {systemHealth.status === "healthy" ? "Healthy" : "Warning"}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemHealth.uptime}% uptime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.responseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center space-x-3">
                <Badge 
                  variant={alert.type === "warning" ? "destructive" : "secondary"}
                >
                  {alert.type}
                </Badge>
                <span className="flex-1">{alert.message}</span>
                <span className="text-sm text-muted-foreground">
                  {alert.timestamp}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tenant Metrics */}
      <TenantMetrics />

      {/* Security Status */}
      <SecurityStatus />
    </div>
  );
}
