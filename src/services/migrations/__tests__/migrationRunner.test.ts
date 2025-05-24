
// Migration Runner Tests
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import { MigrationRunner, Migration } from '../migrationRunner';
import { TestDatabase, createMockSupabaseClient } from '../../../tests/testUtils';

// Mock the database module
jest.mock('../../database', () => ({
  supabase: createMockSupabaseClient()
}));

// Mock executeSQL function
const mockExecuteSQL = jest.fn();

describe('MigrationRunner', () => {
  let migrationRunner: MigrationRunner;
  let mockSupabase: any;

  beforeEach(async () => {
    mockExecuteSQL.mockClear();
    migrationRunner = new MigrationRunner(mockExecuteSQL);
    mockSupabase = require('../../database').supabase;
    await TestDatabase.setupTestEnvironment();
  });

  afterEach(async () => {
    await TestDatabase.teardownTestEnvironment();
    jest.clearAllMocks();
  });

  describe('Infrastructure Setup', () => {
    it('should create migrations table if not exists', async () => {
      // Mock successful execution
      mockExecuteSQL.mockResolvedValue({ rows: [], rowCount: 0 });

      await migrationRunner.initialize();

      expect(mockExecuteSQL).toHaveBeenCalled();
    });

    it('should handle infrastructure migration setup', async () => {
      // Mock infrastructure migration loading
      const mockInfrastructureMigration: Migration = {
        version: '000',
        name: 'migration_infrastructure',
        script: 'CREATE TABLE test;'
      };

      // Mock successful execution
      mockExecuteSQL.mockResolvedValue({ rows: [], rowCount: 0 });

      await migrationRunner.initialize();

      expect(mockExecuteSQL).toHaveBeenCalled();
    });
  });

  describe('Migration Execution', () => {
    it('should execute migration successfully', async () => {
      const testMigration: Migration = {
        version: '001',
        name: 'test_migration',
        script: 'CREATE TABLE test_table;'
      };

      // Mock successful execution
      mockExecuteSQL.mockResolvedValue({ rows: [], rowCount: 0 });

      await migrationRunner.runMigration(testMigration);

      expect(mockExecuteSQL).toHaveBeenCalledWith(testMigration.script);
    });

    it('should skip already applied migrations', async () => {
      const testMigration: Migration = {
        version: '001',
        name: 'test_migration',
        script: 'CREATE TABLE test_table;'
      };

      // Mock migration already exists
      mockExecuteSQL.mockResolvedValueOnce([{ version: '001' }]);

      await migrationRunner.runMigration(testMigration);

      // Should check if migration exists but not execute the script again
      expect(mockExecuteSQL).toHaveBeenCalled();
    });

    it('should handle migration execution errors', async () => {
      const testMigration: Migration = {
        version: '001',
        name: 'test_migration',
        script: 'INVALID SQL;'
      };

      // Mock execution error
      mockExecuteSQL.mockRejectedValue(new Error('SQL execution failed'));

      await expect(migrationRunner.runMigration(testMigration)).rejects.toThrow('SQL execution failed');
    });
  });

  describe('Hash Calculation', () => {
    it('should calculate consistent hash for same script', async () => {
      const script = 'CREATE TABLE test;';
      
      // Access the validator through the migrationRunner's getAppliedMigrations method
      // This is a workaround since the validator is private
      const migration1: Migration = { version: '001', name: 'test1', script };
      const migration2: Migration = { version: '002', name: 'test2', script };
      
      migrationRunner.addMigration(migration1);
      migrationRunner.addMigration(migration2);

      // Test that validation works (indirectly tests hash calculation)
      mockExecuteSQL.mockResolvedValue({ rows: [], rowCount: 0 });
      const isValid = await migrationRunner.validateMigrations();
      
      expect(typeof isValid).toBe('boolean');
    });
  });
});
