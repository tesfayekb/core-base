
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserManagementService } from '@/services/user/UserManagementService';
import { UserWithRoles } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface UserRoleAssignmentProps {
  user: UserWithRoles;
  tenantId: string;
  onSuccess?: () => void;
}

export function UserRoleAssignment({ user, tenantId, onSuccess }: UserRoleAssignmentProps) {
  const { toast } = useToast();
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRoles, setFetchingRoles] = useState(true);

  useEffect(() => {
    fetchRoles();
    // Set currently assigned roles
    if (user.user_roles) {
      const currentRoleIds = user.user_roles.map(ur => ur.role_id);
      setSelectedRoles(currentRoleIds);
      console.log('Current user roles:', user.user_roles);
      console.log('Setting selected roles to:', currentRoleIds);
    }
  }, [user]);

  const fetchRoles = async () => {
    try {
      setFetchingRoles(true);
      console.log('Fetching roles for tenant:', tenantId);
      
      const { data: roles, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }
      
      console.log('Available roles:', roles);
      setAvailableRoles(roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive"
      });
    } finally {
      setFetchingRoles(false);
    }
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    console.log('Toggling role:', roleId, 'checked:', checked);
    setSelectedRoles(prev => {
      const newSelection = checked 
        ? [...prev, roleId]
        : prev.filter(id => id !== roleId);
      console.log('New role selection:', newSelection);
      return newSelection;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      console.log('Submitting role assignment:', {
        userId: user.id,
        selectedRoles,
        tenantId
      });
      
      await UserManagementService.assignRoles(user.id, selectedRoles, tenantId);
      
      toast({
        title: "Success",
        description: "User roles updated successfully"
      });
      onSuccess?.();
    } catch (error) {
      console.error('Error updating roles:', error);
      toast({
        title: "Error",
        description: "Failed to update user roles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingRoles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Roles...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Roles to {user.email}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Current roles: {user.user_roles?.map(ur => ur.roles?.name).join(', ') || 'None'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {availableRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles available for this tenant.</p>
          ) : (
            availableRoles.map((role) => {
              const isSelected = selectedRoles.includes(role.id);
              const isCurrentRole = user.user_roles?.some(ur => ur.role_id === role.id);
              
              return (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={role.id}
                    checked={isSelected}
                    onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={role.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.name}
                      {isCurrentRole && (
                        <span className="ml-2 text-xs text-green-600">(Currently assigned)</span>
                      )}
                    </label>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? 'Updating...' : 'Update Roles'}
          </Button>
          <Button variant="outline" onClick={() => onSuccess?.()} disabled={loading}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
