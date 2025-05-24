
# Documentation Map

> **Version**: 3.1.0  
> **Last Updated**: 2025-05-23

## Documentation Hierarchy

This project follows a three-tier documentation structure for clarity and AI processing:

1. **Master Entry Points** - High-level guides and starting points
2. **Implementation Guides** - Phase-specific, actionable instructions
3. **Reference Documents** - Detailed specifications and standards

## Master Entry Points

Start here for high-level understanding and navigation:

- **[CORE_ARCHITECTURE.md](CORE_ARCHITECTURE.md)**: System architecture overview
- **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)**: Implementation timeline
- **[implementation/MASTER_DOCUMENT_MAP.md](implementation/MASTER_DOCUMENT_MAP.md)**: Complete implementation guide
- **[RBAC_SYSTEM.md](RBAC_SYSTEM.md)**: Access control overview
- **[SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md)**: Security overview
- **[TEST_FRAMEWORK.md](TEST_FRAMEWORK.md)**: Testing approach

## Implementation Guides

Phase-specific implementation documents:

### Phase 1: Foundation
- **[implementation/phase1/IMPLEMENTATION_DOCUMENT_MAP.md](implementation/phase1/IMPLEMENTATION_DOCUMENT_MAP.md)**: Phase 1 guide
- **[implementation/testing/PHASE1_TESTING.md](implementation/testing/PHASE1_TESTING.md)**: Phase 1 testing

### Phase 2: Core Features
- **[implementation/phase2/IMPLEMENTATION_DOCUMENT_MAP.md](implementation/phase2/IMPLEMENTATION_DOCUMENT_MAP.md)**: Phase 2 guide
- **[implementation/testing/PHASE2_TESTING.md](implementation/testing/PHASE2_TESTING.md)**: Phase 2 testing

### Phase 3: Advanced Features
- **[implementation/phase3/IMPLEMENTATION_DOCUMENT_MAP.md](implementation/phase3/IMPLEMENTATION_DOCUMENT_MAP.md)**: Phase 3 guide
- **[implementation/testing/PHASE3_TESTING.md](implementation/testing/PHASE3_TESTING.md)**: Phase 3 testing

### Phase 4: Polish & Production
- **[implementation/phase4/IMPLEMENTATION_DOCUMENT_MAP.md](implementation/phase4/IMPLEMENTATION_DOCUMENT_MAP.md)**: Phase 4 guide
- **[implementation/testing/PHASE4_TESTING.md](implementation/testing/PHASE4_TESTING.md)**: Phase 4 testing

## Reference Documents

Detailed specifications and standards:

### Canonical References
These are the definitive specifications for key subsystems:

- **[audit/LOG_FORMAT_STANDARDIZATION.md](audit/LOG_FORMAT_STANDARDIZATION.md)**: Audit log format standard
- **[integration/EVENT_CORE_PATTERNS.md](integration/EVENT_CORE_PATTERNS.md)**: Event architecture patterns
- **[rbac/ROLE_ARCHITECTURE.md](rbac/ROLE_ARCHITECTURE.md)**: RBAC role architecture
- **[data-model/DATABASE_SCHEMA.md](data-model/DATABASE_SCHEMA.md)**: Database schema
- **[implementation/AUDIT_INTEGRATION_CHECKLIST.md](implementation/AUDIT_INTEGRATION_CHECKLIST.md)**: Audit integration requirements
- **[design/PATTERN_ENFORCEMENT_MECHANISMS.md](design/PATTERN_ENFORCEMENT_MECHANISMS.md)**: **NEW** - Pattern enforcement mechanisms
- **[design/CENTRALIZED_PERFORMANCE_MONITORING.md](design/CENTRALIZED_PERFORMANCE_MONITORING.md)**: **NEW** - Centralized performance monitoring
- **[design/DOCUMENTATION_MAINTENANCE_AUTOMATION.md](design/DOCUMENTATION_MAINTENANCE_AUTOMATION.md)**: **NEW** - Documentation automation

### Component-Specific References
Detailed specifications for individual components:

- **[rbac/permission-resolution/README.md](rbac/permission-resolution/README.md)**: Permission resolution
- **[multitenancy/DATA_ISOLATION.md](multitenancy/DATA_ISOLATION.md)**: Multi-tenant data isolation
- **[security/AUTH_SYSTEM.md](security/AUTH_SYSTEM.md)**: Authentication system
- **[ui/DESIGN_SYSTEM.md](ui/DESIGN_SYSTEM.md)**: UI design system
- **[mobile/OVERVIEW.md](mobile/OVERVIEW.md)**: Mobile strategy overview

## Implementation Path

For implementing features, follow this path:

1. Start with the relevant **phase implementation document map**
2. Reference the **testing guide** for that phase
3. Follow the implementation sequence in the phase map
4. Refer to **canonical references** for detailed specifications
5. Use **component-specific references** for implementation details

## Specialized Documentation Maps

For detailed documentation navigation:

- **[documentation-maps/README.md](documentation-maps/README.md)**: Specialized documentation maps

## Version History

- **3.1.0**: Added new documents for design and architecture improvements (2025-05-23)
- **3.0.0**: Established clear three-tier documentation hierarchy (2025-05-23)
- **2.0.0**: Refactored into specialized documentation maps (2025-05-22)
- **1.0.0**: Initial documentation map (2025-05-22)
