
# Automated Permission Dependency Validation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document outlines automated systems for validating permission dependencies, ensuring role configurations follow logical relationships, and preventing permission inconsistencies across the RBAC system.

## Validation Architecture

### Permission Dependency Validator

```typescript
interface PermissionDependency {
  permission: string;
  requires: string[];
  implies: string[];
  conflicts: string[];
  context?: DependencyContext;
}

interface DependencyContext {
  resourceType?: string;
  tenantScope?: boolean;
  conditionalRules?: ConditionalRule[];
}

interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

class PermissionDependencyValidator {
  private dependencyRules: Map<string, PermissionDependency> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();
  
  constructor() {
    this.initializeDependencyRules();
  }
  
  async validateRolePermissions(roleId: string, permissions: string[]): Promise<ValidationResult> {
    const cacheKey = `${roleId}_${permissions.sort().join(',')}`;
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }
    
    const result = await this.performValidation(permissions);
    this.validationCache.set(cacheKey, result);
    
    return result;
  }
  
  private async performValidation(permissions: string[]): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];
    
    // Check for missing required permissions
    for (const permission of permissions) {
      const dependency = this.dependencyRules.get(permission);
      if (dependency) {
        for (const required of dependency.requires) {
          if (!permissions.includes(required)) {
            violations.push({
              type: 'missing_required_permission',
              permission,
              required,
              severity: 'error',
              message: `Permission '${permission}' requires '${required}' but it's not assigned`
            });
          }
        }
        
        // Check for conflicting permissions
        for (const conflict of dependency.conflicts) {
          if (permissions.includes(conflict)) {
            violations.push({
              type: 'conflicting_permissions',
              permission,
              conflict,
              severity: 'error',
              message: `Permission '${permission}' conflicts with '${conflict}'`
            });
          }
        }
      }
    }
    
    // Check for redundant permissions
    const redundantPermissions = this.findRedundantPermissions(permissions);
    for (const redundant of redundantPermissions) {
      warnings.push({
        type: 'redundant_permission',
        permission: redundant.permission,
        impliedBy: redundant.impliedBy,
        severity: 'warning',
        message: `Permission '${redundant.permission}' is redundant because '${redundant.impliedBy}' implies it`
      });
    }
    
    // Generate optimization suggestions
    const optimizations = this.generateOptimizationSuggestions(permissions);
    suggestions.push(...optimizations);
    
    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      suggestions
    };
  }
  
  private initializeDependencyRules(): void {
    // User management permissions
    this.dependencyRules.set('users:update', {
      permission: 'users:update',
      requires: ['users:view'],
      implies: [],
      conflicts: []
    });
    
    this.dependencyRules.set('users:delete', {
      permission: 'users:delete',
      requires: ['users:view'],
      implies: [],
      conflicts: []
    });
    
    this.dependencyRules.set('users:updateAny', {
      permission: 'users:updateAny',
      requires: ['users:viewAny', 'users:update'],
      implies: [],
      conflicts: []
    });
    
    // Role management permissions
    this.dependencyRules.set('roles:assign', {
      permission: 'roles:assign',
      requires: ['roles:view', 'users:view'],
      implies: [],
      conflicts: []
    });
    
    this.dependencyRules.set('roles:manage', {
      permission: 'roles:manage',
      requires: ['roles:view'],
      implies: ['roles:update', 'roles:assign'],
      conflicts: []
    });
    
    // Admin permissions
    this.dependencyRules.set('system:admin', {
      permission: 'system:admin',
      requires: [],
      implies: ['users:viewAny', 'users:updateAny', 'roles:manage'],
      conflicts: []
    });
    
    // Tenant management
    this.dependencyRules.set('tenants:manage', {
      permission: 'tenants:manage',
      requires: ['tenants:view'],
      implies: ['tenants:update', 'tenants:create'],
      conflicts: ['tenants:readonly']
    });
  }
}
```

### Real-time Validation Engine

```typescript
class RealTimePermissionValidator {
  private validator: PermissionDependencyValidator;
  private subscriptions: Map<string, ValidationSubscription> = new Map();
  
  constructor(validator: PermissionDependencyValidator) {
    this.validator = validator;
  }
  
  async validatePermissionChange(
    roleId: string, 
    oldPermissions: string[], 
    newPermissions: string[]
  ): Promise<PermissionChangeValidation> {
    const oldValidation = await this.validator.validateRolePermissions(roleId, oldPermissions);
    const newValidation = await this.validator.validateRolePermissions(roleId, newPermissions);
    
    const addedPermissions = newPermissions.filter(p => !oldPermissions.includes(p));
    const removedPermissions = oldPermissions.filter(p => !newPermissions.includes(p));
    
    // Check impact of changes
    const impactAnalysis = await this.analyzeChangeImpact(
      roleId, 
      addedPermissions, 
      removedPermissions
    );
    
    return {
      oldValidation,
      newValidation,
      addedPermissions,
      removedPermissions,
      impactAnalysis,
      canApply: newValidation.isValid && impactAnalysis.safeToApply,
      autoFixSuggestions: this.generateAutoFixSuggestions(newValidation, impactAnalysis)
    };
  }
  
  subscribeToValidationUpdates(
    roleId: string, 
    callback: (validation: ValidationResult) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    
    this.subscriptions.set(subscriptionId, {
      roleId,
      callback,
      createdAt: new Date()
    });
    
    return subscriptionId;
  }
  
  private async analyzeChangeImpact(
    roleId: string, 
    added: string[], 
    removed: string[]
  ): Promise<ChangeImpactAnalysis> {
    const affectedUsers = await this.getAffectedUsers(roleId);
    const criticalPermissions = this.identifyCriticalPermissions(removed);
    const securityRisks = this.assessSecurityRisks(added);
    
    return {
      affectedUserCount: affectedUsers.length,
      criticalPermissionsRemoved: criticalPermissions,
      securityRisksIntroduced: securityRisks,
      safeToApply: criticalPermissions.length === 0 && securityRisks.every(r => r.severity !== 'high'),
      requiresApproval: this.requiresApproval(added, removed),
      estimatedImpact: this.calculateImpactScore(added, removed, affectedUsers.length)
    };
  }
  
  private generateAutoFixSuggestions(
    validation: ValidationResult, 
    impact: ChangeImpactAnalysis
  ): AutoFixSuggestion[] {
    const suggestions: AutoFixSuggestion[] = [];
    
    // Auto-fix missing dependencies
    for (const violation of validation.violations) {
      if (violation.type === 'missing_required_permission') {
        suggestions.push({
          type: 'add_required_permission',
          action: 'add',
          permission: violation.required!,
          reason: `Required by ${violation.permission}`,
          confidence: 0.9
        });
      }
    }
    
    // Auto-fix conflicts by removing less important permission
    for (const violation of validation.violations) {
      if (violation.type === 'conflicting_permissions') {
        const lessImportant = this.determineLessImportantPermission(
          violation.permission, 
          violation.conflict!
        );
        
        suggestions.push({
          type: 'remove_conflicting_permission',
          action: 'remove',
          permission: lessImportant,
          reason: `Conflicts with ${violation.permission}`,
          confidence: 0.7
        });
      }
    }
    
    // Remove redundant permissions
    for (const warning of validation.warnings) {
      if (warning.type === 'redundant_permission') {
        suggestions.push({
          type: 'remove_redundant_permission',
          action: 'remove',
          permission: warning.permission,
          reason: `Implied by ${warning.impliedBy}`,
          confidence: 0.8
        });
      }
    }
    
    return suggestions;
  }
}
```

### Continuous Validation Monitor

```typescript
class ContinuousValidationMonitor {
  private scheduledValidations: Map<string, NodeJS.Timeout> = new Map();
  private validationMetrics: ValidationMetrics = new ValidationMetrics();
  
  startContinuousValidation(): void {
    // Validate all roles daily
    this.scheduleValidation('daily_full_validation', () => {
      this.validateAllRoles();
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Validate role consistency hourly
    this.scheduleValidation('hourly_consistency_check', () => {
      this.validateRoleConsistency();
    }, 60 * 60 * 1000); // 1 hour
    
    // Quick validation every 5 minutes
    this.scheduleValidation('quick_validation', () => {
      this.validateRecentChanges();
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  private async validateAllRoles(): Promise<void> {
    const roles = await this.getAllRoles();
    const validationResults: RoleValidationResult[] = [];
    
    for (const role of roles) {
      try {
        const permissions = await this.getRolePermissions(role.id);
        const validation = await this.validator.validateRolePermissions(role.id, permissions);
        
        validationResults.push({
          roleId: role.id,
          roleName: role.name,
          validation,
          timestamp: new Date()
        });
        
        // Log issues
        if (!validation.isValid) {
          await this.logValidationIssues(role.id, validation);
        }
        
      } catch (error) {
        console.error(`Failed to validate role ${role.id}:`, error);
        this.validationMetrics.incrementFailureCount();
      }
    }
    
    // Generate validation report
    await this.generateValidationReport(validationResults);
    this.validationMetrics.recordValidationRun(validationResults.length);
  }
  
  private async validateRoleConsistency(): Promise<void> {
    const inconsistencies = await this.findRoleInconsistencies();
    
    for (const inconsistency of inconsistencies) {
      await this.handleInconsistency(inconsistency);
    }
  }
  
  private async findRoleInconsistencies(): Promise<RoleInconsistency[]> {
    const inconsistencies: RoleInconsistency[] = [];
    const roles = await this.getAllRoles();
    
    // Check for duplicate permission sets
    const permissionSets = new Map<string, string[]>();
    
    for (const role of roles) {
      const permissions = await this.getRolePermissions(role.id);
      const permissionKey = permissions.sort().join(',');
      
      if (permissionSets.has(permissionKey)) {
        inconsistencies.push({
          type: 'duplicate_permission_sets',
          roleIds: [permissionSets.get(permissionKey)![0], role.id],
          description: `Roles have identical permission sets`,
          severity: 'warning'
        });
      } else {
        permissionSets.set(permissionKey, [role.id]);
      }
    }
    
    // Check for orphaned permissions
    const orphanedPermissions = await this.findOrphanedPermissions();
    if (orphanedPermissions.length > 0) {
      inconsistencies.push({
        type: 'orphaned_permissions',
        permissions: orphanedPermissions,
        description: `Permissions assigned but not defined in system`,
        severity: 'error'
      });
    }
    
    return inconsistencies;
  }
}
```

### Validation Testing Framework

```typescript
class PermissionValidationTestSuite {
  async testValidationRules(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    // Test dependency validation
    results.push(await this.testDependencyValidation());
    
    // Test conflict detection
    results.push(await this.testConflictDetection());
    
    // Test redundancy detection
    results.push(await this.testRedundancyDetection());
    
    // Test auto-fix suggestions
    results.push(await this.testAutoFixSuggestions());
    
    return results;
  }
  
  private async testDependencyValidation(): Promise<TestResult> {
    const testCases = [
      {
        name: 'Missing required permission',
        permissions: ['users:update'], // Missing users:view
        expectedValid: false,
        expectedViolations: ['missing_required_permission']
      },
      {
        name: 'All dependencies satisfied',
        permissions: ['users:view', 'users:update'],
        expectedValid: true,
        expectedViolations: []
      },
      {
        name: 'Complex dependency chain',
        permissions: ['users:viewAny', 'users:view', 'users:update', 'users:updateAny'],
        expectedValid: true,
        expectedViolations: []
      }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      const validation = await this.validator.validateRolePermissions(
        'test-role', 
        testCase.permissions
      );
      
      const passed = validation.isValid === testCase.expectedValid &&
        testCase.expectedViolations.every(v => 
          validation.violations.some(violation => violation.type === v)
        );
      
      results.push({
        name: testCase.name,
        passed,
        details: {
          expected: testCase.expectedValid,
          actual: validation.isValid,
          violations: validation.violations.map(v => v.type)
        }
      });
    }
    
    return {
      suiteName: 'Dependency Validation',
      passed: results.every(r => r.passed),
      testResults: results
    };
  }
  
  private async testAutoFixSuggestions(): Promise<TestResult> {
    const invalidPermissions = ['users:update']; // Missing users:view
    const validation = await this.validator.validateRolePermissions('test-role', invalidPermissions);
    
    const autoFix = new RealTimePermissionValidator(this.validator);
    const changeValidation = await autoFix.validatePermissionChange(
      'test-role',
      [],
      invalidPermissions
    );
    
    const hasAddSuggestion = changeValidation.autoFixSuggestions.some(s => 
      s.type === 'add_required_permission' && s.permission === 'users:view'
    );
    
    return {
      suiteName: 'Auto-fix Suggestions',
      passed: hasAddSuggestion,
      testResults: [{
        name: 'Suggests adding required permission',
        passed: hasAddSuggestion,
        details: {
          suggestions: changeValidation.autoFixSuggestions
        }
      }]
    };
  }
}
```

### Integration with Role Management

```typescript
class ValidatedRoleManager {
  constructor(
    private validator: PermissionDependencyValidator,
    private realTimeValidator: RealTimePermissionValidator
  ) {}
  
  async updateRolePermissions(
    roleId: string, 
    newPermissions: string[],
    options: RoleUpdateOptions = {}
  ): Promise<RoleUpdateResult> {
    const currentPermissions = await this.getCurrentPermissions(roleId);
    
    // Validate the change
    const changeValidation = await this.realTimeValidator.validatePermissionChange(
      roleId,
      currentPermissions,
      newPermissions
    );
    
    if (!changeValidation.canApply) {
      if (options.autoFix) {
        // Apply auto-fix suggestions
        const fixedPermissions = this.applyAutoFix(newPermissions, changeValidation.autoFixSuggestions);
        return this.updateRolePermissions(roleId, fixedPermissions, { ...options, autoFix: false });
      } else {
        throw new ValidationError('Permission update validation failed', changeValidation);
      }
    }
    
    // Check if approval is required
    if (changeValidation.impactAnalysis.requiresApproval && !options.approved) {
      return {
        success: false,
        requiresApproval: true,
        approvalRequest: this.createApprovalRequest(roleId, changeValidation),
        changeValidation
      };
    }
    
    // Apply the change
    try {
      await this.doUpdateRolePermissions(roleId, newPermissions);
      
      // Log the change
      await this.logPermissionChange(roleId, currentPermissions, newPermissions);
      
      return {
        success: true,
        changeValidation,
        appliedPermissions: newPermissions
      };
      
    } catch (error) {
      // Rollback on failure
      await this.doUpdateRolePermissions(roleId, currentPermissions);
      throw error;
    }
  }
  
  private applyAutoFix(
    permissions: string[], 
    suggestions: AutoFixSuggestion[]
  ): string[] {
    let fixedPermissions = [...permissions];
    
    for (const suggestion of suggestions) {
      if (suggestion.confidence > 0.8) { // Only apply high-confidence fixes
        if (suggestion.action === 'add') {
          if (!fixedPermissions.includes(suggestion.permission)) {
            fixedPermissions.push(suggestion.permission);
          }
        } else if (suggestion.action === 'remove') {
          fixedPermissions = fixedPermissions.filter(p => p !== suggestion.permission);
        }
      }
    }
    
    return fixedPermissions;
  }
}
```

## Related Documentation

- **[PERMISSION_DEPENDENCIES.md](PERMISSION_DEPENDENCIES.md)**: Permission dependency definitions
- **[ROLE_ARCHITECTURE.md](ROLE_ARCHITECTURE.md)**: Role structure and management
- **[MONITORING_ANALYTICS.md](MONITORING_ANALYTICS.md)**: RBAC monitoring and analytics
- **[permission-resolution/CORE_ALGORITHM.md](permission-resolution/CORE_ALGORITHM.md)**: Permission resolution algorithm

## Version History

- **1.0.0**: Initial automated permission dependency validation documentation (2025-05-23)
