
# Documentation Map

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-22

This document has been refactored into smaller, more focused documentation maps for better maintainability and navigation.

## Organization of Documentation Maps

For detailed documentation mapping, please refer to the specialized maps in the [documentation-maps](documentation-maps/) directory:

- [Core Architecture Map](documentation-maps/CORE_ARCHITECTURE_MAP.md): Central architecture documents
- [RBAC System Map](documentation-maps/RBAC_SYSTEM_MAP.md): Role-based access control documentation
- [Security System Map](documentation-maps/SECURITY_SYSTEM_MAP.md): Security implementation documentation
- [Audit System Map](documentation-maps/AUDIT_SYSTEM_MAP.md): Audit logging documentation
- [Multi-Tenant Map](documentation-maps/MULTI_TENANT_MAP.md): Multi-tenant implementation documentation
- [Integration Map](documentation-maps/INTEGRATION_MAP.md): System integration documentation
- [Implementation Map](documentation-maps/IMPLEMENTATION_MAP.md): Implementation phases and decisions
- [Mobile Map](documentation-maps/MOBILE_MAP.md): Mobile application documentation
- [Testing Map](documentation-maps/TESTING_MAP.md): Testing strategies and approaches
- [User Management Map](documentation-maps/USER_MANAGEMENT_MAP.md): User management documentation

## Core Documentation Structure

The overall documentation structure remains organized as:

```
project-plan/
├── README.md                  # Entry point and overview
├── DOCUMENTATION_MAP.md       # This file - navigation guide
├── CORE_ARCHITECTURE.md       # System architecture principles
├── DEVELOPMENT_ROADMAP.md     # Timeline and milestones
├── INTEGRATION_SPECIFICATIONS.md # Component integration details
├── RBAC_SYSTEM.md             # Access control framework
├── TECHNOLOGIES.md            # Technology stack decisions
├── SCHEMA_MANAGEMENT.md       # Database schema approach
├── TEST_FRAMEWORK.md          # Testing strategy
├── UI_STANDARDS.md            # UI design guidelines
├── CLONING_GUIDELINES.md      # Project reproduction guidelines
├── GLOSSARY.md                # Terminology standardization
├── VERSION_COMPATIBILITY.md   # Version compatibility matrix
├── CROSS_REFERENCE_STANDARDS.md # Documentation cross-reference standards
├── implementation/            # Implementation details by phase
├── security/                  # Security implementation details
├── rbac/                      # RBAC implementation details
├── audit/                     # Audit logging framework
├── multitenancy/              # Multi-tenant implementation 
├── data-model/                # Database model and schema
├── documentation-maps/        # Specialized documentation maps
├── mobile/                    # Mobile application strategy
├── testing/                   # Testing strategies
└── user-management/           # User management documentation
```

## How to Use Documentation Maps

1. **Begin with the README.md** for the project overview
2. **Consult this document** to understand the overall documentation structure
3. **Navigate to specialized maps** for detailed subsystem documentation:
   - For core architecture, see [Core Architecture Map](documentation-maps/CORE_ARCHITECTURE_MAP.md)
   - For RBAC documentation, see [RBAC System Map](documentation-maps/RBAC_SYSTEM_MAP.md)
   - For security documentation, see [Security System Map](documentation-maps/SECURITY_SYSTEM_MAP.md)
   - For specific subsystem details, follow links in the specialized maps

## Cross-System Integration

For documentation about how systems integrate with each other, refer to:
- [Integration Map](documentation-maps/INTEGRATION_MAP.md): Comprehensive integration documentation
- [INTEGRATION_SPECIFICATIONS.md](INTEGRATION_SPECIFICATIONS.md): High-level integration details

## Version Compatibility

For compatibility information between document versions, refer to:
- [VERSION_COMPATIBILITY.md](VERSION_COMPATIBILITY.md): Version compatibility matrix

## Documentation Standards

For documentation standards, refer to:
- [CROSS_REFERENCE_STANDARDS.md](CROSS_REFERENCE_STANDARDS.md): Documentation linking conventions

## Version History

- **2.0.0**: Refactored into specialized documentation maps (2025-05-22)
- **1.5.0**: Added comprehensive RBAC and multi-tenancy document relationships
- **1.4.0**: Added VERSION_COMPATIBILITY.md reference and updated version guidance
- **1.3.0**: Added integration specifications document and updated relationship diagrams
- **1.2.0**: Standardized all document references with consistent relative paths and file extensions
- **1.1.0**: Added detailed integration diagrams and enhanced cross-references
- **1.0.3**: Fixed path inconsistencies and improved cross-references
- **1.0.2**: Enhanced diagram clarity and navigation guidance
- **1.0.1**: Added document type descriptions
- **1.0.0**: Initial documentation map
