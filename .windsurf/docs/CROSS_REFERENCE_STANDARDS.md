
# Documentation Cross-Reference Standards

> **Version**: 3.1.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the updated standards for cross-referencing between documentation files to ensure consistency, navigability, and AI-friendly navigation across the entire documentation set.

## Cross-Reference Formats

### Absolute Path Standard (REQUIRED)

All cross-references MUST use absolute paths from the docs root to prevent confusion when files are moved:

1. **Standard Format**:
   - Format: `[Document Title](src/docs/path/to/DOCUMENT_NAME.md)`
   - Example: `[Core Architecture](src/docs/CORE_ARCHITECTURE.md)`

2. **Subdirectory References**:
   - Format: `[Document Title](src/docs/directory/DOCUMENT_NAME.md)`
   - Example: `[Role Architecture](src/docs/rbac/ROLE_ARCHITECTURE.md)`

3. **Deep Path References**:
   - Format: `[Document Title](src/docs/directory/subdirectory/DOCUMENT_NAME.md)`
   - Example: `[Core Algorithm](src/docs/rbac/permission-resolution/CORE_ALGORITHM.md)`

### Deprecated Path Formats

❌ **Do NOT use these formats:**
- Relative paths: `../security/AUTH_SYSTEM.md`
- Root relative: `/docs/CORE_ARCHITECTURE.md`
- Missing src/docs prefix: `rbac/README.md`

## Standard Reference Blocks

### Related Documentation Section

Each document should include a "Related Documentation" section using absolute paths:

```markdown
## Related Documentation

- **[Core Architecture](src/docs/CORE_ARCHITECTURE.md)**: Core architectural principles
- **[RBAC System](src/docs/rbac/README.md)**: RBAC system overview
- **[Security System](src/docs/security/AUTH_SYSTEM.md)**: Authentication system details
```

### Cross-System Integration References

```markdown
## Integration Points

- **Security Integration**: See [Security RBAC Integration](src/docs/integration/SECURITY_RBAC_INTEGRATION.md)
- **Audit Integration**: See [RBAC Audit Integration](src/docs/integration/RBAC_AUDIT_INTEGRATION.md)
```

## AI Navigation Aids

### Document Maps

Reference phase-specific document maps for AI navigation:

```markdown
## Implementation Guide

For AI implementation, see:
- **[Phase 1 Map](src/docs/implementation/phase1/DOCUMENT_MAP.md)**: Foundation implementation
- **[Phase 2 Map](src/docs/implementation/phase2/DOCUMENT_MAP.md)**: Core features implementation
```

## Related Documentation

- **[KNOWLEDGE_GRAPH.md](src/docs/KNOWLEDGE_GRAPH.md)**: Complete knowledge graph of document relationships
- **[DOCUMENTATION_MAP.md](src/docs/DOCUMENTATION_MAP.md)**: Documentation structure overview
- **[VERSION_COMPATIBILITY.md](src/docs/VERSION_COMPATIBILITY.md)**: Version compatibility matrix

## Version History

- **3.1.0**: Made absolute path format mandatory and deprecated relative paths (2025-05-23)
- **3.0.0**: Standardized to absolute path format for all references (2025-05-23)
- **2.0.0**: Updated to absolute path standard and added knowledge graph integration (2025-05-23)
- **1.0.0**: Initial cross-reference standards (2025-05-22)
