// Role Manager Component
// Version: 1.0.0
// Phase 1.4: RBAC Foundation

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuth } from '@/components/auth/AuthProvider';
import { Role } from '@/types/rbac';

export function RoleManager() {
  const { user } = useAuth();
  const { userRoles, userPermissions, loading, refreshData } = useRBAC();

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Please log in to view role information.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse">Loading roles...</div>
          ) : userRoles.length > 0 ? (
            <div className="space-y-2">
              {userRoles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <Badge variant={role.is_system_role ? "default" : "secondary"}>
                      {role.name}
                    </Badge>
                    {role.description && (
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {role.is_system_role ? 'System Role' : 'Custom Role'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No roles assigned</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse">Loading permissions...</div>
          ) : userPermissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {userPermissions.map((permission, index) => (
                <div key={index} className="p-2 border rounded text-sm">
                  <div className="font-medium">
                    {permission.resource}:{permission.action}
                  </div>
                  <div className="text-xs text-gray-500">
                    Source: {permission.source}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No permissions found</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={refreshData} disabled={loading}>
          Refresh Data
        </Button>
      </div>
    </div>
  );
}
