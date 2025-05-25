
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";
import { RoleManagement } from "@/components/rbac/RoleManagement";
import { PermissionMatrix } from "@/components/rbac/PermissionMatrix";
import { Users as UsersIcon, Shield, Grid } from "lucide-react";

export default function Users() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">Manage users, roles, and permissions</p>
      </div>
      
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
          <Card>
            <CardHeader>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>View and manage user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>User management interface coming soon...</p>
                <p className="text-sm">This will include user creation, editing, and account management.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <PermissionBoundary 
            action="Manage" 
            resource="roles"
            fallback={
              <Card>
                <CardHeader>
                  <CardTitle>Access Restricted</CardTitle>
                  <CardDescription>You don't have permission to manage roles</CardDescription>
                </CardHeader>
              </Card>
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
              <Card>
                <CardHeader>
                  <CardTitle>Access Restricted</CardTitle>
                  <CardDescription>You don't have permission to view permissions</CardDescription>
                </CardHeader>
              </Card>
            }
          >
            <PermissionMatrix />
          </PermissionBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
