
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, User } from 'lucide-react';
import { UserFormFields } from './forms/UserFormFields';
import { RoleSelection } from './forms/RoleSelection';
import { UserFormActions } from './forms/UserFormActions';
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

  // Fetch available roles with caching
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
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
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

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
            <UserFormFields
              formData={formData}
              errors={errors}
              isEditMode={!!user}
              onFieldChange={handleFieldChange}
            />

            <RoleSelection
              roles={roles}
              selectedRoleIds={formData.roleIds}
              onRoleToggle={handleRoleToggle}
            />

            <UserFormActions
              isSubmitting={isSubmitting}
              isEditMode={!!user}
              onCancel={onClose}
              submitError={errors.submit}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
