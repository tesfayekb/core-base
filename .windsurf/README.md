# Windsurf AI Configuration

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-26

This directory contains configuration, rules, and templates specifically designed for Windsurf AI development assistance.

## 📁 Directory Structure

```
.windsurf/
├── README.md              # This file
├── rules.md              # Comprehensive development rules and standards
├── quick-reference.md    # Quick reference for common patterns
├── config.json          # Windsurf-specific configuration
└── templates/           # Code generation templates
    ├── component.tsx.template
    ├── hook.ts.template
    ├── service.ts.template
    └── test.tsx.template
```

## 📋 Files Overview

### rules.md
Comprehensive development rules aligned with `src/docs/` documentation, including:
- Project architecture and technology stack
- Implementation phases (1-4)
- Security standards and RBAC model
- UI/UX standards and accessibility requirements
- Testing requirements and code quality standards
- Performance metrics and monitoring

### quick-reference.md
Quick access to:
- Essential commands
- Key documentation locations
- Common code patterns
- Component and test templates
- Security checklist
- PR checklist
- Troubleshooting guide

### config.json
Machine-readable configuration containing:
- Project metadata
- Documentation structure
- Development phases
- Quality standards
- AI context preferences
- Code generation rules

### templates/
Reusable code templates following project standards:
- **component.tsx.template**: React component with TypeScript, permissions, and accessibility
- **hook.ts.template**: Custom React hook with React Query integration
- **service.ts.template**: API service class with Zod validation
- **test.tsx.template**: Comprehensive test suite template

## 🚀 Usage for AI Development

### Starting a New Feature
1. Review the relevant phase in `src/docs/implementation/`
2. Check `rules.md` for applicable standards
3. Use templates from `templates/` for consistency
4. Follow patterns in `quick-reference.md`

### Code Generation
When generating code, the AI should:
1. Use appropriate template as a base
2. Follow TypeScript strict mode requirements
3. Include proper error handling
4. Add accessibility attributes
5. Write accompanying tests
6. Update relevant documentation

### Project Navigation
For authoritative information, always reference:
- `src/docs/` - Primary documentation source
- `.windsurf/rules.md` - Consolidated standards
- `.windsurf/config.json` - Project configuration

## 🔄 Maintenance

This configuration should be updated when:
- New patterns are established
- Documentation structure changes
- Standards are updated
- New templates are needed

## 📚 Related Documentation

Primary documentation sources:
- `src/docs/README.md` - Main documentation entry point
- `src/docs/CORE_ARCHITECTURE.md` - System architecture
- `src/docs/implementation/` - Implementation guides
- `src/docs/ai-development/` - AI-specific guides

## 🎯 Key Principles

1. **Documentation First**: Always refer to `src/docs/` as the source of truth
2. **Consistency**: Use templates and patterns for uniformity
3. **Security**: Follow security standards in all implementations
4. **Quality**: Maintain high code quality with tests and reviews
5. **Accessibility**: Ensure WCAG 2.1 AA compliance

---

**Note**: This configuration is specifically designed to enhance Windsurf AI's understanding of the project and ensure consistent, high-quality code generation aligned with project standards.
