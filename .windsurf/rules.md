# Windsurf Development Rules and Standards

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-26
> **Project**: Core Base Enterprise Application

This document defines the development rules, standards, and guidelines for the Core Base project. These rules ensure consistency, maintainability, and adherence to the comprehensive documentation structure in `src/docs/`.

## 🏗️ Project Architecture

### Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (server state) + Context API (UI state)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Jest + React Testing Library + Cypress
- **Backend**: Supabase (PostgreSQL with Row-Level Security)

### Folder Structure
```
src/
  components/    # Shared UI components
  hooks/         # Custom React hooks
  pages/         # Route-based page components
  context/       # React context providers
  services/      # API and data services
  utils/         # Utility functions
  types/         # TypeScript type definitions
  lib/           # External library wrappers
  docs/          # Comprehensive documentation
```

## 📋 Implementation Phases

Follow the phased implementation approach defined in `src/docs/implementation/`:

1. **Phase 1: Foundation** - Authentication, routing, basic UI
2. **Phase 2: Core Features** - RBAC, user management, data operations
3. **Phase 3: Advanced Features** - Multi-tenancy, integrations, analytics
4. **Phase 4: Polish & Production** - Performance, monitoring, deployment

## 🔐 Security Standards

### Core Security Principles
1. **Input Validation**: All user inputs must be validated using Zod schemas
2. **Authentication**: JWT-based with secure session management
3. **Authorization**: Direct permission assignment RBAC (no inheritance)
4. **Data Protection**: Encrypt sensitive data in transit and at rest
5. **Error Handling**: Generic error messages to users, detailed logs for monitoring

### Security Implementation Rules
- Follow security standards in `src/docs/security/`
- Implement Content Security Policy (CSP) headers
- Use HTTPS for all communications
- Sanitize all user-generated content
- Implement rate limiting for API endpoints
- Regular security audits and dependency updates

## 🎨 UI/UX Standards

### Design Principles
1. **Consistency**: Use shadcn/ui components as the base
2. **Accessibility**: WCAG 2.1 AA compliance required
3. **Responsiveness**: Mobile-first approach
4. **Performance**: Optimize rendering and minimize layout shifts

### Component Implementation
```typescript
// Always include accessibility attributes
<Dialog>
  <DialogContent>
    <VisuallyHidden>
      <DialogTitle>Dialog Title</DialogTitle>
    </VisuallyHidden>
    {/* Content */}
  </DialogContent>
</Dialog>

// Use permission boundaries for protected UI
<PermissionBoundary action="Update" resource="users">
  <EditButton />
</PermissionBoundary>
```

### Theme System
- Use CSS variables for theming
- Support light/dark modes
- Allow tenant-specific theme customization
- Follow theme security guidelines in `src/docs/security/THEME_SECURITY.md`

## 🔑 RBAC Implementation

### Direct Permission Assignment Model
- **No inheritance**: Permissions are explicitly assigned to roles
- **Union resolution**: Users with multiple roles get union of all permissions
- **Functional dependencies**: Logical relationships between permission types
- **Entity boundaries**: Permissions isolated by entity type

### Permission Types
1. **Global Permissions**: System-wide access
2. **Resource Permissions**: Access to specific resource types
3. **Instance Permissions**: Access to specific resource instances
4. **Entity-Scoped Permissions**: Permissions within entity boundaries

### Implementation Pattern
```typescript
// Permission check example
const hasPermission = await checkPermission({
  user: currentUser,
  action: 'Update',
  resource: 'users',
  resourceId: userId,
  entityType: 'tenant',
  entityId: tenantId
});
```

## 🏢 Multi-Tenancy

### Data Isolation
- Implement Row-Level Security (RLS) in PostgreSQL
- Tenant context must be present for all operations
- Follow patterns in `src/docs/multitenancy/DATA_ISOLATION.md`

### Tenant-Aware Components
```typescript
<TenantProvider tenantId={tenantId}>
  <TenantAwareComponent>
    {/* Component content */}
  </TenantAwareComponent>
</TenantProvider>
```

## 🧪 Testing Requirements

### Test Coverage Standards
- **Unit Tests**: Minimum 80% coverage for business logic
- **Integration Tests**: All API endpoints must be tested
- **Component Tests**: All UI components with logic
- **E2E Tests**: Critical user journeys

### Testing Patterns
```typescript
// Component testing example
describe('UserList', () => {
  it('should display users with proper permissions', async () => {
    const { getByRole } = render(
      <MockedProvider>
        <UserList />
      </MockedProvider>
    );
    
    await waitFor(() => {
      expect(getByRole('list')).toBeInTheDocument();
    });
  });
});
```

## 📝 Code Quality Standards

### TypeScript Requirements
- **Strict mode**: enabled
- **No any types**: Use unknown or proper types
- **Interface over type**: For object shapes
- **Proper error handling**: Use Result types or error boundaries

### Code Style
```typescript
// Good: Clear, typed, and documented
interface UserData {
  id: string;
  email: string;
  roles: Role[];
}

/**
 * Updates user information with validation
 * @throws {ValidationError} When data is invalid
 */
async function updateUser(id: string, data: Partial<UserData>): Promise<User> {
  const validated = userSchema.parse(data);
  return userService.update(id, validated);
}

// Bad: Unclear types and no documentation
async function updateUser(id: any, data: any) {
  return fetch(`/users/${id}`, { method: 'PUT', body: data });
}
```

### Naming Conventions
- **Components**: PascalCase (e.g., `UserProfile`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth`)
- **Utils**: camelCase (e.g., `formatDate`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase with descriptive names

## 🔄 State Management

### React Query Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Context Usage
- **AuthContext**: User authentication state
- **ThemeContext**: Theme preferences
- **TenantContext**: Current tenant context
- **PermissionContext**: Cached permissions

## 🚀 Performance Standards

### Core Web Vitals Targets
- **LCP**: < 2.5 seconds
- **FID**: < 100 milliseconds
- **CLS**: < 0.1

### Optimization Techniques
1. **Code splitting**: Route-based lazy loading
2. **Image optimization**: WebP with fallbacks
3. **Bundle optimization**: Tree shaking and minification
4. **Caching**: Implement service workers
5. **Database queries**: Use indexes and query optimization

## 📊 Monitoring and Logging

### Audit Requirements
- Log all permission checks
- Track authentication events
- Record data modifications
- Monitor API performance
- Follow patterns in `src/docs/audit/`

### Error Tracking
```typescript
// Centralized error handling
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    logger.error('UI Error', { error, errorInfo, context: this.context });
    
    // Show user-friendly error
    this.setState({ hasError: true });
  }
}
```

## 🔧 Development Workflow

### Git Commit Standards
```bash
# Format: <type>(<scope>): <subject>
feat(auth): add two-factor authentication
fix(ui): resolve dialog accessibility issues
docs(rbac): update permission documentation
test(users): add integration tests for user service
```

### Pull Request Requirements
1. All tests must pass
2. Code review required
3. Documentation updated
4. Changelog entry added
5. No decrease in test coverage

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

## 🤖 AI Development Guidelines

### Context Management
- Reference `src/docs/` for authoritative information
- Follow phased implementation approach
- Use structured knowledge from documentation
- Maintain consistency with existing patterns

### Code Generation Rules
1. Always include proper TypeScript types
2. Add comprehensive error handling
3. Include accessibility attributes
4. Follow security best practices
5. Write accompanying tests

### Documentation Updates
- Keep inline comments concise
- Update relevant docs in `src/docs/`
- Maintain cross-references
- Version all significant changes

## 📱 Mobile Development

### React Native Standards
- Share business logic with web
- Platform-specific UI when needed
- Follow mobile security guidelines
- Implement offline capabilities
- Reference `src/docs/mobile/`

## 🔗 Integration Standards

### API Design
- RESTful endpoints with consistent naming
- Versioned APIs (`/api/v1/`)
- Comprehensive error responses
- Rate limiting and throttling
- OpenAPI documentation

### Third-Party Integrations
- Use adapters pattern
- Implement circuit breakers
- Add retry logic
- Monitor integration health
- Document all dependencies

## 📚 Documentation Requirements

### Code Documentation
```typescript
/**
 * Processes user registration with validation and notifications
 * 
 * @param data - Registration form data
 * @returns Promise resolving to created user or validation errors
 * 
 * @example
 * const result = await registerUser({
 *   email: 'user@example.com',
 *   password: 'secure-password'
 * });
 */
```

### API Documentation
- OpenAPI/Swagger specifications
- Request/response examples
- Error code documentation
- Authentication requirements
- Rate limit information

## 🚦 Validation and Quality Gates

### Pre-commit Checks
1. Linting (ESLint)
2. Formatting (Prettier)
3. Type checking (TypeScript)
4. Unit test execution

### CI/CD Pipeline
1. Install dependencies
2. Run linting and type checks
3. Execute all tests
4. Build application
5. Run security scans
6. Deploy to appropriate environment

## 🎯 Success Metrics

### Development Metrics
- Code coverage > 80%
- Build time < 2 minutes
- Zero critical security vulnerabilities
- All accessibility tests passing

### Production Metrics
- Uptime > 99.9%
- Response time < 200ms (p95)
- Error rate < 0.1%
- User satisfaction > 4.5/5

## 📋 Checklists

### Feature Development Checklist
- [ ] Requirements documented
- [ ] Design approved
- [ ] Tests written
- [ ] Code implemented
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Accessibility verified
- [ ] Performance tested
- [ ] Code reviewed
- [ ] Deployed to staging

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified

## 🔄 Project Completion Status

**CRITICAL**: Before creating any new components or systems, ALWAYS check:

1. **Completion Status**: `.windsurf/completion-status.md` - Lists all completed phases and components
2. **Config Status**: `.windsurf/config.json` - Machine-readable completion tracking
3. **Phase Tracker**: `src/docs/implementation/PHASE_COMPLETION_TRACKER.md` - Detailed completion documentation

### ✅ Completed Systems (DO NOT RECREATE):
- Authentication system (JWT-based with security measures)
- Basic RBAC foundation (SuperAdmin/BasicUser roles)
- Advanced RBAC with caching and optimization
- Multi-tenant foundation with complete data isolation
- Enhanced multi-tenant features and dashboard
- Security infrastructure (comprehensive headers)
- Enhanced audit logging with real-time monitoring
- User management system with complete CRUD operations
- UI foundation (responsive layout with theme system)

### 🎯 Current Focus: Phase 3 - Advanced Features
**Next Priority**: Audit Dashboard Implementation
**Reference**: `src/docs/implementation/phase3/AUDIT_DASHBOARD.md`

### 🚫 Avoid Duplication Rules:
1. Check existing components in `src/components/`, `src/services/`, `src/hooks/`
2. Review completion status before starting new features
3. Build upon existing infrastructure, don't recreate
4. Focus only on Phase 3 requirements

## 🔄 Continuous Improvement

1. Regular code reviews
2. Monthly security audits
3. Quarterly performance reviews
4. Bi-annual dependency updates
5. Ongoing documentation refinement

---

**Remember**: These rules are derived from the comprehensive documentation in `src/docs/`. When in doubt, refer to the source documentation for detailed implementation guidance.

## 🗄️ Database Conventions

### Naming Standards
- Tables: lowercase, plural (e.g., `users`, `permissions`)
- Columns: lowercase, snake_case (e.g., `created_at`)
- Foreign keys: `table_id` (e.g., `user_id`)
- Indexes: `idx_table_column` (e.g., `idx_users_email`)

### Query Patterns
- Always include tenant context
- Use parameterized queries
- Implement proper pagination
- Follow patterns in `src/docs/multitenancy/DATABASE_QUERY_PATTERNS.md`

## 📊 Database Migration Standards

### Migration File Structure
```typescript
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: 'XXX', // Zero-padded number (e.g., '008')
  name: 'descriptive_name', // Snake case description
  script: `
    -- Migration Title
    -- Version: X.X.X
    -- Phase X.X: Component Name
    
    -- SQL statements here
  `
};

export default migration;
```

### Migration Naming Convention
- Format: `XXX_descriptive_name.ts` where XXX is zero-padded version
- Examples:
  - `008_add_user_preferences_table.ts`
  - `009_create_notification_system.ts`

### Migration Requirements
1. **Idempotency**: All migrations must be safe to run multiple times
2. **Rollback Plan**: Document rollback procedure in comments
3. **Performance Impact**: Note expected impact in migration comments
4. **Dependencies**: List required prior migrations
5. **Testing**: Include test scenarios in comments

### Migration Documentation
Every migration must update:
1. `src/docs/data-model/SCHEMA_MIGRATIONS.md` - Detailed description
2. `src/docs/data-model/MIGRATION_HISTORY.md` - Status tracking
3. Add SQL debugging scripts to `sql-scripts/debugging/` if needed

### Migration Best Practices
```sql
-- DO: Use IF NOT EXISTS/IF EXISTS
CREATE TABLE IF NOT EXISTS new_table (...);
CREATE INDEX IF NOT EXISTS idx_name ON table(column);

-- DO: Use transactions for complex changes
BEGIN;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);
  UPDATE users SET new_field = 'default' WHERE new_field IS NULL;
COMMIT;

-- DO: Add helpful comments
-- This index improves query performance for user lookups by email
CREATE INDEX idx_users_email ON users(email);

-- DON'T: Drop data without backup plan
-- DON'T: Make breaking changes without feature flags
-- DON'T: Ignore RLS policies
```

### RLS Policy Migrations
When modifying RLS policies:
1. Test with multiple tenant contexts
2. Verify no data leakage between tenants
3. Ensure initial setup scenarios work
4. Document security implications

### Migration Testing Checklist
- [ ] Migration runs successfully on clean database
- [ ] Migration is idempotent (can run multiple times)
- [ ] RLS policies maintain tenant isolation
- [ ] Performance impact is acceptable
- [ ] Rollback procedure is documented and tested
- [ ] Documentation is updated

## 🔒 Security Patterns

{{ ... }}
