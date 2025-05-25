
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSecureErrorNotification } from '@/hooks/useSecureErrorNotification';
import { useFormValidation } from '@/hooks/useFormValidation';
import { loginFormSchema } from '@/utils/validation';

interface LoginFormData {
  email: string;
  password: string;
}

export function useLoginForm(onSuccess?: () => void) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const { signIn } = useAuth();
  const { handleAuthenticationError, handleInputValidationError } = useSecureErrorNotification();

  const {
    errors,
    isValid,
    isSubmitting,
    touched,
    validateField,
    handleSubmit,
    setFieldTouched
  } = useFormValidation({
    schema: loginFormSchema,
    onSubmit: async (validatedData) => {
      try {
        const result = await signIn(validatedData.email, validatedData.password);
        
        if (result.success) {
          // Don't show success message for security reasons - just redirect
          onSuccess?.();
        } else if (result.error) {
          // Use secure error handling for authentication failures
          await handleAuthenticationError(
            new Error(result.error),
            { operation: 'login_attempt' }
          );
        }
      } catch (error) {
        // Handle unexpected errors securely
        await handleAuthenticationError(
          error instanceof Error ? error : new Error('Unexpected login error'),
          { operation: 'login_system_error' }
        );
      }
    }
  });

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Validate field in real-time if it has been touched
    if (touched[field]) {
      try {
        validateField(field, value, newFormData);
      } catch (validationError) {
        // Handle validation errors securely
        handleInputValidationError(
          validationError instanceof Error ? validationError : new Error('Validation failed'),
          field
        );
      }
    }
  };

  const handleFieldBlur = (field: keyof LoginFormData) => {
    setFieldTouched(field);
    try {
      validateField(field, formData[field], formData);
    } catch (validationError) {
      // Handle validation errors securely
      handleInputValidationError(
        validationError instanceof Error ? validationError : new Error('Field validation failed'),
        field
      );
    }
  };

  const submitForm = async () => {
    // Mark all fields as touched
    Object.keys(formData).forEach(field => {
      setFieldTouched(field as keyof LoginFormData);
    });
    
    return handleSubmit(formData);
  };

  return {
    formData,
    isLoading: isSubmitting,
    isFormValid: isValid,
    errors,
    touched,
    handleInputChange,
    handleFieldBlur,
    handleSubmit: submitForm
  };
}
