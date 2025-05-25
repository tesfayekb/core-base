
import { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { useErrorNotification } from '@/hooks/useErrorNotification';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export function useSignupForm(onSuccess?: () => void) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const { signUp, clearAuthError } = useAuth();
  const { showError, showSuccess } = useErrorNotification();

  const validatePasswordStrength = (password: string): boolean => {
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ];
    
    return checks.filter(Boolean).length >= 4;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'confirmPassword' || field === 'password') {
      const newPassword = field === 'password' ? value : formData.password;
      const newConfirmPassword = field === 'confirmPassword' ? value : formData.confirmPassword;
      setPasswordMismatch(newConfirmPassword !== '' && newPassword !== newConfirmPassword);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (!validatePasswordStrength(formData.password)) {
      showError('Password does not meet security requirements');
      return;
    }

    setIsLoading(true);
    clearAuthError();

    try {
      const result = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      
      if (result.success) {
        if (result.requiresVerification) {
          showSuccess('Registration successful! Please check your email to verify your account.');
        } else {
          showSuccess('Registration successful!');
        }
        onSuccess?.();
      } else if (result.error) {
        showError(result.error);
      }
    } catch (error) {
      showError('An unexpected error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.email && 
                     formData.password && 
                     formData.confirmPassword && 
                     !passwordMismatch &&
                     validatePasswordStrength(formData.password);

  return {
    formData,
    isLoading,
    passwordMismatch,
    isFormValid,
    handleInputChange,
    handleSubmit
  };
}
