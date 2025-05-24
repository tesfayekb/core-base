
# Core Architecture

> **Version**: 1.5.0  
> **Last Updated**: 2025-05-22

This document outlines the core architectural principles and patterns used in the project.

## System Architecture

The application follows a modern client-side architecture with:

- React for UI components
- TypeScript for type safety
- React Query for server state management
- Context API for global UI state
- React Router for routing

## Key Architectural Components

### 1. Authentication & Authorization Layer
- JWT-based authentication system
- Role-based access control (RBAC) system with direct permission assignment
- Permission-based component rendering
- Secure session management

### 2. API Layer
- RESTful API design
- API versioning
- Request/response interceptors
- Error handling standardization
- Service abstraction for data operations

### 3. UI Layer
- Component-based UI architecture
- Design system implementation
- Theme customization
- Responsive design patterns
- Accessibility standards

### 4. Testing Layer
- Component testing with React Testing Library
- Unit testing with Jest
- E2E testing with Cypress
- Test result reporting and visualization
- Continuous test execution

## Data Flow

1. User interacts with UI components
2. Actions trigger service calls
3. Services communicate with API
4. API returns data
5. React Query caches responses
6. UI updates based on data changes

## Security Architecture

The application implements a comprehensive security architecture:

- Authentication via JWT
- Authorization through direct permission assignment RBAC
  - No role hierarchy or permission inheritance
  - Explicit permission grants
  - Functional dependencies between related permissions
- Input validation and sanitization
- Secure communication protocols
- Audit logging

## Resource Framework

Resources in this system are defined as entities that can be created, read, updated, or deleted and are subject to access control. Each resource:

- Has a defined schema and type definition
- Is subject to permission checks through the RBAC system
- Follows consistent API patterns for operations
- Has standardized validation rules
- Includes proper error handling

All resources adhere to the framework defined in the Resource Definition Framework documentation.

## Folder Structure

The application uses a feature-based folder structure:

```
src/
  components/    # Shared UI components
  hooks/         # Custom React hooks
  pages/         # Route-based page components
  context/       # React context providers
  services/      # API and data services
  utils/         # Utility functions
  types/         # TypeScript type definitions
  lib/           # External library wrappers
```

## Version Compatibility

This document is part of a coherent set of documentation. For compatible versions of related documents, please refer to the [VERSION_COMPATIBILITY.md](VERSION_COMPATIBILITY.md) file. This ensures you implement features using compatible versions of different subsystem documents.

## Related Documentation

For a comprehensive understanding of the application architecture:

- **[GLOSSARY.md](GLOSSARY.md)**: Standardized terminology for architectural components
- **[security/README.md](security/README.md)**: Detailed security architecture
- **[audit/README.md](audit/README.md)**: Logging architecture and implementation
- **[rbac/README.md](rbac/README.md)**: Permission system design with direct assignment model
- **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)**: Implementation timeline and milestones
- **[TEST_FRAMEWORK.md](TEST_FRAMEWORK.md)**: Testing architecture and approach
- **[TECHNOLOGIES.md](TECHNOLOGIES.md)**: Technology stack and dependencies
- **[mobile/README.md](mobile/README.md)**: Mobile application architecture
- **[CLONING_GUIDELINES.md](CLONING_GUIDELINES.md)**: Guidelines for project reproduction
- **[VERSION_COMPATIBILITY.md](VERSION_COMPATIBILITY.md)**: Version compatibility matrix

## Version History

- **1.5.0**: Reinforced description of RBAC as direct permission assignment model with no hierarchy
- **1.4.0**: Clarified RBAC implementation as direct permission assignment model
- **1.3.0**: Added reference to version compatibility matrix
- **1.2.0**: Clarified RBAC implementation details regarding permission model
- **1.1.0**: Added comprehensive security and resource framework sections
- **1.0.0**: Initial architecture documentation
