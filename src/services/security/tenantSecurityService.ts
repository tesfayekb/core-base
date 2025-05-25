
// Tenant Security Service
// Phase 1.6: Multi-Tenant Foundation Security Implementation

import { supabase } from '../database/connection';
import { tenantContextService } from '../database/tenantContext';

export interface TenantAccessContext {
  userId: string;
  requestedTenantId: string;
  currentTenantId?: string;
  operation: string;
  resourceType?: string;
  resourceId?: string;
}

export interface TenantAccessResult {
  allowed: boolean;
  reason: string;
  securityViolation?: boolean;
}

export interface DataIsolationResult {
  allowed: boolean;
  reason: string;
  modifiedQuery?: string;
  modifiedParameters?: any[];
}

export class TenantSecurityService {
  private static instance: TenantSecurityService;

  static getInstance(): TenantSecurityService {
    if (!TenantSecurityService.instance) {
      TenantSecurityService.instance = new TenantSecurityService();
    }
    return TenantSecurityService.instance;
  }

  async validateTenantAccess(context: TenantAccessContext): Promise<TenantAccessResult> {
    try {
      // Check if user has access to the requested tenant
      const hasAccess = await this.checkUserTenantAccess(
        context.userId,
        context.requestedTenantId
      );

      if (!hasAccess) {
        return {
          allowed: false,
          reason: 'User does not have access to requested tenant',
          securityViolation: true
        };
      }

      // Check for suspicious patterns
      const isSuspicious = this.detectSuspiciousActivity(context);
      if (isSuspicious) {
        return {
          allowed: false,
          reason: 'Suspicious access pattern detected',
          securityViolation: true
        };
      }

      // Validate operation permissions
      const hasOperationPermission = await this.validateOperationPermission(context);
      if (!hasOperationPermission) {
        return {
          allowed: false,
          reason: 'Insufficient permissions for requested operation'
        };
      }

      return {
        allowed: true,
        reason: 'Access granted'
      };
    } catch (error) {
      console.error('Tenant access validation error:', error);
      return {
        allowed: false,
        reason: 'Validation error occurred',
        securityViolation: true
      };
    }
  }

  async validateTenantSwitch(
    userId: string,
    currentTenantId: string | null,
    targetTenantId: string
  ): Promise<TenantAccessResult> {
    try {
      // Prevent switching to the same tenant
      if (currentTenantId === targetTenantId) {
        return {
          allowed: true,
          reason: 'Already in target tenant context'
        };
      }

      // Check user access to target tenant
      const hasAccess = await this.checkUserTenantAccess(userId, targetTenantId);
      if (!hasAccess) {
        return {
          allowed: false,
          reason: 'User does not have access to target tenant',
          securityViolation: true
        };
      }

      // Check for rapid switching patterns (potential security issue)
      const isRapidSwitching = await this.detectRapidTenantSwitching(userId);
      if (isRapidSwitching) {
        return {
          allowed: false,
          reason: 'Rapid tenant switching detected - potential security risk',
          securityViolation: true
        };
      }

      return {
        allowed: true,
        reason: 'Tenant switch authorized'
      };
    } catch (error) {
      console.error('Tenant switch validation error:', error);
      return {
        allowed: false,
        reason: 'Switch validation failed',
        securityViolation: true
      };
    }
  }

  async enforceDataIsolation(
    userId: string,
    tenantId: string,
    query: string,
    parameters: any[] = []
  ): Promise<DataIsolationResult> {
    try {
      // Check if query is safe for multi-tenant environment
      const queryAnalysis = this.analyzeQuery(query);
      
      if (queryAnalysis.containsSuspiciousPatterns) {
        return {
          allowed: false,
          reason: 'Query contains suspicious patterns'
        };
      }

      // Ensure tenant context is set
      const contextResult = await tenantContextService.setTenantContext(tenantId);
      if (!contextResult.success) {
        return {
          allowed: false,
          reason: 'Failed to set tenant context'
        };
      }

      // For select queries, ensure they include tenant filtering
      if (queryAnalysis.isSelectQuery && !queryAnalysis.hasTenantFilter) {
        const modifiedQuery = this.addTenantFilter(query, tenantId);
        const modifiedParameters = [...parameters, tenantId];
        
        return {
          allowed: true,
          reason: 'Query modified for tenant isolation',
          modifiedQuery,
          modifiedParameters
        };
      }

      return {
        allowed: true,
        reason: 'Query is safe for execution'
      };
    } catch (error) {
      console.error('Data isolation enforcement error:', error);
      return {
        allowed: false,
        reason: 'Data isolation enforcement failed'
      };
    }
  }

  private async checkUserTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_tenants')
        .select('id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('User tenant access check failed:', error);
      return false;
    }
  }

  private detectSuspiciousActivity(context: TenantAccessContext): boolean {
    // Check for common attack patterns
    const suspiciousPatterns = [
      /admin|root|system|superuser/i,
      /\b(union|select|drop|delete|update|insert)\b/i,
      /['"`;]/,
      /%[0-9a-f]{2}/i // URL encoding
    ];

    const testString = `${context.requestedTenantId} ${context.operation} ${context.resourceType || ''}`;
    
    return suspiciousPatterns.some(pattern => pattern.test(testString));
  }

  private async validateOperationPermission(context: TenantAccessContext): Promise<boolean> {
    try {
      // This would integrate with the RBAC system
      // For now, implement basic validation
      const validOperations = [
        'read', 'write', 'update', 'delete',
        'view', 'edit', 'create', 'manage'
      ];

      return validOperations.includes(context.operation.toLowerCase());
    } catch (error) {
      console.error('Operation permission validation failed:', error);
      return false;
    }
  }

  private async detectRapidTenantSwitching(userId: string): Promise<boolean> {
    // Implement rate limiting logic for tenant switching
    // This would typically check recent switching activity
    // For now, return false (no rapid switching detected)
    return false;
  }

  private analyzeQuery(query: string): {
    isSelectQuery: boolean;
    hasTenantFilter: boolean;
    containsSuspiciousPatterns: boolean;
  } {
    const normalizedQuery = query.toLowerCase().trim();
    
    return {
      isSelectQuery: normalizedQuery.startsWith('select'),
      hasTenantFilter: /tenant_id\s*=/.test(normalizedQuery),
      containsSuspiciousPatterns: this.containsSuspiciousQueryPatterns(normalizedQuery)
    };
  }

  private containsSuspiciousQueryPatterns(query: string): boolean {
    const suspiciousPatterns = [
      /information_schema/i,
      /pg_catalog/i,
      /\bdrop\s+table/i,
      /\btruncate\s+table/i,
      /\balter\s+table/i,
      /\bgrant\s+/i,
      /\brevoke\s+/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(query));
  }

  private addTenantFilter(query: string, tenantId: string): string {
    // Simple implementation - in production, use a proper SQL parser
    const whereClausePattern = /\bwhere\b/i;
    
    if (whereClausePattern.test(query)) {
      return query.replace(whereClausePattern, 'WHERE tenant_id = $? AND');
    } else {
      // Find the FROM clause and add WHERE
      const fromPattern = /(\bfrom\s+\w+)/i;
      return query.replace(fromPattern, '$1 WHERE tenant_id = $?');
    }
  }
}

export const tenantSecurityService = TenantSecurityService.getInstance();
