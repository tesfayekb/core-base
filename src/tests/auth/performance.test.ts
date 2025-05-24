
// Authentication Performance Tests
// Following src/docs/PERFORMANCE_STANDARDS.md requirements

import { authService } from '../../services/authService';

// Create proper mocks
const mockSignInWithPassword = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword
    }
  }
}));

describe('Authentication Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should meet authentication time target (<1000ms)', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'test', email: 'test@example.com' }, session: {} },
      error: null
    });

    const measurements: number[] = [];
    
    // Run multiple iterations to get average
    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();
      await authService.signIn('test@example.com', 'password123');
      const duration = performance.now() - startTime;
      measurements.push(duration);
    }

    const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const maxTime = Math.max(...measurements);

    expect(averageTime).toBeLessThan(1000);
    expect(maxTime).toBeLessThan(1000);
  });

  test('should handle concurrent authentication requests', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'test', email: 'test@example.com' }, session: {} },
      error: null
    });

    const promises = Array.from({ length: 10 }, () => 
      authService.signIn('test@example.com', 'password123')
    );

    const startTime = performance.now();
    const results = await Promise.allSettled(promises);
    const duration = performance.now() - startTime;

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successCount).toBe(10);
    expect(duration).toBeLessThan(2000); // Should handle 10 concurrent requests in <2s
  });
});
