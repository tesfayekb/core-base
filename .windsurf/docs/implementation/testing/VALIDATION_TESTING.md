
# Validation Testing Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document outlines the testing strategy for validation functions that ensure system integrity across phases.

## Validation Function Testing

### Core Validation Tests

```typescript
// Testing validation functions
import { validatePhase1to2 } from '../validation/helpers';
import { mockPhase1Metrics } from '../mocks/metrics';

describe('Phase Validation Functions', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    
    // Mock metrics collection
    jest.mock('../validation/metrics', () => ({
      collectPhase1Metrics: jest.fn().mockResolvedValue(mockPhase1Metrics)
    }));
  });
  
  test('validatePhase1to2 should pass with valid metrics', async () => {
    // Arrange
    const validMetrics = {
      ...mockPhase1Metrics,
      database: {
        tablesCreated: true,
        tableCount: 5,
        rlsEnabled: true,
        queryExecution: 5
      },
      auth: {
        loginTime: 500,
        registrationTime: 800,
        tokenValidation: 5
      },
      rbac: {
        permissionCheckTime: 10,
        roleAssignmentTime: 50,
        permissionAccuracy: 1
      },
      multitenant: {
        crossTenantAccess: 0,
        tenantSwitchTime: 100,
        queryFilteringOverhead: 2
      },
      errorRate: 0.0005
    };
    
    require('../validation/metrics').collectPhase1Metrics.mockResolvedValueOnce(validMetrics);
    
    // Act
    const result = await validatePhase1to2();
    
    // Assert
    expect(result.passed).toBe(true);
    expect(result.passRate).toBe(1.0);
  });
  
  test('validatePhase1to2 should fail with invalid metrics', async () => {
    // Arrange
    const invalidMetrics = {
      ...mockPhase1Metrics,
      database: {
        tablesCreated: false, // Missing required tables
        tableCount: 3,
        rlsEnabled: true,
        queryExecution: 5
      }
    };
    
    require('../validation/metrics').collectPhase1Metrics.mockResolvedValueOnce(invalidMetrics);
    
    // Act
    const result = await validatePhase1to2();
    
    // Assert
    expect(result.passed).toBe(false);
    expect(result.validations.find(v => v.name === 'Database Schema')?.passed).toBe(false);
  });
});
```

## Validation Metric Collection Tests

```typescript
// Testing metric collection functions
import { collectDatabaseMetrics } from '../validation/metrics';

describe('Validation Metrics Collection', () => {
  beforeEach(() => {
    // Reset database mock
    jest.resetAllMocks();
    
    // Mock Supabase client
    jest.mock('../lib/supabase', () => ({
      supabase: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        rpc: jest.fn().mockReturnThis()
      }
    }));
  });
  
  test('collectDatabaseMetrics should return table metrics', async () => {
    // Arrange
    const mockData = {
      data: [
        { table_name: 'users' },
        { table_name: 'roles' },
        { table_name: 'user_roles' },
        { table_name: 'audit_logs' }
      ],
      error: null
    };
    
    const mockRlsData = {
      data: [
        { table_name: 'users' },
        { table_name: 'roles' },
        { table_name: 'user_roles' },
        { table_name: 'audit_logs' }
      ],
      error: null
    };
    
    const supabase = require('../lib/supabase').supabase;
    supabase.from.mockImplementation((table) => {
      if (table.includes('information_schema')) {
        return {
          select: () => ({
            eq: () => ({
              in: () => mockData
            })
          })
        };
      }
      return { select: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue({}) }) };
    });
    
    supabase.rpc.mockImplementation(() => mockRlsData);
    
    // Act
    const result = await collectDatabaseMetrics();
    
    // Assert
    expect(result.tablesCreated).toBe(true);
    expect(result.tableCount).toBe(4);
    expect(result.rlsEnabled).toBe(true);
  });
});
```

## UI Validation Integration Tests

```typescript
// Testing validation UI components
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Phase1ValidationStatus } from '../components/Phase1ValidationStatus';
import { validatePhase1to2 } from '../validation/helpers';

// Mock validation helper
jest.mock('../validation/helpers', () => ({
  validatePhase1to2: jest.fn()
}));

describe('Phase1ValidationStatus Component', () => {
  test('displays loading state during validation', async () => {
    // Arrange
    validatePhase1to2.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        passed: true,
        passRate: 1.0,
        validations: []
      }), 100);
    }));
    
    // Act
    render(<Phase1ValidationStatus />);
    fireEvent.click(screen.getByText('Validate Phase 1 Completion'));
    
    // Assert
    expect(screen.getByText('Running Validation...')).toBeInTheDocument();
  });
  
  test('displays success message when validation passes', async () => {
    // Arrange
    validatePhase1to2.mockResolvedValue({
      passed: true,
      passRate: 1.0,
      validations: [],
      summary: 'All tests passed'
    });
    
    // Act
    render(<Phase1ValidationStatus />);
    fireEvent.click(screen.getByText('Validate Phase 1 Completion'));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('✅ System is ready for Phase 2')).toBeInTheDocument();
    });
  });
  
  test('displays failure message when validation fails', async () => {
    // Arrange
    validatePhase1to2.mockResolvedValue({
      passed: false,
      passRate: 0.8,
      validations: [
        {
          name: 'Database Schema',
          passed: false,
          metric: '3 tables with RLS',
          threshold: 'All tables created with RLS'
        }
      ],
      summary: 'Some tests failed'
    });
    
    // Act
    render(<Phase1ValidationStatus />);
    fireEvent.click(screen.getByText('Validate Phase 1 Completion'));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('❌ System is not ready for Phase 2')).toBeInTheDocument();
      expect(screen.getByText('Database Schema')).toBeInTheDocument();
    });
  });
});
```

## Related Documents

- [VALIDATION_CHECKLIST_HELPERS.md](../VALIDATION_CHECKLIST_HELPERS.md): Helper functions for validation
- [PHASE_VALIDATION_CHECKPOINTS.md](../PHASE_VALIDATION_CHECKPOINTS.md): Validation checkpoints

## Version History

- **1.0.0**: Initial validation testing strategy (2025-05-23)
