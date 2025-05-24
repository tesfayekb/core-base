
# Resource Code Templates

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Ready-to-use code templates for implementing new resources. Replace `{ResourceName}`, `{resourceName}`, and `{RESOURCE_NAME}` with your actual resource names.

## TypeScript Interface Template

**File: `src/types/{ResourceName}.ts`**
```typescript
import { z } from 'zod';

// Zod schema for validation
export const {ResourceName}Schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  owner_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// TypeScript interface
export interface {ResourceName} extends z.infer<typeof {ResourceName}Schema> {}

// Create/Update schemas
export const Create{ResourceName}Schema = {ResourceName}Schema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const Update{ResourceName}Schema = Create{ResourceName}Schema.partial().omit({
  tenant_id: true,
  owner_id: true
});

export interface Create{ResourceName} extends z.infer<typeof Create{ResourceName}Schema> {}
export interface Update{ResourceName} extends z.infer<typeof Update{ResourceName}Schema> {}
```

## Database Migration Template

**File: `src/migrations/{timestamp}_create_{resourceName}.sql`**
```sql
-- Create {resourceName} table
CREATE TABLE {resourceName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_{resourceName}_tenant_id ON {resourceName}(tenant_id);
CREATE INDEX idx_{resourceName}_owner_id ON {resourceName}(owner_id);
CREATE INDEX idx_{resourceName}_status ON {resourceName}(status);
CREATE INDEX idx_{resourceName}_tenant_status ON {resourceName}(tenant_id, status);

-- Enable RLS
ALTER TABLE {resourceName} ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY {resourceName}_tenant_isolation ON {resourceName}
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY {resourceName}_select_policy ON {resourceName}
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      check_user_permission(auth.uid(), '{resourceName}', 'ViewAny')
      OR owner_id = auth.uid()
      OR check_resource_permission(auth.uid(), '{resourceName}', 'View', id::text)
    )
  );

CREATE POLICY {resourceName}_insert_policy ON {resourceName}
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND check_user_permission(auth.uid(), '{resourceName}', 'Create')
  );

CREATE POLICY {resourceName}_update_policy ON {resourceName}
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      check_user_permission(auth.uid(), '{resourceName}', 'UpdateAny')
      OR (owner_id = auth.uid() AND check_user_permission(auth.uid(), '{resourceName}', 'UpdateOwn'))
    )
  );

CREATE POLICY {resourceName}_delete_policy ON {resourceName}
  FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      check_user_permission(auth.uid(), '{resourceName}', 'DeleteAny')
      OR (owner_id = auth.uid() AND check_user_permission(auth.uid(), '{resourceName}', 'DeleteOwn'))
    )
  );

-- Updated at trigger
CREATE TRIGGER {resourceName}_updated_at
  BEFORE UPDATE ON {resourceName}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger
CREATE TRIGGER {resourceName}_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON {resourceName}
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger();
```

## Service Layer Template

**File: `src/services/{ResourceName}Service.ts`**
```typescript
import { supabase } from '../integrations/supabase/client';
import { {ResourceName}, Create{ResourceName}, Update{ResourceName} } from '../types/{ResourceName}';
import { StandardResult } from '../types/StandardResult';
import { checkPermission } from './PermissionService';

export class {ResourceName}Service {
  async get{ResourceName}s(tenantId: string, userId: string): Promise<StandardResult<{ResourceName}[]>> {
    try {
      const hasPermission = await checkPermission({
        userId,
        tenantId,
        resourceType: '{resourceName}',
        action: 'ViewAny'
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      const { data, error } = await supabase
        .from('{resourceName}')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as {ResourceName}[] };
    } catch (error) {
      console.error('Error fetching {resourceName}:', error);
      return { success: false, error: 'Failed to fetch {resourceName}' };
    }
  }

  async create{ResourceName}(
    data: Create{ResourceName},
    tenantId: string,
    userId: string
  ): Promise<StandardResult<{ResourceName}>> {
    try {
      const hasPermission = await checkPermission({
        userId,
        tenantId,
        resourceType: '{resourceName}',
        action: 'Create'
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      const { data: result, error } = await supabase
        .from('{resourceName}')
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

      return { success: true, data: result as {ResourceName} };
    } catch (error) {
      console.error('Error creating {resourceName}:', error);
      return { success: false, error: 'Failed to create {resourceName}' };
    }
  }

  async update{ResourceName}(
    id: string,
    data: Update{ResourceName},
    tenantId: string,
    userId: string
  ): Promise<StandardResult<{ResourceName}>> {
    try {
      const hasPermission = await checkPermission({
        userId,
        tenantId,
        resourceType: '{resourceName}',
        action: 'UpdateAny',
        resourceId: id
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      const { data: result, error } = await supabase
        .from('{resourceName}')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: result as {ResourceName} };
    } catch (error) {
      console.error('Error updating {resourceName}:', error);
      return { success: false, error: 'Failed to update {resourceName}' };
    }
  }

  async delete{ResourceName}(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<StandardResult<void>> {
    try {
      const hasPermission = await checkPermission({
        userId,
        tenantId,
        resourceType: '{resourceName}',
        action: 'DeleteAny',
        resourceId: id
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      const { error } = await supabase
        .from('{resourceName}')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error deleting {resourceName}:', error);
      return { success: false, error: 'Failed to delete {resourceName}' };
    }
  }
}

export const {resourceName}Service = new {ResourceName}Service();
```

## React Hooks Template

**File: `src/hooks/use{ResourceName}.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {resourceName}Service } from '../services/{ResourceName}Service';
import { {ResourceName}, Create{ResourceName}, Update{ResourceName} } from '../types/{ResourceName}';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function use{ResourceName}s() {
  const { user, currentTenantId } = useAuth();
  
  return useQuery({
    queryKey: ['{resourceName}', currentTenantId],
    queryFn: async () => {
      if (!user || !currentTenantId) throw new Error('Not authenticated');
      
      const result = await {resourceName}Service.get{ResourceName}s(currentTenantId, user.id);
      if (!result.success) throw new Error(result.error);
      
      return result.data;
    },
    enabled: !!user && !!currentTenantId
  });
}

export function useCreate{ResourceName}() {
  const { user, currentTenantId } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Create{ResourceName}) => {
      if (!user || !currentTenantId) throw new Error('Not authenticated');
      
      const result = await {resourceName}Service.create{ResourceName}(data, currentTenantId, user.id);
      if (!result.success) throw new Error(result.error);
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{resourceName}', currentTenantId] });
      toast.success('{ResourceName} created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create {resourceName}: ${error.message}`);
    }
  });
}

export function useUpdate{ResourceName}() {
  const { user, currentTenantId } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Update{ResourceName} }) => {
      if (!user || !currentTenantId) throw new Error('Not authenticated');
      
      const result = await {resourceName}Service.update{ResourceName}(id, data, currentTenantId, user.id);
      if (!result.success) throw new Error(result.error);
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{resourceName}', currentTenantId] });
      toast.success('{ResourceName} updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update {resourceName}: ${error.message}`);
    }
  });
}

export function useDelete{ResourceName}() {
  const { user, currentTenantId } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !currentTenantId) throw new Error('Not authenticated');
      
      const result = await {resourceName}Service.delete{ResourceName}(id, currentTenantId, user.id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{resourceName}', currentTenantId] });
      toast.success('{ResourceName} deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete {resourceName}: ${error.message}`);
    }
  });
}
```

## UI Components Template

**File: `src/components/{resourceName}/{ResourceName}List.tsx`**
```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { use{ResourceName}s } from '../../hooks/use{ResourceName}';
import { {ResourceName} } from '../../types/{ResourceName}';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { PermissionGuard } from '../auth/PermissionGuard';

interface {ResourceName}ListProps {
  onCreate{ResourceName}: () => void;
  onEdit{ResourceName}: (item: {ResourceName}) => void;
  onDelete{ResourceName}: (item: {ResourceName}) => void;
}

export function {ResourceName}List({ onCreate{ResourceName}, onEdit{ResourceName}, onDelete{ResourceName} }: {ResourceName}ListProps) {
  const { data: items, isLoading, error } = use{ResourceName}s();

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
        <p className="text-destructive">Error loading {resourceName}: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{ResourceName}s</h2>
        <PermissionGuard resource="{resourceName}" action="Create">
          <Button onClick={onCreate{ResourceName}}>
            <Plus className="h-4 w-4 mr-2" />
            Create {ResourceName}
          </Button>
        </PermissionGuard>
      </div>

      {!items || items.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-muted-foreground">No {resourceName} found</p>
            <PermissionGuard resource="{resourceName}" action="Create">
              <Button onClick={onCreate{ResourceName}} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create your first {resourceName}
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                )}
                <div className="flex gap-2">
                  <PermissionGuard resource="{resourceName}" action="UpdateAny" resourceId={item.id}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit{ResourceName}(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard resource="{resourceName}" action="DeleteAny" resourceId={item.id}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete{ResourceName}(item)}
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

**File: `src/components/{resourceName}/{ResourceName}Form.tsx`**
```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Create{ResourceName}Schema, Create{ResourceName}, {ResourceName} } from '../../types/{ResourceName}';

interface {ResourceName}FormProps {
  onSubmit: (data: Create{ResourceName}) => void;
  onCancel: () => void;
  initialData?: Partial<{ResourceName}>;
  isLoading?: boolean;
}

export function {ResourceName}Form({ onSubmit, onCancel, initialData, isLoading }: {ResourceName}FormProps) {
  const form = useForm<Create{ResourceName}>({
    resolver: zodResolver(Create{ResourceName}Schema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      status: initialData?.status || 'active',
      metadata: initialData?.metadata || {}
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter {resourceName} name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter {resourceName} description" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

## Test Template

**File: `src/tests/{resourceName}/{ResourceName}.test.ts`**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { {resourceName}Service } from '../../services/{ResourceName}Service';
import { Create{ResourceName} } from '../../types/{ResourceName}';

describe('{ResourceName}Service', () => {
  const testTenantId = 'test-tenant-id';
  const testUserId = 'test-user-id';
  
  const testData: Create{ResourceName} = {
    name: 'Test {ResourceName}',
    description: 'Test description',
    status: 'active',
    metadata: { test: true }
  };

  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  describe('create{ResourceName}', () => {
    it('should create a {resourceName} successfully', async () => {
      const result = await {resourceName}Service.create{ResourceName}(testData, testTenantId, testUserId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(testData.name);
        expect(result.data.tenant_id).toBe(testTenantId);
        expect(result.data.owner_id).toBe(testUserId);
      }
    });

    it('should fail without proper permissions', async () => {
      // Test permission failure scenario
    });
  });

  describe('get{ResourceName}s', () => {
    it('should retrieve {resourceName}s for tenant', async () => {
      const result = await {resourceName}Service.get{ResourceName}s(testTenantId, testUserId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });
  });

  describe('update{ResourceName}', () => {
    it('should update a {resourceName} successfully', async () => {
      // Create a {resourceName} first
      const createResult = await {resourceName}Service.create{ResourceName}(testData, testTenantId, testUserId);
      
      if (createResult.success) {
        const updateData = { name: 'Updated Name' };
        const result = await {resourceName}Service.update{ResourceName}(
          createResult.data.id,
          updateData,
          testTenantId,
          testUserId
        );
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(updateData.name);
        }
      }
    });
  });

  describe('delete{ResourceName}', () => {
    it('should delete a {resourceName} successfully', async () => {
      // Create a {resourceName} first
      const createResult = await {resourceName}Service.create{ResourceName}(testData, testTenantId, testUserId);
      
      if (createResult.success) {
        const result = await {resourceName}Service.delete{ResourceName}(
          createResult.data.id,
          testTenantId,
          testUserId
        );
        
        expect(result.success).toBe(true);
      }
    });
  });
});
```

## Usage Instructions

1. **Copy the appropriate template**
2. **Replace placeholders**:
   - `{ResourceName}` → Your resource name (PascalCase, e.g., "Project")
   - `{resourceName}` → Your resource name (camelCase, e.g., "project")
   - `{RESOURCE_NAME}` → Your resource name (UPPER_CASE, e.g., "PROJECT")
3. **Customize fields** based on your specific resource requirements
4. **Add custom validation** and business logic as needed
5. **Update permissions** in your RBAC system
6. **Test thoroughly** using the provided test templates

## Related Documentation

- [Practical Resource Integration Guide](PRACTICAL_RESOURCE_INTEGRATION_GUIDE.md)
- [Resource Integration Checklist](RESOURCE_INTEGRATION_CHECKLIST.md)
- [Core Patterns](../ai-development/CORE_PATTERNS.md)
