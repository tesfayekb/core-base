
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleManager } from '@/components/rbac/RoleManager';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';

export default function Users() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      {/* User's Current Roles and Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>My Access Control</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleManager />
        </CardContent>
      </Card>

      {/* Example Permission Guards */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermissionGuard
            action="read"
            resource="users"
            fallback={<p className="text-red-500">You don't have permission to view users</p>}
          >
            <p className="text-green-500">✓ You can view users</p>
          </PermissionGuard>

          <PermissionGuard
            action="create"
            resource="users"
            fallback={<p className="text-red-500">You don't have permission to create users</p>}
          >
            <p className="text-green-500">✓ You can create users</p>
          </PermissionGuard>

          <PermissionGuard
            action="manage"
            resource="roles"
            fallback={<p className="text-red-500">You don't have permission to manage roles</p>}
          >
            <p className="text-green-500">✓ You can manage roles</p>
          </PermissionGuard>
        </CardContent>
      </Card>
    </div>
  );
}
