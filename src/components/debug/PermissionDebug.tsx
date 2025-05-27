
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { rbacService } from '@/services/rbac/rbacService';

export function PermissionDebug() {
  const { user, currentTenantId } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDebugInfo = async () => {
      if (!user || !currentTenantId) return;

      try {
        const userRoles = await rbacService.getUserRoles(user.id, currentTenantId);
        const userPermissions = await rbacService.getUserPermissions(user.id, currentTenantId);
        
        setRoles(userRoles);
        setPermissions(userPermissions);
      } catch (error) {
        console.error('Debug info load failed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDebugInfo();
  }, [user, currentTenantId]);

  if (!user) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Permission Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">User Info:</h4>
          <div className="text-sm space-y-1">
            <p>Email: {user.email}</p>
            <p>ID: {user.id}</p>
            <p>Tenant ID: {currentTenantId || 'Not set'}</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Roles ({roles.length}):</h4>
          <div className="flex flex-wrap gap-2">
            {loading ? (
              <Badge variant="outline">Loading...</Badge>
            ) : roles.length > 0 ? (
              roles.map((role, index) => (
                <Badge key={index} variant="secondary">
                  {role.name || role.id}
                </Badge>
              ))
            ) : (
              <Badge variant="destructive">No roles found</Badge>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Permissions ({permissions.length}):</h4>
          <div className="max-h-32 overflow-y-auto">
            {loading ? (
              <Badge variant="outline">Loading...</Badge>
            ) : permissions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {permissions.slice(0, 10).map((perm, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {perm.action}:{perm.resource}
                  </Badge>
                ))}
                {permissions.length > 10 && (
                  <Badge variant="outline">+{permissions.length - 10} more</Badge>
                )}
              </div>
            ) : (
              <Badge variant="destructive">No permissions found</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
