
import { useState, useCallback } from 'react';

interface FormValidationOptions {
  schema: any;
  onSubmit: (data: any) => Promise<void>;
}

export function useFormValidation({ schema, onSubmit }: FormValidationOptions) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((field: string, value: any, formData: any) => {
    // Basic validation logic
    if (!value) {
      setErrors(prev => ({ ...prev, [field]: 'This field is required' }));
      return false;
    }
    setErrors(prev => ({ ...prev, [field]: '' }));
    return true;
  }, []);

  const handleSubmit = useCallback(async (formData: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit]);

  const setFieldTouched = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    isSubmitting,
    touched,
    validateField,
    handleSubmit,
    setFieldTouched
  };
}
