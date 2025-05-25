
import * as React from "react"
import { cn } from "@/lib/utils"

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ 
  title, 
  description, 
  children, 
  className 
}: FormSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
