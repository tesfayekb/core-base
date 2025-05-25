
import { useState, useCallback } from 'react';
import { z } from 'zod';
import { validateInput } from '@/utils/validation';
import { sanitizeFormData } from '@/utils/sanitization';

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit?: (data: T) => void | Promise<void>;
  sanitize?: boolean;
}

interface ValidationState {
  errors: Record<string, string>;
  isValid: boolean;
  isSubmitting: boolean;
  touched: Record<string, boolean>;
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  onSubmit,
  sanitize = true
}: UseFormValidationOptions<T>) {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    isValid: false,
    isSubmitting: false,
    touched: {}
  });

  const validateField = useCallback((fieldName: keyof T, value: any, formData: T) => {
    try {
      // Validate the entire form but only show error for this field
      const result = validateInput(schema, formData);
      
      setValidationState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [fieldName as string]: result.errors?.[fieldName as string] || ''
        },
        touched: {
          ...prev.touched,
          [fieldName as string]: true
        }
      }));

      return !result.errors?.[fieldName as string];
    } catch {
      return false;
    }
  }, [schema]);

  const validateForm = useCallback((data: T) => {
    const processedData = sanitize ? sanitizeFormData(data) : data;
    const result = validateInput(schema, processedData);
    
    setValidationState(prev => ({
      ...prev,
      errors: result.errors || {},
      isValid: result.isValid
    }));

    return result;
  }, [schema, sanitize]);

  const handleSubmit = useCallback(async (data: T) => {
    setValidationState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      const validation = validateForm(data);
      
      if (validation.isValid && validation.data && onSubmit) {
        await onSubmit(validation.data);
      }
      
      return validation;
    } finally {
      setValidationState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [validateForm, onSubmit]);

  const clearErrors = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      errors: {},
      touched: {}
    }));
  }, []);

  const setFieldTouched = useCallback((fieldName: keyof T) => {
    setValidationState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [fieldName as string]: true
      }
    }));
  }, []);

  return {
    errors: validationState.errors,
    isValid: validationState.isValid,
    isSubmitting: validationState.isSubmitting,
    touched: validationState.touched,
    validateField,
    validateForm,
    handleSubmit,
    clearErrors,
    setFieldTouched
  };
}
