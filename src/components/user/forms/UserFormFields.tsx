
import React from 'react';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserFormFieldsProps {
  formData: {
    email: string;
    firstName: string;
    lastName: string;
    status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  };
  errors: Record<string, string>;
  isEditMode: boolean;
  onFieldChange: (field: string, value: string) => void;
}

export function UserFormFields({ formData, errors, isEditMode, onFieldChange }: UserFormFieldsProps) {
  return (
    <>
      {/* Email Field */}
      <FormField
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={(value) => onFieldChange('email', value)}
        error={errors.email}
        required
        disabled={isEditMode} // Email cannot be changed for existing users
      />

      {/* First Name */}
      <FormField
        label="First Name"
        name="firstName"
        value={formData.firstName}
        onChange={(value) => onFieldChange('firstName', value)}
        error={errors.firstName}
        required={!isEditMode}
      />

      {/* Last Name */}
      <FormField
        label="Last Name"
        name="lastName"
        value={formData.lastName}
        onChange={(value) => onFieldChange('lastName', value)}
        error={errors.lastName}
      />

      {/* Status (only for existing users) */}
      {isEditMode && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={formData.status} onValueChange={(value: any) => onFieldChange('status', value)}>
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
    </>
  );
}
