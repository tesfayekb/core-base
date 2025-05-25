
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useErrorNotification } from '@/hooks/useErrorNotification';
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
    schema: loginFormSchema,
    onSubmit: async (validatedData) => {
      try {
        const result = await signIn(validatedData.email, validatedData.password);
        
        if (result.success) {
          showSuccess('Login successful!');
          onSuccess?.();
        } else if (result.error) {
          showError(result.error);
        }
      } catch (error) {
        showError('An unexpected error occurred during login');
      }
    }
  });

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Validate field in real-time if it has been touched
    if (touched[field]) {
      validateField(field, value, newFormData);
    }
  };

  const handleFieldBlur = (field: keyof LoginFormData) => {
    setFieldTouched(field);
    validateField(field, formData[field], formData);
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
