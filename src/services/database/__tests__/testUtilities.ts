
// Enhanced Test Utilities
// Shared utilities for comprehensive testing

export interface TestScenario {
  name: string;
  setup?: () => Promise<void>;
  execute: () => Promise<any>;
  validate: (result: any) => boolean;
  cleanup?: () => Promise<void>;
}

export interface LoadTestConfig {
  concurrentUsers: number;
  duration: number;
  operationsPerSecond: number;
  rampUpTime: number;
}

export interface ChaosTestConfig {
  failureRate: number;
  recoveryTime: number;
  cascadeDepth: number;
}

export class TestScenarioRunner {
  private scenarios: TestScenario[] = [];

  addScenario(scenario: TestScenario): void {
    this.scenarios.push(scenario);
  }

  async runAll(): Promise<TestResults> {
    const results: TestResults = {
      total: this.scenarios.length,
      passed: 0,
      failed: 0,
      errors: [],
      duration: 0
    };

    const startTime = performance.now();

    for (const scenario of this.scenarios) {
      try {
        await scenario.setup?.();
        const result = await scenario.execute();
        const isValid = scenario.validate(result);
        
        if (isValid) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(`Validation failed for ${scenario.name}`);
        }
        
        await scenario.cleanup?.();
      } catch (error) {
        results.failed++;
        results.errors.push(`Error in ${scenario.name}: ${error.message}`);
      }
    }

    results.duration = performance.now() - startTime;
    return results;
  }
}

export class LoadTestRunner {
  async runLoadTest(config: LoadTestConfig, operation: () => Promise<any>): Promise<LoadTestResults> {
    const results: LoadTestResults = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      throughput: 0,
      errors: []
    };

    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const operations: Promise<OperationResult>[] = [];

    // Ramp up phase
    let currentUsers = 0;
    const rampUpInterval = config.rampUpTime / config.concurrentUsers;

    while (Date.now() < endTime) {
      // Add users during ramp-up
      if (currentUsers < config.concurrentUsers && Date.now() - startTime < config.rampUpTime) {
        currentUsers++;
        this.startUserSimulation(operation, endTime, results, operations);
        await new Promise(resolve => setTimeout(resolve, rampUpInterval));
      } else if (currentUsers < config.concurrentUsers) {
        currentUsers++;
        this.startUserSimulation(operation, endTime, results, operations);
      }

      await new Promise(resolve => setTimeout(resolve, 1000 / config.operationsPerSecond));
    }

    // Wait for all operations to complete
    const operationResults = await Promise.allSettled(operations);
    
    // Calculate final results
    this.calculateResults(operationResults, results, config.duration);
    
    return results;
  }

  private startUserSimulation(
    operation: () => Promise<any>,
    endTime: number,
    results: LoadTestResults,
    operations: Promise<OperationResult>[]
  ): void {
    const userOperation = async (): Promise<OperationResult> => {
      const operationStartTime = performance.now();
      
      try {
        await operation();
        const duration = performance.now() - operationStartTime;
        
        return {
          success: true,
          duration,
          timestamp: Date.now()
        };
      } catch (error) {
        const duration = performance.now() - operationStartTime;
        
        return {
          success: false,
          duration,
          timestamp: Date.now(),
          error: error.message
        };
      }
    };

    operations.push(userOperation());
  }

  private calculateResults(
    operationResults: PromiseSettledResult<OperationResult>[],
    results: LoadTestResults,
    duration: number
  ): void {
    const successfulResults: OperationResult[] = [];
    const failedResults: OperationResult[] = [];

    operationResults.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successfulResults.push(result.value);
        } else {
          failedResults.push(result.value);
        }
      }
    });

    results.totalOperations = operationResults.length;
    results.successfulOperations = successfulResults.length;
    results.failedOperations = failedResults.length;
    
    if (successfulResults.length > 0) {
      const durations = successfulResults.map(r => r.duration);
      results.averageResponseTime = durations.reduce((a, b) => a + b, 0) / durations.length;
      results.maxResponseTime = Math.max(...durations);
      results.minResponseTime = Math.min(...durations);
    }
    
    results.throughput = results.successfulOperations / (duration / 1000); // operations per second
    results.errors = failedResults.map(r => r.error).filter(Boolean);
  }
}

export class ChaosTestRunner {
  async runChaosTest(config: ChaosTestConfig, operation: () => Promise<any>): Promise<ChaosTestResults> {
    const results: ChaosTestResults = {
      totalOperations: 0,
      failureOperations: 0,
      recoveryOperations: 0,
      cascadeFailures: 0,
      systemStability: 0,
      recoveryTime: 0
    };

    const operations = 100; // Fixed number for chaos testing
    
    for (let i = 0; i < operations; i++) {
      const shouldFail = Math.random() < config.failureRate;
      
      try {
        if (shouldFail) {
          throw new Error('Chaos-induced failure');
        }
        
        await operation();
        results.recoveryOperations++;
      } catch (error) {
        results.failureOperations++;
        
        // Check for cascade failures
        if (i > 0 && results.failureOperations > results.totalOperations * 0.5) {
          results.cascadeFailures++;
        }
      }
      
      results.totalOperations++;
      
      // Add recovery delay
      if (shouldFail) {
        await new Promise(resolve => setTimeout(resolve, config.recoveryTime));
      }
    }

    results.systemStability = results.recoveryOperations / results.totalOperations;
    results.recoveryTime = config.recoveryTime;
    
    return results;
  }
}

// Type definitions
export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

export interface LoadTestResults {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  throughput: number;
  errors: string[];
}

export interface ChaosTestResults {
  totalOperations: number;
  failureOperations: number;
  recoveryOperations: number;
  cascadeFailures: number;
  systemStability: number;
  recoveryTime: number;
}

export interface OperationResult {
  success: boolean;
  duration: number;
  timestamp: number;
  error?: string;
}

// Export utility instances
export const testScenarioRunner = new TestScenarioRunner();
export const loadTestRunner = new LoadTestRunner();
export const chaosTestRunner = new ChaosTestRunner();
