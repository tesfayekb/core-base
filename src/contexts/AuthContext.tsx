// Re-export everything from the correct AuthProvider to avoid breaking imports
// This file exists for backward compatibility - all auth logic is now in components/auth/AuthProvider

export { AuthProvider, useAuth } from '@/components/auth/AuthProvider';

// For components that expect `tenantId` instead of `currentTenantId`, provide a wrapper
import { useAuth as useAuthOriginal } from '@/components/auth/AuthProvider';

export function useAuthCompat() {
  const auth = useAuthOriginal();
  return {
    ...auth,
    tenantId: auth.currentTenantId // Map currentTenantId to tenantId for backward compatibility
  };
}
