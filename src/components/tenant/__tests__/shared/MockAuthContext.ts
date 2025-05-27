
export const createMockAuthContext = (overrides = {}) => ({
  user: { id: 'user-1', email: 'test@example.com' },
  tenantId: 'tenant-1',
  currentTenantId: 'tenant-1',
  session: null,
  loading: false,
  isLoading: false,
  authError: null,
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  clearAuthError: jest.fn(),
  switchTenant: jest.fn(),
  isAuthenticated: true,
  ...overrides
});
