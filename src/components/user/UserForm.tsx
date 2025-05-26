
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, User } from 'lucide-react';
import { FormField } from '@/components/ui/form-field';
import { userManagementService, UserWithRoles, CreateUserRequest, UpdateUserRequest } from '@/services/user/UserManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserFormProps {
  user?: UserWithRoles | null;
  onClose: () => void;
  tenantId: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export function UserForm({ user, onClose, tenantId }: UserFormProps) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    status: 'active' as const,
    roleIds: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!tenantId
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        status: user.status as any,
        roleIds: user.roles?.map(r => r.id) || []
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!user && !formData.firstName.trim()) {
      newErrors.firstName = 'First name is required for new users';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !currentUser?.id) return;

    setIsSubmitting(true);

    try {
      if (user) {
        // Update existing user
        const updateRequest: UpdateUserRequest = {
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          status: formData.status
        };

        const result = await userManagementService.updateUser(user.id, updateRequest, currentUser.id);
        
        if (result.success) {
          onClose();
        } else {
          setErrors({ submit: result.error || 'Failed to update user' });
        }
      } else {
        // Create new user
        const createRequest: CreateUserRequest = {
          email: formData.email,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          tenantId,
          roleIds: formData.roleIds.length > 0 ? formData.roleIds : undefined
        };

        const result = await userManagementService.createUser(createRequest, currentUser.id);
        
        if (result.success) {
          onClose();
        } else {
          setErrors({ submit: result.error || 'Failed to create user' });
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>{user ? 'Edit User' : 'Create User'}</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <FormField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
              error={errors.email}
              required
              disabled={!!user} // Email cannot be changed for existing users
            />

            {/* First Name */}
            <FormField
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
              error={errors.firstName}
              required={!user}
            />

            {/* Last Name */}
            <FormField
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
              error={errors.lastName}
            />

            {/* Status (only for existing users) */}
            {user && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending_verification">Pending Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Roles</label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.roleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{role.name}</div>
                      {role.description && (
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : user ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
