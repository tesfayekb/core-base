
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";

export default function Dashboard() {
  const { user, tenantId } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome to your enterprise dashboard</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PermissionBoundary 
          action="Read" 
          resource="dashboard"
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Access Restricted</CardTitle>
                <CardDescription>You don't have permission to view dashboard metrics</CardDescription>
              </CardHeader>
            </Card>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Current system status and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active Users: 142</div>
              <p className="text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
        </PermissionBoundary>
        
        <PermissionBoundary 
          action="Read" 
          resource="users"
          fallback={null}
        >
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Total Users: 1,247</div>
              <p className="text-muted-foreground">Across {tenantId ? '1' : 'multiple'} tenant(s)</p>
            </CardContent>
          </Card>
        </PermissionBoundary>
        
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Current user information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Email:</strong> {user?.email || 'Not authenticated'}</p>
              <p><strong>Tenant:</strong> {tenantId || 'No tenant'}</p>
              <p><strong>Status:</strong> {user ? 'Active' : 'Inactive'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
