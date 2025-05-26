
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Shield, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { userManagementService, UserWithRoles } from '@/services/user/UserManagementService';
import { PermissionPreview } from './PermissionPreview';
import { toast } from 'sonner';

interface UserRoleAssignmentProps {
  user: UserWithRoles;
  onClose: () => void;
}

export function UserRoleAssignment({ user, onClose }: UserRoleAssignmentProps) {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const queryClient = useQueryClient();

  // Get current user roles
  const { data: userRoles = [], isLoading: loadingRoles, refetch: refetchRoles } = useQuery({
    queryKey: ['userRoles', user.id, user.tenant_id],
    queryFn: async () => {
      const result = await userManagementService.getUserRoles(user.id, user.tenant_id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    }
  });

  // Get available roles
  const { data: availableRoles = [], isLoading: loadingAvailableRoles } = useQuery({
    queryKey: ['availableRoles', user.tenant_id],
    queryFn: async () => {
      const result = await userManagementService.getAvailableRoles(user.tenant_id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    }
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const result = await userManagementService.assignRole(user.id, roleId, user.tenant_id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Role assigned successfully');
      refetchRoles();
      setSelectedRoleId('');
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Failed to assign role: ${error.message}`);
    }
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const result = await userManagementService.removeRole(user.id, roleId, user.tenant_id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Role removed successfully');
      refetchRoles();
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Failed to remove role: ${error.message}`);
    }
  });

  const handleAssignRole = () => {
    if (selectedRoleId) {
      assignRoleMutation.mutate(selectedRoleId);
    }
  };

  const handleRemoveRole = (roleId: string) => {
    removeRoleMutation.mutate(roleId);
  };

  const assignedRoleIds = userRoles.map(role => role.id);
  const unassignedRoles = availableRoles.filter(role => !assignedRoleIds.includes(role.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Manage Roles</h2>
            <p className="text-sm text-muted-foreground">
              {user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}` 
                : user.email}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Assign New Role */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Assign New Role</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center space-x-2">
                            <span>{role.name}</span>
                            {role.is_system_role && (
                              <Badge variant="outline" className="text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAssignRole}
                  disabled={!selectedRoleId || assignRoleMutation.isPending}
                >
                  {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
                </Button>
              </div>
              
              {unassignedRoles.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>All available roles have been assigned to this user</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Current Roles</span>
                <Badge variant="outline">
                  {userRoles.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="text-center py-4">Loading roles...</div>
              ) : userRoles.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <h3 className="font-medium mb-2">No Roles Assigned</h3>
                  <p className="text-sm">This user has no roles assigned.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userRoles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={role.is_system_role ? "default" : "secondary"}>
                          {role.name}
                        </Badge>
                        <div className="text-sm">
                          <div className="text-muted-foreground">
                            Assigned: {new Date(role.assigned_at).toLocaleDateString()}
                          </div>
                          {role.is_system_role && (
                            <div className="text-xs text-blue-600">System Role</div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRole(role.id)}
                        disabled={removeRoleMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permission Preview */}
          {userRoles.length > 0 && (
            <PermissionPreview 
              roleIds={userRoles.map(role => role.id)}
              tenantId={user.tenant_id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
