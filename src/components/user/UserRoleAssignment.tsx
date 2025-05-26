
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Save, UserCog, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserWithRoles, userManagementService } from '@/services/user/UserManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PermissionPreview } from './PermissionPreview';

interface UserRoleAssignmentProps {
  user: UserWithRoles;
  onClose: () => void;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
}

export function UserRoleAssignment({ user, onClose }: UserRoleAssignmentProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user.roles?.map(r => r.id) || []
  );

  // Fetch available roles
  const { data: allRoles = [] } = useQuery({
    queryKey: ['roles', user.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, is_system_role')
        .eq('tenant_id', user.tenant_id)
        .order('name');
      
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!user.tenant_id
  });

  // Fetch current user roles for comparison
  const { data: currentRoles = [] } = useQuery({
    queryKey: ['userRoles', user.id, user.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          assigned_at,
          roles!inner(
            id,
            name,
            is_system_role
          )
        `)
        .eq('user_id', user.id)
        .eq('tenant_id', user.tenant_id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user.id && !!user.tenant_id
  });

  // Role assignment mutation
  const assignRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      if (!currentUser?.id) throw new Error('No current user');
      
      return userManagementService.assignRole(
        user.id,
        roleId,
        user.tenant_id,
        currentUser.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles', user.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'Role assigned successfully'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign role',
        variant: 'destructive'
      });
    }
  });

  // Role removal mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      if (!currentUser?.id) throw new Error('No current user');
      
      return userManagementService.removeRole(
        user.id,
        roleId,
        user.tenant_id,
        currentUser.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles', user.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'Role removed successfully'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove role',
        variant: 'destructive'
      });
    }
  });

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSaveChanges = async () => {
    if (!currentUser?.id) return;

    const currentRoleIds = currentRoles.map(r => r.role_id);
    const rolesToAdd = selectedRoles.filter(id => !currentRoleIds.includes(id));
    const rolesToRemove = currentRoleIds.filter(id => !selectedRoles.includes(id));

    try {
      // Add new roles
      for (const roleId of rolesToAdd) {
        await assignRoleMutation.mutateAsync(roleId);
      }

      // Remove unselected roles
      for (const roleId of rolesToRemove) {
        await removeRoleMutation.mutateAsync(roleId);
      }

      onClose();
    } catch (error) {
      console.error('Error saving role changes:', error);
    }
  };

  const systemRoles = allRoles.filter(role => role.is_system_role);
  const customRoles = allRoles.filter(role => !role.is_system_role);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex">
          {/* Left Panel - Role Assignment */}
          <div className="flex-1 p-6 border-r">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <UserCog className="h-5 w-5" />
                  <span>Manage User Roles</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name} (${user.email})`
                    : user.email
                  }
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* System Roles */}
              {systemRoles.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>System Roles</span>
                  </h3>
                  <div className="space-y-2">
                    {systemRoles.map((role) => (
                      <label key={role.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{role.name}</span>
                            <Badge variant="outline" className="text-xs">System</Badge>
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Roles */}
              {customRoles.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Custom Roles</span>
                  </h3>
                  <div className="space-y-2">
                    {customRoles.map((role) => (
                      <label key={role.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{role.name}</span>
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* No Roles */}
              {allRoles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <h3 className="font-medium mb-2">No Roles Available</h3>
                  <p className="text-sm">Create roles first to assign them to users.</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveChanges}
                disabled={assignRoleMutation.isPending || removeRoleMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {assignRoleMutation.isPending || removeRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Right Panel - Permission Preview */}
          <div className="w-96 bg-gray-50">
            <PermissionPreview 
              roleIds={selectedRoles}
              tenantId={user.tenant_id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
