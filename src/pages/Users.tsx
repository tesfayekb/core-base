
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";

export default function Users() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Manage user accounts and permissions</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            User management with RBAC permission boundaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PermissionBoundary 
              action="Read" 
              resource="users"
              fallback={<p className="text-muted-foreground">You don't have permission to view users</p>}
            >
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">User list will be displayed here</p>
              </div>
            </PermissionBoundary>
            
            <PermissionBoundary 
              action="Create" 
              resource="users"
              fallback={null}
            >
              <Button>Add New User</Button>
            </PermissionBoundary>
            
            <PermissionBoundary 
              action="Manage" 
              resource="roles"
              fallback={null}
            >
              <Button variant="outline">Manage Roles</Button>
            </PermissionBoundary>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
