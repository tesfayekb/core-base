
# Practical Resource Integration Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

This guide provides a complete step-by-step walkthrough for adding a new resource to the system, using "Projects" as a concrete example. Follow this guide to understand the complete integration process with actual code examples.

## Example: Adding a "Projects" Resource

### Step 1: Define Resource Schema and Types

**File: `src/types/Project.ts`**
```typescript
import { z } from 'zod';

// Zod schema for validation
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']),
  owner_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// TypeScript interface
export interface Project extends z.infer<typeof ProjectSchema> {}

// Create/Update schemas
export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({
  tenant_id: true,
  owner_id: true
});

export interface CreateProject extends z.infer<typeof CreateProjectSchema> {}
export interface UpdateProject extends z.infer<typeof UpdateProjectSchema> {}
```

### Step 2: Database Migration

**File: `src/migrations/20250524000001_create_projects.sql`**
```sql
-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY projects_tenant_isolation ON projects
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      -- User has permission to view projects
      check_user_permission(auth.uid(), 'projects', 'ViewAny')
      OR
      -- User is the owner
      owner_id = auth.uid()
      OR
      -- User has specific permission for this project
      check_resource_permission(auth.uid(), 'projects', 'View', id::text)
    )
  );

CREATE POLICY projects_insert_policy ON projects
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND check_user_permission(auth.uid(), 'projects', 'Create')
  );

CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      check_user_permission(auth.uid(), 'projects', 'UpdateAny')
      OR
      (owner_id = auth.uid() AND check_user_permission(auth.uid(), 'projects', 'UpdateOwn'))
    )
  );

CREATE POLICY projects_delete_policy ON projects
  FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      check_user_permission(auth.uid(), 'projects', 'DeleteAny')
      OR
      (owner_id = auth.uid() AND check_user_permission(auth.uid(), 'projects', 'DeleteOwn'))
    )
  );

-- Updated at trigger
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();
```

### Step 3: Resource Registration

**File: `src/services/resources/ProjectResource.ts`**
```typescript
import { BaseResource, ResourceMetadata } from './BaseResource';
import { Project, ProjectSchema, CreateProject, UpdateProject } from '../../types/Project';

export class ProjectResource extends BaseResource<Project, CreateProject, UpdateProject> {
  constructor() {
    super('projects', ProjectSchema);
  }

  // Custom validation logic
  protected async validateCreate(data: CreateProject, context: ResourceContext): Promise<ValidationResult> {
    const baseValidation = await super.validateCreate(data, context);
    if (!baseValidation.isValid) return baseValidation;

    // Custom business logic validation
    if (data.name.toLowerCase().includes('test') && context.tenantType === 'production') {
      return {
        isValid: false,
        errors: ['Test projects not allowed in production tenants']
      };
    }

    return { isValid: true };
  }

  // Custom hooks
  protected async beforeCreate(data: CreateProject, context: ResourceContext): Promise<CreateProject> {
    // Auto-set owner to current user if not specified
    return {
      ...data,
      owner_id: data.owner_id || context.userId,
      tenant_id: context.tenantId
    };
  }

  protected async afterCreate(resource: Project, context: ResourceContext): Promise<void> {
    // Send notification, update metrics, etc.
    await this.auditLogger.log({
      action: 'project_created',
      resourceType: 'projects',
      resourceId: resource.id,
      userId: context.userId,
      tenantId: context.tenantId,
      metadata: { projectName: resource.name }
    });
  }
}

// Register the resource
export const projectResource = new ProjectResource();
```

### Step 4: Service Layer Implementation

**File: `src/services/ProjectService.ts`**
```typescript
import { supabase } from '../integrations/supabase/client';
import { Project, CreateProject, UpdateProject } from '../types/Project';
import { StandardResult } from '../types/StandardResult';
import { checkPermission } from './PermissionService';

export class ProjectService {
  async getProjects(tenantId: string, userId: string): Promise<StandardResult<Project[]>> {
    try {
      // Check permission
      const hasPermission = await checkPermission({
        userId,
        tenantId,
        resourceType: 'projects',
        action: 'ViewAny'
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      // Set tenant context
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      // Query projects
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as Project[] };
    } catch (error) {
      console.error('Error fetching projects:', error);
      return { success: false, error: 'Failed to fetch projects' };
    }
  }

  async createProject(
    data: CreateProject,
    tenantId: string,
    userId: string
  ): Promise<StandardResult<Project>> {
    try {
      // Check permission
      const hasPermission = await checkPermission({
        userId,
        tenantId,
        resourceType: 'projects',
        action: 'Create'
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      // Set tenant context
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      // Create project
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          ...data,
          owner_id: userId,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: project as Project };
    } catch (error) {
      console.error('Error creating project:', error);
      return { success: false, error: 'Failed to create project' };
    }
  }

  async updateProject(
    id: string,
    data: UpdateProject,
    tenantId: string,
    userId: string
  ): Promise<StandardResult<Project>> {
    try {
      // Check permission
      const hasPermission = await checkPermission({
        userId,
        tenantId,
        resourceType: 'projects',
        action: 'UpdateAny',
        resourceId: id
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      // Set tenant context
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      // Update project
      const { data: project, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: project as Project };
    } catch (error) {
      console.error('Error updating project:', error);
      return { success: false, error: 'Failed to update project' };
    }
  }

  async deleteProject(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<StandardResult<void>> {
    try {
      // Check permission
      const hasPermission = await checkPermission({
        userId,
        tenantId,
        resourceType: 'projects',
        action: 'DeleteAny',
        resourceId: id
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      // Set tenant context
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: 'Failed to delete project' };
    }
  }
}

export const projectService = new ProjectService();
```

### Step 5: React Hooks

**File: `src/hooks/useProjects.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/ProjectService';
import { Project, CreateProject, UpdateProject } from '../types/Project';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useProjects() {
  const { user, currentTenantId } = useAuth();
  
  return useQuery({
    queryKey: ['projects', currentTenantId],
    queryFn: async () => {
      if (!user || !currentTenantId) throw new Error('Not authenticated');
      
      const result = await projectService.getProjects(currentTenantId, user.id);
      if (!result.success) throw new Error(result.error);
      
      return result.data;
    },
    enabled: !!user && !!currentTenantId
  });
}

export function useCreateProject() {
  const { user, currentTenantId } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateProject) => {
      if (!user || !currentTenantId) throw new Error('Not authenticated');
      
      const result = await projectService.createProject(data, currentTenantId, user.id);
      if (!result.success) throw new Error(result.error);
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentTenantId] });
      toast.success('Project created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    }
  });
}

export function useUpdateProject() {
  const { user, currentTenantId } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProject }) => {
      if (!user || !currentTenantId) throw new Error('Not authenticated');
      
      const result = await projectService.updateProject(id, data, currentTenantId, user.id);
      if (!result.success) throw new Error(result.error);
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentTenantId] });
      toast.success('Project updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update project: ${error.message}`);
    }
  });
}

export function useDeleteProject() {
  const { user, currentTenantId } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !currentTenantId) throw new Error('Not authenticated');
      
      const result = await projectService.deleteProject(id, currentTenantId, user.id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentTenantId] });
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    }
  });
}
```

### Step 6: UI Components

**File: `src/components/projects/ProjectList.tsx`**
```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useProjects } from '../../hooks/useProjects';
import { Project } from '../../types/Project';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { PermissionGuard } from '../auth/PermissionGuard';

interface ProjectListProps {
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
}

export function ProjectList({ onCreateProject, onEditProject, onDeleteProject }: ProjectListProps) {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">Error loading projects: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Projects</h2>
        <PermissionGuard resource="projects" action="Create">
          <Button onClick={onCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </PermissionGuard>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">No projects found</p>
            <PermissionGuard resource="projects" action="Create">
              <Button onClick={onCreateProject} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create your first project
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                )}
                <div className="flex gap-2">
                  <PermissionGuard resource="projects" action="UpdateAny" resourceId={project.id}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditProject(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard resource="projects" action="DeleteAny" resourceId={project.id}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteProject(project)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Integration Checklist

### ✅ Phase 1: Foundation
- [ ] Define TypeScript interfaces and Zod schemas
- [ ] Create database migration with proper RLS policies
- [ ] Register resource in the resource registry
- [ ] Define permission structure

### ✅ Phase 2: Business Logic
- [ ] Implement service layer with permission checks
- [ ] Create React Query hooks for data management
- [ ] Implement validation and business rules
- [ ] Add audit logging integration

### ✅ Phase 3: User Interface
- [ ] Create CRUD UI components
- [ ] Implement permission-aware UI elements
- [ ] Add form validation and error handling
- [ ] Integrate with navigation and routing

### ✅ Phase 4: Testing
- [ ] Generate automated test scaffolding
- [ ] Implement unit tests for business logic
- [ ] Create integration tests for API endpoints
- [ ] Add E2E tests for user workflows

### ✅ Phase 5: Documentation
- [ ] Document API endpoints and schemas
- [ ] Create user documentation
- [ ] Add developer integration notes
- [ ] Update system architecture documentation

## Next Steps

1. **Follow the templates** in the companion documents for faster implementation
2. **Use the CLI tools** (when available) for scaffolding
3. **Test thoroughly** using the generated test suites
4. **Update permissions** in your RBAC system as needed
5. **Monitor performance** and optimize queries as the resource grows

## Related Documentation

- [Resource Code Templates](RESOURCE_CODE_TEMPLATES.md)
- [Resource Integration Checklist](RESOURCE_INTEGRATION_CHECKLIST.md)
- [Resource CLI Tools](RESOURCE_CLI_TOOLS.md)
- [Test Scaffolding](../TEST_SCAFFOLDING.md)
- [RBAC Integration](../rbac/PERMISSION_IMPLEMENTATION_GUIDE.md)
