
# Role Architecture

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the architecture for role definitions, classifications, and management within the RBAC system.

## Role Architecture

### System Roles

#### SuperAdmin Role
- **Access Scope**: Complete system access architecture
- **Protection Model**: Immutable role design
- **Resource Access**: Universal access framework for all resources

#### BasicUser Role
- **Access Design**: Default minimum permission set
- **Scope Limitation**: Personal data access framework
- **Permission Boundaries**: Limited scope architecture

### Custom Roles Architecture

The system provides an architecture for custom role creation:
- **System-Level Roles**: Platform-wide standardized roles
- **Entity-Level Roles**: Entity-specific custom roles
- **Mixed Roles**: Entity customizations of system-level roles

## Role Data Model

```
roles(
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)
```

## Role Assignment Model

```
user_roles(
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES users(id),
  UNIQUE(user_id, role_id)
)
```

## Role Management Interfaces

### Administrative Interface
- **Role Creation**: Define new role templates
- **Role Configuration**: Assign permissions to roles
- **Role Assignment**: Associate roles with users
- **Role Management**: Manage role permissions directly (no hierarchy)

### Self-Service Interface
- **Role Request**: Request access to roles
- **Role Acceptance**: Accept responsibility for roles
- **Role Delegation**: Temporarily delegate role responsibilities

## Role Lifecycle Management

1. **Creation Phase**:
   - Role definition (name, description)
   - Permission assignment
   - Boundary configuration
   
2. **Operational Phase**:
   - User assignment
   - Permission updates
   - Boundary adjustments
   
3. **Retirement Phase**:
   - Deprecation notice
   - User migration
   - Deactivation

## Permission Assignment

The system implements a **direct permission assignment model**:

1. **No Hierarchical Inheritance**: Permissions are directly assigned to roles without hierarchical inheritance
2. **Union-Based Resolution**: Users with multiple roles have the union of all permissions from their roles  
3. **Explicit Permissions**: All permissions must be explicitly granted to roles

## Related Documentation

- **[README.md](README.md)**: RBAC system overview
- **[PERMISSION_TYPES.md](PERMISSION_TYPES.md)**: Permission taxonomy and implementation
- **[PERMISSION_RESOLUTION.md](PERMISSION_RESOLUTION.md)**: How permissions are resolved for users
- **[ENTITY_BOUNDARIES.md](ENTITY_BOUNDARIES.md)**: Entity-level permission isolation and boundaries

## Version History

- **1.1.0**: Updated to clarify direct permission assignment model
- **1.0.0**: Initial document created from RBAC_SYSTEM.md refactoring
