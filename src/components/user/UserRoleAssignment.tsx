
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Shield, Eye, AlertCircle } from 'lucide-react';
import { UserWithRoles } from '@/services/user/UserManagementService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionPreview } from './PermissionPreview';

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  assigned_at?: string;
}

interface UserRoleAssignmentProps {
  user: UserWithRoles;
  onClose: () => void;
}

export function UserRoleAssignment({ user, onClose }: UserRoleAssignmentProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user.roles?.map(r => r.id) || []
  );
  const [showPermissionPreview, setShowPermissionPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available roles
  const { data: availableRoles = [], isLoading: rolesLoading } = useQuery({
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

  // Role assignment mutation
  const assignRolesMutation = useMutation({
    mutationFn: async (roleIds: string[]) => {
      const currentRoleIds = user.roles?.map(r => r.id) || [];
      const rolesToAdd = roleIds.filter(id => !currentRoleIds.includes(id));
      const rolesToRemove = currentRoleIds.filter(id => !roleIds.includes(id));

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('user_roles')
          .insert(
            rolesToAdd.map(roleId => ({
              user_id: user.id,
              role_id: roleId,
              tenant_id: user.tenant_id,
              assigned_by: currentUser?.id
            }))
          );
        
        if (addError) throw addError;
      }

      // Remove old roles
      if (rolesToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('tenant_id', user.tenant_id)
          .in('role_id', rolesToRemove);
        
        if (removeError) throw removeError;
      }

      return { added: rolesToAdd.length, removed: rolesToRemove.length };
    },
    onSuccess: (result) => {
      toast({
        title: 'Roles Updated',
        description: `Successfully updated roles for ${user.email}. Added: ${result.added}, Removed: ${result.removed}`
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error) => {
      console.error('Role assignment error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user roles',
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

  const handleSubmit = async () => {
    if (!currentUser?.id) return;
    
    setIsSubmitting(true);
    try {
      await assignRolesMutation.mutateAsync(selectedRoles);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserCurrentRoles = () => {
    return availableRoles.filter(role => 
      user.roles?.some(userRole => userRole.id === role.id)
    );
  };

  const getRoleAssignmentDate = (roleId: string) => {
    const userRole = user.roles?.find(r => r.id === roleId);
    return userRole?.assigned_at ? new Date(userRole.assigned_at).toLocaleDateString() : null;
  };

  if (rolesLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <div className="text-center">Loading roles...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Manage Roles for {user.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPermissionPreview(!showPermissionPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Permissions
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                ×
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current Roles Summary */}
          <div>
            <h3 className="text-sm font-medium mb-2">Current Roles</h3>
            <div className="flex flex-wrap gap-2">
              {getUserCurrentRoles().map((role) => (
                <Badge key={role.id} variant={role.is_system_role ? 'default' : 'secondary'}>
                  <Shield className="h-3 w-3 mr-1" />
                  {role.name}
                  {role.is_system_role && ' (System)'}
                </Badge>
              ))}
              {getUserCurrentRoles().length === 0 && (
                <span className="text-sm text-muted-foreground">No roles assigned</span>
              )}
            </div>
          </div>

          {/* Role Assignment */}
          <div>
            <h3 className="text-sm font-medium mb-3">Available Roles</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {availableRoles.map((role) => {
                const isAssigned = selectedRoles.includes(role.id);
                const assignmentDate = getRoleAssignmentDate(role.id);
                
                return (
                  <label key={role.id} className="flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      checked={isAssigned}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                      disabled={role.is_system_role && role.name === 'SuperAdmin'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{role.name}</span>
                        {role.is_system_role && (
                          <Badge variant="outline" className="text-xs">
                            System Role
                          </Badge>
                        )}
                        {role.name === 'SuperAdmin' && (
                          <AlertCircle className="h-4 w-4 text-amber-500" title="Protected system role" />
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      )}
                      {assignmentDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned: {assignmentDate}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Permission Preview */}
          {showPermissionPreview && (
            <PermissionPreview 
              roleIds={selectedRoles}
              tenantId={user.tenant_id}
            />
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || assignRolesMutation.isPending}
            >
              {isSubmitting || assignRolesMutation.isPending ? 'Updating...' : 'Update Roles'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
