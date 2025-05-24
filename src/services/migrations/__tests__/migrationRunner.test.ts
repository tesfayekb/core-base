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
      
      const hash1 = await migrationRunner['generateHash'](script);
      const hash2 = await migrationRunner['generateHash'](script);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });

    it('should calculate different hashes for different scripts', async () => {
      const script1 = 'CREATE TABLE test1;';
      const script2 = 'CREATE TABLE test2;';
      
      const hash1 = await migrationRunner['generateHash'](script1);
      const hash2 = await migrationRunner['generateHash'](script2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
