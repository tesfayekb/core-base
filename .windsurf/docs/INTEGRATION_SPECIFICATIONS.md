
# Component Integration Specifications

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Important Notice

This document has been reorganized into smaller, focused documents for better maintainability and clarity.

Please refer to the new structure in the [integration directory](integration/README.md).

## Canonical Event Architecture Reference

**CRITICAL**: All system integrations MUST use the canonical event architecture defined in [integration/EVENT_ARCHITECTURE.md](integration/EVENT_ARCHITECTURE.md). This is the single source of truth for all event-driven integration across the entire system.

## Primary Integration Documents

- [Integration Overview](integration/OVERVIEW.md)
- [Security and RBAC Integration](integration/SECURITY_RBAC_INTEGRATION.md)
- [RBAC and Audit Integration](integration/RBAC_AUDIT_INTEGRATION.md)
- [Security and Audit Integration](integration/SECURITY_AUDIT_INTEGRATION.md)
- **[Event Architecture](integration/EVENT_ARCHITECTURE.md) - CANONICAL REFERENCE FOR ALL EVENT-DRIVEN INTEGRATION**
- [API Contracts](integration/API_CONTRACTS.md)
- [Technical Dependencies](integration/TECHNICAL_DEPENDENCIES.md)
- [Documentation Map](integration/DOCUMENTATION_MAP.md)

## Security Implementation Structure

The security implementation documentation has been reorganized into the following structure:

- [Security Overview](security/OVERVIEW.md)
- [Authentication and Authorization](security/AUTH_SYSTEM.md)
- [Data Protection](security/DATA_PROTECTION.md)
- [Input Validation](security/INPUT_VALIDATION.md)
- [Security Monitoring](security/SECURITY_MONITORING.md)
- [Multi-tenant Role Management](security/MULTI_TENANT_ROLES.md)
- [Error Handling Standards](security/ERROR_HANDLING.md) - **Canonical reference for standardized error handling across all components**

## Multitenancy Implementation

For multitenancy implementation details, refer to:

- [Multitenancy Overview](multitenancy/README.md)
- [Data Isolation](multitenancy/DATA_ISOLATION.md) - **Canonical reference for tenant data isolation including user profile isolation**
- [Database Query Patterns](multitenancy/DATABASE_QUERY_PATTERNS.md) - **Canonical reference for multi-tenant database queries**
- [Entity Boundaries](rbac/ENTITY_BOUNDARIES.md) - **Canonical reference for entity boundary implementation**

## Integration Core Principles

All integrations between system components must adhere to these core principles:

1. **Canonical Event Architecture**: ALL event-driven integration must follow [Event Architecture](integration/EVENT_ARCHITECTURE.md)
2. **Standardized Error Handling**: Follow the patterns defined in [Error Handling Standards](security/ERROR_HANDLING.md)
3. **Consistent Log Formats**: Adhere to formats defined in [Log Format Standardization](audit/LOG_FORMAT_STANDARDIZATION.md)
4. **Optimized Permission Queries**: Implement according to [Permission Query Optimization](rbac/PERMISSION_QUERY_OPTIMIZATION.md) and [Permission Dependencies](rbac/PERMISSION_DEPENDENCIES.md)
5. **Multi-tenant Data Access**: Follow patterns in [Database Query Patterns](multitenancy/DATABASE_QUERY_PATTERNS.md)

For user management and multitenancy integration with security, refer to:
- [User Management Overview](user-management/README.md)
- [Core User Model](user-management/CORE_USER_MODEL.md)
- [User Extensions](user-management/USER_EXTENSIONS.md)

## Event Architecture Consolidation

**IMPORTANT CHANGE**: All duplicate event pattern documentation has been removed. The following documents now reference [integration/EVENT_ARCHITECTURE.md](integration/EVENT_ARCHITECTURE.md) as the single canonical source:

- ✅ `security/SECURITY_EVENTS.md` - Updated to extend canonical patterns
- ✅ `integration/RBAC_AUDIT_INTEGRATION.md` - Updated to use canonical event architecture
- ✅ `integration/SECURITY_RBAC_INTEGRATION.md` - Updated to use canonical event architecture
- ✅ All other integration documents reference canonical patterns

## Related Documentation

- [Core Architecture](CORE_ARCHITECTURE.md)
- [RBAC System](rbac/README.md)
- [Security Implementation](security/README.md)
- [Audit Logging Framework](audit/README.md)

## Version History

- **2.0.0**: Consolidated all event architecture to single canonical reference in EVENT_ARCHITECTURE.md, removed duplicate event patterns (2025-05-23)
- **1.6.0**: Added Integration Core Principles section highlighting canonical cross-component standards (2025-05-22)
- **1.5.0**: Added Database Query Patterns as canonical reference for multi-tenant database queries (2025-05-22)
- **1.4.0**: Added reference to ERROR_HANDLING.md for standardized error handling (2025-05-22)
- **1.3.0**: Added explicit references to security implementation structure and multitenancy integration (2025-05-22)
- **1.2.0**: Updated to specify EVENT_ARCHITECTURE.md as the canonical reference for event-driven integration (2025-05-22)
- **1.1.0**: Refactored into smaller, focused documents with redirections
- **1.0.0**: Initial integration specifications
