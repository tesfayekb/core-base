
// Migration Runner Tests
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import { MigrationRunner, Migration } from '../migrationRunner';
import { TestDatabase, createMockSupabaseClient } from '../../../tests/testUtils';

// Mock the database module
jest.mock('../../database', () => ({
  supabase: createMockSupabaseClient()
}));

describe('MigrationRunner', () => {
  let migrationRunner: MigrationRunner;
  let mockSupabase: any;

  beforeEach(async () => {
    migrationRunner = new MigrationRunner();
    mockSupabase = require('../../database').supabase;
    await TestDatabase.setupTestEnvironment();
  });

  afterEach(async () => {
    await TestDatabase.teardownTestEnvironment();
    jest.clearAllMocks();
  });

  describe('Infrastructure Setup', () => {
    it('should create migrations table if not exists', async () => {
      // Mock successful RPC call
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await migrationRunner['ensureMigrationsTable']();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_migrations_table_if_not_exists');
    });

    it('should handle infrastructure migration setup', async () => {
      // Mock infrastructure migration loading
      const mockInfrastructureMigration: Migration = {
        version: '000',
        name: 'migration_infrastructure',
        script: 'CREATE TABLE test;'
      };

      // Mock successful execution
      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockSupabase.from().select().eq().single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      await migrationRunner['ensureMigrationsTable']();

      expect(mockSupabase.rpc).toHaveBeenCalled();
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
      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // No existing migration
      });
      mockSupabase.from().insert.mockResolvedValue({ error: null });

      await migrationRunner.runMigration(testMigration);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('execute_migration', {
        migration_script: testMigration.script
      });
    });

    it('should skip already applied migrations', async () => {
      const testMigration: Migration = {
        version: '001',
        name: 'test_migration',
        script: 'CREATE TABLE test_table;'
      };

      // Mock migration already exists
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { version: '001' },
        error: null
      });

      await migrationRunner.runMigration(testMigration);

      // Should not execute migration script
      expect(mockSupabase.rpc).not.toHaveBeenCalledWith('execute_migration', expect.any(Object));
    });

    it('should handle migration execution errors', async () => {
      const testMigration: Migration = {
        version: '001',
        name: 'test_migration',
        script: 'INVALID SQL;'
      };

      // Mock migration doesn't exist
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Mock execution error
      mockSupabase.rpc.mockResolvedValue({ 
        error: { message: 'SQL execution failed' } 
      });

      await expect(migrationRunner.runMigration(testMigration)).rejects.toThrow('Migration execution failed: SQL execution failed');
    });
  });

  describe('Hash Calculation', () => {
    it('should calculate consistent hash for same script', async () => {
      const script = 'CREATE TABLE test;';
      
      const hash1 = await migrationRunner['calculateHash'](script);
      const hash2 = await migrationRunner['calculateHash'](script);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });

    it('should calculate different hashes for different scripts', async () => {
      const script1 = 'CREATE TABLE test1;';
      const script2 = 'CREATE TABLE test2;';
      
      const hash1 = await migrationRunner['calculateHash'](script1);
      const hash2 = await migrationRunner['calculateHash'](script2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
