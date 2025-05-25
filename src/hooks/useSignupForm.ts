
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signupFormSchema } from '@/utils/validation';
import { useFormValidation } from './useFormValidation';

export function useSignupForm() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { 
    errors, 
    isValid, 
    isSubmitting, 
    touched, 
    validateField, 
    handleSubmit, 
    setFieldTouched 
  } = useFormValidation({
    schema: signupFormSchema,
    onSubmit: async (data) => {
      setIsLoading(true);
      try {
        const result = await signIn(data.email, data.password);
        if (!result.success) {
          throw new Error(result.error || 'Signup failed');
        }
      } finally {
        setIsLoading(false);
      }
    }
  });

  return {
    errors,
    isValid,
    isSubmitting: isSubmitting || isLoading,
    touched,
    validateField,
    handleSubmit,
    setFieldTouched
  };
}
