
# Global Documentation Map

> **Version**: 4.0.0  
> **Last Updated**: 2025-05-23

## Official Implementation Path

The **only** official implementation path is:

- **[ai-development/AUTHORITATIVE_IMPLEMENTATION_PATH.md](ai-development/AUTHORITATIVE_IMPLEMENTATION_PATH.md)**

All implementations must follow this path exactly. This document provides the single source of truth for implementation sequence, validation checkpoints, and integration strategy.

## Documentation Hierarchy

For reference purposes, this project follows a three-tier documentation structure:

### 1. Master Entry Points
High-level guides and starting points that provide overview and navigation.

### 2. Implementation Guides
Phase-specific, actionable instructions organized by implementation phase.

### 3. Reference Documents
Detailed specifications, standards, and component-specific documentation.

## Canonical References

These are the definitive specifications for key subsystems:

- **[audit/LOG_FORMAT_STANDARDIZATION.md](audit/LOG_FORMAT_STANDARDIZATION.md)**: Audit log format
- **[integration/EVENT_CORE_PATTERNS.md](integration/EVENT_CORE_PATTERNS.md)**: Event patterns
- **[rbac/ROLE_ARCHITECTURE.md](rbac/ROLE_ARCHITECTURE.md)**: RBAC architecture
- **[data-model/DATABASE_SCHEMA.md](data-model/DATABASE_SCHEMA.md)**: Database schema
- **[implementation/AUDIT_INTEGRATION_CHECKLIST.md](implementation/AUDIT_INTEGRATION_CHECKLIST.md)**: Audit requirements
- **[ui/DESIGN_SYSTEM.md](ui/DESIGN_SYSTEM.md)**: UI design system
- **[multitenancy/DATA_ISOLATION.md](multitenancy/DATA_ISOLATION.md)**: Multi-tenant isolation

## For AI Implementation

When implementing features:

1. **Follow only the authoritative implementation path**
   - [ai-development/AUTHORITATIVE_IMPLEMENTATION_PATH.md](ai-development/AUTHORITATIVE_IMPLEMENTATION_PATH.md)
   - Implement exactly in the order specified

2. **Reference canonical specifications**
   - Use canonical references for specifications
   - Do not modify canonical references

3. **Validate against success criteria**
   - Check implementation against phase success criteria
   - Run tests specified in testing guides

## Related Documentation

- **[DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md)**: Detailed documentation structure
- **[VERSION_COMPATIBILITY.md](VERSION_COMPATIBILITY.md)**: Version compatibility matrix
- **[CROSS_REFERENCE_STANDARDS.md](CROSS_REFERENCE_STANDARDS.md)**: Documentation standards

## Version History

- **4.0.0**: Established single authoritative implementation path (2025-05-23)
- **3.0.0**: Implemented three-tier documentation hierarchy (2025-05-23)
- **2.0.0**: Refactored to reference specialized documentation maps (2025-05-22)
- **1.0.0**: Initial global documentation map (2025-05-22)
