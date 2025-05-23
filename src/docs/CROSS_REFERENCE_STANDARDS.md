
# Documentation Cross-Reference Standards

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines the standards for cross-referencing between documentation files to ensure consistency, navigability, and maintainability across the entire documentation set.

## Cross-Reference Formats

### Internal References

References to other documents within the project-plan directory should use relative paths:

1. **Same-Directory References**:
   - Format: `[Document Title](DOCUMENT_NAME.md)`
   - Example: `[Core Architecture](CORE_ARCHITECTURE.md)`

2. **Child-Directory References**:
   - Format: `[Document Title](directory/DOCUMENT_NAME.md)`
   - Example: `[Role Architecture](rbac/ROLE_ARCHITECTURE.md)`

3. **Parent-Directory References**:
   - Format: `[Document Title](../DOCUMENT_NAME.md)`
   - Example: `[RBAC System](../rbac/README.md)`

4. **Cross-Directory References**:
   - Format: `[Document Title](../other-directory/DOCUMENT_NAME.md)`
   - Example: `[Authentication System](../security/AUTH_SYSTEM.md)`

### Section References

References to specific sections within documents:

1. **Within-Document Section References**:
   - Format: `[Section Title](#section-anchor)`
   - Example: `[Permission Model](#permission-model)`

2. **External Document Section References**:
   - Format: `[Document Title: Section Name](path/to/DOCUMENT.md#section-anchor)`
   - Example: `[Role Architecture: Role Types](rbac/ROLE_ARCHITECTURE.md#role-types)`

## Cross-Reference Guidelines

### Path Construction

1. **Always Use Relative Paths**:
   - All internal document references must use relative paths
   - Start with the location of the current document
   - Navigate to the target document using `../` for parent directories

2. **Never Use Absolute Paths**:
   - Do not use absolute paths starting with `/`
   - This ensures portability across different environments

3. **Always Include File Extension**:
   - Include `.md` extension for all Markdown files
   - Example: `DOCUMENT_NAME.md` not just `DOCUMENT_NAME`

### Reference Text

1. **Use Descriptive Link Text**:
   - Link text should describe the target document
   - Example: `[Role Architecture](rbac/ROLE_ARCHITECTURE.md)` not `[click here](rbac/ROLE_ARCHITECTURE.md)`

2. **Match Document Titles**:
   - Link text should typically match the title of the target document
   - Example: For a document titled "Role Architecture", use `[Role Architecture](rbac/ROLE_ARCHITECTURE.md)`

3. **Include Context When Needed**:
   - Add context when referencing similar documents from different systems
   - Example: `[Security: Authentication System](security/AUTH_SYSTEM.md)` vs `[User Management: Authentication](user-management/AUTHENTICATION.md)`

## Standard Reference Blocks

### Related Documentation Section

Each document should include a "Related Documentation" section near the end:

```markdown
## Related Documentation

- **[DOCUMENT1.md](DOCUMENT1.md)**: Brief description of relationship
- **[directory/DOCUMENT2.md](directory/DOCUMENT2.md)**: Brief description of relationship
- **[../directory/DOCUMENT3.md](../directory/DOCUMENT3.md)**: Brief description of relationship
```

Example:

```markdown
## Related Documentation

- **[CORE_ARCHITECTURE.md](CORE_ARCHITECTURE.md)**: Core architectural principles
- **[rbac/README.md](rbac/README.md)**: RBAC system overview
- **[security/AUTH_SYSTEM.md](security/AUTH_SYSTEM.md)**: Authentication system details
```

### Cross-System Integration References

For documents at system boundaries, include explicit integration references:

```markdown
## Integration Points

- **Security Integration**: See [security/RBAC_INTEGRATION.md](security/RBAC_INTEGRATION.md)
- **Audit Integration**: See [audit/SECURITY_INTEGRATION.md](audit/SECURITY_INTEGRATION.md)
```

## Navigation Aids

### Document Maps

Include navigation guidance in README files:

```markdown
## Documentation Structure

This system's documentation is organized as follows:

1. **[README.md](README.md)**: This overview document
2. **[COMPONENT1.md](COMPONENT1.md)**: Component 1 details
3. **[COMPONENT2.md](COMPONENT2.md)**: Component 2 details
4. **[subdirectory/README.md](subdirectory/README.md)**: Subdirectory overview
```

### Version Compatibility References

Reference version compatibility when relevant:

```markdown
For compatible versions of related documents, please refer to [VERSION_COMPATIBILITY.md](VERSION_COMPATIBILITY.md).
```

## Cross-Reference Validation

To maintain integrity of cross-references:

1. **Validate Before Committing**:
   - Ensure all referenced documents exist
   - Check that relative paths are correct
   - Verify that section anchors exist in target documents

2. **Update References When Moving Documents**:
   - When moving or renaming a document, update all references to it
   - Use search tools to find all references to the document

3. **Handle Deleted Documents**:
   - Before deleting a document, identify and update all references to it
   - Provide alternative references when a document is removed

## Examples of Standard References

### Example 1: Reference from System README to Component Document

In `rbac/README.md`:

```markdown
The permission resolution process is detailed in [Permission Resolution](permission-resolution/README.md).
```

### Example 2: Reference from Component to Related System

In `rbac/permission-resolution/IMPLEMENTATION.md`:

```markdown
For integration with the security system, see [Security RBAC Integration](../../integration/SECURITY_RBAC_INTEGRATION.md).
```

### Example 3: Reference from One System to Another

In `security/AUTH_SYSTEM.md`:

```markdown
After authentication, permission resolution is handled by the RBAC system as described in [Permission Resolution](../rbac/permission-resolution/README.md).
```

## Related Documentation

- **[DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md)**: Documentation structure overview
- **[GLOBAL_DOCUMENTATION_MAP.md](GLOBAL_DOCUMENTATION_MAP.md)**: Complete documentation map
- **[VERSION_COMPATIBILITY.md](VERSION_COMPATIBILITY.md)**: Version compatibility matrix

## Version History

- **1.0.0**: Initial cross-reference standards (2025-05-22)
