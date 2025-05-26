import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserWithRoles } from '@/services/user/UserManagementService';
import { Shield, Calendar, User, Info } from 'lucide-react';

interface UserRoleInheritanceProps {
  user: UserWithRoles;
}

export function UserRoleInheritance({ user }: UserRoleInheritanceProps) {
  const systemRoles = user.roles?.filter(role => role.is_system_role === true) || [];
  const customRoles = user.roles?.filter(role => role.is_system_role === false) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Role Inheritance Display</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Direct Assignment Model Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Direct Permission Assignment Model</p>
              <p>This system uses direct role assignment without hierarchical inheritance. Users receive the union of all permissions from their directly assigned roles.</p>
            </div>
          </div>
        </div>

        {/* System Roles */}
        {systemRoles.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>System Roles (Direct Assignment)</span>
            </h3>
            <div className="space-y-2">
              {systemRoles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="default" className="bg-blue-600">
                      {role.name}
                    </Badge>
                    <div className="text-sm">
                      <div className="font-medium">System Role</div>
                      <div className="text-muted-foreground">Protected role with system-wide permissions</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Assigned: {formatDate(role.assigned_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Roles */}
        {customRoles.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Custom Roles (Direct Assignment)</span>
            </h3>
            <div className="space-y-2">
              {customRoles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">
                      {role.name}
                    </Badge>
                    <div className="text-sm">
                      <div className="font-medium">Custom Role</div>
                      <div className="text-muted-foreground">Tenant-specific role with custom permissions</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Assigned: {formatDate(role.assigned_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Roles */}
        {(!user.roles || user.roles.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="font-medium mb-2">No Roles Assigned</h3>
            <p className="text-sm">This user has no roles assigned and will have minimal system access.</p>
          </div>
        )}

        {/* Permission Resolution Info */}
        {user.roles && user.roles.length > 1 && (
          <div className="p-3 bg-gray-50 border rounded-lg">
            <h4 className="text-sm font-medium mb-2">Permission Resolution</h4>
            <p className="text-sm text-muted-foreground">
              This user has {user.roles.length} roles assigned. Their effective permissions are the 
              <strong> union </strong> of all permissions from these directly assigned roles.
              There is no hierarchical inheritance - all permissions are explicitly granted.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
