
# AI Implementation Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

This document provides concrete implementation examples for key concepts in the system to help AI development platforms understand the practical application of the architecture.

## Authentication Implementation

### User Authentication Flow

```typescript
// User authentication implementation
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '../services/AuditLogger';

interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  session?: Record<string, any>;
  requiresMFA?: boolean;
}

export class AuthenticationService {
  constructor(
    private supabase: SupabaseClient,
    private auditLogger: AuditLogger
  ) {}
  
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // 1. Attempt authentication
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        // 2. Log failed attempt
        await this.auditLogger.log({
          eventType: 'authentication',
          action: 'sign_in',
          status: 'failed',
          metadata: {
            reason: error.message,
            email // Redacted in logs
          }
        });
        
        return {
          success: false,
          error: error.message
        };
      }
      
      // 3. Log successful authentication
      await this.auditLogger.log({
        eventType: 'authentication',
        userId: data.user?.id,
        action: 'sign_in',
        status: 'success'
      });
      
      // 4. Return success with session
      return {
        success: true,
        userId: data.user?.id,
        session: data.session
      };
    } catch (e) {
      // 5. Handle unexpected errors
      const error = e as Error;
      
      await this.auditLogger.log({
        eventType: 'authentication',
        action: 'sign_in',
        status: 'error',
        metadata: {
          error: error.message
        }
      });
      
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }
}
```

## Permission System Implementation

### Permission Check Hook

```typescript
// React hook for permission checking
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { usePermissionCache } from './usePermissionCache';

export function usePermission(
  resourceType: string,
  action: string,
  resourceId?: string
): {
  hasPermission: boolean;
  isLoading: boolean;
  error?: string;
} {
  const { user, tenantId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { checkCache, updateCache } = usePermissionCache();
  
  const checkPermission = useCallback(async () => {
    if (!user) {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 1. Check permission cache first
      const cacheKey = `${user.id}:${tenantId}:${resourceType}:${action}:${resourceId || 'any'}`;
      const cachedValue = checkCache(cacheKey);
      
      if (cachedValue !== undefined) {
        setHasPermission(cachedValue);
        setIsLoading(false);
        return;
      }
      
      // 2. If not in cache, check via API
      const response = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resourceType,
          action,
          resourceId,
          tenantId
        })
      });
      
      if (!response.ok) {
        throw new Error('Permission check failed');
      }
      
      const { granted } = await response.json();
      
      // 3. Update cache and state
      updateCache(cacheKey, granted);
      setHasPermission(granted);
      setError(undefined);
    } catch (e) {
      const error = e as Error;
      setError(error.message);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, tenantId, resourceType, action, resourceId, checkCache, updateCache]);
  
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);
  
  return { hasPermission, isLoading, error };
}
```

### Permission Component Gate

```typescript
// Permission gate component for conditional rendering
import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionGateProps {
  resourceType: string;
  action: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  resourceType,
  action,
  resourceId,
  children,
  fallback
}) => {
  const { hasPermission, isLoading } = usePermission(resourceType, action, resourceId);
  
  if (isLoading) {
    return <div className="loading">Checking permissions...</div>;
  }
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
};
```

## Multi-Tenant Implementation

### Multi-Tenant API Controller

```typescript
// Base API controller with multi-tenant support
import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/PermissionService';
import { AuditLogger } from '../services/AuditLogger';

export abstract class MultiTenantApiController {
  constructor(
    protected permissionService: PermissionService,
    protected auditLogger: AuditLogger,
    protected resourceType: string
  ) {}
  
  protected async checkPermission(
    req: Request,
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    const userId = req.user?.id;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      return false;
    }
    
    return this.permissionService.checkPermission({
      userId,
      resourceType: this.resourceType,
      action,
      resourceId,
      tenantId
    });
  }
  
  protected logAccess(req: Request, action: string, status: 'success' | 'denied' | 'error'): void {
    const userId = req.user?.id;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    this.auditLogger.log({
      eventType: 'api_access',
      userId: userId || 'anonymous',
      tenantId,
      resource: this.resourceType,
      action,
      status,
      metadata: {
        path: req.path,
        method: req.method,
        ip: req.ip
      }
    });
  }
  
  // Standard handler with permission check
  protected createHandler(action: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 1. Check permission
        const hasPermission = await this.checkPermission(req, action);
        
        if (!hasPermission) {
          this.logAccess(req, action, 'denied');
          return res.status(403).json({ error: 'Permission denied' });
        }
        
        // 2. Apply tenant filter to query
        const tenantId = req.headers['x-tenant-id'] as string;
        req.tenantContext = { tenantId };
        
        // 3. Proceed with handler
        this.logAccess(req, action, 'success');
        next();
      } catch (e) {
        const error = e as Error;
        this.logAccess(req, action, 'error');
        res.status(500).json({ error: error.message });
      }
    };
  }
}
```

## Audit Logging Implementation

### Structured Audit Logger

```typescript
// Structured audit logger implementation
import { v4 as uuidv4 } from 'uuid';

interface AuditEventBase {
  eventType: string;
  userId?: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  status?: 'success' | 'failed' | 'error' | 'denied';
  metadata?: Record<string, any>;
}

interface StoredAuditEvent extends AuditEventBase {
  id: string;
  timestamp: string;
  environmentId: string;
  applicationVersion: string;
}

export class AuditLogger {
  constructor(
    private storageAdapter: AuditStorageAdapter,
    private applicationVersion: string,
    private environmentId: string,
    private piiProcessor: PiiProcessor
  ) {}
  
  async log(event: AuditEventBase): Promise<string> {
    // 1. Generate event ID and timestamp
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    // 2. Sanitize PII in metadata
    const sanitizedMetadata = event.metadata 
      ? this.piiProcessor.sanitize(event.metadata)
      : undefined;
    
    // 3. Create structured event
    const storedEvent: StoredAuditEvent = {
      ...event,
      id,
      timestamp,
      environmentId: this.environmentId,
      applicationVersion: this.applicationVersion,
      metadata: sanitizedMetadata
    };
    
    // 4. Store event
    await this.storageAdapter.store(storedEvent);
    
    // 5. Return event ID
    return id;
  }
}
```

## RBAC Implementation

### Role Permission Management

```typescript
// Role permission management service
import { Database } from '../database';

interface RolePermission {
  roleId: string;
  resourceType: string;
  action: string;
}

export class RolePermissionService {
  constructor(private db: Database) {}
  
  async grantPermission(roleId: string, resourceType: string, action: string): Promise<void> {
    // 1. Get resource ID from type
    const { data: resource } = await this.db
      .from('resources')
      .select('id')
      .eq('name', resourceType)
      .single();
    
    if (!resource) {
      throw new Error(`Resource ${resourceType} not found`);
    }
    
    // 2. Get permission ID
    const { data: permission } = await this.db
      .from('permissions')
      .select('id')
      .eq('resource_id', resource.id)
      .eq('action', action)
      .single();
    
    if (!permission) {
      throw new Error(`Permission ${action} not found for resource ${resourceType}`);
    }
    
    // 3. Grant permission to role
    const { error } = await this.db.from('role_permissions').insert({
      role_id: roleId,
      permission_id: permission.id
    });
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return; // Permission already exists
      }
      throw new Error(`Failed to grant permission: ${error.message}`);
    }
  }
  
  async revokePermission(roleId: string, resourceType: string, action: string): Promise<void> {
    // Implementation for revoking permissions
    // ...
  }
  
  async listRolePermissions(roleId: string): Promise<RolePermission[]> {
    // Implementation for listing role permissions
    // ...
    return [];
  }
}
```

## Related Documentation

- **[AI_DEVELOPMENT_GUIDE.md](AI_DEVELOPMENT_GUIDE.md)**: Navigation guide for AI platforms
- **[AI_STRUCTURED_KNOWLEDGE.md](AI_STRUCTURED_KNOWLEDGE.md)**: Structured knowledge representation

## Version History

- **1.0.0**: Initial implementation examples (2025-05-22)
