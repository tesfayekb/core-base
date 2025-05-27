
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { rbacService, Permission } from '@/services/rbac/rbacService';
import { Grid, Check, X } from 'lucide-react';

interface PermissionMatrixData {
  resource: string;
  actions: {
    [action: string]: boolean;
  };
}

export function PermissionMatrix() {
  const { user, currentTenantId } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [matrixData, setMatrixData] = useState<PermissionMatrixData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserPermissions();
  }, [user, currentTenantId]);

  const loadUserPermissions = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const userPermissions = await rbacService.getUserPermissions(user.id, currentTenantId || undefined);
      setPermissions(userPermissions);
      
      // Transform permissions into matrix format
      const matrix = transformToMatrix(userPermissions);
      setMatrixData(matrix);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const transformToMatrix = (permissions: Permission[]): PermissionMatrixData[] => {
    const resources = ['users', 'documents', 'settings', 'roles', 'audit', 'dashboard'];
    const actions = ['Read', 'Create', 'Update', 'Delete', 'Manage'];

    return resources.map(resource => {
      const resourcePermissions = permissions.filter(p => 
        p.resource === resource || p.action?.includes(resource)
      );

      const actionMap: { [action: string]: boolean } = {};
      actions.forEach(action => {
        actionMap[action] = resourcePermissions.some(p => 
          p.action === action || p.action === 'Manage'
        );
      });

      return {
        resource,
        actions: actionMap
      };
    });
  };

  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid className="h-5 w-5" />
          Permission Matrix
        </CardTitle>
        <CardDescription>
          Current permissions for {user?.email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>Create</TableHead>
                <TableHead>Update</TableHead>
                <TableHead>Delete</TableHead>
                <TableHead>Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.map(row => (
                <TableRow key={row.resource}>
                  <TableCell className="font-medium capitalize">
                    {row.resource}
                  </TableCell>
                  <TableCell>{getPermissionIcon(row.actions.Read)}</TableCell>
                  <TableCell>{getPermissionIcon(row.actions.Create)}</TableCell>
                  <TableCell>{getPermissionIcon(row.actions.Update)}</TableCell>
                  <TableCell>{getPermissionIcon(row.actions.Delete)}</TableCell>
                  <TableCell>{getPermissionIcon(row.actions.Manage)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {permissions.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            No permissions found
          </div>
        )}

        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Permission Summary</h4>
          <div className="flex flex-wrap gap-2">
            {permissions.map((permission, index) => (
              <Badge key={index} variant="outline">
                {permission.action}:{permission.resource}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
