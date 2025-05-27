
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { userManagementService, CreateUserRequest, UpdateUserRequest } from '@/services/user/UserManagementService';
import { rbacService, Role } from '@/services/rbac/rbacService';
import { User, Mail, Shield, Save, X } from 'lucide-react';

const userFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  status: z.enum(['active', 'inactive', 'suspended', 'pending_verification']),
  roleIds: z.array(z.string()).optional()
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  userId?: string;
  tenantId: string;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UserForm({ userId, tenantId, onSubmit, onCancel, isLoading }: UserFormProps) {
  const { toast } = useToast();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      status: 'active',
      roleIds: []
    }
  });

  // Load available roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', tenantId],
    queryFn: async () => {
      const result = await rbacService.getRoles(tenantId);
      return result || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000 // Updated from cacheTime
  });

  // Load user data if editing
  useEffect(() => {
    if (userId && tenantId) {
      loadUserData();
    }
  }, [userId, tenantId]);

  const loadUserData = async () => {
    if (!userId) return;

    try {
      const result = await userManagementService.getUser(userId);
      if (result.success && result.data) {
        const user = result.data;
        form.reset({
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email,
          status: user.status,
          roleIds: user.roles?.map(r => r.role.id) || []
        });
        setSelectedRoles(user.roles?.map(r => r.role.id) || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (data: UserFormData) => {
    try {
      const submitData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        status: data.status,
        tenantId,
        roleIds: selectedRoles
      };

      await onSubmit(submitData);
      
      toast({
        title: 'Success',
        description: userId ? 'User updated successfully' : 'User created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive'
      });
    }
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, roleId]);
    } else {
      setSelectedRoles(prev => prev.filter(id => id !== roleId));
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>{userId ? 'Edit User' : 'Create New User'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending_verification">Pending Verification</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Assignment */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center space-x-1">
                <Shield className="h-4 w-4" />
                <span>Roles</span>
              </label>
              {rolesLoading ? (
                <div className="text-sm text-gray-500">Loading roles...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={role.id}
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                      />
                      <label
                        htmlFor={role.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {role.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-6">
              <Button type="submit" disabled={isLoading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : (userId ? 'Update User' : 'Create User')}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
