
# Project Cloning & Extension Guidelines

## Externalization Standards

### Configuration Management
- **All Configuration Must Be Externalized**
  - No hardcoded configuration values in codebase
  - All environment-specific settings in Supabase Environment Variables
  - Configuration schema documented and validated at runtime
  - Clear separation between configuration and code
  - Centralized configuration management service
  - Configuration validation on application startup
  - **Database Functions**: Leverage database functions for configuration-dependent operations as described in CORE_ARCHITECTURE.md
  - **Schema Documentation**: Follow schema documentation patterns from CORE_ARCHITECTURE.md when extending configuration tables

### Secret Management
- **Zero Secrets in Repository**
  - All secrets stored in Supabase Secrets Manager
  - Secret rotation procedures documented
  - Separate development/staging/production secrets
  - Secret access audit logging enabled
  - Emergency secret rotation plan documented
  - Secret versioning and history maintained
  - **Security Functions**: Use SECURITY DEFINER functions for secure access to secrets
  - **Audit Logging**: Integrate with the comprehensive audit logging system defined in CORE_ARCHITECTURE.md

### Multi-Tenant Considerations
- **Tenant Isolation Strategy**
  - Database schema prefixing for multi-tenant deployments
  - Tenant-specific storage buckets
  - Cross-tenant data access controls
  - Tenant migration and backup procedures
  - Tenant-specific configuration overrides
  - Tenant usage metering and monitoring
  - **Row-Level Security**: Implement tenant-aware RLS policies following CORE_ARCHITECTURE.md guidelines
  - **Migration Management**: Follow version-controlled migration patterns described in CORE_ARCHITECTURE.md

## Cloning Checklist

When creating a new instance of this project, follow this checklist to ensure proper setup:

### 1. Database Configuration
- [ ] Create new Supabase project
- [ ] Run initial migration scripts
- [ ] Set database connection parameters
- [ ] Configure RLS policies
- [ ] Initialize schema with tenant prefix if applicable
- [ ] Verify database connection and permissions
- [ ] Set up migration tracking and version control as described in CORE_ARCHITECTURE.md
- [ ] Implement required utility functions for permission checks

### 2. Authentication Setup
- [ ] Configure authentication providers
- [ ] Set password policies
- [ ] Configure multi-factor authentication settings
- [ ] Add initial SuperAdmin account
- [ ] Set token expiration policies
- [ ] Verify login/logout flows
- [ ] Set up secure session management according to CORE_ARCHITECTURE.md

### 3. Environment Configuration
- [ ] Set environment-specific variables
- [ ] Configure logging levels
- [ ] Set API URL endpoints
- [ ] Configure CORS settings
- [ ] Set rate limiting parameters
- [ ] Configure feature flags
- [ ] Implement centralized configuration service using the database functions approach

### 4. Secret Rotation
- [ ] Generate new API keys
- [ ] Set encryption keys
- [ ] Configure webhook secrets
- [ ] Update third-party service credentials
- [ ] Document all secrets in secure location
- [ ] Implement secret rotation schedule
- [ ] Integrate with audit logging for secret access tracking

### 5. Branding & Customization
- [ ] Update application name in all locations
- [ ] Replace logos and favicon
- [ ] Set primary color scheme
- [ ] Configure email templates
- [ ] Update terms of service and privacy policy
- [ ] Set custom domain and SSL certificate

### 6. CI/CD Pipeline
- [ ] Configure build environments
- [ ] Set deployment targets
- [ ] Configure automated testing
- [ ] Set branch protection rules
- [ ] Configure deployment approval process
- [ ] Set up monitoring and alerting
- [ ] Implement migration dry-run and rollback testing as specified in CORE_ARCHITECTURE.md

### 7. Data Initialization
- [ ] Create initial role definitions
- [ ] Set up permission matrix
- [ ] Initialize system settings
- [ ] Create sample data if needed
- [ ] Verify data integrity
- [ ] Run data validation scripts
- [ ] Implement the pure permission-based approach described in CORE_ARCHITECTURE.md

## Template Documentation

### Standard Project README
The project includes a template README.md that should be customized with project-specific information:

```markdown
# [Project Name]

## Overview
Brief description of project purpose and capabilities

## Configuration
Instructions for setting up environment variables and configuration

## Development
Instructions for local development setup

## Deployment
Instructions for deployment to production

## Security
Security considerations and compliance information

## License
License information
```

### License Template
Update the LICENSE file with appropriate licensing information for your specific deployment.

## Project Reset & Scrubbing

### Automated Cleanup Script
The project includes a scrubbing script that performs the following actions:

1. Removes all non-essential data
2. Resets all logs and audit trails
3. Removes development keys and credentials
4. Initializes system to a clean state
5. Documents the reset process

To run the script:
```bash
npm run project:clean
```

### Manual Cleanup Checklist
- [ ] Remove all test users and data
- [ ] Clear audit logs
- [ ] Reset all API keys and credentials
- [ ] Remove development feature flags
- [ ] Clear storage buckets of non-essential files
- [ ] Reset database sequences
- [ ] Document cleanup performed

## Extension Guidelines

### Adding New Resources

When adding a new resource to the system, follow both CLONING_GUIDELINES.md and CORE_ARCHITECTURE.md standards:

1. **Database Layer**
   - Create migration script for new tables
   - Implement RLS policies for row-level security
   - Add appropriate indices and constraints
   - Document table relationships and dependencies
   - Register resource in resource registry
   - Implement required database functions
   - Follow the standardized docstring requirements for SQL functions
   - Implement error handling using the consistent patterns in CORE_ARCHITECTURE.md

2. **API Layer**
   - Create API controller for resource
   - Implement standard CRUD operations
   - Add appropriate validation schemas
   - Implement permission checks
   - Document API endpoints
   - Add appropriate error handling
   - Integrate with the versioning strategy in CORE_ARCHITECTURE.md
   - Apply consistent error response structures

3. **UI Layer**
   - Create resource list/detail components
   - Implement form components for resource
   - Add resource to navigation
   - Implement permission-based UI controls
   - Add appropriate loading and error states
   - Implement responsive design for all screen sizes
   - Follow component size limits (max 50 lines)
   - Implement design token usage for theme consistency

4. **Testing Layer**
   - Create unit tests for resource model
   - Implement API endpoint tests
   - Add UI component tests
   - Create integration tests for resource workflows
   - Add performance tests if applicable
   - Document test coverage and assumptions
   - Implement test flakiness tracking if needed
   - Follow test directory structure conventions

5. **Documentation Layer**
   - Update API documentation
   - Document resource permissions
   - Add examples of resource usage
   - Update database schema documentation
   - Document UI components and props
   - Update test documentation
   - Follow standardized documentation formatting
   - Update schema visualizations

### Recommended Extension Points

The system is designed to be extended in the following ways:

1. **New Resources**
   - Add new resource types in `/src/resources/`
   - Follow the Resource Registration pattern
   - Implement required interfaces
   - Register with the Resource Registry service
   - Follow the pure permission-based approach in CORE_ARCHITECTURE.md

2. **Custom Permissions**
   - Extend permission types in `/src/types/resource-permissions.ts`
   - Add permission checking logic
   - Update permission UI components
   - Document new permissions
   - Ensure permissions follow the DAG structure described in CORE_ARCHITECTURE.md

3. **UI Extensions**
   - Add new pages in `/src/pages/`
   - Create new components in `/src/components/`
   - Extend the navigation in `/src/components/layout/`
   - Follow UI component standards
   - Adhere to component size limits in CORE_ARCHITECTURE.md

4. **API Extensions**
   - Create new API controllers in `/src/services/`
   - Extend existing controllers as needed
   - Document API changes
   - Update OpenAPI specifications
   - Follow the API standards described in CORE_ARCHITECTURE.md

5. **Workflow Extensions**
   - Add new workflows in appropriate resource services
   - Update form wizards for multi-step processes
   - Document workflow requirements and states
   - Implement appropriate validation and error handling
   - Follow the form system guidelines in CORE_ARCHITECTURE.md

## Developer and AI Guidance

### Architecture Documentation

The project architecture is documented in the following locations:

1. **Core Principles**: `/src/docs/PRINCIPLES.md`
2. **API Standards**: `/src/docs/API_STANDARDS.md`
3. **UI Standards**: `/src/docs/UI_STANDARDS.md`
4. **Testing Framework**: `/src/docs/TEST_FRAMEWORK.md`
5. **Security Guidelines**: `/src/docs/SECURITY_STANDARDS.md`
6. **Database Structure**: `/src/docs/DATABASE_STRUCTURE.md`

### Code Standards and Practices

- **Atomicity**: All code changes should be atomic and focused on a specific feature or fix
- **Traceability**: Code changes should reference documentation or issues
- **Documentation**: Non-obvious code sections must include comments referencing documentation
- **Testing**: All code changes must include appropriate tests
- **Performance**: Performance implications must be considered and documented

### Conventions vs. Rules

Throughout the documentation, we distinguish between:

- **Rules** (🔒): Must be followed without exception
- **Conventions** (📋): Recommended practices with some flexibility
- **Guidelines** (💡): Suggestions that may be adapted as needed

### Project Glossary

| Term | Definition |
|------|------------|
| Resource | A core data entity in the system with standard CRUD operations |
| Permission | A specific action that can be performed on a resource |
| Role | A collection of permissions assigned to users |
| Tenant | A logical isolation of data and configuration in multi-tenant deployments |
| RLS | Row-Level Security, database-enforced access control |
| SuperAdmin | User role with full system access |
| RBAC | Role-Based Access Control system |

## Compliance and Governance

### Code Review Standards
- All cloned projects must maintain the same code review standards
- Required reviewers for security-sensitive changes
- Automated compliance checks in CI pipeline
- Documentation updates required for all significant changes

### Audit Requirements
- Maintain audit trail of all configuration changes
- Document compliance requirements for each deployment
- Maintain history of security-relevant modifications
- Regular security reviews scheduled and documented

### Governance Model
- Document project ownership and responsibilities
- Establish change management process
- Define emergency change procedures
- Document approval workflows for significant changes

## Related Documentation

For a comprehensive understanding of the project architecture and extension guidelines:

- **[CORE_ARCHITECTURE.md](CORE_ARCHITECTURE.md)**: Core architectural principles and patterns
- **[SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md)**: Detailed security implementation guidelines
- **[AUDIT_LOGGING.md](AUDIT_LOGGING.md)**: Audit logging framework and database schema
- **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)**: Development phases and priorities
- **[RBAC_SYSTEM.md](RBAC_SYSTEM.md)**: Role-based access control system details
- **[SCHEMA_MANAGEMENT.md](SCHEMA_MANAGEMENT.md)**: Database schema management practices
