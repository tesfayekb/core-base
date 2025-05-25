
import { rbacService } from '../../services/rbac/rbacService';

describe('System Health Integration Tests', () => {
  test('should check system health status', async () => {
    const systemStatus = rbacService.getSystemStatus();
    
    expect(systemStatus).toHaveProperty('cacheStats');
    expect(systemStatus).toHaveProperty('performanceReport');
    expect(systemStatus).toHaveProperty('warmingStatus');
    expect(systemStatus).toHaveProperty('alerts');
  });

  test('should handle alerts correctly', () => {
    const alerts = rbacService.getActiveAlerts();
    expect(Array.isArray(alerts)).toBe(true);
  });

  test('should run diagnostics', () => {
    const diagnostics = rbacService.runDiagnostics();
    
    expect(diagnostics).toHaveProperty('status');
    expect(diagnostics).toHaveProperty('details');
    expect(diagnostics.details).toHaveProperty('systemStatus');
    expect(diagnostics.details).toHaveProperty('alerts');
    expect(diagnostics.details).toHaveProperty('recommendations');
  });
});
