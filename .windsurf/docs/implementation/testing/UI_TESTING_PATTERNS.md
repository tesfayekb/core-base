
# UI Testing Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

UI-specific testing patterns for React components using React Testing Library and Jest.

## Component Testing Patterns

### Basic Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  test('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Form Component Testing
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserForm } from '@/components/forms/UserForm';

describe('UserForm Component', () => {
  test('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<UserForm onSubmit={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  test('should submit form with valid data', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(<UserForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe'
      });
    });
  });
});
```

### Permission-Aware Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import { PermissionBoundary } from '@/components/auth/PermissionBoundary';
import { RBACProvider } from '@/providers/RBACProvider';

const renderWithPermissions = (component: React.ReactElement, permissions: string[]) => {
  const mockRBACContext = {
    hasPermission: (permission: string) => permissions.includes(permission),
    userRoles: [],
    loading: false
  };

  return render(
    <RBACProvider value={mockRBACContext}>
      {component}
    </RBACProvider>
  );
};

describe('PermissionBoundary Component', () => {
  test('should render children when user has permission', () => {
    renderWithPermissions(
      <PermissionBoundary action="edit" resource="users">
        <button>Edit User</button>
      </PermissionBoundary>,
      ['users:edit']
    );

    expect(screen.getByRole('button', { name: /edit user/i })).toBeInTheDocument();
  });

  test('should not render children when user lacks permission', () => {
    renderWithPermissions(
      <PermissionBoundary action="edit" resource="users">
        <button>Edit User</button>
      </PermissionBoundary>,
      []
    );

    expect(screen.queryByRole('button', { name: /edit user/i })).not.toBeInTheDocument();
  });
});
```

### Multi-Tenant Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import { TenantProvider } from '@/providers/TenantProvider';
import { TenantAwareComponent } from '@/components/tenant/TenantAwareComponent';

const renderWithTenant = (component: React.ReactElement, tenantId: string) => {
  const mockTenantContext = {
    currentTenant: { id: tenantId, name: 'Test Tenant' },
    switchTenant: jest.fn(),
    loading: false
  };

  return render(
    <TenantProvider value={mockTenantContext}>
      {component}
    </TenantProvider>
  );
};

describe('TenantAwareComponent', () => {
  test('should display tenant-specific content', () => {
    renderWithTenant(<TenantAwareComponent />, 'tenant-123');
    
    expect(screen.getByText(/test tenant/i)).toBeInTheDocument();
  });
});
```

## Accessibility Testing Patterns

### Basic Accessibility Testing
```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  test('should not have accessibility violations', async () => {
    const { container } = render(<YourComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## Related Documentation

- **[CORE_TESTING_PATTERNS.md](CORE_TESTING_PATTERNS.md)**: Basic testing patterns
- **[ADVANCED_TESTING_PATTERNS.md](ADVANCED_TESTING_PATTERNS.md)**: Complex testing scenarios
- **[../UI_STANDARDS.md](../UI_STANDARDS.md)**: UI component standards

## Version History

- **1.0.0**: Extracted UI patterns from TESTING_PATTERNS.md for better AI processing (2025-05-24)
