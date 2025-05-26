
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, Eye, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
}

interface UserRole {
  id: string;
  role_id: string;
  assigned_at: string;
  expires_at?: string;
  role: Role;
}

interface UserRoleAssignmentProps {
  userId: string;
  tenantId: string;
  onClose?: () => void;
}

export function UserRoleAssignment({ userId, tenantId, onClose }: UserRoleAssignmentProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showPermissionPreview, setShowPermissionPreview] = useState(false);

  // Fetch user's current roles
  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', userId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          role_id,
          assigned_at,
          expires_at,
          roles!inner(
            id,
            name,
            description,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return data.map(ur => ({
        id: ur.id,
        role_id: ur.role_id,
        assigned_at: ur.assigned_at,
        expires_at: ur.expires_at,
        role: ur.roles
      })) as UserRole[];
    },
    enabled: !!userId && !!tenantId
  });

  // Fetch available roles
  const { data: availableRoles = [] } = useQuery({
    queryKey: ['availableRoles', tenantId],
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

  // Fetch permissions for selected roles (for preview)
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['rolePermissions', selectedRoles],
    queryFn: async () => {
      if (selectedRoles.length === 0) return [];
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permissions!inner(
            id,
            name,
            resource,
            action
          )
        `)
        .in('role_id', selectedRoles);
      
      if (error) throw error;
      return data.map(rp => rp.permissions);
    },
    enabled: selectedRoles.length > 0 && showPermissionPreview
  });

  const assignRolesMutation = useMutation({
    mutationFn: async (roleIds: string[]) => {
      const assignments = roleIds.map(roleId => ({
        user_id: userId,
        tenant_id: tenantId,
        role_id: roleId,
        assigned_by: currentUser?.id
      }));

      const { error } = await supabase
        .from('user_roles')
        .insert(assignments);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles', userId, tenantId] });
      toast({
        title: 'Success',
        description: 'Roles assigned successfully'
      });
      setSelectedRoles([]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to assign roles',
        variant: 'destructive'
      });
      console.error('Role assignment error:', error);
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (userRoleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles', userId, tenantId] });
      toast({
        title: 'Success',
        description: 'Role removed successfully'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove role',
        variant: 'destructive'
      });
      console.error('Role removal error:', error);
    }
  });

  const currentRoleIds = userRoles.map(ur => ur.role_id);
  const unassignedRoles = availableRoles.filter(role => !currentRoleIds.includes(role.id));

  const handleRoleSelection = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, roleId]);
    } else {
      setSelectedRoles(prev => prev.filter(id => id !== roleId));
    }
  };

  const handleAssignRoles = () => {
    if (selectedRoles.length > 0) {
      assignRolesMutation.mutate(selectedRoles);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Role Assignment</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Current Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Current Roles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userRoles.length > 0 ? (
            <div className="space-y-2">
              {userRoles.map((userRole) => (
                <div key={userRole.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Badge variant={userRole.role.is_system_role ? "secondary" : "default"}>
                      {userRole.role.name}
                    </Badge>
                    {userRole.role.description && (
                      <span className="text-sm text-muted-foreground">
                        {userRole.role.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      Assigned: {new Date(userRole.assigned_at).toLocaleDateString()}
                    </span>
                    {!userRole.role.is_system_role && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeRoleMutation.mutate(userRole.id)}
                        disabled={removeRoleMutation.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No roles assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Available Roles */}
      {unassignedRoles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unassignedRoles.map((role) => (
                <div key={role.id} className="flex items-center space-x-3 p-2 border rounded">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={(checked) => handleRoleSelection(role.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <label htmlFor={`role-${role.id}`} className="flex items-center space-x-2 cursor-pointer">
                      <Badge variant={role.is_system_role ? "secondary" : "default"}>
                        {role.name}
                      </Badge>
                      {role.description && (
                        <span className="text-sm text-muted-foreground">
                          {role.description}
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {selectedRoles.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPermissionPreview(!showPermissionPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPermissionPreview ? 'Hide' : 'Preview'} Permissions
                </Button>
                <Button
                  onClick={handleAssignRoles}
                  disabled={assignRolesMutation.isPending}
                >
                  Assign Selected Roles ({selectedRoles.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permission Preview */}
      {showPermissionPreview && selectedRoles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Permission Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {rolePermissions.length > 0 ? (
              <div className="space-y-2">
                {rolePermissions.map((permission, index) => (
                  <Badge key={index} variant="outline" className="mr-2 mb-2">
                    {permission.resource}:{permission.action}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading permissions...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
