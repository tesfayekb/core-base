
import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle } from "lucide-react"

interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'textarea' | 'number'
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
  description?: string
  success?: boolean
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  required,
  disabled,
  className,
  description,
  success
}: FormFieldProps) {
  const inputId = `form-field-${name}`
  const hasError = !!error
  const hasSuccess = success && !hasError

  const inputClassName = cn(
    "w-full",
    hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
    hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500",
    className
  )

  const renderInput = () => {
    const commonProps = {
      id: inputId,
      name,
      placeholder,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        onChange(e.target.value),
      onBlur,
      disabled,
      className: inputClassName
    }

    if (type === 'textarea') {
      return <Textarea {...commonProps} rows={4} />
    }

    return <Input {...commonProps} type={type} />
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        {renderInput()}
        
        {(hasError || hasSuccess) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {hasError && <AlertCircle className="h-4 w-4 text-red-500" />}
            {hasSuccess && <CheckCircle className="h-4 w-4 text-green-500" />}
          </div>
        )}
      </div>

      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          {error}
        </p>
      )}
    </div>
  )
}
