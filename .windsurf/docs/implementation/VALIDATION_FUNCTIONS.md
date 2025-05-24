
# Validation Functions

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides practical implementation of validation functions to ensure each phase meets the required success criteria.

## Phase Validation Usage

### How to Use Phase Validation

```typescript
// Example of validating readiness to proceed from Phase 1 to Phase 2
import { validatePhase1to2 } from '../validation/helpers';

async function checkPhase1Completion() {
  const validationResult = await validatePhase1to2();
  
  if (validationResult.passed) {
    console.log('✅ System is ready to proceed to Phase 2');
    console.log(`All validation checks passed (${validationResult.passRate * 100}%)`);
    
    // Begin Phase 2 implementation
    startPhase2Implementation();
  } else {
    console.log('❌ System is not ready for Phase 2');
    console.log(validationResult.summary);
    
    // Display specific issues
    validationResult.validations
      .filter(v => !v.passed)
      .forEach(failed => {
        console.log(`- ${failed.name}: ${failed.metric} (Required: ${failed.threshold})`);
      });
      
    // Take corrective action
    await fixPhase1Issues(validationResult.validations);
  }
}
```

## Metric Collection Implementation

Below are examples of how to implement the metric collection functions that power the validation.

### Phase 1 Metrics Collection

```typescript
/**
 * Collects all metrics needed for Phase 1 validation
 */
export async function collectPhase1Metrics(): Promise<Phase1Metrics> {
  return {
    database: await collectDatabaseMetrics(),
    auth: await collectAuthMetrics(),
    rbac: await collectRbacMetrics(),
    multitenant: await collectMultitenantMetrics(),
    errorRate: await calculateErrorRate()
  };
}

/**
 * Collects database metrics
 */
async function collectDatabaseMetrics() {
  // Start timing
  const startTime = performance.now();
  
  try {
    // Check if required tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['tenants', 'roles', 'user_roles', 'audit_logs']);
    
    // Check if RLS is enabled
    const { data: rlsTables } = await supabase.rpc('check_rls_enabled');
    
    // Run a simple test query
    const testQueryStart = performance.now();
    await supabase.from('users').select('id').limit(1);
    const queryTime = performance.now() - testQueryStart;
    
    return {
      tablesCreated: tables && tables.length >= 4,
      tableCount: tables ? tables.length : 0,
      rlsEnabled: rlsTables && rlsTables.length >= 4,
      queryExecution: queryTime
    };
  } catch (error) {
    console.error('Error collecting database metrics:', error);
    return {
      tablesCreated: false,
      tableCount: 0,
      rlsEnabled: false,
      queryExecution: 999
    };
  }
}

/**
 * Collects authentication metrics
 */
async function collectAuthMetrics() {
  const loginTime = await measureLoginTime();
  const registrationTime = await measureRegistrationTime();
  const tokenValidation = await measureTokenValidation();
  
  return {
    loginTime,
    registrationTime,
    tokenValidation
  };
}

/**
 * Measures login response time
 */
async function measureLoginTime() {
  try {
    const startTime = performance.now();
    
    // Use a test account for measurement
    await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });
    
    return performance.now() - startTime;
  } catch (error) {
    console.error('Login time measurement failed:', error);
    return 9999; // Error value
  }
}

// Additional implementation of metric collection functions
// ...
```

## Validation UI Integration

### React Component for Validation Status

```typescript
import React, { useState, useEffect } from 'react';
import { validatePhase1to2, ValidationResult } from '../validation/helpers';

export const Phase1ValidationStatus: React.FC = () => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const runValidation = async () => {
    setIsValidating(true);
    setError(null);
    
    try {
      const result = await validatePhase1to2();
      setValidationResult(result);
    } catch (err) {
      setError('Failed to run validation: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <div className="validation-status">
      <h2>Phase 1→2 Transition Validation</h2>
      
      <button 
        onClick={runValidation} 
        disabled={isValidating}
        className="validation-button"
      >
        {isValidating ? 'Running Validation...' : 'Validate Phase 1 Completion'}
      </button>
      
      {error && (
        <div className="validation-error">
          {error}
        </div>
      )}
      
      {validationResult && (
        <div className={`validation-result ${validationResult.passed ? 'passed' : 'failed'}`}>
          <h3>
            {validationResult.passed 
              ? '✅ System is ready for Phase 2' 
              : '❌ System is not ready for Phase 2'
            }
          </h3>
          
          <div className="validation-metrics">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${validationResult.passRate * 100}%`}}
              />
            </div>
            <div className="progress-text">
              {Math.round(validationResult.passRate * 100)}% complete
            </div>
          </div>
          
          <ul className="validation-checks">
            {validationResult.validations.map((check, i) => (
              <li key={i} className={check.passed ? 'passed' : 'failed'}>
                <span className="check-status">
                  {check.passed ? '✓' : '✗'}
                </span>
                <span className="check-name">{check.name}</span>
                <span className="check-metric">{check.metric}</span>
                <span className="check-threshold">
                  Required: {check.threshold}
                </span>
              </li>
            ))}
          </ul>
          
          {!validationResult.passed && (
            <div className="validation-guidance">
              <h4>Recommended Actions:</h4>
              <ul>
                {validationResult.validations
                  .filter(v => !v.passed)
                  .map((failedCheck, i) => (
                    <li key={i}>
                      {getRecommendationForCheck(failedCheck.name)}
                    </li>
                  ))
                }
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to provide guidance based on failing check
function getRecommendationForCheck(checkName: string): string {
  const recommendations: Record<string, string> = {
    'Database Schema': 'Verify that all required tables are created with RLS enabled',
    'Authentication': 'Optimize login and registration performance',
    'RBAC Foundation': 'Improve permission check response time with caching',
    'Multi-Tenant Foundation': 'Ensure tenant isolation is properly implemented',
    'Error Rates': 'Address error handling to reduce overall error rate'
  };
  
  return recommendations[checkName] || 'Review implementation against requirements';
}
```

## Command-Line Validation Tool

```typescript
/**
 * Simple CLI tool for running validation checks
 */
async function validateFromCLI() {
  const args = process.argv.slice(2);
  const phaseArg = args[0];
  
  if (!phaseArg) {
    console.log('Please specify which phase transition to validate:');
    console.log('  npm run validate 1-2   # Validate Phase 1 → Phase 2');
    console.log('  npm run validate 2-3   # Validate Phase 2 → Phase 3');
    console.log('  npm run validate 3-4   # Validate Phase 3 → Phase 4');
    console.log('  npm run validate 4-prod # Validate Phase 4 → Production');
    process.exit(1);
  }
  
  let validationResult: ValidationResult | null = null;
  
  try {
    switch (phaseArg) {
      case '1-2':
        validationResult = await validatePhase1to2();
        break;
      case '2-3':
        validationResult = await validatePhase2to3();
        break;
      case '3-4':
        validationResult = await validatePhase3to4();
        break;
      case '4-prod':
        validationResult = await validatePhase4toProd();
        break;
      default:
        console.error('Invalid phase transition specified.');
        process.exit(1);
    }
    
    console.log('='.repeat(50));
    console.log(`VALIDATION RESULT: ${validationResult.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('='.repeat(50));
    console.log(validationResult.summary);
    
    if (!validationResult.passed) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error running validation:', error);
    process.exit(1);
  }
}

// Run the CLI if this script is executed directly
if (require.main === module) {
  validateFromCLI().catch(console.error);
}
```

## Related Documentation

- [PHASE_VALIDATION_CHECKPOINTS.md](PHASE_VALIDATION_CHECKPOINTS.md): Detailed validation checkpoint requirements
- [VALIDATION_CHECKLISTS.md](VALIDATION_CHECKLISTS.md): Comprehensive validation checklists
- [VALIDATION_CHECKLIST_HELPERS.md](VALIDATION_CHECKLIST_HELPERS.md): Helper functions for validation

## Version History

- **1.0.0**: Initial validation functions implementation (2025-05-23)
