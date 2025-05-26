
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Shield, Plus, Trash2, Eye } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userManagementService, UserRole, Role } from '@/services/user/UserManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface UserRoleAssignmentProps {
  userId: string;
  tenantId: string;
  onClose: () => void;
}

export function UserRoleAssignment({ userId, tenantId, onClose }: UserRoleAssignmentProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoleForPreview, setSelectedRoleForPreview] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch current user roles
  const { data: userRolesResult, isLoading: rolesLoading } = useQuery({
    queryKey: ['userRoles', userId, tenantId],
    queryFn: () => userManagementService.getUserRoles(userId, tenantId),
    enabled: !!userId && !!tenantId
  });

  // Fetch available roles
  const { data: availableRolesResult, isLoading: availableRolesLoading } = useQuery({
    queryKey: ['availableRoles', tenantId],
    queryFn: () => userManagementService.getAvailableRoles(tenantId),
    enabled: !!tenantId
  });

  // Fetch permissions for selected role
  const { data: rolePermissionsResult } = useQuery({
    queryKey: ['rolePermissions', selectedRoleForPreview, tenantId],
    queryFn: () => userManagementService.getRolePermissions(selectedRoleForPreview!, tenantId),
    enabled: !!selectedRoleForPreview && !!tenantId
  });

  const userRoles = userRolesResult?.success ? userRolesResult.data || [] : [];
  const availableRoles = availableRolesResult?.success ? availableRolesResult.data || [] : [];
  const rolePermissions = rolePermissionsResult?.success ? rolePermissionsResult.data || [] : [];

  // Filter out roles already assigned to user
  const assignedRoleIds = userRoles.map(ur => ur.role_id);
  const unassignedRoles = availableRoles.filter(role => !assignedRoleIds.includes(role.id));

  const handleAssignRole = async (roleId: string) => {
    if (!currentUser?.id) return;

    setIsAssigning(true);
    try {
      const result = await userManagementService.assignRole(userId, roleId, tenantId, currentUser.id);
      
      if (result.success) {
        toast({
          title: "Role Assigned",
          description: "Role has been successfully assigned to the user.",
        });
        
        // Refresh the data
        queryClient.invalidateQueries({ queryKey: ['userRoles', userId, tenantId] });
        queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      } else {
        toast({
          title: "Assignment Failed",
          description: result.error || "Failed to assign role",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      const result = await userManagementService.removeRole(userId, roleId, tenantId);
      
      if (result.success) {
        toast({
          title: "Role Removed",
          description: "Role has been successfully removed from the user.",
        });
        
        // Refresh the data
        queryClient.invalidateQueries({ queryKey: ['userRoles', userId, tenantId] });
        queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      } else {
        toast({
          title: "Removal Failed",
          description: result.error || "Failed to remove role",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Removal Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  if (rolesLoading || availableRolesLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading role data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          {/* Current Roles */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Roles</h3>
            {userRoles.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No roles assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userRoles.map((userRole) => (
                  <div key={userRole.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant={userRole.role.is_system_role ? "secondary" : "default"}>
                        {userRole.role.name}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {userRole.role.description && (
                          <div>{userRole.role.description}</div>
                        )}
                        <div>Assigned: {new Date(userRole.assigned_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRoleForPreview(userRole.role_id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      {!userRole.role.is_system_role && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRole(userRole.role_id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Roles */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Available Roles</h3>
            {unassignedRoles.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>All available roles have been assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedRoles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant={role.is_system_role ? "secondary" : "outline"}>
                        {role.name}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {role.description}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRoleForPreview(role.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAssignRole(role.id)}
                        disabled={isAssigning}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permission Preview */}
          {selectedRoleForPreview && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Role Permissions Preview</h3>
              <Card>
                <CardContent className="pt-4">
                  {rolePermissions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No permissions assigned to this role
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {rolePermissions.map((permission, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{permission.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {permission.action} on {permission.resource}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedRoleForPreview(null)}
                    >
                      Close Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
