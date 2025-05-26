# Quick Reference Guide

## 🚀 Essential Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run test            # Run tests
npm run lint            # Run linting
npm run type-check      # Check TypeScript

# Database
npm run db:migrate      # Run migrations
npm run db:seed         # Seed database
npm run db:reset        # Reset database
```

## 📁 Key Documentation Locations

- **Architecture**: `src/docs/CORE_ARCHITECTURE.md`
- **Implementation Phases**: `src/docs/implementation/`
- **Security**: `src/docs/security/`
- **RBAC System**: `src/docs/rbac/`
- **UI Standards**: `src/docs/ui/`
- **Testing**: `src/docs/testing/`
- **AI Guides**: `src/docs/ai-development/`

## 🔑 Common Patterns

### Permission Check
```typescript
const canEdit = usePermission('Update', 'users', userId);
```

### Secure API Call
```typescript
const { data, error } = await apiClient.users.update(userId, {
  ...validatedData
});
```

### Form with Validation
```typescript
const form = useForm<UserFormData>({
  resolver: zodResolver(userSchema),
  defaultValues: initialData
});
```

### Protected Route
```tsx
<ProtectedRoute requiredPermission="View:users">
  <UserList />
</ProtectedRoute>
```

## 🎨 Component Template

```tsx
import { FC } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { Card } from '@/components/ui/card';

interface ComponentNameProps {
  // Props definition
}

export const ComponentName: FC<ComponentNameProps> = ({ ...props }) => {
  const canEdit = usePermission('Update', 'resource');
  
  return (
    <Card>
      {/* Component content */}
    </Card>
  );
};
```

## 🧪 Test Template

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should render correctly', async () => {
    render(<ComponentName />);
    
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
```

## 🔐 Security Checklist

- [ ] Input validation with Zod
- [ ] Permission checks implemented
- [ ] Error messages sanitized
- [ ] CSRF protection enabled
- [ ] XSS prevention in place
- [ ] SQL injection prevented
- [ ] Rate limiting configured

## 📋 PR Checklist

- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Accessibility verified
- [ ] Security review completed
- [ ] Performance impact assessed
- [ ] Code review requested

## 🚨 Common Issues

### Dialog Accessibility Error
```tsx
// Always include DialogTitle
<Dialog>
  <DialogContent>
    <VisuallyHidden>
      <DialogTitle>Title</DialogTitle>
    </VisuallyHidden>
    {/* content */}
  </DialogContent>
</Dialog>
```

### Permission Denied
```typescript
// Check entity boundaries
const permission = await checkPermission({
  action: 'Update',
  resource: 'users',
  entityType: 'tenant',
  entityId: currentTenant.id
});
```

### Type Errors
```typescript
// Use proper types, avoid 'any'
interface UserData {
  id: string;
  email: string;
  roles: Role[];
}
```

## 📞 Support

- **Documentation**: `src/docs/`
- **Architecture Decisions**: `src/docs/implementation/TECHNICAL_DECISIONS.md`
- **Troubleshooting**: `src/docs/implementation/TROUBLESHOOTING.md`
