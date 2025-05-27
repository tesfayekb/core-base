import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";
import { RoleManagement } from "@/components/rbac/RoleManagement";
import { PermissionMatrix } from "@/components/rbac/PermissionMatrix";
import { UserDirectory } from "@/components/user/UserDirectory";
import { PermissionDebug } from "@/components/debug/PermissionDebug";
import { Users as UsersIcon, Shield, Grid } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Users() {
  const { user } = useAuth();

  // Fallback card for when permissions are unclear
  const AccessFallback = ({ title, description }: { title: string; description: string }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          If you're an administrator and seeing this message, there may be a permission configuration issue.
        </p>
        {user && (
          <div className="text-xs text-muted-foreground">
            <p>Current user: {user.email}</p>
            <p>User ID: {user.id}</p>
          </div>
        )}
        <PermissionDebug />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">Manage users, roles, and permissions</p>
      </div>
      
      {/* User Management Interface */}

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <PermissionBoundary 
            action="read" 
            resource="users"
            fallback={
              <div className="space-y-4">
                <AccessFallback 
                  title="User Directory Access" 
                  description="Checking permissions to view users..."
                />
                {/* Show UserDirectory anyway for superadmin testing */}
                <div className="border-2 border-dashed border-yellow-300 bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-4">
                    <strong>Debug Mode:</strong> Showing UserDirectory for troubleshooting. 
                    If you can see user data below, the permission system needs configuration.
                  </p>
                  <UserDirectory />
                </div>
              </div>
            }
          >
            <UserDirectory />
          </PermissionBoundary>
        </TabsContent>

        <TabsContent value="roles">
          <PermissionBoundary 
            action="Manage" 
            resource="roles"
            fallback={
              <AccessFallback 
                title="Role Management Access Restricted" 
                description="You don't have permission to manage roles"
              />
            }
          >
            <RoleManagement />
          </PermissionBoundary>
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionBoundary 
            action="Read" 
            resource="permissions"
            fallback={
              <AccessFallback 
                title="Permission Matrix Access Restricted" 
                description="You don't have permission to view permissions"
              />
            }
          >
            <PermissionMatrix />
          </PermissionBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
