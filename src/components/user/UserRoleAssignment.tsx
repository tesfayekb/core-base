
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

  useEffect(() => {
    fetchRoles();
    // Set currently assigned roles
    if (user.user_roles) {
      setSelectedRoles(user.user_roles.map(ur => ur.role_id));
    }
  }, [user]);

  const fetchRoles = async () => {
    try {
      const { data: roles, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setAvailableRoles(roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive"
      });
    }
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    setSelectedRoles(prev => 
      checked 
        ? [...prev, roleId]
        : prev.filter(id => id !== roleId)
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {availableRoles.map((role) => (
            <div key={role.id} className="flex items-center space-x-2">
              <Checkbox
                id={role.id}
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor={role.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {role.name}
                </label>
                {role.description && (
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? 'Updating...' : 'Update Roles'}
        </Button>
      </CardContent>
    </Card>
  );
}
