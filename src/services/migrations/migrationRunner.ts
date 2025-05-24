
import { supabase } from '../database';

export interface Migration {
  version: string;
  name: string;
  script: string;
  hash?: string;
  applied_by?: string;
  applied_at?: string;
}

export class MigrationRunner {
  private async ensureMigrationsTable(): Promise<void> {
    // First run migration 000 if it exists to set up infrastructure
    const infrastructureMigration = await this.loadInfrastructureMigration();
    if (infrastructureMigration && !await this.isMigrationApplied('000')) {
      console.log('🔧 Setting up migration infrastructure...');
      await this.executeRawMigration(infrastructureMigration);
    }

    const { error } = await supabase.rpc('create_migrations_table_if_not_exists');
    if (error) {
      console.error('Failed to create migrations table:', error);
      throw new Error(`Migration table creation failed: ${error.message}`);
    }
  }

  private async loadInfrastructureMigration(): Promise<Migration | null> {
    try {
      const module = await import('./migrations/000_migration_infrastructure.ts');
      return module.default;
    } catch {
      return null; // Infrastructure migration doesn't exist
    }
  }

  private async executeRawMigration(migration: Migration): Promise<void> {
    // Execute migration script directly for infrastructure setup
    const { error } = await supabase.rpc('execute_migration', {
      migration_script: migration.script
    });

    if (error) {
      throw new Error(`Infrastructure migration failed: ${error.message}`);
    }

    // Record the migration
    const hash = await this.calculateHash(migration.script);
    await this.recordMigration({ ...migration, hash });
  }

  private async calculateHash(script: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(script);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async isMigrationApplied(version: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('migrations')
      .select('version')
      .eq('version', version)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check migration status: ${error.message}`);
    }

    return !!data;
  }

  private async recordMigration(migration: Migration): Promise<void> {
    const { error } = await supabase
      .from('migrations')
      .insert({
        version: migration.version,
        name: migration.name,
        script: migration.script,
        hash: migration.hash,
        applied_by: migration.applied_by || 'system',
        applied_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to record migration: ${error.message}`);
    }
  }

  async runMigration(migration: Migration): Promise<void> {
    console.log(`🔄 Running migration ${migration.version}: ${migration.name}`);

    // Ensure migrations table exists (will set up infrastructure if needed)
    await this.ensureMigrationsTable();

    // Check if already applied
    const isApplied = await this.isMigrationApplied(migration.version);
    if (isApplied) {
      console.log(`✅ Migration ${migration.version} already applied, skipping`);
      return;
    }

    // Calculate hash
    const hash = await this.calculateHash(migration.script);
    const migrationWithHash = { ...migration, hash };

    try {
      // Execute migration script
      const { error } = await supabase.rpc('execute_migration', {
        migration_script: migration.script
      });

      if (error) {
        throw new Error(`Migration execution failed: ${error.message}`);
      }

      // Record successful migration
      await this.recordMigration(migrationWithHash);
      console.log(`✅ Migration ${migration.version} completed successfully`);

    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  async runPendingMigrations(): Promise<void> {
    console.log('🚀 Starting migration process...');

    const migrations = await this.loadMigrations();
    
    for (const migration of migrations) {
      await this.runMigration(migration);
    }

    console.log('✅ All migrations completed');
  }

  private async loadMigrations(): Promise<Migration[]> {
    // Import all migration files
    const migrationModules = import.meta.glob('./migrations/*.ts', { eager: true });
    
    const migrations: Migration[] = [];
    
    for (const [path, module] of Object.entries(migrationModules)) {
      const migration = (module as any).default as Migration;
      if (migration) {
        migrations.push(migration);
      }
    }

    // Sort by version
    return migrations.sort((a, b) => a.version.localeCompare(b.version));
  }
}

export const migrationRunner = new MigrationRunner();
