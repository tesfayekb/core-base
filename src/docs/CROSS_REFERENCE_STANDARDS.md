
# Documentation Cross-Reference Standards

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the updated standards for cross-referencing between documentation files to ensure consistency, navigability, and AI-friendly navigation across the entire documentation set.

## Cross-Reference Formats

### Absolute Path Standard

All cross-references must use absolute paths from the docs root to prevent confusion when files are moved:

1. **Standard Format**:
   - Format: `[Document Title](docs/path/to/DOCUMENT_NAME.md)`
   - Example: `[Core Architecture](docs/CORE_ARCHITECTURE.md)`

2. **Subdirectory References**:
   - Format: `[Document Title](docs/directory/DOCUMENT_NAME.md)`
   - Example: `[Role Architecture](docs/rbac/ROLE_ARCHITECTURE.md)`

3. **Deep Path References**:
   - Format: `[Document Title](docs/directory/subdirectory/DOCUMENT_NAME.md)`
   - Example: `[Core Algorithm](docs/rbac/permission-resolution/CORE_ALGORITHM.md)`

### Section References

References to specific sections within documents:

1. **Within-Document Section References**:
   - Format: `[Section Title](#section-anchor)`
   - Example: `[Permission Model](#permission-model)`

2. **External Document Section References**:
   - Format: `[Document Title: Section Name](docs/path/to/DOCUMENT.md#section-anchor)`
   - Example: `[Role Architecture: Role Types](docs/rbac/ROLE_ARCHITECTURE.md#role-types)`

## Cross-Reference Guidelines

### Path Construction

1. **Always Use Absolute Paths from docs root**:
   - All internal document references must start with `docs/`
   - This ensures references work regardless of current file location
   - Example: `docs/rbac/ROLE_ARCHITECTURE.md` not `../rbac/ROLE_ARCHITECTURE.md`

2. **Always Include File Extension**:
   - Include `.md` extension for all Markdown files
   - Example: `DOCUMENT_NAME.md` not just `DOCUMENT_NAME`

3. **Use Forward Slashes**:
   - Always use forward slashes `/` for path separators
   - This ensures cross-platform compatibility

### Reference Text

1. **Use Descriptive Link Text**:
   - Link text should describe the target document
   - Example: `[Role Architecture](docs/rbac/ROLE_ARCHITECTURE.md)` not `[click here](docs/rbac/ROLE_ARCHITECTURE.md)`

2. **Match Document Titles**:
   - Link text should typically match the title of the target document
   - Example: For a document titled "Role Architecture", use `[Role Architecture](docs/rbac/ROLE_ARCHITECTURE.md)`

3. **Include Context When Needed**:
   - Add context when referencing similar documents from different systems
   - Example: `[Security: Authentication System](docs/security/AUTH_SYSTEM.md)` vs `[User Management: Authentication](docs/user-management/AUTHENTICATION.md)`

## Standard Reference Blocks

### Related Documentation Section

Each document should include a "Related Documentation" section using absolute paths:

```markdown
## Related Documentation

- **[Core Architecture](docs/CORE_ARCHITECTURE.md)**: Core architectural principles
- **[RBAC System](docs/rbac/README.md)**: RBAC system overview
- **[Security System](docs/security/AUTH_SYSTEM.md)**: Authentication system details
```

### Cross-System Integration References

For documents at system boundaries, include explicit integration references:

```markdown
## Integration Points

- **Security Integration**: See [Security RBAC Integration](docs/integration/SECURITY_RBAC_INTEGRATION.md)
- **Audit Integration**: See [RBAC Audit Integration](docs/integration/RBAC_AUDIT_INTEGRATION.md)
```

## Knowledge Graph Integration

### Relationship Declarations

Documents should declare their relationships explicitly:

```markdown
## Document Relationships

### Dependencies
- **Requires**: [Core Architecture](docs/CORE_ARCHITECTURE.md)
- **Built On**: [RBAC System](docs/RBAC_SYSTEM.md)

### Dependents
- **Required By**: [Permission Resolution](docs/rbac/PERMISSION_RESOLUTION.md)
- **Integrates With**: [Security System](docs/security/README.md)
```

## AI Navigation Aids

### Document Maps

Reference phase-specific document maps for AI navigation:

```markdown
## Implementation Guide

For AI implementation, see:
- **[Phase 1 Map](docs/implementation/phase1/DOCUMENT_MAP.md)**: Foundation implementation
- **[Phase 2 Map](docs/implementation/phase2/DOCUMENT_MAP.md)**: Core features implementation
```

### Context Management

Reference context management guidelines:

```markdown
## AI Context Guidelines

- **Maximum 3 documents per session**
- **Start with**: [Streamlined Implementation Guide](docs/ai-development/STREAMLINED_IMPLEMENTATION_GUIDE.md)
- **Follow**: [Context Management Strategy](docs/ai-development/CONTEXT_MANAGEMENT_STRATEGY.md)
```

## Migration from Relative Paths

### Before (Relative Paths)
```markdown
- [Role Architecture](../rbac/ROLE_ARCHITECTURE.md)
- [Security System](../../security/README.md)
```

### After (Absolute Paths)
```markdown
- [Role Architecture](docs/rbac/ROLE_ARCHITECTURE.md)
- [Security System](docs/security/README.md)
```

## Validation Rules

### Cross-Reference Validation

1. **Path Validation**:
   - All references must start with `docs/`
   - All references must include `.md` extension
   - All referenced files must exist

2. **Link Text Validation**:
   - Link text should match document title when possible
   - Link text should be descriptive and meaningful
   - Avoid generic text like "click here" or "see here"

3. **Section Anchor Validation**:
   - Section anchors must exist in target documents
   - Use kebab-case for section anchors
   - Anchor format: `#section-name`

## Examples of Standard References

### Example 1: System Overview to Component
```markdown
The RBAC system is detailed in [RBAC System Overview](docs/rbac/README.md).
```

### Example 2: Component to Integration
```markdown
For security integration, see [Security RBAC Integration](docs/integration/SECURITY_RBAC_INTEGRATION.md).
```

### Example 3: Implementation Reference
```markdown
Implementation details are in [Phase 1 Foundation](docs/implementation/phase1/DOCUMENT_MAP.md).
```

## Related Documentation

- **[KNOWLEDGE_GRAPH.md](docs/KNOWLEDGE_GRAPH.md)**: Complete knowledge graph of document relationships
- **[DOCUMENTATION_MAP.md](docs/DOCUMENTATION_MAP.md)**: Documentation structure overview
- **[VERSION_COMPATIBILITY.md](docs/VERSION_COMPATIBILITY.md)**: Version compatibility matrix

## Version History

- **2.0.0**: Updated to absolute path standard and added knowledge graph integration (2025-05-23)
- **1.0.0**: Initial cross-reference standards (2025-05-22)
