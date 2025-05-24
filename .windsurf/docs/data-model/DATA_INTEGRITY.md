
# Data Integrity Documentation

> **Version**: 1.2.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the data integrity rules, validation constraints, and enforcement mechanisms used to maintain data quality and consistency across the system.

## Data Integrity Principles

### 1. Entity Integrity

All entities in the system have unique identifiers:

```sql
-- Example of entity integrity through primary keys
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- other columns
);
```

### 2. Referential Integrity

Foreign key relationships are enforced to ensure data consistency across tables:

```sql
-- Example of referential integrity through foreign keys
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id),
  -- other columns
);
```

### 3. Domain Integrity

Field-level constraints ensure values meet specific requirements:

```sql
-- Example of domain integrity through constraints
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  age INTEGER CHECK (age >= 18),
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended'))
);
```

## Validation Layers

### 1. Database Constraints

Database-level constraints provide a fundamental level of data integrity:

- **Primary Keys**: Ensure unique entity identification
- **Foreign Keys**: Maintain referential integrity
- **Check Constraints**: Enforce domain rules
- **Unique Constraints**: Prevent duplicate values
- **Not Null Constraints**: Ensure required fields are provided

### 2. Triggers and Functions

Database triggers and functions provide active enforcement of complex integrity rules:

```sql
-- Example trigger for maintaining audit trails
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, operation, data_new)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, operation, data_old, data_new)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, operation, data_old)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER roles_audit
AFTER INSERT OR UPDATE OR DELETE ON roles
FOR EACH ROW EXECUTE FUNCTION audit_changes();
```

### 3. Application-Level Validation

The application implements validation rules using Zod schemas:

```typescript
// Example user schema with validation rules
const userSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "user", "moderator"]),
  settings: z.object({
    theme: z.enum(["light", "dark", "system"]),
    notifications: z.boolean(),
  }),
});
```

### 4. API Gateway Validation

API endpoints validate requests before processing:

```typescript
// Example API endpoint with validation
app.post('/api/users', 
  validateRequest(userSchema), 
  async (req, res) => {
    // Request is already validated by middleware
    const userData = req.body;
    // Process the data...
  }
);
```

## Complex Integrity Rules

### 1. Cross-Field Validation

Rules that involve multiple fields:

```typescript
const registrationSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
```

### 2. Temporal Constraints

Rules involving time and date values:

```typescript
const eventSchema = z.object({
  startDate: z.date(),
  endDate: z.date()
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"]
});
```

### 3. State Transition Rules

Rules governing allowable state changes:

```typescript
const orderStateTransitions = {
  "pending": ["processing", "cancelled"],
  "processing": ["shipped", "cancelled"],
  "shipped": ["delivered", "returned"],
  "delivered": ["returned"],
  "cancelled": [],
  "returned": []
};

function validateStateTransition(currentState, newState) {
  const allowedTransitions = orderStateTransitions[currentState] || [];
  return allowedTransitions.includes(newState);
}
```

## Handling Integrity Violations

### 1. Constraint Violation Response

How the system responds to integrity violations:

```typescript
try {
  await db.insert(table, data);
} catch (error) {
  if (error.code === '23505') { // Unique constraint violation
    return res.status(409).json({ 
      error: "Resource already exists",
      detail: parseConstraintError(error)
    });
  } else if (error.code === '23503') { // Foreign key violation
    return res.status(400).json({ 
      error: "Referenced resource does not exist",
      detail: parseConstraintError(error)
    });
  } else if (error.code === '23514') { // Check constraint violation
    return res.status(400).json({ 
      error: "Value does not meet requirements",
      detail: parseConstraintError(error)
    });
  }
  throw error;
}
```

### 2. Standardized Error Handling

Data integrity errors follow the standardized error handling approach defined in [../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md):

```typescript
try {
  await db.insert(table, data);
} catch (error) {
  // 1. Classify and format the error
  const securityError = classifyDataIntegrityError(error);
  
  // 2. Log appropriately with correlation ID
  const traceId = generateTraceId();
  logger.error(`Data integrity violation: ${securityError.message}`, {
    operation: 'insert',
    table,
    errorCode: error.code,
    traceId,
    userId: getCurrentUserId()
  });
  
  // 3. Return standardized error response
  return {
    error: {
      code: securityError.code,
      message: securityError.message,
      classification: 'Minor', // Usually minor unless tampering detected
      traceId,
      timestamp: new Date().toISOString(),
      details: {
        constraint: securityError.constraint,
        suggestion: securityError.suggestion
      }
    }
  };
}
```

### 3. Logging and Monitoring

Integrity violations are logged and monitored:

```typescript
function handleIntegrityViolation(error, context) {
  logger.warn("Data integrity violation", {
    error: error.message,
    errorCode: error.code,
    context,
    timestamp: new Date(),
    user: getCurrentUser()?.id
  });
  
  metrics.increment('data_integrity_violation', {
    type: mapErrorCodeToType(error.code),
    entity: context.entity
  });
}
```

## Testing Data Integrity

### 1. Schema Validation Tests

Tests to verify schema behavior:

```typescript
describe('User Schema Validation', () => {
  test('rejects invalid email formats', () => {
    const result = userSchema.safeParse({ email: 'invalid-email' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain('email');
  });
  
  test('accepts valid user data', () => {
    const validUser = {
      email: 'user@example.com',
      name: 'Test User',
      password: 'securepass123'
    };
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });
});
```

### 2. Database Constraint Tests

Tests to verify database constraints:

```typescript
describe('Database Constraints', () => {
  test('prevents duplicate emails', async () => {
    await db.insert('users', { email: 'test@example.com', name: 'Test User' });
    
    await expect(
      db.insert('users', { email: 'test@example.com', name: 'Another User' })
    ).rejects.toThrow(/unique constraint/i);
  });
});
```

## Related Documentation

- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**: Schema definitions and table structures
- **[ENTITY_RELATIONSHIPS.md](ENTITY_RELATIONSHIPS.md)**: Entity-relationship diagrams and documentation
- **[SCHEMA_MIGRATIONS.md](SCHEMA_MIGRATIONS.md)**: Migration guidelines and version control
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Standardized error handling for security components
- **[../VALIDATION_SYSTEM.md](../VALIDATION_SYSTEM.md)**: Validation system architecture
- **[../multitenancy/DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md)**: Multi-tenant data isolation

## Version History

- **1.2.0**: Added reference to ERROR_HANDLING.md for standardized error handling (2025-05-22)
- **1.1.0**: Added comprehensive data integrity documentation (2025-05-22)
- **1.0.0**: Initial placeholder document (2025-05-22)
