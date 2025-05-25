
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signupFormSchema } from '@/utils/validation';

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function useSignupForm(onSuccess?: () => void) {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const passwordMismatch = formData.password !== formData.confirmPassword && formData.confirmPassword.length > 0;
  const isFormValid = formData.email && formData.password && formData.firstName && formData.lastName && !passwordMismatch;

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setAuthError(null);
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const result = await signIn(formData.email, formData.password);
      if (!result.success) {
        throw new Error(result.error || 'Signup failed');
      }
      onSuccess?.();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    isLoading,
    passwordMismatch,
    authError,
    isFormValid,
    handleInputChange,
    handleSubmit
  };
}
