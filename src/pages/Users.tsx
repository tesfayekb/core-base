
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";
import { EnhancedUserDirectory } from "@/components/user/EnhancedUserDirectory";
import { PermissionDebug } from "@/components/debug/PermissionDebug";
import { Users as UsersIcon } from "lucide-react";
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
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UsersIcon className="h-8 w-8" />
          User Management
        </h2>
        <p className="text-muted-foreground">
          Manage user accounts and access across your organization
        </p>
      </div>
      
      {/* User Directory with permission-based access */}
      <PermissionBoundary 
        action="read" 
        resource="users"
        fallback={
          <AccessFallback 
            title="User Directory Access" 
            description="Checking permissions to view users..."
          />
        }
      >
        <EnhancedUserDirectory />
      </PermissionBoundary>
    </div>
  );
}
