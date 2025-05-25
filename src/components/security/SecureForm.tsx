
import React, { useState, useEffect } from 'react';
import { formSecurityService } from '@/services/security/FormSecurityService';
import { useCSRFProtection } from '@/hooks/useCSRFProtection';
import { useToast } from '@/hooks/use-toast';

interface SecureFormProps {
  children: React.ReactNode;
  onSubmit: (sanitizedData: Record<string, any>) => Promise<void>;
  validationSchema: Record<string, any>;
  requireCSRF?: boolean;
  className?: string;
}

export function SecureForm({ 
  children, 
  onSubmit, 
  validationSchema, 
  requireCSRF = true,
  className = ''
}: SecureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const { token, getHeaders } = useCSRFProtection();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData(event.currentTarget);
      const data: Record<string, any> = {};
      
      // Convert FormData to regular object
      formData.forEach((value, key) => {
        data[key] = value;
      });

      // Add CSRF token if required
      if (requireCSRF) {
        data._csrf = token;
      }

      // Validate and sanitize form data
      const validationResult = await formSecurityService.validateForm(
        data,
        validationSchema,
        requireCSRF
      );

      if (!validationResult.isValid) {
        setErrors(validationResult.errors);
        toast({
          title: "Validation Error",
          description: "Please check the form for errors",
          variant: "destructive"
        });
        return;
      }

      // Submit sanitized data
      await onSubmit(validationResult.sanitizedData);

      toast({
        title: "Success",
        description: "Form submitted successfully"
      });

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "An error occurred while submitting the form",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {requireCSRF && (
        <input type="hidden" name="_csrf" value={token} />
      )}
      
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            errors: errors,
            isSubmitting: isSubmitting
          } as any);
        }
        return child;
      })}
    </form>
  );
}
