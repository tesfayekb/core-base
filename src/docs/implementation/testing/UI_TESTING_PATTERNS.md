
# UI Testing Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Focused UI component testing patterns with React Testing Library examples.

## Form Component Testing

### Registration Form Testing
```typescript
describe('User Registration Form', () => {
  test('should validate required fields', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    render(<RegistrationForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    render(<RegistrationForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!');

    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'SecurePassword123!'
    });
  });
});
```

## Permission-Based Component Testing

### Conditional Rendering Testing
```typescript
describe('Permission-Based UI Components', () => {
  test('should show admin actions for admin users', () => {
    const adminUser = createMockUser({ role: 'admin' });
    
    render(
      <UserProvider user={adminUser}>
        <DocumentActions documentId="123" />
      </UserProvider>
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  test('should hide admin actions for regular users', () => {
    const regularUser = createMockUser({ role: 'viewer' });
    
    render(
      <UserProvider user={regularUser}>
        <DocumentActions documentId="123" />
      </UserProvider>
    );

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
  });
});
```

## Test Utilities

### Mock Helpers
```typescript
export const createMockUser = (overrides: Partial<User> = {}) => ({
  id: 'mock-user-id',
  email: 'mock@example.com',
  role: 'viewer',
  ...overrides
});

export const renderWithProviders = (component: React.ReactElement, options?: RenderOptions) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClient>
      <UserProvider>
        {children}
      </UserProvider>
    </QueryClient>
  );

  return render(component, { wrapper: Wrapper, ...options });
};
```

## Related Documentation

- **[CORE_TESTING_PATTERNS.md](CORE_TESTING_PATTERNS.md)**: Basic testing patterns
- **[ADVANCED_TESTING_PATTERNS.md](ADVANCED_TESTING_PATTERNS.md)**: Integration patterns

## Version History

- **1.0.0**: Extracted UI patterns from TESTING_PATTERNS.md (2025-05-23)
