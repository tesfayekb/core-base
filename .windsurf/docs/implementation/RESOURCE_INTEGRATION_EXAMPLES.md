
# Resource Integration Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Concrete examples of resource integration patterns with actual implementation code.

## Example 1: Simple Resource (Tasks)

### TypeScript Definition
```typescript
// src/types/Task.ts
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string().datetime().optional(),
  owner_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export interface Task extends z.infer<typeof TaskSchema> {}
export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
export interface CreateTask extends z.infer<typeof CreateTaskSchema> {}
```

### Database Migration
```sql
-- 20250524000001_create_tasks.sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMPTZ,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes and RLS policies...
```

### Service Implementation
```typescript
// src/services/TaskService.ts
export class TaskService {
  async getTasks(tenantId: string, userId: string): Promise<StandardResult<Task[]>> {
    const hasPermission = await checkPermission({
      userId, tenantId, resourceType: 'tasks', action: 'ViewAny'
    });

    if (!hasPermission) {
      return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    return error 
      ? { success: false, error: error.message }
      : { success: true, data: data as Task[] };
  }
}
```

## Example 2: Complex Resource (Projects with Teams)

### Relationship Modeling
```typescript
// src/types/Project.ts
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'archived']),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  budget: z.number().optional(),
  team_lead_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Project team members relationship
export const ProjectTeamMemberSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['member', 'lead', 'observer']),
  joined_at: z.string().datetime(),
  tenant_id: z.string().uuid()
});
```

### Advanced Database Schema
```sql
-- Projects with team relationships
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'planning',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget DECIMAL(15,2),
  team_lead_id UUID REFERENCES auth.users(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  UNIQUE(project_id, user_id)
);
```

## Example 3: Resource with File Attachments

### File Integration Pattern
```typescript
// src/types/Document.ts
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  file_url: z.string().url().optional(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  tags: z.array(z.string()).default([]),
  category: z.enum(['contract', 'invoice', 'report', 'other']),
  owner_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});
```

### File Upload Service Integration
```typescript
// src/services/DocumentService.ts
export class DocumentService {
  async createDocumentWithFile(
    documentData: CreateDocument,
    file: File,
    tenantId: string,
    userId: string
  ): Promise<StandardResult<Document>> {
    try {
      // 1. Upload file to storage
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`${tenantId}/${userId}/${file.name}`, file);

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      // 2. Create document record
      const documentWithFile: CreateDocument = {
        ...documentData,
        file_url: fileData.path,
        file_size: file.size,
        mime_type: file.type,
        owner_id: userId,
        tenant_id: tenantId
      };

      const result = await this.createDocument(documentWithFile, tenantId, userId);
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to create document with file' };
    }
  }
}
```

## Integration Patterns Summary

### Simple Resources
- Basic CRUD operations
- Standard permission patterns
- Minimal relationships

### Complex Resources
- Multiple entity relationships
- Advanced business logic
- Custom validation rules

### File-Enabled Resources
- Storage integration
- File metadata tracking
- Upload/download workflows

### Audit-Heavy Resources
- Enhanced audit logging
- Change tracking
- Compliance reporting

## Related Documentation

- [Practical Resource Integration Guide](PRACTICAL_RESOURCE_INTEGRATION_GUIDE.md)
- [Resource Code Templates](RESOURCE_CODE_TEMPLATES.md)
- [Quick Integration Checklist](RESOURCE_INTEGRATION_QUICK_CHECKLIST.md)
