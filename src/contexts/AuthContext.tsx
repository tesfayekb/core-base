// This file exists for backward compatibility - all auth logic is now in components/auth/AuthProvider

// Import the original auth provider and hook
import { AuthProvider as OriginalAuthProvider, useAuth as useAuthOriginal } from '@/components/auth/AuthProvider';
import React, { createContext } from 'react';

// Create a wrapper for useAuth that adds tenantId for backward compatibility
export function useAuth() {
  const auth = useAuthOriginal();
  return {
    ...auth,
    tenantId: auth.currentTenantId // Map currentTenantId to tenantId for backward compatibility
  };
}

// Re-export AuthProvider as-is
export { OriginalAuthProvider as AuthProvider };

// Also export the compatibility version for explicit use
export function useAuthCompat() {
  return useAuth(); // Now they're the same
}

// Export AuthContext for test files that might need it
export const AuthContext = createContext<ReturnType<typeof useAuth> | undefined>(undefined);
