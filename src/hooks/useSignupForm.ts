
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useErrorNotification } from '@/hooks/useErrorNotification';
import { useFormValidation } from '@/hooks/useFormValidation';
import { signupFormSchema } from '@/utils/validation';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export function useSignupForm(onSuccess?: () => void) {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });

  const { signUp, authError, clearAuthError } = useAuth();
  const { showError, showSuccess } = useErrorNotification();

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
    onSubmit: async (validatedData) => {
      clearAuthError();

      try {
        const result = await signUp(
          validatedData.email,
          validatedData.password,
          validatedData.firstName,
          validatedData.lastName
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
      }
    }
  });

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Validate field in real-time if it has been touched
    if (touched[field]) {
      validateField(field, value, newFormData);
    }
  };

  const handleFieldBlur = (field: keyof SignupFormData) => {
    setFieldTouched(field);
    validateField(field, formData[field], formData);
  };

  const submitForm = async () => {
    // Mark all fields as touched
    Object.keys(formData).forEach(field => {
      setFieldTouched(field as keyof SignupFormData);
    });
    
    return handleSubmit(formData);
  };

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

  const passwordMismatch = formData.confirmPassword !== '' && formData.password !== formData.confirmPassword;

  return {
    formData,
    isLoading: isSubmitting,
    passwordMismatch,
    authError,
    isFormValid: isValid,
    errors,
    touched,
    handleInputChange,
    handleFieldBlur,
    handleSubmit: submitForm,
    validatePasswordStrength
  };
}
