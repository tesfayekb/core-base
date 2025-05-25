
import React from 'react';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  description: string;
  type?: ToastType;
  duration?: number;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const toastStyles = {
  success: 'border-green-500 bg-green-50 text-green-900',
  error: 'border-red-500 bg-red-50 text-red-900',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-900',
  info: 'border-blue-500 bg-blue-50 text-blue-900',
};

export function showToast({ title, description, type = 'info', duration = 5000 }: ToastOptions) {
  const Icon = toastIcons[type];
  
  toast({
    title: title && (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title}
      </div>
    ),
    description,
    duration,
    className: toastStyles[type],
  });
}

// Convenience functions
export const toastSuccess = (description: string, title?: string) =>
  showToast({ type: 'success', description, title });

export const toastError = (description: string, title?: string) =>
  showToast({ type: 'error', description, title });

export const toastWarning = (description: string, title?: string) =>
  showToast({ type: 'warning', description, title });

export const toastInfo = (description: string, title?: string) =>
  showToast({ type: 'info', description, title });

// Hook for easy access
export function useEnhancedToast() {
  return {
    success: toastSuccess,
    error: toastError,
    warning: toastWarning,
    info: toastInfo,
    custom: showToast,
  };
}
