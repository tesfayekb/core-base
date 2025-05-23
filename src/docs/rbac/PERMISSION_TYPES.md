
# Permission Types

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines the standardized permission taxonomy used throughout the RBAC system.

## Permission Type Architecture

The system defines a standardized permission taxonomy:

### Standard Permission Types

- **View**: Single resource viewing permission
- **ViewAny**: Collection viewing permission
- **Create**: Resource creation permission
- **Update**: Resource modification permission
- **Delete**: Resource removal permission
- **DeleteAny**: Collection deletion permission
- **Restore**: Soft-deleted resource restoration permission
- **Replicate**: Resource duplication permission
- **Export**: Data export permission
- **Import**: Data import permission
- **BulkEdit**: Mass update permission
- **BulkDelete**: Mass deletion permission
- **Manage**: Administrative permission

### Permission Type Implementation

```typescript
// Permission type enum
enum PermissionType {
  View = 'View',
  ViewAny = 'ViewAny',
  Create = 'Create',
  Update = 'Update',
  Delete = 'Delete',
  DeleteAny = 'DeleteAny',
  Restore = 'Restore',
  Replicate = 'Replicate',
  Export = 'Export',
  Import = 'Import',
  BulkEdit = 'BulkEdit',
  BulkDelete = 'BulkDelete',
  Manage = 'Manage'
}

// Permission interface
interface Permission {
  id: string;
  resource_id: string;
  action: PermissionType;
  created_at?: Date;
  updated_at?: Date;
}
```

## Permission Assignment Architecture

The permission system implements a direct assignment model:
- **Direct Assignment**: Permissions are directly assigned to roles without inheritance
- **Resource-Specific Permissions**: Each resource defines its own set of available permissions
- **Role-Based Access**: Users access resources based on their assigned role's permissions
- **Dynamic Management**: Permissions can be dynamically granted or revoked through the admin interface

## Permission Functional Dependencies

While permissions are assigned directly to roles without automatic inheritance, there are logical functional dependencies between certain permission types. These dependencies should be considered during permission assignment and validation.

For example:
- The `Update` permission has a functional dependency on the `View` permission
- The `DeleteAny` permission has a functional dependency on the `ViewAny` permission

For a comprehensive definition of permission functional dependencies, see [PERMISSION_DEPENDENCIES.md](PERMISSION_DEPENDENCIES.md).

## Permission Data Model

```
permissions(
  id UUID PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource_id, action)
)
```

## Role-Permission Association Model

```
role_permissions(
  id UUID PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES users(id),
  UNIQUE(role_id, permission_id)
)
```

## Permission UI Integration

### Permission Display Names

The system provides user-friendly display names for technical permission actions:

```typescript
const getActionDisplayName = (action: string): string => {
  const displayNames: Record<string, string> = {
    'View': 'View Single',
    'ViewAny': 'View All',
    'Create': 'Create',
    'Update': 'Update',
    'Delete': 'Delete Single',
    'DeleteAny': 'Delete Any',
    'Restore': 'Restore',
    'Replicate': 'Duplicate',
    'Export': 'Export',
    'Import': 'Import',
    'BulkEdit': 'Bulk Edit',
    'BulkDelete': 'Bulk Delete',
    'Manage': 'Manage'
  };
  
  return displayNames[action] || action;
};
```

### Permission Icons

Visual indicators for permission types:

```typescript
const getActionIcon = (action: string): string => {
  const icons: Record<string, string> = {
    'View': 'eye',
    'ViewAny': 'list',
    'Create': 'plus-circle',
    'Update': 'edit',
    'Delete': 'trash',
    'DeleteAny': 'trash-2',
    'Restore': 'refresh-cw',
    'Replicate': 'copy',
    'Export': 'download',
    'Import': 'upload',
    'BulkEdit': 'edit-3',
    'BulkDelete': 'trash',
    'Manage': 'settings'
  };
  
  return icons[action] || 'help-circle';
};
```

## Related Documentation

- **[README.md](README.md)**: RBAC system overview
- **[ROLE_ARCHITECTURE.md](ROLE_ARCHITECTURE.md)**: Role definition and structure
- **[PERMISSION_DEPENDENCIES.md](PERMISSION_DEPENDENCIES.md)**: Explicit definition of permission functional dependencies
- **[PERMISSION_RESOLUTION.md](PERMISSION_RESOLUTION.md)**: How permissions are resolved for users
- **[DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md)**: Database design and optimization for permissions

## Version History

- **1.1.0**: Added reference to PERMISSION_DEPENDENCIES.md (2025-05-22)
- **1.0.0**: Initial document created from RBAC_SYSTEM.md refactoring

