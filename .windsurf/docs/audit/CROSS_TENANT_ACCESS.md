
# Cross-Tenant Audit Access Controls

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the access control mechanisms for cross-tenant audit log access, ensuring secure isolation while allowing authorized cross-tenant operations and administrative oversight.

## Multi-Tenant Audit Isolation

### Data Isolation Principles

1. **Default Tenant Isolation**
   - Audit logs are isolated by tenant ID in storage
   - Default queries automatically apply tenant filter
   - Cross-tenant access explicitly prohibited by default
   - Integration with entity boundaries from [../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)

2. **Tenant Context Enforcement**
   - All audit operations require tenant context
   - Missing tenant context treated as security violation
   - Attempt logging without tenant context generates security alert
   - Default tenant context applied from authenticated user

### Storage-Level Isolation

```typescript
// Example of tenant isolation in query layer
class AuditLogRepository {
  /**
   * Get audit logs with automatic tenant isolation
   */
  async getAuditLogs(filters: AuditLogFilter, tenantContext: TenantContext): Promise<AuditLog[]> {
    // Apply tenant filter automatically
    const tenantFilter = { tenantId: tenantContext.tenantId };
    
    // Execute query with tenant isolation
    const logs = await this.auditLogModel.find({
      ...filters,
      ...tenantFilter, // Enforced tenant isolation
    });
    
    return logs;
  }
}
```

## Authorized Cross-Tenant Access

### Permission Framework

1. **Cross-Tenant Permissions**
   - Special permission: `AUDIT_CROSS_TENANT_READ`
   - Granular sub-permissions available:
     - `AUDIT_CROSS_TENANT_READ_SECURITY`
     - `AUDIT_CROSS_TENANT_READ_AUTHENTICATION`
     - `AUDIT_CROSS_TENANT_READ_DATA`
   - Permission assignment via [../rbac/PERMISSIONS.md](../rbac/PERMISSIONS.md)
   - Required for any cross-tenant audit access

2. **Elevated Permission Requirements**
   - Two-factor authentication required
   - Justification required for cross-tenant access
   - Time-limited access grants (max 8 hours)
   - Full audit trail of cross-tenant access

### Cross-Tenant Access Implementation

```typescript
// Example of cross-tenant access control
async function getCrossTenantAuditLogs(
  filters: AuditLogFilter, 
  sourceTenantId: string,
  targetTenantId: string,
  userId: string
): Promise<AuditLog[]> {
  // 1. Check cross-tenant permission
  const hasPermission = await permissionService.checkPermission(
    userId, 
    'AUDIT_CROSS_TENANT_READ', 
    sourceTenantId
  );
  
  if (!hasPermission) {
    throw new SecurityError('Permission denied for cross-tenant audit access');
  }
  
  // 2. Log cross-tenant access attempt
  await auditService.logSecurityEvent({
    eventType: 'CROSS_TENANT_ACCESS',
    userId,
    sourceTenantId,
    targetTenantId,
    resource: 'audit_logs',
    success: true
  });
  
  // 3. Execute query with explicit tenant filter
  const logs = await auditLogRepository.findWithExplicitTenant({
    ...filters,
    tenantId: targetTenantId
  });
  
  return logs;
}
```

## Administrative Oversight

### SuperAdmin Access

1. **SuperAdmin Capabilities**
   - Platform-wide audit visibility
   - Configurable tenant access
   - Pattern-based log search across tenants
   - Statistical analysis without PII exposure

2. **Access Constraints**
   - Justification logging required
   - Time-limited access sessions
   - Limited PII visibility based on purpose
   - Full audit trail of SuperAdmin access

### Multi-Tenant Dashboard

1. **Dashboard Security**
   - Role-based dashboard access
   - Configurable tenant visibility
   - Visual indication of tenant context
   - Automatic logging of all cross-tenant views

2. **Multi-Tenant Analysis**
   - Anonymized cross-tenant metrics
   - Benchmark comparison capabilities
   - Pattern recognition across tenants
   - Anomaly detection in tenant comparison

## Access Audit Trail

### Cross-Tenant Access Logging

1. **Access Log Requirements**
   - All cross-tenant access attempts logged
   - Source and target tenant recorded
   - Justification statement captured
   - Timestamp and duration tracked
   - Viewed records summary included

2. **Access Notification**
   - Target tenant admins notified of access
   - Summary report of cross-tenant access
   - Optional real-time alerts
   - Dashboard indication of external access

### Example Access Log

```json
{
  "eventType": "CROSS_TENANT_ACCESS",
  "timestamp": "2025-05-23T14:32:45Z",
  "userId": "admin-user-123",
  "userEmail": "admin@example.com",
  "sourceTenantId": "tenant-456",
  "sourceTenantName": "Corporate HQ",
  "targetTenantId": "tenant-789",
  "targetTenantName": "Regional Office",
  "justification": "Investigating reported security incident #45982",
  "accessDuration": 1800,
  "recordsAccessed": 142,
  "searchFilters": {
    "timeRange": "2025-05-20T00:00:00Z to 2025-05-23T00:00:00Z",
    "eventTypes": ["AUTHENTICATION_FAILED", "PERMISSION_DENIED"]
  }
}
```

## Emergency Access Procedures

### Break-Glass Access

1. **Emergency Override Process**
   - Emergency access mechanism for critical incidents
   - Multi-person approval required
   - Time-limited emergency access
   - Enhanced monitoring during emergency access
   - Post-incident review requirement

2. **Break-Glass Audit Trail**
   - Special audit category for emergency access
   - Executive notification of emergency access
   - Detailed timeline of emergency actions
   - Justification review and validation
   - Post-incident reporting requirements

## Related Documentation

- **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)**: Entity boundary enforcement
- **[SECURITY_INTEGRATION.md](SECURITY_INTEGRATION.md)**: Security audit integration
- **[PII_PROTECTION.md](PII_PROTECTION.md)**: PII handling in cross-tenant scenarios
- **[LOG_ANALYSIS.md](LOG_ANALYSIS.md)**: Log analysis across tenant boundaries
- **[DASHBOARD.md](DASHBOARD.md)**: Multi-tenant dashboard implementation

## Version History

- **1.0.0**: Initial cross-tenant audit access controls document (2025-05-23)
