
# RBAC System Diagrams

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-23

This directory contains visual diagrams that complement the RBAC system documentation, illustrating key concepts in a visual format to enhance understanding of the system's architecture.

## Available Diagrams

1. [Permission Resolution Flow](PERMISSION_RESOLUTION_FLOW.md) - Shows how permissions are resolved when a user has multiple roles
2. [Caching Architecture](CACHING_ARCHITECTURE.md) - Illustrates the multi-level caching system for permissions
3. [Entity Boundary Enforcement](ENTITY_BOUNDARY_ENFORCEMENT.md) - Demonstrates how permission boundaries are enforced

## Usage

These diagrams use Mermaid markdown syntax, which renders as interactive diagrams when viewed in compatible markdown viewers (such as GitHub, GitLab, or dedicated documentation tools).

When viewing these diagrams in a compatible renderer, users can:
- Zoom in/out for better visibility
- Export diagrams as images
- View the diagram source code
- Navigate the diagrams interactively

## Implementation Notes

These diagrams are designed to complement the written documentation by providing visual representations of complex concepts. They should be updated whenever the underlying systems change to ensure accuracy.

## Related Documentation

- [RBAC System Overview](../README.md)
- [Permission Resolution](../permission-resolution/README.md)
- [Caching Strategy](../CACHING_STRATEGY.md)
- [Entity Boundaries](../ENTITY_BOUNDARIES.md)
- [Security: Multi-Tenant Roles](../../security/MULTI_TENANT_ROLES.md)
- [Performance: Strategies](../../audit/PERFORMANCE_STRATEGIES.md)

## Version History

- **1.1.0**: Updated related documentation links to follow cross-reference standards (2025-05-23)
- **1.0.0**: Initial creation of RBAC system diagrams
