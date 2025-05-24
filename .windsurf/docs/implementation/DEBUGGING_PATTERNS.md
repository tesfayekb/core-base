# Debugging Patterns for Complex Integrations

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Advanced debugging strategies and patterns for complex integration issues that span multiple system components.

## Systematic Debugging Approach

### 1. Issue Isolation Framework

```typescript
interface DebuggingContext {
  component: string;
  operation: string;
  inputs: Record<string, any>;
  timestamp: string;
  user?: string;
  tenant?: string;
}

class DebugTracker {
  private static traces: DebuggingContext[] = [];
  
  static trace(context: DebuggingContext) {
    this.traces.push({
      ...context,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[DEBUG] ${context.component}.${context.operation}`, context.inputs);
  }
  
  static getTrace(component?: string): DebuggingContext[] {
    if (component) {
      return this.traces.filter(t => t.component === component);
    }
    return this.traces;
  }
  
  static clearTrace() {
    this.traces = [];
  }
}
```

### 2. Component Integration Debugging

```typescript
// Auth + RBAC integration debugging
class AuthRBACDebugger {
  static async debugPermissionFlow(userId: string, action: string, resource: string) {
    console.group(`🔍 Permission Debug: ${action}:${resource} for user ${userId}`);
    
    try {
      // Step 1: Verify user exists
      DebugTracker.trace({
        component: 'auth',
        operation: 'getUserInfo',
        inputs: { userId }
      });
      
      const { data: user, error: userError } = await supabase
        .from('auth.users')
        .select('id, email, tenant_id')
        .eq('id', userId)
        .single();
        
      if (userError || !user) {
        console.error('❌ User not found:', userError);
        return false;
      }
      
      console.log('✅ User found:', user);
      
      // Step 2: Check tenant context
      DebugTracker.trace({
        component: 'tenant',
        operation: 'checkContext',
        inputs: { tenantId: user.tenant_id }
      });
      
      const currentTenant = await supabase.rpc('get_current_tenant_id');
      console.log('🏢 Current tenant context:', currentTenant);
      
      if (currentTenant !== user.tenant_id) {
        console.warn('⚠️ Tenant context mismatch');
        await supabase.rpc('set_tenant_context', { tenant_id: user.tenant_id });
        console.log('✅ Tenant context corrected');
      }
      
      // Step 3: Get user roles
      DebugTracker.trace({
        component: 'rbac',
        operation: 'getUserRoles',
        inputs: { userId }
      });
      
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles (
            id,
            name,
            permissions
          )
        `)
        .eq('user_id', userId);
        
      console.log('👥 User roles:', userRoles);
      
      // Step 4: Check specific permission
      const requiredPermission = `${action}:${resource}`;
      let hasPermission = false;
      
      for (const userRole of userRoles || []) {
        if (userRole.roles?.permissions?.includes(requiredPermission)) {
          hasPermission = true;
          console.log(`✅ Permission found in role: ${userRole.roles.name}`);
          break;
        }
      }
      
      if (!hasPermission) {
        console.error(`❌ Permission ${requiredPermission} not found in any role`);
      }
      
      return hasPermission;
      
    } finally {
      console.groupEnd();
    }
  }
}
```

### 3. Database Query Debugging

```typescript
class DatabaseDebugger {
  static async debugQuery(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    filters: Record<string, any> = {}
  ) {
    console.group(`🗄️ Database Debug: ${operation} on ${table}`);
    
    try {
      // Check RLS status
      const { data: rlsStatus } = await supabase
        .rpc('check_rls_status', { table_name: table });
      
      console.log('🔒 RLS Status:', rlsStatus);
      
      // Check current tenant context
      const tenantId = await supabase.rpc('get_current_tenant_id');
      console.log('🏢 Current tenant:', tenantId);
      
      // Check table policies
      const { data: policies } = await supabase
        .rpc('get_table_policies', { table_name: table });
      
      console.log('📋 Table policies:', policies);
      
      // Execute query with timing
      const startTime = performance.now();
      
      let query = supabase.from(table).select('*');
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error, count } = await query;
      
      const endTime = performance.now();
      
      console.log(`⏱️ Query time: ${endTime - startTime}ms`);
      console.log(`📊 Results: ${count || data?.length || 0} records`);
      
      if (error) {
        console.error('❌ Query error:', error);
      } else {
        console.log('✅ Query successful');
      }
      
      return { data, error, queryTime: endTime - startTime };
      
    } finally {
      console.groupEnd();
    }
  }
}
```

## Multi-Component Integration Debugging

### 1. End-to-End Flow Tracing

```typescript
class FlowTracer {
  private flowId: string;
  private steps: Array<{
    component: string;
    action: string;
    timestamp: number;
    success: boolean;
    data?: any;
    error?: any;
  }> = [];
  
  constructor(flowName: string) {
    this.flowId = `${flowName}_${Date.now()}`;
    console.log(`🚀 Starting flow trace: ${this.flowId}`);
  }
  
  step(component: string, action: string, success: boolean, data?: any, error?: any) {
    const step = {
      component,
      action,
      timestamp: performance.now(),
      success,
      data,
      error
    };
    
    this.steps.push(step);
    
    const icon = success ? '✅' : '❌';
    console.log(`${icon} ${component}.${action}`, data || error);
  }
  
  complete() {
    console.group(`📊 Flow trace complete: ${this.flowId}`);
    
    const totalTime = this.steps[this.steps.length - 1].timestamp - this.steps[0].timestamp;
    const successfulSteps = this.steps.filter(s => s.success).length;
    
    console.log(`⏱️ Total time: ${totalTime}ms`);
    console.log(`✅ Successful steps: ${successfulSteps}/${this.steps.length}`);
    
    // Show detailed flow
    this.steps.forEach((step, index) => {
      const icon = step.success ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${step.component}.${step.action}`);
    });
    
    console.groupEnd();
    
    return {
      flowId: this.flowId,
      totalTime,
      successRate: successfulSteps / this.steps.length,
      steps: this.steps
    };
  }
}

// Usage example
async function debugUserLogin(email: string, password: string) {
  const tracer = new FlowTracer('user_login');
  
  try {
    // Step 1: Authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    tracer.step('auth', 'signIn', !authError, authData, authError);
    
    if (authError) return tracer.complete();
    
    // Step 2: Set tenant context
    const tenantId = authData.user?.user_metadata?.tenant_id;
    
    if (tenantId) {
      const { error: contextError } = await supabase.rpc('set_tenant_context', {
        tenant_id: tenantId
      });
      
      tracer.step('tenant', 'setContext', !contextError, { tenantId }, contextError);
    }
    
    // Step 3: Load user permissions
    const { data: permissions, error: permError } = await supabase.rpc('get_user_permissions', {
      user_id: authData.user.id
    });
    
    tracer.step('rbac', 'loadPermissions', !permError, permissions, permError);
    
    return tracer.complete();
    
  } catch (error) {
    tracer.step('system', 'unexpectedError', false, null, error);
    return tracer.complete();
  }
}
```

### 2. Performance Bottleneck Detection

```typescript
class PerformanceProfiler {
  private static measurements: Map<string, number[]> = new Map();
  
  static async profile<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.recordMeasurement(operation, duration);
      
      if (duration > 1000) { // > 1 second
        console.warn(`🐌 Slow operation detected: ${operation} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ Operation failed: ${operation} after ${duration}ms`, error);
      throw error;
    }
  }
  
  private static recordMeasurement(operation: string, duration: number) {
    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }
    
    const measurements = this.measurements.get(operation)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }
  }
  
  static getStats(operation: string) {
    const measurements = this.measurements.get(operation) || [];
    
    if (measurements.length === 0) {
      return null;
    }
    
    const sorted = [...measurements].sort((a, b) => a - b);
    const avg = measurements.reduce((a, b) => a + b) / measurements.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    return {
      count: measurements.length,
      average: avg,
      median,
      p95,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }
  
  static getAllStats() {
    const stats: Record<string, any> = {};
    
    for (const [operation] of this.measurements) {
      stats[operation] = this.getStats(operation);
    }
    
    return stats;
  }
}

// Usage
const user = await PerformanceProfiler.profile(
  'database.getUser',
  () => supabase.from('users').select('*').eq('id', userId).single()
);
```

### 3. State Consistency Debugging

```typescript
class StateDebugger {
  static validateAuthState() {
    console.group('🔍 Auth State Validation');
    
    try {
      // Check local storage
      const localAuth = localStorage.getItem('supabase.auth.token');
      console.log('💾 Local storage auth:', !!localAuth);
      
      // Check Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('🔐 Supabase session:', !!session);
        console.log('👤 Current user:', session?.user?.email);
      });
      
      // Check tenant context
      supabase.rpc('get_current_tenant_id').then(tenantId => {
        console.log('🏢 Tenant context:', tenantId);
      });
      
    } finally {
      console.groupEnd();
    }
  }
  
  static validatePermissionState(userId: string) {
    console.group('🔍 Permission State Validation');
    
    // Check cached permissions
    const cached = permissionCache.get(userId);
    console.log('💾 Cached permissions:', cached);
    
    // Check database permissions
    supabase.rpc('get_user_permissions', { user_id: userId })
      .then(({ data }) => {
        console.log('🗄️ Database permissions:', data);
        
        // Compare cached vs database
        if (cached && data) {
          const cachedSet = new Set(cached);
          const dbSet = new Set(data.map((p: any) => `${p.action}:${p.resource}`));
          
          const missing = [...dbSet].filter(p => !cachedSet.has(p));
          const extra = [...cachedSet].filter(p => !dbSet.has(p));
          
          if (missing.length > 0) {
            console.warn('⚠️ Missing from cache:', missing);
          }
          
          if (extra.length > 0) {
            console.warn('⚠️ Extra in cache:', extra);
          }
        }
        
        console.groupEnd();
      });
  }
}
```

## Automated Debugging Tools

### 1. Health Check System

```typescript
class HealthChecker {
  static async runFullHealthCheck() {
    const results = {
      database: await this.checkDatabase(),
      auth: await this.checkAuth(),
      rbac: await this.checkRBAC(),
      tenant: await this.checkTenant()
    };
    
    console.table(results);
    return results;
  }
  
  private static async checkDatabase() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('count')
        .limit(1);
      
      return { status: error ? 'error' : 'healthy', error };
    } catch (error) {
      return { status: 'error', error };
    }
  }
  
  private static async checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return { 
        status: 'healthy', 
        authenticated: !!session,
        user: session?.user?.email 
      };
    } catch (error) {
      return { status: 'error', error };
    }
  }
  
  private static async checkRBAC() {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('count')
        .limit(1);
      
      return { status: error ? 'error' : 'healthy', error };
    } catch (error) {
      return { status: 'error', error };
    }
  }
  
  private static async checkTenant() {
    try {
      const tenantId = await supabase.rpc('get_current_tenant_id');
      return { 
        status: 'healthy', 
        contextSet: !!tenantId,
        tenantId 
      };
    } catch (error) {
      return { status: 'error', error };
    }
  }
}
```

### 2. Integration Test Debugger

```typescript
class IntegrationTestDebugger {
  static async debugFailedTest(testName: string, testFn: () => Promise<void>) {
    console.group(`🧪 Debugging failed test: ${testName}`);
    
    try {
      // Capture initial state
      const initialState = await this.captureSystemState();
      console.log('📸 Initial state:', initialState);
      
      // Run test with enhanced logging
      await testFn();
      
      console.log('✅ Test passed on retry');
      
    } catch (error) {
      console.error('❌ Test failed again:', error);
      
      // Capture failure state
      const failureState = await this.captureSystemState();
      console.log('📸 Failure state:', failureState);
      
      // Generate debugging report
      this.generateDebugReport(testName, initialState, failureState, error);
      
    } finally {
      console.groupEnd();
    }
  }
  
  private static async captureSystemState() {
    return {
      timestamp: new Date().toISOString(),
      auth: await this.getAuthState(),
      tenant: await this.getTenantState(),
      permissions: await this.getPermissionState()
    };
  }
  
  private static async getAuthState() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      authenticated: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    };
  }
  
  private static async getTenantState() {
    try {
      const tenantId = await supabase.rpc('get_current_tenant_id');
      return { tenantId, contextSet: !!tenantId };
    } catch {
      return { tenantId: null, contextSet: false };
    }
  }
  
  private static async getPermissionState() {
    // Implementation depends on your permission caching strategy
    return { cached: false };
  }
  
  private static generateDebugReport(
    testName: string,
    initialState: any,
    failureState: any,
    error: any
  ) {
    const report = {
      testName,
      error: error.message,
      stateChanges: this.compareStates(initialState, failureState),
      recommendations: this.generateRecommendations(error)
    };
    
    console.log('📄 Debug report:', report);
    return report;
  }
  
  private static compareStates(initial: any, failure: any) {
    const changes: string[] = [];
    
    if (initial.auth.authenticated !== failure.auth.authenticated) {
      changes.push('Authentication state changed');
    }
    
    if (initial.tenant.tenantId !== failure.tenant.tenantId) {
      changes.push('Tenant context changed');
    }
    
    return changes;
  }
  
  private static generateRecommendations(error: any) {
    const recommendations: string[] = [];
    
    if (error.message.includes('permission')) {
      recommendations.push('Check user role assignments');
      recommendations.push('Verify permission cache is up to date');
    }
    
    if (error.message.includes('tenant')) {
      recommendations.push('Ensure tenant context is set before operations');
      recommendations.push('Check RLS policies');
    }
    
    return recommendations;
  }
}
```

## Debugging Commands for Development

```typescript
// Add to window for browser console access
declare global {
  interface Window {
    debug: {
      auth: typeof AuthRBACDebugger;
      db: typeof DatabaseDebugger;
      health: typeof HealthChecker;
      perf: typeof PerformanceProfiler;
      state: typeof StateDebugger;
    };
  }
}

// Initialize debugging tools
if (process.env.NODE_ENV === 'development') {
  window.debug = {
    auth: AuthRBACDebugger,
    db: DatabaseDebugger,
    health: HealthChecker,
    perf: PerformanceProfiler,
    state: StateDebugger
  };
  
  console.log('🛠️ Debugging tools available at window.debug');
  console.log('Examples:');
  console.log('  window.debug.health.runFullHealthCheck()');
  console.log('  window.debug.auth.debugPermissionFlow(userId, "Read", "users")');
  console.log('  window.debug.state.validateAuthState()');
}
```

## Related Documentation

- **[TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)**: Common integration issues
- **[PRACTICAL_IMPLEMENTATION_GUIDE.md](PRACTICAL_IMPLEMENTATION_GUIDE.md)**: Implementation guidance
- **[testing/QUANTIFIABLE_METRICS.md](testing/QUANTIFIABLE_METRICS.md)**: Performance metrics

## Version History

- **1.0.0**: Initial debugging patterns for complex integrations (2025-05-23)
