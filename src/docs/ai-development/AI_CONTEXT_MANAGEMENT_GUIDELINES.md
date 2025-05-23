
# AI Context Management Guidelines

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides specific guidelines for AI platforms to effectively manage context when navigating and implementing features from this documentation system.

## Context Management Principles

### 1. Document Session Limits
- **Maximum 3-4 documents per implementation session**
- **Single phase focus**: Don't mix documents from different implementation phases
- **Complete current scope**: Finish implementing current document set before moving to next

### 2. Context Processing Order
Always process documents in this order within a session:
1. **Overview/Map document** (provides context)
2. **Core specification** (defines requirements)
3. **Implementation examples** (shows how to implement)
4. **Testing integration** (validates implementation)

### 3. Phase Boundary Management
- **Never mix phases**: Complete Phase N before starting Phase N+1
- **Validation gates**: Must pass validation checkpoint before proceeding
- **Context reset**: Clear implementation context between phases

## Document Grouping for AI Processing

### Phase 1 Context Groups

#### Group 1A: Project Foundation (Session 1)
- `docs/CORE_ARCHITECTURE.md`
- `docs/TECHNOLOGIES.md`
- `docs/data-model/DATABASE_SCHEMA.md`

#### Group 1B: Authentication (Session 2)
- `docs/security/AUTH_SYSTEM.md`
- `docs/user-management/AUTHENTICATION.md`
- `docs/implementation/phase1/TESTING_INTEGRATION.md`

#### Group 1C: RBAC Foundation (Session 3)
- `docs/rbac/ROLE_ARCHITECTURE.md`
- `docs/rbac/PERMISSION_TYPES.md`
- `docs/rbac/PERMISSION_DEPENDENCIES.md`

#### Group 1D: Multi-Tenant & Security (Session 4)
- `docs/multitenancy/DATA_ISOLATION.md`
- `docs/security/INPUT_VALIDATION.md`
- `docs/implementation/phase1/TESTING_INTEGRATION.md`

### Phase 2 Context Groups

#### Group 2A: Advanced RBAC (Session 1)
- `docs/rbac/permission-resolution/CORE_ALGORITHM.md`
- `docs/rbac/CACHING_STRATEGY.md`
- `docs/rbac/PERFORMANCE_OPTIMIZATION.md`

#### Group 2B: Enhanced Features (Session 2)
- `docs/multitenancy/DATABASE_QUERY_PATTERNS.md`
- `docs/audit/LOG_FORMAT_STANDARDIZATION.md`
- `docs/implementation/phase2/TESTING_INTEGRATION.md`

#### Group 2C: User Management (Session 3)
- `docs/user-management/RBAC_INTEGRATION.md`
- `docs/user-management/MULTITENANCY_INTEGRATION.md`
- `docs/implementation/phase2/TESTING_INTEGRATION.md`

### Phase 3 Context Groups

#### Group 3A: Audit Dashboard (Session 1)
- `docs/audit/DASHBOARD.md`
- `docs/ui/DESIGN_SYSTEM.md`
- `docs/implementation/phase3/TESTING_INTEGRATION.md`

#### Group 3B: Security Monitoring (Session 2)
- `docs/security/SECURITY_MONITORING.md`
- `docs/audit/PERFORMANCE_STRATEGIES.md`
- `docs/implementation/phase3/TESTING_INTEGRATION.md`

#### Group 3C: Performance Optimization (Session 3)
- `docs/multitenancy/PERFORMANCE_OPTIMIZATION.md`
- `docs/PERFORMANCE_STANDARDS.md`
- `docs/implementation/phase3/TESTING_INTEGRATION.md`

### Phase 4 Context Groups

#### Group 4A: Mobile Strategy (Session 1)
- `docs/mobile/OVERVIEW.md`
- `docs/mobile/UI_UX.md`
- `docs/implementation/phase4/TESTING_INTEGRATION.md`

#### Group 4B: Security Hardening (Session 2)
- `docs/security/SECURE_DEVELOPMENT.md`
- `docs/implementation/PHASE_VALIDATION_CHECKPOINTS.md`
- `docs/implementation/phase4/TESTING_INTEGRATION.md`

## Context Retention Strategies

### 1. Session Scope Management
```typescript
interface AIContextSession {
  phase: number;
  group: string;
  documents: string[];
  maxDocuments: 4;
  currentImplementation: string;
  validationRequired: boolean;
}

// Example session
const session: AIContextSession = {
  phase: 1,
  group: "1A",
  documents: [
    "docs/CORE_ARCHITECTURE.md",
    "docs/TECHNOLOGIES.md", 
    "docs/data-model/DATABASE_SCHEMA.md"
  ],
  maxDocuments: 4,
  currentImplementation: "database_foundation",
  validationRequired: true
};
```

### 2. Implementation State Tracking
- **Current Phase**: Track which phase is being implemented
- **Current Group**: Track which document group within phase
- **Dependencies Met**: Verify previous groups completed
- **Validation Status**: Track validation checkpoint results

### 3. Context Handoff Between Sessions
When transitioning between context groups:
1. **Complete current implementation**
2. **Run validation tests**
3. **Document implementation status**
4. **Clear previous context**
5. **Load next group context**

## AI Implementation Guidelines

### Do's
✅ **Follow document grouping strictly**  
✅ **Complete current group before moving to next**  
✅ **Reference validation checkpoints between phases**  
✅ **Use implementation examples as patterns**  
✅ **Track dependencies and completion status**  

### Don'ts
❌ **Mix documents from different phases**  
❌ **Exceed 4 documents per implementation session**  
❌ **Skip validation checkpoints**  
❌ **Implement features out of dependency order**  
❌ **Reference advanced documents during basic implementation**  

## Context Validation Checklist

Before proceeding to next context group:
- [ ] All documents in current group processed
- [ ] Implementation completed for current scope
- [ ] Tests written and passing
- [ ] Performance targets met (if applicable)
- [ ] Dependencies for next group satisfied
- [ ] Validation checkpoint passed (if end of phase)

## Emergency Context Recovery

If context is lost during implementation:
1. **Identify current phase and group**
2. **Review implementation status**
3. **Restart from beginning of current group**
4. **Follow document processing order**
5. **Validate completion before proceeding**

## Related Documentation

- `docs/ai-development/TIERED_NAVIGATION_GUIDE.md`: Navigation strategy
- `docs/implementation/PHASE_VALIDATION_CHECKPOINTS.md`: Validation requirements
- `docs/GLOBAL_DOCUMENTATION_MAP.md`: Complete documentation structure

## Version History

- **1.0.0**: Initial AI context management guidelines (2025-05-23)
