# Windsurf Project Configuration

This directory contains AI-specific configuration and documentation for the Core Base Enterprise Application.

## Overview

Core Base is a multi-tenant React application with comprehensive RBAC (Role-Based Access Control) system built on:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL with RLS)
- **UI**: shadcn/ui components + TailwindCSS
- **Database**: PostgreSQL with migrations and Row-Level Security

Current Progress: **62.5%** (Phase 3 - Advanced Features)

## 📁 Directory Structure

```
.windsurf/
├── README.md              # This file
├── rules.md              # Comprehensive development rules and standards
├── quick-reference.md    # Quick reference for common patterns
├── completion-status.md  # Project completion tracking
├── config.json          # Windsurf-specific configuration
├── docs/                # Additional Windsurf documentation
│   ├── database-migrations.md  # Complete migration guide
│   ├── migration-quick-reference.md  # AI-friendly migration summary
│   └── entity-relationships.md # Entity relationship documentation
└── templates/           # Code generation templates
    ├── component.tsx.template
    ├── hook.ts.template
    ├── service.ts.template
    └── test.tsx.template
```

## 📋 Quick Links

### Core Documentation
- **Development Rules**: [rules.md](rules.md) - Coding standards and best practices
- **Quick Reference**: [quick-reference.md](quick-reference.md) - Common commands and patterns
- **Completion Status**: [completion-status.md](completion-status.md) - Project progress tracking
- **Project Config**: [config.json](config.json) - AI context configuration

### Database Documentation
#### Quick Access
- **[Migration Quick Reference](docs/migration-quick-reference.md)** - AI-friendly migration summary
- **[Database Migrations](docs/database-migrations.md)** - Complete migration guide
- **[Entity Relationships](docs/entity-relationships.md)** - Database structure and relationships

#### Migration Files
- **Location**: `src/services/migrations/migrations/`
- **Applied Migrations**: 000 through 007
- **Debug Scripts**: `sql-scripts/debugging/`

### Primary Documentation Sources
- **Implementation Guides**: `src/docs/implementation/`
- **Data Model**: `src/docs/data-model/`
- **RBAC Documentation**: `src/docs/rbac/`
- **Multi-tenancy**: `src/docs/multitenancy/`
- **Phase Completion**: `src/docs/implementation/PHASE_COMPLETION_TRACKER.md`

## 🚀 Current Status

### Completed Phases
1. **Phase 1**: Foundation (100%)
   - Core infrastructure
   - Database schema
   - Migration system
   - Basic UI components

2. **Phase 2**: Core Features (100%)
   - Advanced RBAC system
   - Enhanced multi-tenancy
   - Audit logging
   - User management

### In Progress
3. **Phase 3**: Advanced Features (25%)
   - Currently implementing audit dashboard
   - Next: Real-time collaboration features

### Upcoming
4. **Phase 4**: Enterprise Features
   - SSO integration
   - Advanced analytics
   - API gateway
   - Mobile applications

## 🗄️ Database Information

### Current Migration Version: 007

Applied migrations:
- 000: Migration infrastructure
- 001: Core schema
- 002: RBAC tables
- 003: Audit and session tables
- 004: Performance indexes
- 005: RLS policies
- 006: Utility functions
- 007: RLS policy fixes

### Key Database Features
- **Multi-tenancy**: Row-Level Security (RLS) for data isolation
- **RBAC**: Comprehensive role and permission system
- **Audit Logging**: Complete audit trail for compliance
- **Performance**: Optimized indexes and query patterns

## 💻 Development Workflow

### Essential Commands
```bash
# Start development server
npm run dev

# Run database migrations
npm run db:migrate

# Run tests
npm test

# Build for production
npm run build
```

### Key Patterns
- **Authentication**: JWT-based with Supabase
- **State Management**: React Context + React Query
- **Component Library**: shadcn/ui with Radix UI
- **Testing**: Vitest + React Testing Library

## 📏 Development Standards

### Code Quality
- TypeScript strict mode
- ESLint + Prettier formatting
- 80%+ test coverage
- Accessibility (WCAG 2.1 AA)

### Security
- Permission-based access control
- Tenant data isolation
- Input validation and sanitization
- Regular security audits

### Performance
- Core Web Vitals targets met
- Lazy loading and code splitting
- Optimized database queries
- Caching strategies

## 🎯 AI Development Guidelines

When working with this codebase:

1. **Reference Documentation**: Always check `src/docs/` for authoritative information
2. **Follow Phases**: Implement features according to the phased approach
3. **Maintain Standards**: Adhere to rules defined in [rules.md](rules.md)
4. **Update Documentation**: Keep documentation in sync with code changes
5. **Test Thoroughly**: Include tests for all new features

## 📚 Additional Resources

- **Global Documentation Map**: `src/docs/GLOBAL_DOCUMENTATION_MAP.md`
- **Performance Standards**: `src/docs/PERFORMANCE_STANDARDS.md`
- **Security Implementation**: `src/docs/SECURITY_IMPLEMENTATION.md`
- **Testing Strategy**: `src/docs/TESTING_STRATEGY.md`

---

**Note**: This configuration is specifically designed to enhance Windsurf AI's understanding of the project and ensure consistent, high-quality code generation aligned with project standards.
