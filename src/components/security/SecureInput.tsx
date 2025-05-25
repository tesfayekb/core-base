
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inputValidationService } from '@/services/security/InputValidationService';
import { cn } from '@/lib/utils';

interface SecureInputProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'url';
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  pattern?: string;
  className?: string;
  errors?: string[];
  isSubmitting?: boolean;
  realTimeValidation?: boolean;
}

export function SecureInput({
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  maxLength,
  pattern,
  className,
  errors = [],
  isSubmitting = false,
  realTimeValidation = false
}: SecureInputProps) {
  const [value, setValue] = useState('');
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [isTouched, setIsTouched] = useState(false);

  const validateInput = (inputValue: string) => {
    if (!realTimeValidation || !isTouched) return;

    let validationResult;
    switch (type) {
      case 'email':
        validationResult = inputValidationService.validateEmail(inputValue);
        break;
      case 'password':
        validationResult = inputValidationService.validatePassword(inputValue);
        break;
      case 'url':
        validationResult = inputValidationService.validateUrl(inputValue);
        break;
      default:
        validationResult = inputValidationService.sanitizeInput(inputValue, {
          maxLength,
          stripWhitespace: true
        });
    }

    setLocalErrors(validationResult.errors);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    validateInput(newValue);
  };

  const handleBlur = () => {
    setIsTouched(true);
    validateInput(value);
  };

  const allErrors = [...(errors || []), ...localErrors];
  const hasErrors = allErrors.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className={cn("text-sm font-medium", {
        "text-red-600": hasErrors
      })}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        pattern={pattern}
        required={required}
        disabled={isSubmitting}
        className={cn({
          "border-red-500 focus:border-red-500": hasErrors,
          "border-green-500 focus:border-green-500": isTouched && !hasErrors && value.length > 0
        })}
        aria-invalid={hasErrors}
        aria-describedby={hasErrors ? `${name}-error` : undefined}
      />
      
      {hasErrors && (
        <div id={`${name}-error`} className="space-y-1">
          {allErrors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}
      
      {maxLength && (
        <p className="text-xs text-gray-500">
          {value.length}/{maxLength} characters
        </p>
      )}
    </div>
  );
}
