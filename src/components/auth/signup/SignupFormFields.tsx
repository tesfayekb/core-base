
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

interface SignupFormFieldsProps {
  formData: FormData;
  passwordMismatch: boolean;
  isLoading: boolean;
  onInputChange: (field: string, value: string) => void;
}

export function SignupFormFields({
  formData,
  passwordMismatch,
  isLoading,
  onInputChange
}: SignupFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => onInputChange('firstName', e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => onInputChange('lastName', e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => onInputChange('email', e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Create a secure password"
          value={formData.password}
          onChange={(e) => onInputChange('password', e.target.value)}
          required
          disabled={isLoading}
        />
        <PasswordStrengthIndicator password={formData.password} />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={(e) => onInputChange('confirmPassword', e.target.value)}
          required
          disabled={isLoading}
          className={passwordMismatch ? 'border-red-500' : ''}
        />
        {passwordMismatch && (
          <p className="text-sm text-red-600">Passwords do not match</p>
        )}
      </div>
    </>
  );
}
