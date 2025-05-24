
# Core Architecture Documentation Map

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Document Structure

### Primary Architecture Documents
- **[../CORE_ARCHITECTURE.md](../CORE_ARCHITECTURE.md)**: System architecture overview
- **[../DEVELOPMENT_ROADMAP.md](../DEVELOPMENT_ROADMAP.md)**: Implementation timeline and phases
- **[../RBAC_SYSTEM.md](../RBAC_SYSTEM.md)**: Role-based access control overview
- **[../SECURITY_IMPLEMENTATION.md](../SECURITY_IMPLEMENTATION.md)**: Security system overview
- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Testing framework overview

### Foundation Documents
- **[../data-model/DATABASE_SCHEMA.md](../data-model/DATABASE_SCHEMA.md)**: Database schema design
- **[../data-model/ENTITY_RELATIONSHIPS.md](../data-model/ENTITY_RELATIONSHIPS.md)**: Entity relationship model
- **[../TECHNOLOGIES.md](../TECHNOLOGIES.md)**: Technology stack decisions

### Integration Documents
- **[../integration/OVERVIEW.md](../integration/OVERVIEW.md)**: System integration overview
- **[../integration/EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md)**: Event-driven architecture
- **[../integration/API_CONTRACTS.md](../integration/API_CONTRACTS.md)**: API contracts and standards

## Navigation Sequence

### For System Understanding
1. **Start**: [CORE_ARCHITECTURE.md](../CORE_ARCHITECTURE.md) - Get high-level system overview
2. **Technology**: [TECHNOLOGIES.md](../TECHNOLOGIES.md) - Understand technology choices
3. **Data Model**: [DATABASE_SCHEMA.md](../data-model/DATABASE_SCHEMA.md) - Review data structure
4. **Timeline**: [DEVELOPMENT_ROADMAP.md](../DEVELOPMENT_ROADMAP.md) - See implementation phases

### For Implementation Planning
1. **Foundation**: [CORE_ARCHITECTURE.md](../CORE_ARCHITECTURE.md) - Architecture principles
2. **Integration**: [EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md) - Integration patterns
3. **Testing**: [TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md) - Testing approach
4. **Security**: [SECURITY_IMPLEMENTATION.md](../SECURITY_IMPLEMENTATION.md) - Security overview

### For Component Development
1. **Overview**: [CORE_ARCHITECTURE.md](../CORE_ARCHITECTURE.md) - System context
2. **RBAC**: [RBAC_SYSTEM.md](../RBAC_SYSTEM.md) - Permission system
3. **Integration**: [API_CONTRACTS.md](../integration/API_CONTRACTS.md) - API standards
4. **Data**: [ENTITY_RELATIONSHIPS.md](../data-model/ENTITY_RELATIONSHIPS.md) - Data relationships

## Integration Points

### With Component Maps
- **RBAC System**: Use [RBAC_SYSTEM_MAP.md](RBAC_SYSTEM_MAP.md) for detailed RBAC navigation
- **Security System**: Use [SECURITY_SYSTEM_MAP.md](SECURITY_SYSTEM_MAP.md) for security details
- **Multi-Tenant**: Use [MULTI_TENANT_MAP.md](MULTI_TENANT_MAP.md) for tenant architecture
- **Implementation**: Use [IMPLEMENTATION_MAP.md](IMPLEMENTATION_MAP.md) for phase-specific guidance

### With External Systems
- **Database**: All documents reference database schema and design
- **API Layer**: Integration documents define API contracts
- **Security Layer**: Security implementation spans multiple components
- **Audit Layer**: Logging and monitoring integrated throughout

## Usage Guidelines

### For Architects
- Start with CORE_ARCHITECTURE.md for system overview
- Review technology decisions in TECHNOLOGIES.md
- Use integration documents for system boundaries

### For Developers
- Begin with component-specific documents (RBAC, Security)
- Reference API contracts for integration requirements
- Follow testing framework for quality assurance

### For Project Managers
- Use DEVELOPMENT_ROADMAP.md for timeline planning
- Reference CORE_ARCHITECTURE.md for scope understanding
- Check integration points for dependency management

## Related Maps

- **[IMPLEMENTATION_MAP.md](IMPLEMENTATION_MAP.md)**: Phase-specific implementation guidance
- **[INTEGRATION_MAP.md](INTEGRATION_MAP.md)**: System integration patterns
- **[RBAC_SYSTEM_MAP.md](RBAC_SYSTEM_MAP.md)**: RBAC system details
- **[SECURITY_SYSTEM_MAP.md](SECURITY_SYSTEM_MAP.md)**: Security system details

## Version History

- **2.0.0**: Standardized format with consistent navigation structure (2025-05-23)
- **1.0.0**: Initial core architecture map (2025-05-22)
