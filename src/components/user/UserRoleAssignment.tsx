
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Save, Shield, Users, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementService, UserRole, Permission } from '@/services/user/UserManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserRoleAssignmentProps {
  userId: string;
  tenantId: string;
  onClose: () => void;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
}

export function UserRoleAssignment({ userId, tenantId, onClose }: UserRoleAssignmentProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [previewPermissions, setPreviewPermissions] = useState<Permission[]>([]);

  // Fetch current user roles
  const { data: userRoles = [], isLoading: userRolesLoading } = useQuery({
    queryKey: ['userRoles', userId, tenantId],
    queryFn: () => userManagementService.getUserRoles(userId, tenantId),
    enabled: !!userId && !!tenantId
  });

  // Fetch available roles
  const { data: availableRoles = [] } = useQuery({
    queryKey: ['roles', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, is_system_role')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!tenantId
  });

  // Preview permissions for selected role
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['rolePermissions', selectedRoleId],
    queryFn: () => userManagementService.getRolePermissions(selectedRoleId!),
    enabled: !!selectedRoleId
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: ({ roleId }: { roleId: string }) =>
      userManagementService.assignRole(userId, roleId, tenantId, currentUser?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles', userId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: ({ roleId }: { roleId: string }) =>
      userManagementService.removeRole(userId, roleId, tenantId, currentUser?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles', userId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  const handleAssignRole = async (roleId: string) => {
    const result = await assignRoleMutation.mutateAsync({ roleId });
    if (!result.success) {
      alert(result.error || 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    const result = await removeRoleMutation.mutateAsync({ roleId });
    if (!result.success) {
      alert(result.error || 'Failed to remove role');
    }
  };

  const handlePreviewPermissions = (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  const currentRoleIds = userRoles.map(ur => ur.role_id);
  const unassignedRoles = availableRoles.filter(role => !currentRoleIds.includes(role.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Manage User Roles</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Roles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Current Roles ({userRoles.length})</span>
              </h3>
              
              {userRolesLoading ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Loading roles...</p>
                </div>
              ) : userRoles.length === 0 ? (
                <div className="text-center py-4 border rounded-lg bg-muted/50">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No roles assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userRoles.map((userRole) => (
                    <div key={userRole.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{userRole.role.name}</span>
                          <Badge variant={userRole.role.is_system_role ? "secondary" : "outline"}>
                            {userRole.role.is_system_role ? "System" : "Custom"}
                          </Badge>
                        </div>
                        {userRole.role.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {userRole.role.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewPermissions(userRole.role_id)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveRole(userRole.role_id)}
                          disabled={removeRoleMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Roles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Available Roles ({unassignedRoles.length})</h3>
              
              {unassignedRoles.length === 0 ? (
                <div className="text-center py-4 border rounded-lg bg-muted/50">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">All available roles assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedRoles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{role.name}</span>
                          <Badge variant={role.is_system_role ? "secondary" : "outline"}>
                            {role.is_system_role ? "System" : "Custom"}
                          </Badge>
                        </div>
                        {role.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {role.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewPermissions(role.id)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAssignRole(role.id)}
                          disabled={assignRoleMutation.isPending}
                        >
                          Assign
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Permission Preview */}
          {selectedRoleId && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">Permission Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {rolePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2 p-2 border rounded">
                    <span className="text-sm font-medium">{permission.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {permission.action} {permission.resource}
                    </Badge>
                  </div>
                ))}
              </div>
              {rolePermissions.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No permissions found for this role
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
