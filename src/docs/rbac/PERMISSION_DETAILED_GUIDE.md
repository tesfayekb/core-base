
# Detailed Permission Implementation Guide

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Advanced permission system implementation after completing the quick start. Covers caching, optimization, and complex scenarios.

## Advanced Caching Strategy

### Multi-Level Caching

```typescript
export class AdvancedPermissionService {
  private memoryCache = new Map<string, boolean>();
  private redisCache: Redis;
  
  async checkPermissionWithCaching(
    userId: string,
    resource: string,
    action: string,
    tenantId?: string
  ): Promise<boolean> {
    const cacheKey = `perm:${userId}:${tenantId}:${resource}:${action}`;
    
    // 1. Memory cache (fastest)
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }
    
    // 2. Redis cache (fast)
    const cached = await this.redisCache.get(cacheKey);
    if (cached !== null) {
      const result = cached === 'true';
      this.memoryCache.set(cacheKey, result);
      return result;
    }
    
    // 3. Database query (slower)
    const result = await this.checkPermissionFromDatabase(
      userId, resource, action, tenantId
    );
    
    // 4. Cache at both levels
    await this.redisCache.setex(cacheKey, 300, result.toString()); // 5 min
    this.memoryCache.set(cacheKey, result);
    
    return result;
  }
  
  async invalidateUserPermissions(userId: string, tenantId?: string): Promise<void> {
    const pattern = `perm:${userId}:${tenantId || '*'}:*`;
    
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`perm:${userId}:`)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear Redis cache
    const keys = await this.redisCache.keys(pattern);
    if (keys.length > 0) {
      await this.redisCache.del(...keys);
    }
  }
}
```

### Batch Permission Checks

```typescript
// Check multiple permissions at once
async function checkMultiplePermissions(
  userId: string,
  checks: Array<{resource: string, action: string}>,
  tenantId?: string
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  // Batch database query
  const { data } = await supabase.rpc('check_multiple_permissions', {
    p_user_id: userId,
    p_checks: checks,
    p_tenant_id: tenantId
  });
  
  // Process results
  checks.forEach((check, index) => {
    const key = `${check.resource}:${check.action}`;
    results[key] = data[index]?.has_permission || false;
  });
  
  return results;
}
```

## Performance Optimization

### Database Indexes

```sql
-- Essential indexes for performance
CREATE INDEX CONCURRENTLY idx_user_roles_user_tenant 
  ON user_roles(user_id, tenant_id);

CREATE INDEX CONCURRENTLY idx_role_permissions_role 
  ON role_permissions(role_id);

CREATE INDEX CONCURRENTLY idx_permissions_resource_action 
  ON permissions(resource_id, action);

-- Composite index for permission resolution
CREATE INDEX CONCURRENTLY idx_permission_resolution 
  ON user_roles(user_id, tenant_id) 
  INCLUDE (role_id);
```

### Query Optimization

```sql
-- Optimized permission check with proper joins
CREATE OR REPLACE FUNCTION check_user_permission_optimized(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT,
  p_tenant_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Use EXISTS for better performance
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = p_user_id
    AND (p_tenant_id IS NULL OR ur.tenant_id = p_tenant_id)
    AND EXISTS (
      SELECT 1
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN resources r ON p.resource_id = r.id
      WHERE rp.role_id = ur.role_id
      AND r.name = p_resource
      AND p.action = p_action
    )
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Complex Permission Scenarios

### Resource-Specific Permissions

```typescript
// Check permission for specific resource instance
async function checkResourcePermission(
  userId: string,
  resource: string,
  action: string,
  resourceId: string,
  tenantId?: string
): Promise<boolean> {
  // 1. Check general permission first
  const hasGeneralPermission = await checkPermission(
    userId, resource, action, tenantId
  );
  
  if (!hasGeneralPermission) return false;
  
  // 2. Check resource-specific rules
  switch (resource) {
    case 'articles':
      return await checkArticleAccess(userId, resourceId, action);
    case 'users':
      return await checkUserAccess(userId, resourceId, action, tenantId);
    default:
      return hasGeneralPermission;
  }
}

async function checkArticleAccess(
  userId: string,
  articleId: string,
  action: string
): Promise<boolean> {
  // Owner can edit their own articles
  if (action === 'update' || action === 'delete') {
    const { data: article } = await supabase
      .from('articles')
      .select('author_id')
      .eq('id', articleId)
      .single();
      
    return article?.author_id === userId;
  }
  
  return true; // View access already checked
}
```

### Conditional Permissions

```typescript
// Permissions that depend on data state
async function checkConditionalPermission(
  userId: string,
  resource: string,
  action: string,
  resourceId: string,
  tenantId?: string
): Promise<boolean> {
  // Base permission check
  const hasBasePermission = await checkPermission(
    userId, resource, action, tenantId
  );
  
  if (!hasBasePermission) return false;
  
  // Additional conditions
  switch (`${resource}:${action}`) {
    case 'orders:cancel':
      return await canCancelOrder(resourceId);
    case 'invoices:edit':
      return await canEditInvoice(resourceId);
    default:
      return true;
  }
}

async function canCancelOrder(orderId: string): Promise<boolean> {
  const { data: order } = await supabase
    .from('orders')
    .select('status, created_at')
    .eq('id', orderId)
    .single();
    
  if (!order) return false;
  
  // Can only cancel pending orders within 24 hours
  const isRecent = new Date(order.created_at) > 
    new Date(Date.now() - 24 * 60 * 60 * 1000);
    
  return order.status === 'pending' && isRecent;
}
```

## Testing Advanced Scenarios

```typescript
describe('Advanced Permission Scenarios', () => {
  describe('Resource-specific permissions', () => {
    it('should allow authors to edit their own articles', async () => {
      const authorId = 'author-123';
      const articleId = await createTestArticle(authorId);
      
      const canEdit = await checkResourcePermission(
        authorId, 'articles', 'update', articleId
      );
      
      expect(canEdit).toBe(true);
    });
    
    it('should prevent non-authors from editing articles', async () => {
      const authorId = 'author-123';
      const otherId = 'other-456';
      const articleId = await createTestArticle(authorId);
      
      const canEdit = await checkResourcePermission(
        otherId, 'articles', 'update', articleId
      );
      
      expect(canEdit).toBe(false);
    });
  });
  
  describe('Conditional permissions', () => {
    it('should allow canceling recent pending orders', async () => {
      const orderId = await createTestOrder('pending');
      
      const canCancel = await checkConditionalPermission(
        'user-123', 'orders', 'cancel', orderId
      );
      
      expect(canCancel).toBe(true);
    });
  });
});
```

## Monitoring and Analytics

```typescript
// Permission check analytics
export class PermissionAnalytics {
  async logPermissionCheck(
    userId: string,
    resource: string,
    action: string,
    result: boolean,
    duration: number
  ): Promise<void> {
    await supabase.from('permission_analytics').insert({
      user_id: userId,
      resource,
      action,
      result,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  }
  
  async getPermissionStats(
    dateRange: { start: Date; end: Date }
  ): Promise<PermissionStats> {
    const { data } = await supabase
      .from('permission_analytics')
      .select(`
        resource,
        action,
        result,
        AVG(duration_ms) as avg_duration,
        COUNT(*) as total_checks
      `)
      .gte('timestamp', dateRange.start.toISOString())
      .lte('timestamp', dateRange.end.toISOString())
      .group(['resource', 'action', 'result']);
      
    return this.processStats(data);
  }
}
```

## Related Documentation

- **Quick Start**: `PERMISSION_QUICK_START.md`
- **Patterns**: `PERMISSION_PATTERNS.md`
- **Multi-tenant Integration**: `../multitenancy/ADVANCED_CHECKLIST.md`
- **Performance**: `PERFORMANCE_OPTIMIZATION.md`

This detailed guide covers advanced permission scenarios beyond the basic implementation.
