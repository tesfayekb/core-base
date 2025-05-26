
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Key, AlertTriangle } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

interface RolePermission {
  role_name: string;
  permission: Permission;
}

interface PermissionPreviewProps {
  roleIds: string[];
  tenantId: string;
}

export function PermissionPreview({ roleIds, tenantId }: PermissionPreviewProps) {
  const { data: rolePermissions = [], isLoading } = useQuery({
    queryKey: ['rolePermissions', roleIds, tenantId],
    queryFn: async () => {
      if (roleIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          role_id,
          roles!inner(name),
          permissions!inner(
            id,
            name,
            resource,
            action,
            description
          )
        `)
        .eq('tenant_id', tenantId)
        .in('role_id', roleIds);
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        role_name: item.roles.name,
        permission: item.permissions
      })) as RolePermission[];
    },
    enabled: roleIds.length > 0 && !!tenantId
  });

  const getUniquePermissions = (): Permission[] => {
    const permissionMap = new Map<string, Permission>();
    
    rolePermissions.forEach(rp => {
      permissionMap.set(rp.permission.id, rp.permission);
    });
    
    return Array.from(permissionMap.values()).sort((a, b) => 
      `${a.resource}:${a.action}`.localeCompare(`${b.resource}:${b.action}`)
    );
  };

  const getPermissionSources = (permissionId: string): string[] => {
    return rolePermissions
      .filter(rp => rp.permission.id === permissionId)
      .map(rp => rp.role_name);
  };

  const groupPermissionsByResource = () => {
    const permissions = getUniquePermissions();
    const grouped = new Map<string, Permission[]>();
    
    permissions.forEach(permission => {
      const resource = permission.resource;
      if (!grouped.has(resource)) {
        grouped.set(resource, []);
      }
      grouped.get(resource)!.push(permission);
    });
    
    return grouped;
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'manage': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Permission Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading permissions...</div>
        </CardContent>
      </Card>
    );
  }

  const uniquePermissions = getUniquePermissions();
  const groupedPermissions = groupPermissionsByResource();

  if (uniquePermissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Permission Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No permissions will be granted with selected roles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>Permission Preview</span>
          <Badge variant="outline" className="ml-2">
            {uniquePermissions.length} permissions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {Array.from(groupedPermissions.entries()).map(([resource, permissions]) => (
            <div key={resource} className="space-y-2">
              <h4 className="font-medium text-sm flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="capitalize">{resource}</span>
              </h4>
              <div className="space-y-2 pl-6">
                {permissions.map((permission) => {
                  const sources = getPermissionSources(permission.id);
                  
                  return (
                    <div key={permission.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${getActionColor(permission.action)}`}>
                          {permission.action}
                        </Badge>
                        <span>{permission.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-muted-foreground">from:</span>
                        {sources.map((source, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Direct Permission Assignment:</strong> This system uses direct permission assignment where users receive the union of all permissions from their assigned roles.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
