
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserManagement } from '../useUserManagement';

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
    expect(result.current.assignRoles).toBeDefined();
  });
});
