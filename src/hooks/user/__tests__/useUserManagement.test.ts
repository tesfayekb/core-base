
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserManagement } from '../useUserManagement';
import React from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUserManagement', () => {
  test('should provide user management functions', () => {
    const { result } = renderHook(() => useUserManagement('tenant-123'), {
      wrapper: createWrapper()
    });

    expect(result.current.createUser).toBeDefined();
    expect(result.current.updateUser).toBeDefined();
    expect(result.current.deleteUser).toBeDefined();
    expect(result.current.assignRole).toBeDefined();
  });

  test('should handle loading states correctly', () => {
    const { result } = renderHook(() => useUserManagement('tenant-123'), {
      wrapper: createWrapper()
    });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.isAssigningRole).toBe(false);
  });

  test('should provide cache management functions', () => {
    const { result } = renderHook(() => useUserManagement('tenant-123'), {
      wrapper: createWrapper()
    });

    expect(result.current.clearCache).toBeDefined();
    expect(result.current.getCacheStats).toBeDefined();
    expect(result.current.batchUpdateUsers).toBeDefined();
  });
});
